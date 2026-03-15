export const PREFIX_KEY = 'SANIPAY'
export const POSTFIX = process.env.NODE_ENV === 'production' ? '' : '_DEV'

export const getKey = (key: string) => {
  return `${PREFIX_KEY}_${key}${POSTFIX}`
}
