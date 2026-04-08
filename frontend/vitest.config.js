/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [
        ...configDefaults.exclude,
      ],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'lcov', 'cobertura'],
        reportsDirectory: './target/coverage',
        exclude: [
          'dist/**',
          'target/**',
          'node_modules/**',

          'src/__tests__/**',

          // Test and config files
          'vite.config.js',
          'vitest.config.js',
          '**/*.config.js',

          // Exclude Vite internals
          '**/\0**', // Exclude Vite virtual modules
        ],
        excludeNodeModules: true,
      },
    },
  }),
)
