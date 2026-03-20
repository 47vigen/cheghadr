import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@twa-dev/sdk', () => ({
  default: { openLink: vi.fn() },
}))

vi.mock('@/utils/telegram', () => ({
  isTelegramWebApp: vi.fn(() => false),
}))

import { downloadCSV } from '@/lib/csv-download'
import { isTelegramWebApp } from '@/utils/telegram'

describe('downloadCSV', () => {
  const blobCalls: Array<{ parts: BlobPart[]; options?: BlobPropertyBag }> = []

  beforeEach(() => {
    blobCalls.length = 0
    const OriginalBlob = globalThis.Blob
    vi.stubGlobal(
      'Blob',
      class extends OriginalBlob {
        constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options)
          blobCalls.push({ parts: parts ?? [], options })
        }
      },
    )

    const link = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    })

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:unit-test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.mocked(isTelegramWebApp).mockReturnValue(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('builds CSV blob with UTF-8 BOM prefix', () => {
    downloadCSV('col1,col2', 'export.csv')

    expect(blobCalls.length).toBe(1)
    const first = blobCalls[0]?.parts[0]
    expect(typeof first).toBe('string')
    expect((first as string).codePointAt(0)).toBe(0xfeff)
    expect((first as string).slice(1)).toBe('col1,col2')
  })

  it('triggers anchor download in non-Telegram environment', () => {
    const doc = document as unknown as {
      createElement: ReturnType<typeof vi.fn>
      body: { appendChild: ReturnType<typeof vi.fn> }
    }
    downloadCSV('x', 'out.csv')

    expect(doc.createElement).toHaveBeenCalledWith('a')
    const link = doc.createElement.mock.results[0]?.value as {
      download: string
      click: ReturnType<typeof vi.fn>
    }
    expect(link.download).toBe('out.csv')
    expect(link.click).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:unit-test')
  })
})
