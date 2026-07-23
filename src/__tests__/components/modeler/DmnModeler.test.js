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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const dmnInstance = vi.hoisted(() => {
  const canvas = { zoom: vi.fn() }
  const minimap = { toggle: vi.fn() }
  const propertiesPanel = { attachTo: vi.fn(), detach: vi.fn() }
  const eventBus = { on: vi.fn() }
  const viewer = {
    on: vi.fn(),
    get: vi.fn((name) => {
      if (name === 'propertiesPanel') return propertiesPanel
      if (name === 'eventBus') return eventBus
      if (name === 'canvas') return canvas
      if (name === 'minimap') return minimap
      return null
    }),
  }
  return {
    canvas,
    minimap,
    propertiesPanel,
    viewer,
    instance: {
      saveXML: vi.fn().mockResolvedValue({ xml: '<dmn/>' }),
      getActiveViewer: vi.fn(() => viewer),
      on: vi.fn(),
      destroy: vi.fn(),
      get: vi.fn(),
    },
  }
})

const modelerMocks = vi.hoisted(() => ({
  validate: vi.fn().mockResolvedValue(undefined),
  saveXmlAfterUpdate: vi.fn(),
  toggleConsole: vi.fn(),
  addLineWithErrorToConsole: vi.fn(),
  copyLine: vi.fn(),
  cleanConsole: vi.fn(),
  isConsolePanelShowing: vi.fn(() => false),
  isConsoleOpen: { value: false },
  processHistoryListComp: { value: [] },
  changeActiveVersion: vi.fn(),
  activeVersion: { value: -1 },
  toggleVersionNotSaved: vi.fn(),
  toggleEnableSave: vi.fn(),
  saveDecisionTable: vi.fn(),
}))

const panelMocks = vi.hoisted(() => ({
  updateParentHeight: vi.fn(),
  updateParentWidth: vi.fn(),
  parentWidth: { value: 700 },
  parentHeight: { value: 600 },
}))

vi.mock('dmn-js/lib/Modeler', () => ({
  default: vi.fn(function () {
    return dmnInstance.instance
  }),
}))

vi.mock('@bpmn-io/dmn-migrate', () => ({
  migrateDiagram: vi.fn((xml) => Promise.resolve(xml)),
}))

vi.mock('dmn-js-properties-panel', () => ({
  DmnPropertiesPanelModule: {},
  DmnPropertiesProviderModule: {},
  CamundaPropertiesProviderModule: {},
}))

vi.mock('diagram-js-minimap', () => ({ default: {} }))
vi.mock('camunda-dmn-moddle/resources/camunda.json', () => ({ default: {} }))

vi.mock('../../../composables/useModeler.js', () => ({
  default: () => modelerMocks,
}))

vi.mock('../../../composables/usePropertiesPanel.js', () => ({
  default: () => panelMocks,
}))

import DmnModeler from '../../../components/modeler/DmnModeler.vue'
import { defaultTabElement } from '../../helpers/modelerTestUtils.js'

const layoutStubs = {
  PropertiesPanel: {
    name: 'PropertiesPanel',
    template: '<div class="properties-panel-stub" ref="propertiesPanelEl" />',
    methods: { _changeWidth: vi.fn(() => 400) },
  },
  ConsolePanel: {
    name: 'ConsolePanel',
    template: '<div class="console-panel-stub" />',
    props: ['isModelerVisible', 'parentHeight', 'rightPos', 'processID'],
  },
  MonacoThemeScope: { template: '<div><slot /></div>' },
  MonacoConsole: { template: '<div class="monaco-console-stub" />' },
  MenuActionButtons: { template: '<div><slot name="leftButtons" /><slot name="rightButtons" /></div>' },
}

function mountDmnModeler(props = {}) {
  return mount(DmnModeler, {
    props: {
      xml: '',
      tabElementIndex: 0,
      tabElement: defaultTabElement,
      isModelerVisible: false,
      isActiveTab: true,
      consoleErrors: '',
      ...props,
    },
    global: {
      stubs: layoutStubs,
      mocks: { $t: (k) => k },
    },
  })
}

describe('DmnModeler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    modelerMocks.isConsoleOpen.value = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('mounts and renders canvas', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      expect(wrapper.find('.canvas').exists()).toBe(true)
    })

    it('renders zoom control buttons', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      expect(wrapper.findAll('button').length).toBeGreaterThanOrEqual(4)
    })

    it('renders console panel stub', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      expect(wrapper.find('.console-panel-stub').exists()).toBe(true)
    })
  })

  describe('zoom controls', () => {
    it('zoomIn calls canvas zoom', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      dmnInstance.canvas.zoom.mockClear()
      await wrapper.findAll('button')[0].trigger('click')
      expect(dmnInstance.canvas.zoom).toHaveBeenCalled()
    })

    it('toggleMinimap toggles minimap', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      const minimapBtn = wrapper.findAll('button').find(b => b.attributes('aria-pressed') !== undefined)
      if (minimapBtn) {
        await minimapBtn.trigger('click')
        expect(dmnInstance.minimap.toggle).toHaveBeenCalled()
      }
    })

    it('zoomOut decreases canvas zoom', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      dmnInstance.canvas.zoom.mockImplementation((val) => (val === undefined ? 1 : val))
      dmnInstance.canvas.zoom.mockClear()
      await wrapper.findAll('button')[1].trigger('click')
      expect(dmnInstance.canvas.zoom).toHaveBeenCalledWith(0.8)
    })

    it('resetViewport fits canvas to viewport', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      dmnInstance.canvas.zoom.mockClear()
      await wrapper.findAll('button')[2].trigger('click')
      expect(dmnInstance.canvas.zoom).toHaveBeenCalledWith('fit-viewport')
    })
  })

  describe('lifecycle', () => {
    it('emits resizeTabNav on mount', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      expect(wrapper.emitted('resizeTabNav')).toBeTruthy()
    })

    it('creates DmnJS modeler on mount', async () => {
      const DmnJS = (await import('dmn-js/lib/Modeler')).default
      mountDmnModeler()
      await flushPromises()
      expect(DmnJS).toHaveBeenCalled()
    })
  })

  describe('exposed methods', () => {
    it('exposes togglePropertiesPanel', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      expect(wrapper.vm.togglePropertiesPanel).toBeDefined()
    })

    it('calls validate through exposed _validate', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      await wrapper.vm._validate('<definitions/>')
      expect(modelerMocks.validate).toHaveBeenCalled()
    })

    it('calls saveDecisionTable through exposed _saveDiagram', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      await wrapper.vm._saveDiagram()
      expect(modelerMocks.saveDecisionTable).toHaveBeenCalled()
    })

    it('forwards saveXmlAfterUpdate to useModeler', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      wrapper.vm._saveXmlAfterUpdate(false, '<definitions/>', 0)
      expect(modelerMocks.saveXmlAfterUpdate).toHaveBeenCalled()
    })

    it('delegates console toggle to useModeler', async () => {
      const wrapper = mountDmnModeler()
      await flushPromises()
      wrapper.vm.toggleConsole(true)
      expect(modelerMocks.toggleConsole).toHaveBeenCalledWith(true)
    })
  })
})
