import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
//
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import buildURL from 'axios/unsafe/helpers/buildURL.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import combineURLs from 'axios/unsafe/helpers/combineURLs'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import isAbsoluteURL from 'axios/unsafe/helpers/isAbsoluteURL'

export type NextFetchRequestConfig = RequestInit['next']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FetchAxiosRequestConfig<D = any>
  extends AxiosRequestConfig<D> {
  cache?: RequestCache
  next?: NextFetchRequestConfig
}

function buildFullPath(requestedURL: string, baseURL?: string): string {
  if (requestedURL && baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL)
  }
  if (!requestedURL && baseURL) {
    return baseURL
  }
  return requestedURL
}

async function getResponse(
  request: Request | string | URL,
  config: FetchAxiosRequestConfig,
): Promise<(AxiosResponse & { ok: boolean }) | AxiosError> {
  let stageOne
  try {
    stageOne = await fetch(request, { cache: config.cache, next: config.next })
  } catch {
    return createError('Network Error', config, 'ERR_NETWORK', request)
  }

  const stageOneHeaders: Record<string, string | string[]> = {}
  stageOne.headers.forEach((value, key) => {
    // The `Set-Cookie` header is treated as an array of strings (even if there's only 1)
    if (key === 'set-cookie') {
      const cookies = stageOneHeaders[key] as string[] | undefined

      if (cookies) {
        cookies.push(value)
      } else {
        stageOneHeaders[key] = [value]
      }
    } else {
      stageOneHeaders[key] = value
    }
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headers: any = Object.assign({}, stageOneHeaders as unknown)
  const response: AxiosResponse = {
    status: stageOne.status,
    statusText: stageOne.statusText,
    headers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: config as any,
    request,
    data: undefined,
  }

  if (stageOne.status >= 200 && stageOne.status !== 204) {
    switch (config.responseType) {
      case 'arraybuffer':
        response.data = await stageOne.arrayBuffer()
        break
      case 'blob':
        response.data = await stageOne.blob()
        break
      case 'json':
        response.data = await stageOne.json()
        break
      default:
        response.data = await stageOne.text()
        break
    }
  }

  return { ...response, ok: stageOne.ok }
}

function createRequest(config: FetchAxiosRequestConfig): Request {
  const headers = new Headers(config.headers as HeadersInit)

  // HTTP basic authentication
  if (config.auth) {
    const username = config.auth.username || ''
    const password = config.auth.password
      ? decodeURI(encodeURIComponent(config.auth.password))
      : ''
    headers.set(
      'Authorization',
      `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    )
  }

  if (config.method === undefined) {
    config.method = 'get'
  }
  const method = config.method.toUpperCase()
  const options: RequestInit = {
    headers,
    method,
    next: config.next,
    cache: config.cache,
  }
  if (method !== 'GET' && method !== 'HEAD') {
    options.body = config.data
  }
  // This config is similar to XHR’s withCredentials flag, but with three available values instead of two.
  // So if withCredentials is not set, default value 'same-origin' will be used
  if (config.withCredentials !== undefined) {
    options.credentials = config.withCredentials ? 'include' : 'omit'
  }

  const fullPath = buildFullPath(config.url ? config.url : '', config.baseURL)
  const serializer = config.paramsSerializer
    ? config.paramsSerializer
    : undefined
  const url = buildURL(fullPath, config.params, serializer)

  return new Request(url, options)
}

function createError(
  message: string,
  config: FetchAxiosRequestConfig,
  code: string,
  request: Request | string | URL,
  response?: AxiosResponse,
): AxiosError {
  const error = new Error(message) as AxiosError
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error.config = config as any
  error.code = code
  error.request = request
  error.response = response
  error.isAxiosError = true

  error.toJSON = function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code,
      status: this.response?.status ? this.response.status : null,
    }
  }
  return error
}

function getErrorCodeFromStatus(status: number): string {
  // 400 errors are bad requests, 500 errors are bad responses, and
  // everything else is probably a bad validation function
  return (
    ['ERR_BAD_REQUEST', 'ERR_BAD_RESPONSE'][Math.floor(status / 100) - 4] ||
    'ERR_BAD_OPTION'
  )
}

export async function fetchAdapter(
  config: FetchAxiosRequestConfig,
): Promise<AxiosResponse> {
  const request = createRequest(config)
  const promiseChain = [getResponse(request, config)]
  let timer: NodeJS.Timeout | null = null

  if (config.timeout && config.timeout > 0) {
    promiseChain.push(
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const message = config.timeoutErrorMessage
            ? config.timeoutErrorMessage
            : `timeout of ${config.timeout}ms exceeded`
          reject(createError(message, config, 'ETIMEDOUT', request))
        }, config.timeout)
      }),
    )
  }

  const response = await Promise.race(promiseChain)
  // Cancel the timeout timer if it's set
  if (timer !== null) {
    clearTimeout(timer)
  }
  return new Promise((resolve, reject) => {
    if (response instanceof Error) {
      reject(response)
    } else {
      const validateStatus = config.validateStatus
      if (
        !response.status ||
        !validateStatus ||
        validateStatus(response.status)
      ) {
        resolve(response)
      } else {
        reject(
          createError(
            `Request failed with status code ${response.status}`,
            config,
            getErrorCodeFromStatus(response.status),
            request,
            response,
          ),
        )
      }
    }
  })
}
