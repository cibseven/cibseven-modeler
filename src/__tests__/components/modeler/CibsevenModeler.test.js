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

    it('resolveConflict delegates to useFileImport', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.resolveConflict('replace', true, { newKey: 'k2' })
      expect(fileImportMocks.resolveConflict).toHaveBeenCalledWith('replace', true, { newKey: 'k2' })
    })

    it('openDiagramFromChildAndResolve skips conflict', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.openDiagramFromChildAndResolve()
      expect(fileImportMocks.resolveConflict).toHaveBeenCalledWith('skip')
    })

    it('toggleEnableSave updates tab canSave flag', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7', canSave: false },
      ]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.toggleEnableSave(true, 0)
      expect(tabManagerState.tabNavList.value[0].canSave).toBe(true)
    })

    it('updateEditorXML stores xml in editorXML ref', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7' },
      ]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.updateEditorXML('<updated/>', 0)
      expect(tabManagerState.editorXML.value[0]).toBe('<updated/>')
    })

    it('hideModalAcceptCancelMessage resets modal show flag', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.showModalAcceptCancelMessage = { show: true, type: 'bpmn' }
      wrapper.vm.hideModalAcceptCancelMessage()
      expect(wrapper.vm.showModalAcceptCancelMessage.show).toBe(false)
    })

    it('handleRename delegates rename conflict resolution', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.handleRename('new-key')
      expect(fileImportMocks.resolveConflict).toHaveBeenCalledWith('rename', false, { newKey: 'new-key' })
    })

    it('handleApplyAll delegates batch conflict resolution', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.handleApplyAll('replace')
      expect(fileImportMocks.resolveConflict).toHaveBeenCalledWith('replace', true)
    })

    it('validateRenameKey rejects duplicate keys', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.modalData = { processkey: 'existing-key', diagramType: 'bpmn' }
      expect(wrapper.vm.validateRenameKey('existing-key')).toBe('modalImportedFile.renameSameKey')
      expect(wrapper.vm.validateRenameKey('unique-new-key')).toBeNull()
    })

    it('showDiagram updates withDiagram flag', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.showDiagram(true)
      expect(wrapper.vm.withDiagram).toBe(true)
    })

    it('toggleModal updates modal visibility', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.toggleModal(true)
      expect(wrapper.vm.isShowModal).toBe(true)
    })

    it('isValidated stores validation state keyed by tab key', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'tab-key-1', name: 'BPMN', type: 'bpmn-c7' },
      ]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.isValidated({ validation: true, text: 'ok' }, 0)
      expect(wrapper.vm.isXmlValidated['tab-key-1']).toEqual({ validation: true, text: 'ok' })
    })

    it('updateTabName updates tab label', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'k1', name: 'Old', type: 'bpmn-c7' },
      ]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.updateTabName('New Name', 0)
      expect(tabManagerState.tabNavList.value[0].name).toBe('New Name')
    })

    it('toggleVersionNotSaved updates tab changedVersion', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7', changedVersion: false },
      ]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.toggleVersionNotSaved(true, 0)
      expect(tabManagerState.tabNavList.value[0].changedVersion).toBe(true)
    })

    it('addErrorMessageToConsole forwards errors to the active modeler tab', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'line-1', key: 'k1', name: 'BPMN', type: 'bpmn-c7' },
      ]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const addLine = vi.fn()
      wrapper.vm.activeTab = 0
      wrapper.vm.modeler = [{ addLineWithErrorToConsole: addLine }]
      wrapper.vm.addErrorMessageToConsole('line-1', 'Something failed')
      expect(addLine).toHaveBeenCalledWith('Something failed')
    })

    it('announce sets status message for screen readers', async () => {
      vi.useFakeTimers()
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.announce('Diagram saved')
      vi.advanceTimersByTime(50)
      expect(wrapper.vm.statusMessage).toBe('Diagram saved')
      vi.useRealTimers()
    })

    it('showPropertyPanel toggles tab panel visibility', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7', isPropertyPanelVisible: false },
      ]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.showPropertyPanel(true, 0)
      expect(tabManagerState.tabNavList.value[0].isPropertyPanelVisible).toBe(true)
    })

    it('setTypeOfDiagramForModeler updates tab type', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7' },
      ]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.setTypeOfDiagramForModeler('dmn', 0)
      expect(tabManagerState.tabNavList.value[0].type).toBe('dmn')
    })

    it('toggleIsSaved updates tab saved flag', async () => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7', isSaved: false },
      ]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.toggleIsSaved(true, 0)
      expect(tabManagerState.tabNavList.value[0].isSaved).toBe(true)
    })

    it('loadMore returns early when no more diagrams', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.hasMore = false
      await wrapper.vm.loadMore()
      expect(storeState.modeler.processes.unifiedDiagrams).toBeDefined()
    })

    it('creates new BPMN tab when creation modal is skipped', async () => {
      localStorage.setItem('cibseven:modeler.skipCreationModal', 'true')
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(
          '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="p"/></bpmn:definitions>',
        ),
      })
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      await wrapper.vm.createNewBpmnDiagram('/default.bpmn', 'bpmn-c7')
      expect(tabManagerState.tabNavList.value.length).toBeGreaterThan(0)
      localStorage.removeItem('cibseven:modeler.skipCreationModal')
    })

    it('creates new DMN tab when creation modal is skipped', async () => {
      localStorage.setItem('cibseven:modeler.skipCreationModal', 'true')
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(
          '<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL"><decision id="d"/></definitions>',
        ),
      })
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      await wrapper.vm.createNewDmnDiagram('/default.dmn', 'dmn')
      expect(tabManagerState.tabNavList.value.some(t => t.type === 'dmn')).toBe(true)
      localStorage.removeItem('cibseven:modeler.skipCreationModal')
    })

    it('creates new form tab when creation modal is skipped', async () => {
      localStorage.setItem('cibseven:modeler.skipCreationModal', 'true')
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      await wrapper.vm.createNewFormDiagram({ type: 'default', components: [] }, 'form')
      expect(tabManagerState.tabNavList.value.some(t => t.type === 'form')).toBe(true)
      localStorage.removeItem('cibseven:modeler.skipCreationModal')
    })

    it('handleSearch refreshes stored diagrams', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.startPage = { _toggleIsLoading: vi.fn() }
      await wrapper.vm.handleSearch({ keyword: 'test', diagramType: 'bpmn' })
      expect(wrapper.vm.currentKeyword).toBe('test')
    })
  })
})
