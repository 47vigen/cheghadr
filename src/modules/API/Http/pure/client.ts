import axios from 'axios'
import qs from 'qs'

import { env } from '@/env'
import { fetchAdapter } from '@/modules/API/Http/adapter'
import { onRejectedResponseError } from '@/modules/API/Http/interceptors/error'
import { requestLanguage } from '@/modules/API/Http/interceptors/language'
import type { CustomAxiosInstance } from '@/modules/API/Http/types'

const client: CustomAxiosInstance = axios.create({
  adapter: fetchAdapter,
  baseURL: env.NEXT_PUBLIC_ECOTRUST_API_URL,
  validateStatus: (status) => status >= 200 && status < 500,
  paramsSerializer: {
    serialize: (params) =>
      qs.stringify(params, { arrayFormat: 'comma', encode: false }),
  },
})

// initial interceptors request
client.interceptors.request.use(requestLanguage)

// initial interceptors response
client.interceptors.response.use(undefined, onRejectedResponseError)

export { client }
