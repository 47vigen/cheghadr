import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'

import type { NextFetchRequestConfig } from './adapter'
import type { AxiosQueue } from './queue'

export interface CustomAxiosInstance extends AxiosInstance {
  queue?: AxiosQueue
}

export type Metadata = {
  disableConfig?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CustomAxiosRequestConfig<D = any>
  extends AxiosRequestConfig<D> {
  meta?: Metadata
  cache?: RequestCache
  next?: NextFetchRequestConfig
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CustomInternalAxiosRequestConfig<D = any>
  extends InternalAxiosRequestConfig<D> {
  meta?: Metadata
  cache?: RequestCache
  next?: NextFetchRequestConfig
  //
  _retry?: boolean
}

export interface CustomAxiosError<T = unknown, D = any>
  extends AxiosError<T, D> {
  config: CustomInternalAxiosRequestConfig
}
