const isBrowser = typeof window !== 'undefined'

export const localStorageAsync = {
  getItem(key: string): Promise<string | null> {
    if (!isBrowser) {
      return Promise.resolve(null)
    }
    return Promise.resolve(window.localStorage.getItem(key))
  },
  setItem(key: string, value: string): Promise<void> {
    if (!isBrowser) {
      return Promise.resolve()
    }
    window.localStorage.setItem(key, value)
    return Promise.resolve()
  },
  removeItem(key: string): Promise<void> {
    if (!isBrowser) {
      return Promise.resolve()
    }
    window.localStorage.removeItem(key)
    return Promise.resolve()
  },
}
