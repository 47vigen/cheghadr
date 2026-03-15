import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

interface CallbackPair {
  resolve: (res: AxiosResponse) => unknown
  reject: (error: AxiosError | Error) => unknown
}

export interface QueueItem {
  config: InternalAxiosRequestConfig
  callbacks: CallbackPair[]
  key: string
}

export class AxiosQueue {
  private queue: QueueItem[] = []
  private processingPromise: Promise<void> | null = null

  constructor(
    private readonly client: AxiosInstance,
    private readonly callback: () => unknown | Promise<unknown>,
  ) {}

  private createRequestKey(config: InternalAxiosRequestConfig): string {
    return `${config.method}:${config.url}:${JSON.stringify(config.params)}:${JSON.stringify(config.data)}`
  }

  private async trigger() {
    if (this.processingPromise) {
      return this.processingPromise
    }

    if (this.queue.length === 0) {
      return
    }

    this.processingPromise = this.processQueue()

    try {
      await this.processingPromise
    } finally {
      this.processingPromise = null
    }
  }

  private async processQueue() {
    while (this.queue.length > 0) {
      const currentQueue = [...this.queue]
      this.queue = []

      try {
        await this.callback()

        await Promise.allSettled(
          currentQueue.map(({ config, callbacks }) =>
            this.client(config)
              .then((res) => {
                callbacks.forEach(({ resolve }) => {
                  try {
                    resolve(res)
                  } catch {}
                })
              })
              .catch((error) => {
                callbacks.forEach(({ reject }) => {
                  try {
                    reject(error)
                  } catch {}
                })
              }),
          ),
        )
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        currentQueue.forEach(({ callbacks }) =>
          callbacks.forEach(({ reject }) => {
            try {
              reject(err)
            } catch {}
          }),
        )
      }
    }
  }

  public add(config: InternalAxiosRequestConfig) {
    return new Promise<AxiosResponse>((resolve, reject) => {
      const key = this.createRequestKey(config)
      const existingItem = this.queue.find((item) => item.key === key)

      if (existingItem) {
        existingItem.callbacks.push({ resolve, reject })
      } else {
        this.queue.push({
          key,
          config,
          callbacks: [{ resolve, reject }],
        })
      }

      this.trigger()
    })
  }

  public clear() {
    this.processingPromise = null
    this.queue = []
  }
}
