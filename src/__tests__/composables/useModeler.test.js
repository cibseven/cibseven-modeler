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
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

vi.mock('../../services/processService.js', () => ({
  saveDiagramProcess: vi.fn().mockResolvedValue({ id: 'new-id', name: 'Process', processkey: 'Process_1' }),
  updateDiagramProcess: vi.fn().mockResolvedValue({ id: 'upd-id', name: 'Process', processkey: 'Process_1' }),
}))

vi.mock('vuex', () => ({
  useStore: () => ({
    state: { modeler: { processes: { processes: [] } } },
  }),
}))

vi.mock('../../composables/useDiagramSave.js', () => ({
  default: () => ({
    save: vi.fn().mockResolvedValue(true),
  }),
}))

import useModeler from '../../composables/useModeler.js'

function withSetup(provide = {}) {
  let composableResult
  const emitted = []
  const emit = (event, ...args) => emitted.push({ event, args })
  const props = {
    tabElement: { id: 'proc1', key: 'process_key', sessionId: null, type: 'bpmn-c7' },
    tabElementIndex: 0,
    isActiveTab: true,
  }
  const monacoEditorConsole = ref({
    addLineWithError: vi.fn(),
    copyLine: vi.fn(),
    cleanConsole: vi.fn(),
  })
  const consolePanel = ref({
    toggleConsole: vi.fn(() => true),
    isOpen: vi.fn(() => false),
  })

  mount(defineComponent({
    name: 'UseModelerTest',
    setup() {
      composableResult = useModeler(props, emit, monacoEditorConsole, consolePanel)
      return () => null
    },
  }), { global: { provide } })

  return { ...composableResult, emitted, props, monacoEditorConsole, consolePanel }
}

function createMockModeler() {
  const canvas = {
    getRootElement: () => ({ businessObject: { id: 'Process_1', name: 'My Process' } }),
  }
  return {
    importXML: vi.fn().mockResolvedValue(undefined),
    saveXML: vi.fn().mockResolvedValue({ xml: '<bpmn:definitions/>' }),
    getViews: vi.fn(() => [{ id: 'Decision_1', name: 'Decision' }]),
    get: vi.fn((name) => {
      if (name === 'canvas') return canvas
      if (name === 'elementRegistry') return { _elements: { a: { element: { type: 'bpmn:Process', id: 'Process_1' } } } }
      return null
    }),
    getActiveViewer: vi.fn(() => ({ get: vi.fn(() => canvas) })),
  }
}

describe('useModeler', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('validate', () => {
    it('emits isValidated true on successful import', async () => {
      const { validate, emitted } = withSetup()
      const modeler = createMockModeler()
      await validate(modeler, '<bpmn:definitions/>')
      expect(emitted.some(e => e.event === 'isValidated' && e.args[0].validation === true)).toBe(true)
    })

    it('emits isValidated false on import error', async () => {
      const { validate, emitted } = withSetup()
      const modeler = createMockModeler()
      modeler.importXML.mockRejectedValue(new Error('Invalid XML'))
      await validate(modeler, '<bad/>')
      expect(emitted.some(e => e.event === 'isValidated' && e.args[0].validation === false)).toBe(true)
    })
  })

  describe('getProcessInformation', () => {
    it('returns process business object from canvas', () => {
      const { getProcessInformation } = withSetup()
      const info = getProcessInformation(createMockModeler())
      expect(info.id).toBe('Process_1')
      expect(info.name).toBe('My Process')
    })
  })

  describe('getElementRegistryFromModeler', () => {
    it('finds process element by type', () => {
      const { getElementRegistryFromModeler } = withSetup()
      const id = getElementRegistryFromModeler(createMockModeler(), 'bpmn:Process')
      expect(id).toBe('Process_1')
    })
  })

  describe('saveProcess', () => {
    it('calls modeler saveXML', async () => {
      const { saveProcess } = withSetup()
      const modeler = createMockModeler()
      await saveProcess(modeler, 'bpmn-c7', null, null)
      expect(modeler.saveXML).toHaveBeenCalled()
    })
  })

  describe('saveDecisionTable', () => {
    it('calls modeler saveXML for dmn', async () => {
      const { saveDecisionTable } = withSetup()
      const modeler = createMockModeler()
      await saveDecisionTable(modeler, 'dmn')
      expect(modeler.saveXML).toHaveBeenCalled()
    })
  })

  describe('console methods', () => {
    it('toggleConsole updates isConsoleOpen', () => {
      const { toggleConsole, isConsoleOpen } = withSetup()
      const result = toggleConsole(true)
      expect(result).toBe(true)
      expect(isConsoleOpen.value).toBe(true)
    })

    it('addLineWithErrorToConsole delegates to monaco console', () => {
      const { addLineWithErrorToConsole, monacoEditorConsole } = withSetup()
      addLineWithErrorToConsole('Error line')
      expect(monacoEditorConsole.value.addLineWithError).toHaveBeenCalledWith('Error line')
    })
  })
})
