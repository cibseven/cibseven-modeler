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

const { sharedSave } = vi.hoisted(() => ({ sharedSave: vi.fn().mockResolvedValue(true) }))

vi.mock('../../composables/useDiagramSave.js', () => ({
  default: () => ({
    save: sharedSave,
  }),
}))

import { BpmnModdle } from 'bpmn-moddle'
import useModeler from '../../composables/useModeler.js'

const DI = 'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"'
const shape = (id) => `<bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}"><dc:Bounds x="0" y="0" width="100" height="80"/></bpmndi:BPMNShape>`
const plane = (id, ...shapes) => `<bpmndi:BPMNDiagram id="d_${id}"><bpmndi:BPMNPlane id="p_${id}" bpmnElement="${id}">${shapes.join('')}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>`

// A process with a collapsed sub-process that holds another collapsed one, each with its own plane
const nestedXml = (subPlanesFirst = false) => {
  const planes = [
    plane('mainProcess', shape('outerSub')),
    plane('outerSub', shape('innerSub')),
    plane('innerSub', shape('task')),
  ]
  if (subPlanesFirst) planes.reverse()
  return `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ${DI} id="defs" targetNamespace="http://cib.de/test">
    <bpmn:process id="mainProcess" name="Main process">
      <bpmn:subProcess id="outerSub" name="Outer sub-process">
        <bpmn:subProcess id="innerSub" name="Inner sub-process"><bpmn:task id="task"/></bpmn:subProcess>
      </bpmn:subProcess>
    </bpmn:process>
    ${planes.join('')}
  </bpmn:definitions>`
}

const collaborationXml = `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ${DI} id="defs" targetNamespace="http://cib.de/test">
  <bpmn:collaboration id="collaboration" name="Collaboration"><bpmn:participant id="pool" processRef="poolProcess"/></bpmn:collaboration>
  <bpmn:process id="poolProcess" name="Pool process"><bpmn:subProcess id="poolSub" name="Pool sub-process"><bpmn:task id="task"/></bpmn:subProcess></bpmn:process>
  ${plane('collaboration', shape('pool'), shape('poolSub'))}${plane('poolSub', shape('task'))}
</bpmn:definitions>`

// A modeler showing the plane of `shownId`, as bpmn-js does after a drill-down
async function modelerShowing(xml, shownId) {
  const { rootElement: definitions, elementsById } = await new BpmnModdle().fromXML(xml)
  const canvas = { getRootElement: () => ({ businessObject: elementsById[shownId] }) }
  return {
    getDefinitions: () => definitions,
    saveXML: vi.fn().mockResolvedValue({ xml }),
    get: vi.fn(name => (name === 'canvas' ? canvas : null)),
  }
}

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

  describe('getProcessInformation with a drilled-down sub-process (CIB7-2946)', () => {
    it('returns the process while a sub-process plane is shown', async () => {
      const { getProcessInformation } = withSetup()
      const info = getProcessInformation(await modelerShowing(nestedXml(), 'outerSub'))
      expect(info.id).toBe('mainProcess')
      expect(info.name).toBe('Main process')
    })

    it('returns the process from a nested sub-process plane', async () => {
      const { getProcessInformation } = withSetup()
      expect(getProcessInformation(await modelerShowing(nestedXml(), 'innerSub')).id).toBe('mainProcess')
    })

    it('finds the process plane when the sub-process planes come first in the XML', async () => {
      const { getProcessInformation } = withSetup()
      expect(getProcessInformation(await modelerShowing(nestedXml(true), 'innerSub')).id).toBe('mainProcess')
    })

    it('keeps the collaboration of a diagram with pools, also from a sub-process in a pool', async () => {
      const { getProcessInformation } = withSetup()
      expect(getProcessInformation(await modelerShowing(collaborationXml, 'collaboration')).id).toBe('collaboration')
      expect(getProcessInformation(await modelerShowing(collaborationXml, 'poolSub')).id).toBe('collaboration')
    })

    it('falls back to the canvas when the definitions cannot be read', () => {
      const { getProcessInformation } = withSetup()
      const modeler = { ...createMockModeler(), getDefinitions: () => { throw new Error('no definitions') } }
      expect(getProcessInformation(modeler).id).toBe('Process_1')
    })

    it('falls back to the canvas when no plane shows a process or a collaboration', async () => {
      const { getProcessInformation } = withSetup()
      const modeler = { ...createMockModeler(), getDefinitions: () => ({ diagrams: [{ plane: {} }] }) }
      expect(getProcessInformation(modeler).id).toBe('Process_1')
    })

    it.each([false, true])('saves the name and key of the process, not of the sub-process (autosave %s)', async (isAutosave) => {
      const { saveProcess } = withSetup()
      await saveProcess(await modelerShowing(nestedXml(), 'outerSub'), 'bpmn-c7', null, null, isAutosave)
      expect(sharedSave).toHaveBeenCalledWith(expect.objectContaining({
        newName: 'Main process', newKey: 'mainProcess', storedKey: 'process_key', isAutosave,
      }))
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
