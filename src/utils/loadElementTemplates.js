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

/**
 * Loads all bundled element templates from `src/element-templates/*.json` at build time.
 *
 * To add a new bundled template, place a `.json` file in the `src/element-templates/` folder.
 * Templates loaded here are automatically merged with any dynamically managed templates from
 * the element-template store.
 *
 * @returns {Array<Object>} Array of parsed element-template JSON objects ready for bpmn-js.
 */
export function loadBundledElementTemplates() {
  const modules = import.meta.glob('../element-templates/*.json', { eager: true })

  return Object.values(modules)
    .map(module => module.default ?? module)
    .filter(Boolean)
}
