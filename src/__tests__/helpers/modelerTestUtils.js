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
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

export const defaultTabElement = {
  id: 'tab-1',
  key: 'tab_key',
  name: 'Test Tab',
  type: 'bpmn-c7',
  sessionId: null,
  isPropertyPanelVisible: true,
  isModelerVisible: false,
  isSaved: false,
}

/**
 * Polyfill DragEvent for jsdom.
 */
export function createDragEvent(type, init = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  event.dataTransfer = init.dataTransfer ?? { types: [], files: [] }
  if (init.target) {
    Object.defineProperty(event, 'target', { value: init.target, writable: false })
  }
  if (init.preventDefault) {
    event.preventDefault = init.preventDefault
  }
  return event
}

export function installDragEventPolyfill() {
  if (globalThis.DragEvent === undefined) {
    globalThis.DragEvent = class DragEvent extends Event {
      constructor(type, init = {}) {
        super(type, init)
        this.dataTransfer = init.dataTransfer ?? null
      }
    }
  }
}

export function mountWithI18n(component, options = {}) {
  const { props, slots, global = {}, ...rest } = options
  return mount(component, {
    props,
    slots,
    ...rest,
    global: {
      mocks: { $t: (key) => key, ...global.mocks },
      stubs: global.stubs,
      provide: global.provide,
      plugins: global.plugins,
    },
  })
}

/** Returns a mock fn that resolves after `ms` (for loading-state tests). */
export function delayedResolveMock(value, ms = 50) {
  return vi.fn(() => new Promise(resolve => {
    setTimeout(() => resolve(value), ms)
  }))
}
