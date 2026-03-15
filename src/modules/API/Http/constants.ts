export const IGNORE_ERROR_STATUS = [401, 403, 404] as const

export const IGNORE_ERROR_PATHS = [
  [401, '/api/v1/user/me'],
] as const satisfies [number, string][]
