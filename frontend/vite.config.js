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
 

import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
const backendUrl = 'http://localhost:8091'

// https://flaviocopes.com/fix-dirname-not-defined-es-module-scope/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    vue(),
  ],
  assetsInclude: ['**/*.bpmn', '**/*.dmn'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      vue: 'vue/dist/vue.esm-bundler.js',
      // Resolve bpmnlint-loader to an empty module, assuming it's not required at runtime
      'bpmnlint-loader': 'empty:',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Suppress deprecation warnings from Bootstrap
        quietDeps: true,
        silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin']
      },
      less: {
        math: 'always',
        relativeUrls: true,
        javascriptEnabled: true,
      },
    }
  },
  optimizeDeps: {
    exclude: ['js-big-decimal'],
  },
  server: {
    proxy: {
      '/cibseven-modeler/modeler-service': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err)
          })
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, backendUrl + req.url)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, backendUrl + req.url)
          })
        }
      },
      '/cibseven-modeler/element-templates': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err)
          })
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, backendUrl + req.url)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, backendUrl + req.url)
          })
        }
      },
      '/cibseven-modeler/auth': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err)
          })
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, backendUrl + req.url)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, backendUrl + req.url)
          })
        }
      },
      '/cibseven-modeler/info': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err)
          })
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, backendUrl + req.url)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, backendUrl + req.url)
          })
        }
      },
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/library.js'),
      name: 'cibseven-modeler',
      formats: ['es', 'umd'],
      fileName: (format) => `cibseven-modeler.${format}.js`,
    },
    rollupOptions: {
      external: ['vue', /^\/assets\/images\//, '@cib/common-frontend', '@cib/bootstrap-components', 'bootstrap', 'vue-i18n', 'vue-router', 'axios', 'vuex', 'bpmn-js', 'dmn-js', '@bpmn-io/form-js'],
      output: {
        globals: {
          vue: 'Vue',
          '@cib/common-frontend': 'CibCommonFrontend',
          bootstrap: 'bootstrap',
          'vue-i18n': 'VueI18n',
          'vue-router': 'VueRouter',
          axios: 'axios',
          vuex: 'Vuex',
          'bpmn-js': 'BpmnJS',
          'dmn-js': 'DmnJS',
          '@bpmn-io/form-js': 'FormJS',
        },
        // Ensure CSS is extracted and placed in the dist folder
        assetFileNames: 'cibseven-modeler.[ext]',
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: true, // Ensure CSS is extracted into a separate file
    outDir: 'dist', // The output directory
  },
  // Add the module section with rules for bpmnlint
  module: {
    rules: [
      {
        test: /\.bpmnlintrc$/,
        use: [
          {
            loader: 'bpmnlint-loader',
          }
        ]
      }
    ]
  }
})
