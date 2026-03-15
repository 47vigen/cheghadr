import { isServer } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { isObject } from 'lodash-es'
import { toast } from 'sonner'

import {
  IGNORE_ERROR_PATHS,
  IGNORE_ERROR_STATUS,
} from '@/modules/API/Http/constants'

import { httpStatus } from './status'

export function onRejectedResponseToast(error: AxiosError<any>) {
  const isIgnoreStatus = IGNORE_ERROR_STATUS.some((status) => {
    return status === error.response?.status
  })

  if (isIgnoreStatus) {
    return Promise.reject(error)
  }

  const isIgnorePaths = IGNORE_ERROR_PATHS.some(([status, path]) => {
    if (!error.config?.url) return
    if (!error.config.url.startsWith(path)) return
    if (error.response?.status !== status) return
    return true
  })

  if (isIgnorePaths) {
    return Promise.reject(error)
  }

  if (isServer) {
    return Promise.reject(error)
  }

  const status = error.response?.status
  if (!status) {
    return Promise.reject(error)
  }

  let message = error.response?.data?.message
  const errorData = error.response?.data?.error as
    | { message: string; messageFa?: string }
    | undefined

  if (isObject(errorData) && errorData.message) {
    message = errorData.message
  }

  if (isObject(errorData) && errorData.messageFa) {
    message = errorData.messageFa
  }

  if (message) {
    toast.error(message)
  } else {
    toast.error(httpStatus[status])
  }

  return Promise.reject(error)
}
