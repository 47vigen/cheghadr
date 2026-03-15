import type { InternalAxiosRequestConfig } from 'axios'

export function requestLanguage(request: InternalAxiosRequestConfig) {
  request.headers['Accept-Language'] = 'fa-IR, fa;q=0.9,en;q=0.8,*;q=0.1'
  request.headers['x-lang'] = 'fa'

  return request
}
