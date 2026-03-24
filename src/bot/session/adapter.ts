import type { StorageAdapter } from 'grammy'

import { db } from '@/server/db'

import type { SessionData } from './types'

export const prismaSessionAdapter: StorageAdapter<SessionData> = {
  async read(key: string) {
    const chatId = BigInt(key)
    const row = await db.botSession.findUnique({ where: { chatId } })
    if (!row) return undefined
    return row.data as SessionData
  },

  async write(key: string, value: SessionData) {
    const chatId = BigInt(key)
    await db.botSession.upsert({
      where: { chatId },
      create: { chatId, data: value as object },
      update: { data: value as object },
    })
  },

  async delete(key: string) {
    const chatId = BigInt(key)
    await db.botSession.deleteMany({ where: { chatId } })
  },
}
