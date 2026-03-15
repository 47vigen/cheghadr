import axios from 'axios'
import qs from 'qs'

import { env } from '@/env'

import {
  // buildOnRejectedResponseAuth,
  // onFulfilledResponseToken,
  onRejectedResponseError,
  onRejectedResponseToast,
  requestLanguage,
  // requestToken,
} from './interceptors'
// import { AxiosQueue } from './queue'
import type { CustomAxiosInstance } from './types'

const client: CustomAxiosInstance = axios.create({
  timeout: 30 * 1_000, // 30 s
  baseURL: env.NEXT_PUBLIC_API_URL,
  paramsSerializer: {
    serialize: (params) =>
      qs.stringify(params, { arrayFormat: 'indices', encode: false }),
  },
})

// const queue = new AxiosQueue(client, async () => {
//   const { refreshToken } = await getTokens()

//   if (!refreshToken) {
//     return Promise.reject(new Error('No refresh token found'))
//   }

//   return authControllerRefreshTokenV1({ refreshToken })
// })

// Object.assign(client, { queue })

// initial interceptors request
// client.interceptors.request.use(requestToken)
client.interceptors.request.use(requestLanguage)

// initial interceptors response
// client.interceptors.response.use(onFulfilledResponseToken)
client.interceptors.response.use(undefined, onRejectedResponseError)
// const onRejectedResponseAuth = buildOnRejectedResponseAuth(client)
// client.interceptors.response.use(undefined, onRejectedResponseAuth)
client.interceptors.response.use(undefined, onRejectedResponseToast)

export { client }
