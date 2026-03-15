import { defineConfig } from '@kubb/core'
import { pluginClient } from '@kubb/plugin-client'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginReactQuery } from '@kubb/plugin-react-query'
import { pluginTs } from '@kubb/plugin-ts'

const banner = [
  `/* eslint-disable @typescript-eslint/no-unused-vars */`,
  `/* eslint-disable @typescript-eslint/ban-ts-comment */`,
  `// @ts-nocheck`,
].join('\n')

export default defineConfig({
  root: '.',
  input: {
    path: 'src/modules/API/Swagger/ecotrust/swagger.yaml',
  },
  output: {
    path: 'src/modules/API/Swagger/ecotrust/gen',
  },
  plugins: [
    pluginOas(),
    pluginTs({
      output: { banner, path: 'models' },
    }),
    pluginClient({
      output: { banner, path: 'clients' },
      importPath: '@/modules/API/Http/mutator.ts',
    }),
    pluginReactQuery({
      output: { banner, path: 'hooks' },
    }),
  ],
})
