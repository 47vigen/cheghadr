'use client'

import { Avatar } from '@heroui/react'

interface AssetAvatarProps {
  alt: string
  symbol: string
  src?: string | null
}

const IRT_FLAG_URL = 'https://flagcdn.com/w40/ir.png'

export function AssetAvatar({ alt, symbol, src }: AssetAvatarProps) {
  const resolvedSrc = src ?? (symbol === 'IRT' ? IRT_FLAG_URL : null)
  return (
    <Avatar size="sm" className="avatar-fallback-default">
      {resolvedSrc ? <Avatar.Image alt={alt} src={resolvedSrc} /> : null}
      <Avatar.Fallback>{symbol.slice(0, 2)}</Avatar.Fallback>
    </Avatar>
  )
}
