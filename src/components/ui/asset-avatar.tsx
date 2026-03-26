'use client'

import { Avatar } from '@heroui/react'

interface AssetAvatarProps {
  alt: string
  symbol: string
  src?: string | null
}

export function AssetAvatar({ alt, symbol, src }: AssetAvatarProps) {
  return (
    <Avatar size="sm" className="avatar-fallback-default">
      {src ? <Avatar.Image alt={alt} src={src} /> : null}
      <Avatar.Fallback>
        {symbol === 'IRT' ? '🇮🇷' : symbol.slice(0, 2)}
      </Avatar.Fallback>
    </Avatar>
  )
}
