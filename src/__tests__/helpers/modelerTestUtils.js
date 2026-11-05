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
  if (typeof globalThis.DragEvent === 'undefined') {
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

/**
 * Factory for a mock bpmn-js / dmn-js Modeler instance.
 */
export function createMockDiagramModeler() {
  const canvas = {
    zoom: vi.fn(),
    getRootElement: vi.fn(() => ({ businessObject: { id: 'Process_1', name: 'Process' } })),
  }
  const minimap = { toggle: vi.fn() }
  const commandStack = { undo: vi.fn(), redo: vi.fn() }
  const elementRegistry = {
    _elements: {
      a: { element: { type: 'bpmn:Process', id: 'Process_1' } },
    },
  }

  const instance = {
    importXML: vi.fn().mockResolvedValue(undefined),
    saveXML: vi.fn().mockResolvedValue({ xml: '<xml/>' }),
    getViews: vi.fn(() => [{ id: 'dmn1', name: 'Decision' }]),
    on: vi.fn(),
    destroy: vi.fn(),
    get: vi.fn((name) => {
      const map = {
        canvas,
        minimap,
        commandStack,
        elementRegistry,
        propertiesPanel: { attachTo: vi.fn(), detach: vi.fn() },
      }
      return map[name]
    }),
    getActiveViewer: vi.fn(() => ({
      get: vi.fn((name) => (name === 'canvas' ? canvas : name === 'minimap' ? minimap : null)),
    })),
  }
  return { instance, canvas, minimap, commandStack }
}

export function mockBpmnModelerClass() {
  const { instance } = createMockDiagramModeler()
  const Modeler = vi.fn(function () {
    return instance
  })
  return { Modeler, instance }
}

export function mockDmnModelerClass() {
  const { instance } = createMockDiagramModeler()
  const Modeler = vi.fn(function () {
    return instance
  })
  return { Modeler, instance }
}

/**
 * Register vi.mock calls for MonacoThemeScoped dependencies.
 * Call from test file with vi.hoisted + vi.mock before component import.
 */
export function getMonacoThemeMockFactories() {
  const mockTheme = {
    getColor: vi.fn(() => ({ toString: () => '#ffffff' })),
  }
  const knownThemes = new Map([['vs', mockTheme], ['vs-dark', mockTheme], ['consoleTheme', mockTheme]])

  return {
    IStandaloneThemeService: Symbol('IStandaloneThemeService'),
    StandaloneServices: {
      get: vi.fn(() => ({ _knownThemes: knownThemes })),
    },
    Registry: {
      as: vi.fn(() => ({
        getColors: vi.fn(() => [{ id: 'editor.background' }]),
      })),
    },
    asCssVariableName: (name) => `--${name}`,
    Extensions: { ColorContribution: 'colorContribution' },
  }
}
