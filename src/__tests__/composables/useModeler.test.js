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

    it('copyLine and cleanConsole delegate to monaco console', () => {
      const { copyLine, cleanConsole, monacoEditorConsole } = withSetup()
      copyLine()
      cleanConsole()
      expect(monacoEditorConsole.value.copyLine).toHaveBeenCalled()
      expect(monacoEditorConsole.value.cleanConsole).toHaveBeenCalled()
    })

    it('isConsolePanelShowing delegates to console panel', () => {
      const { isConsolePanelShowing, consolePanel } = withSetup()
      isConsolePanelShowing()
      expect(consolePanel.value.isOpen).toHaveBeenCalled()
    })
  })

  describe('getProcessInformation fallback', () => {
    it('uses active viewer when canvas service is unavailable', () => {
      const { getProcessInformation } = withSetup()
      const canvas = {
        getRootElement: () => ({ businessObject: { id: 'Process_2', name: 'Fallback' } }),
      }
      const modeler = {
        get: vi.fn(() => { throw new Error('no canvas') }),
        getActiveViewer: vi.fn(() => ({ get: vi.fn(() => canvas) })),
      }

      const info = getProcessInformation(modeler)
      expect(info.id).toBe('Process_2')
    })
  })

  describe('saveXmlAfterUpdate', () => {
    it('emits download link for BPMN xml', async () => {
      const { saveXmlAfterUpdate, emitted } = withSetup()
      const modeler = createMockModeler()
      saveXmlAfterUpdate(true, '<bpmn:definitions/>', 0, modeler)
      expect(emitted.some(e => e.event === 'updateDownloadLink')).toBe(true)
    })

    it('emits download link for DMN xml', async () => {
      const { saveXmlAfterUpdate, emitted } = withSetup()
      const modeler = createMockModeler()
      saveXmlAfterUpdate(false, '<definitions/>', 0, modeler)
      expect(emitted.some(e => e.event === 'updateDownloadLink')).toBe(true)
    })
  })

  describe('history and selector', () => {
    it('loads process history via fetchSnapshotsHook', async () => {
      const fetchSnapshotsHook = vi.fn().mockResolvedValue([{ version: 3 }, { version: 2 }])
      const { getProcessHistoryList, activeVersion } = withSetup({ fetchSnapshotsHook })
      const history = await getProcessHistoryList()
      expect(history).toHaveLength(2)
      expect(activeVersion.value).toBe(3)
    })

    it('changeActiveVersion updates activeVersion ref', () => {
      const { changeActiveVersion, activeVersion } = withSetup()
      changeActiveVersion(5)
      expect(activeVersion.value).toBe(5)
    })

    it('listDataForSelector returns templates when type is templates', async () => {
      const { listDataForSelector, templatesList, typeOfSelector } = withSetup()
      templatesList.value = [{ id: 't1' }]
      typeOfSelector.value = 'templates'
      expect(listDataForSelector.value).toEqual([{ id: 't1' }])
    })
  })

  describe('session hooks', () => {
    it('blocks saveProcess when checkSessionHook returns forceSave false', async () => {
      const checkSessionHook = vi.fn().mockResolvedValue({ forceSave: false })
      const { saveProcess } = withSetup({ checkSessionHook })
      const modeler = createMockModeler()
      await saveProcess(modeler, 'bpmn-c7', null, null)
      expect(modeler.saveXML).not.toHaveBeenCalled()
    })

    it('blocks saveDecisionTable when no views are available', async () => {
      const { saveDecisionTable } = withSetup()
      const modeler = createMockModeler()
      modeler.getViews.mockReturnValue([])
      await saveDecisionTable(modeler, 'dmn')
      expect(modeler.saveXML).not.toHaveBeenCalled()
    })
  })

  describe('saveXmlAfterUpdate and toggles', () => {
    it('emits updateDownloadLink for DMN diagrams', async () => {
      const { saveXmlAfterUpdate, emitted } = withSetup()
      await saveXmlAfterUpdate(false, '<definitions/>', 0, createMockModeler())
      expect(emitted.some(e => e.event === 'updateDownloadLink')).toBe(true)
    })

    it('forwards toggleEnableSave and toggleVersionNotSaved to parent', () => {
      const { toggleEnableSave, toggleVersionNotSaved, emitted } = withSetup()
      toggleEnableSave(true, 0)
      toggleVersionNotSaved(true, 1)
      expect(emitted.some(e => e.event === 'toggleEnableSave' && e.args[0] === true)).toBe(true)
      expect(emitted.some(e => e.event === 'toggleVersionNotSaved' && e.args[0] === true)).toBe(true)
    })
  })
})
