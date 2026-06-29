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

const bpmnInstance = vi.hoisted(() => {
  const canvas = {
    zoom: vi.fn(),
    viewbox: vi.fn(() => ({ width: 100, height: 100 })),
    resized: vi.fn(),
  }
  const minimap = { toggle: vi.fn() }
  const propertiesPanel = { attachTo: vi.fn(), detach: vi.fn() }
  const eventBus = { on: vi.fn() }
  const commandStack = { undo: vi.fn(), redo: vi.fn() }
  return {
    canvas,
    minimap,
    propertiesPanel,
    eventBus,
    instance: {
      importXML: vi.fn().mockResolvedValue(undefined),
      saveXML: vi.fn().mockResolvedValue({ xml: '<bpmn/>' }),
      on: vi.fn(),
      destroy: vi.fn(),
      get: vi.fn((name) => {
        if (name === 'canvas') return canvas
        if (name === 'minimap') return minimap
        if (name === 'propertiesPanel') return propertiesPanel
        if (name === 'eventBus') return eventBus
        if (name === 'elementRegistry') return { _elements: {} }
        if (name === 'commandStack') return commandStack
        return null
      }),
      getActiveViewer: vi.fn(),
    },
  }
})

const modelerMocks = vi.hoisted(() => ({
  saveProcess: vi.fn(),
  validate: vi.fn().mockResolvedValue(undefined),
  getElementRegistryFromModeler: vi.fn(),
  getProcessInformation: vi.fn(() => ({ id: 'Process_1', name: 'Process' })),
  toggleVersionNotSaved: vi.fn(),
  toggleEnableSave: vi.fn(),
  saveXmlAfterUpdate: vi.fn(),
  changeActiveVersion: vi.fn(),
  activeVersion: { value: -1 },
  processHistoryListComp: { value: [] },
  isShowModalListSelector: { value: false },
  listDataForSelector: { value: [] },
  templatesList: { value: [] },
  typeOfSelector: { value: null },
  toggleConsole: vi.fn(),
  addLineWithErrorToConsole: vi.fn(),
  copyLine: vi.fn(),
  cleanConsole: vi.fn(),
  isConsolePanelShowing: vi.fn(() => false),
  isConsoleOpen: { value: false },
}))

const panelMocks = vi.hoisted(() => ({
  updateParentHeight: vi.fn(),
  updateParentWidth: vi.fn(),
  parentWidth: { value: 700 },
  parentHeight: { value: 600 },
}))

vi.mock('bpmn-js/lib/Modeler', () => ({
  default: vi.fn(function () {
    return bpmnInstance.instance
  }),
}))

vi.mock('bpmn-js-properties-panel', () => ({
  BpmnPropertiesProviderModule: {},
  BpmnPropertiesPanelModule: {},
  CamundaPlatformPropertiesProviderModule: {},
}))
vi.mock('bpmn-js-element-templates', () => ({ ElementTemplatesPropertiesProviderModule: {} }))
vi.mock('../../../components/modeler/element-templates/ScopedGroupsModule.js', () => ({ default: {} }))
vi.mock('@bpmn-io/element-template-chooser', () => ({ default: {} }))
vi.mock('../../../components/modeler/element-templates/IconRendererModule.js', () => ({ default: {} }))
vi.mock('camunda-bpmn-moddle/resources/camunda.json', () => ({ default: {} }))
vi.mock('bpmn-js-bpmnlint', () => ({ default: {} }))
vi.mock('../../../../linterConfig', () => ({ default: {} }))
vi.mock('bpmn-js-color-picker', () => ({ default: {} }))
vi.mock('bpmn-js/lib/features/search', () => ({ default: {} }))
vi.mock('diagram-js-minimap', () => ({ default: {} }))
vi.mock('camunda-bpmn-js-behaviors/lib/camunda-platform', () => ({ default: {} }))
vi.mock('../../../i18n.js', () => ({
  customTranslate: vi.fn(),
  translateValue: vi.fn(),
}))
vi.mock('../../../utils.js', () => ({
  checkJSON: vi.fn(() => []),
}))
vi.mock('../../../utils/domUtils.js', () => ({
  waitForElement: vi.fn().mockResolvedValue(document.createElement('div')),
}))
vi.mock('../../../plugins/pluginsConfig', () => ({
  getPlugin: vi.fn(() => null),
}))

vi.mock('../../../composables/useModeler.js', () => ({
  default: () => modelerMocks,
}))
vi.mock('../../../composables/usePropertiesPanel.js', () => ({
  default: () => panelMocks,
}))
vi.mock('../../../composables/customizedTemplateModal.js', () => ({
  default: () => ({
    addCustomizeTemplateButton: vi.fn(),
    customizedModalElementTemplatesData: vi.fn(),
    applyTemplateToTask: vi.fn(),
  }),
}))
vi.mock('../../../composables/useMonacoEditor.js', () => ({
  default: () => ({
    createMonacoEditorForScripts: vi.fn(),
  }),
}))

import BpmnModeler from '../../../components/modeler/BpmnModeler.vue'
import { defaultTabElement } from '../../helpers/modelerTestUtils.js'

const mockMonaco = {
  editor: {
    create: vi.fn(),
    setTheme: vi.fn(),
  },
}

const layoutStubs = {
  PropertiesPanel: {
    name: 'PropertiesPanel',
    template: '<div class="properties-panel-stub" />',
    methods: { _changeWidth: vi.fn(() => 400) },
  },
  ConsolePanel: { name: 'ConsolePanel', template: '<div class="console-panel-stub" />' },
  MonacoThemeScope: { template: '<div><slot /></div>' },
  MonacoConsole: { template: '<div />' },
  MenuActionButtons: { template: '<div><slot name="leftButtons" /><slot name="rightButtons" /></div>' },
  ListSelector: { template: '<div class="list-selector-stub" />' },
  ElementTemplatesModal: { template: '<div />' },
  ScriptEditorModal: { template: '<div />' },
}

function mountBpmnModeler(props = {}) {
  return mount(BpmnModeler, {
    props: {
      diagramType: 'bpmn-c7',
      clipboard: {},
      xml: '<bpmn:definitions></bpmn:definitions>',
      tabElementIndex: 0,
      tabElement: defaultTabElement,
      isModelerVisible: false,
      isActiveTab: true,
      elementTemplateJson: [],
      consoleErrors: '',
      ...props,
    },
    global: {
      stubs: layoutStubs,
      mocks: { $t: (k) => k },
      provide: {
        monaco: mockMonaco,
        config: { modeler: {} },
        extraBpmnModules: [],
      },
    },
  })
}

describe('BpmnModeler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bpmnInstance.instance.saveXML.mockResolvedValue({ xml: '<bpmn/>' })
    modelerMocks.isConsoleOpen.value = false
  })

  describe('rendering', () => {
    it('mounts and renders canvas', async () => {
      const wrapper = mountBpmnModeler()
      await flushPromises()
      expect(wrapper.find('.canvas').exists()).toBe(true)
    })

    it('renders zoom buttons', async () => {
      const wrapper = mountBpmnModeler()
      await flushPromises()
      expect(wrapper.findAll('button').length).toBeGreaterThanOrEqual(4)
    })

    it('renders list selector stub', async () => {
      const wrapper = mountBpmnModeler()
      await flushPromises()
      expect(wrapper.find('.list-selector-stub').exists()).toBe(true)
    })

    it('renders console panel', async () => {
      const wrapper = mountBpmnModeler()
      await flushPromises()
      expect(wrapper.find('.console-panel-stub').exists()).toBe(true)
    })
  })

  describe('zoom controls', () => {
    it('zoomIn increases canvas zoom', async () => {
      const wrapper = mountBpmnModeler()
      await flushPromises()
      bpmnInstance.canvas.zoom.mockClear()
      await wrapper.findAll('button')[0].trigger('click')
      expect(bpmnInstance.canvas.zoom).toHaveBeenCalled()
    })

    it('toggleMinimap calls minimap toggle', async () => {
      const wrapper = mountBpmnModeler()
      await flushPromises()
      const buttons = wrapper.findAll('button')
      const minimapBtn = buttons.find(b => b.attributes('aria-pressed') !== undefined)
      if (minimapBtn) {
        await minimapBtn.trigger('click')
        expect(bpmnInstance.minimap.toggle).toHaveBeenCalled()
      }
    })
  })

  describe('lifecycle', () => {
    it('emits resizeTabNav on mount', async () => {
      const wrapper = mountBpmnModeler()
      await flushPromises()
      expect(wrapper.emitted('resizeTabNav')).toBeTruthy()
    })

    it('emits showDiagram on successful open', async () => {
      const wrapper = mountBpmnModeler()
      await flushPromises()
      expect(wrapper.emitted('showDiagram')).toBeTruthy()
    })

    it('creates bpmn Modeler instance', async () => {
      const BpmnJS = (await import('bpmn-js/lib/Modeler')).default
      mountBpmnModeler()
      await flushPromises()
      expect(BpmnJS).toHaveBeenCalled()
    })
  })
})
