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
import { shallowRef } from 'vue'

/** @type {Record<string, import('vue').ShallowRef<object|null>>} */
const pluginSlots = {}

function ensureSlot(slotName) {
  if (!pluginSlots[slotName]) {
    pluginSlots[slotName] = shallowRef(null)
  }
}

/**
 * Registers a Vue component into a named plugin slot.
 *
 * @param {string} slotName - The name of the plugin slot (e.g. 'form-tools')
 * @param {object} component - A Vue component definition
 */
export function registerPlugin(slotName, component) {
  ensureSlot(slotName)
  pluginSlots[slotName].value = component
}

/**
 * Returns the reactive ref holding the component registered in a named plugin slot.
 *
 * @param {string} slotName - The name of the plugin slot (e.g. 'form-tools')
 * @returns {import('vue').ShallowRef<object|null>}
 */
export function getPlugin(slotName) {
  ensureSlot(slotName)
  return pluginSlots[slotName]
}
