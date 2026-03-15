import type { AxiosError, AxiosResponse } from 'axios'
import axios from 'axios'
import { clean } from 'deep-cleaner'

import type { CustomAxiosRequestConfig } from '@/modules/API/Http/types'

import { client } from './client'

export type RequestConfig<TData = unknown> = CustomAxiosRequestConfig<TData>
export type ResponseConfig<TData = unknown> = AxiosResponse<TData>
export type ResponseErrorConfig<TError = unknown> = AxiosError<TError>

export default function mutator<TData, TError = unknown, TVariables = unknown>(
  config: CustomAxiosRequestConfig,
): Promise<ResponseConfig<TData>> {
  const source = axios.CancelToken.source()

  const combinedConfig: CustomAxiosRequestConfig<any> = {
    ...config,
    cancelToken: source.token,
  }
  const promise: any = client<TVariables, ResponseConfig<TData>>(combinedConfig)
    .then((response) => {
      return { data: clean(response.data) }
    })
    .catch((e: AxiosError<TError>) => {
      throw e
    })

  promise.cancel = () => {
    source.cancel('Query was cancelled')
  }

  return promise
}

export type ErrorType<Error> = AxiosError<Error>
