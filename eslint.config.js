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
import { cibEslintConfig } from '@cib/frontend-preset/eslint'

export default [
  // The modeler does not use the CIB formatting rules (see max-len below).
  // Vitest rules only for files directly in a __tests__ folder, as before.
  ...cibEslintConfig({ formatting: false, testFiles: ['src/**/__tests__/*'], ignores: ['linterConfig.js'] }),

  {
    rules: {
      'vue/require-name-property': 'error',
      'vue/require-explicit-emits': 'error',
      'no-duplicate-imports': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },

  // bpmnlint-plugin-local rules are CommonJS files — declare node globals
  {
    files: ['bpmnlint-plugin-local/**/*.js'],
    languageOptions: {
      globals: {
        module: 'writable',
        require: 'readonly',
        exports: 'writable',
      },
    },
  },

  {
    rules: {
      'max-len': ['error', { code: 350 }],
    },
  },
]
