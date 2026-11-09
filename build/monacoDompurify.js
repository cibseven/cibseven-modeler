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
import path from 'node:path'
import process from 'node:process'

export const MONACO_DOMPURIFY_IMPORT = './dompurify/dompurify.js'
export const MONACO_DOMPURIFY_IMPORTER = 'monaco-editor/esm/vs/base/browser/domSanitize.js'

// monaco-editor ships its own DOMPurify copy, which scanners don't see and which lags behind
// the fixed releases; resolve it to the dompurify package instead.
export default function monacoDompurify() {
  let root = process.cwd()
  return {
    name: 'monaco-dompurify',
    enforce: 'pre',
    configResolved(config) {
      root = config.root
    },
    resolveId(source, importer, options) {
      if (source !== MONACO_DOMPURIFY_IMPORT) return null
      if (!importer?.replaceAll('\\', '/').endsWith(`/node_modules/${MONACO_DOMPURIFY_IMPORTER}`)) return null
      return this.resolve('dompurify', path.join(root, 'package.json'), { ...options, skipSelf: true })
    },
  }
}
