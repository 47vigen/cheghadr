import type { AxiosError } from 'axios'

export function onRejectedResponseError(axiosError: AxiosError) {
  return Promise.reject(axiosError)
}
