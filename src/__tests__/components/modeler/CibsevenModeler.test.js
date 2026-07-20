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
import { mount, flushPromises } from '@vue/test-utils'

const tabManagerState = vi.hoisted(() => ({}))

const fileImportMocks = vi.hoisted(() => ({
  handleFile: vi.fn(),
  _addNewBpmnFromLoadedXml: vi.fn(),
  resolveConflict: vi.fn(),
}))

const storeState = vi.hoisted(() => ({
  modeler: {
    processes: {
      processes: [],
      unifiedDiagrams: [{ id: '1', name: 'Diagram 1', processkey: 'key1', type: 'bpmn-c7' }],
      processSelected: null,
    },
    forms: { forms: [], formSelected: null },
    elementTemplates: { error: null },
  },
}))

vi.mock('../../../monaco-setup.js', () => ({
  editor: { setTheme: vi.fn(), create: vi.fn() },
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: {}, path: '/modeler' })),
  useRouter: vi.fn(() => ({ replace: vi.fn().mockResolvedValue(undefined) })),
}))

vi.mock('vuex', () => ({
  useStore: vi.fn(() => ({
    state: storeState,
    getters: {
      'modeler/elementTemplates/allElementTemplateContents': [],
    },
    dispatch: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useI18n: () => ({ t: (key) => key }),
  }
})

vi.mock('../../../composables/useTabManager.js', async () => {
  const { ref } = await import('vue')
  const tabNavList = ref([])
  const tabNavListXml = ref([])
  const editorXML = ref([])
  Object.assign(tabManagerState, {
    tabNavList,
    tabNavListXml,
    editorXML,
    _copyArray: vi.fn(),
    _saveTabNavSavedLocalStorage: vi.fn(),
    _loadTabNavList: vi.fn(),
    _closeSelectedTab: vi.fn(),
    _orderTabNavListHiddenTab: vi.fn(),
  })
  return { default: () => tabManagerState }
})

vi.mock('../../../composables/useFileImport.js', () => ({
  default: () => fileImportMocks,
}))

vi.mock('../../../services/processService.js', () => ({
  keyExistsRemote: vi.fn().mockResolvedValue(false),
}))

vi.mock('../../../utils.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    filterTemplates: vi.fn(() => []),
    getTimeStamp: vi.fn(() => '12:00:00'),
    generateUniqueId: vi.fn(() => 'abc123'),
  }
})

vi.mock('diagram-js/lib/features/clipboard/Clipboard', () => ({
  default: vi.fn(function Clipboard() {
    this.copy = vi.fn()
    this.paste = vi.fn()
  }),
}))

vi.mock('../../../components/modeler/BpmnModeler.vue', () => ({
  default: { name: 'BpmnModeler', template: '<div class="bpmn-modeler-stub" />' },
}))
vi.mock('../../../components/modeler/DmnModeler.vue', () => ({
  default: { name: 'DmnModeler', template: '<div class="dmn-modeler-stub" />' },
}))
vi.mock('../../../components/modeler/FormModeler.vue', () => ({
  default: { name: 'FormModeler', template: '<div class="form-modeler-stub" />' },
}))
vi.mock('../../../components/modeler/StartPage.vue', () => ({
  default: { name: 'StartPage', template: '<div class="start-page-stub" />', methods: { _toggleIsLoading: vi.fn() } },
}))
vi.mock('../../../components/DropZone.vue', () => ({
  default: { name: 'DropZone', template: '<div class="drop-zone-stub"><slot /></div>', emits: ['handleDropFile'] },
}))
vi.mock('../../../components/layout/TabNav.vue', () => ({
  default: {
    name: 'TabNav',
    template: '<div class="tab-nav-stub" ref="tabNavEl" />',
    methods: { _calculateTabsVisible: vi.fn() },
    mounted() {
      if (this.$refs.tabNavEl) {
        Object.defineProperty(this.$refs.tabNavEl, 'clientWidth', { value: 800, configurable: true })
      }
    },
  },
}))
vi.mock('../../../components/monaco/MonacoEditor.vue', () => ({
  default: { template: '<div class="monaco-editor-stub" />' },
}))
vi.mock('../../../components/ActionButtonsList.vue', () => ({
  default: { template: '<div class="action-buttons-stub" />' },
}))
vi.mock('../../../components/modals/ModalNewDiagram.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../../../components/modals/ModalDeploy.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../../../components/messages/ToastMessage.vue', () => ({
  default: { name: 'ToastMessage', template: '<div class="toast-stub" />', methods: { _showToastTimeOut: vi.fn() } },
}))
vi.mock('../../../components/modals/ImportConflictModal.vue', () => ({ default: { template: '<div />' } }))

import CibsevenModeler from '../../../components/modeler/CibsevenModeler.vue'

const childStubs = {}

function mountCibsevenModeler() {
  const wrapper = mount(CibsevenModeler, {
    global: {
      stubs: childStubs,
      mocks: { $t: (key) => key },
      provide: { config: { modeler: {} } },
    },
  })
  const tabPanes = wrapper.find('.tab-content').element
  Object.defineProperty(tabPanes, 'clientWidth', { value: 1024, configurable: true })
  return wrapper
}

describe('CibsevenModeler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tabManagerState.tabNavList.value = []
    tabManagerState.tabNavListXml.value = []
    tabManagerState.editorXML.value = []
    storeState.modeler.processes.unifiedDiagrams = [
      { id: '1', name: 'Diagram 1', processkey: 'key1', type: 'bpmn-c7' },
    ]
  })

  describe('rendering', () => {
    it('mounts and renders DropZone and TabNav', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      expect(wrapper.find('.drop-zone-stub').exists()).toBe(true)
      expect(wrapper.find('.tab-nav-stub').exists()).toBe(true)
    })

    it('shows StartPage on dashboard tab when diagrams loaded', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      expect(wrapper.find('.start-page-stub').exists()).toBe(true)
    })
  })

  describe('tab panes', () => {
    it('renders BpmnModeler stub for bpmn-c7 tab', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7', isPropertyPanelVisible: true, isModelerVisible: false },
      ]
      tabManagerState.tabNavListXml.value = ['<bpmn/>']
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.activeTab = 0
      await flushPromises()
      expect(wrapper.find('.bpmn-modeler-stub').exists()).toBe(true)
    })

    it('renders DmnModeler stub for dmn tab', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'd1', key: 'k1', name: 'DMN', type: 'dmn', isPropertyPanelVisible: true, isModelerVisible: false },
      ]
      tabManagerState.tabNavListXml.value = ['<dmn/>']
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.activeTab = 0
      await flushPromises()
      expect(wrapper.find('.dmn-modeler-stub').exists()).toBe(true)
    })

    it('renders FormModeler stub for form tab', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'f1', key: 'k1', name: 'Form', type: 'form', isPropertyPanelVisible: true, isModelerVisible: false },
      ]
      tabManagerState.tabNavListXml.value = ['{"id":"form1"}']
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.activeTab = 0
      await flushPromises()
      expect(wrapper.find('.form-modeler-stub').exists()).toBe(true)
    })
  })

  describe('toast and file handling', () => {
    it('showToastMessage updates toast state', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.showToastMessage({ isSuccess: true, toastText: 'toastSaveSuccess' })
      expect(wrapper.vm.isSuccess).toBe(true)
      expect(wrapper.vm.toastText).toBe('toastSaveSuccess')
    })

    it('handleFile delegates to useFileImport', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const file = new File(['<bpmn/>'], 'test.bpmn')
      await wrapper.vm.handleFile(file)
      expect(fileImportMocks.handleFile).toHaveBeenCalledWith(file)
    })

    it('removeSelectedTab calls _closeSelectedTab', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.removeSelectedTab(1)
      expect(tabManagerState._closeSelectedTab).toHaveBeenCalledWith(1)
    })
  })
})
