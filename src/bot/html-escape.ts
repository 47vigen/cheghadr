/**
 * Escape text for Telegram `parse_mode: 'HTML'`.
 * Order: `&` first so we do not double-escape entities we insert.
 */
export function escapeTelegramHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
