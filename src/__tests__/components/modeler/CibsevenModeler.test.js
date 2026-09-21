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

const startPageMocks = vi.hoisted(() => ({
  folderNameFor: vi.fn(),
  folderPathFor: vi.fn(),
  pickFolder: vi.fn(),
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
  default: {
    name: 'StartPage',
    template: '<div class="start-page-stub" />',
    methods: {
      _toggleIsLoading: vi.fn(),
      folderNameFor: (...args) => startPageMocks.folderNameFor(...args),
      folderPathFor: (...args) => startPageMocks.folderPathFor(...args),
      pickFolder: (...args) => startPageMocks.pickFolder(...args),
    },
  },
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

  /**
   * An import lands where the user is looking, so the folder it goes into is read from the
   * screen: the model of the open tab, or the folder the list is browsing behind it.
   */
  describe('the folder an import goes into', () => {
    // The folder is pinned for as long as the import runs, so it is read while it is running
    const folderSeenByImport = wrapper => {
      let seen
      fileImportMocks.handleFile.mockImplementation(() => { seen = wrapper.vm.importFolderId })
      return () => seen
    }

    const openTab = folderId => {
      tabManagerState.tabNavList.value = [
        { id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7', folderId,
          isPropertyPanelVisible: true, isModelerVisible: false },
      ]
      tabManagerState.tabNavListXml.value = ['<bpmn/>']
    }

    it('is the folder the list is browsing while the start page is on screen', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const folder = folderSeenByImport(wrapper)
      await wrapper.vm.handleNavigateFolder('invoicing')

      await wrapper.vm.importFile({})

      expect(folder()).toBe('invoicing')
    })

    it('is the folder of the model on screen, whatever the list is browsing', async () => {
      openTab('archive')
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const folder = folderSeenByImport(wrapper)
      wrapper.vm.activeTab = 0
      await flushPromises()

      await wrapper.vm.importFile({})

      expect(folder()).toBe('archive')
    })

    it('is asked for at the top level, where the list is in no folder', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const folder = folderSeenByImport(wrapper)

      await wrapper.vm.importFile({})

      expect(fileImportMocks.handleFile).not.toHaveBeenCalled()
      expect(startPageMocks.pickFolder).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'folders.importTitle', selected: null }))
      await startPageMocks.pickFolder.mock.calls[0][0].accept('chosen')
      expect(folder()).toBe('chosen')
    })

    it('is asked for when the model on screen has no folder yet', async () => {
      openTab(undefined)
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.activeTab = 0
      await flushPromises()

      await wrapper.vm.importFile({})

      expect(fileImportMocks.handleFile).not.toHaveBeenCalled()
      expect(startPageMocks.pickFolder).toHaveBeenCalled()
    })

    it('offers the folder of the last import as the choice already made', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      await wrapper.vm.importFile({})
      await startPageMocks.pickFolder.mock.calls[0][0].accept('chosen')
      await wrapper.vm.importFile({})

      expect(startPageMocks.pickFolder.mock.calls[1][0].selected).toBe('chosen')
    })

    /** The folder asked for belongs to that import alone, even when the import fails. */
    it('stops holding the folder that was asked for once the import is over', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      fileImportMocks.handleFile.mockRejectedValueOnce(new Error('no'))

      await wrapper.vm.importFile({})
      await expect(startPageMocks.pickFolder.mock.calls[0][0].accept('chosen')).rejects.toThrow('no')
      await wrapper.vm.handleNavigateFolder('invoicing')

      expect(wrapper.vm.importFolderId).toBe('invoicing')
    })

    it('runs the same resolution for a dropped file', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const folder = folderSeenByImport(wrapper)
      await wrapper.vm.handleNavigateFolder('invoicing')

      await wrapper.findComponent({ name: 'DropZone' }).vm.$emit('handleDropFile', {})
      await flushPromises()

      expect(folder()).toBe('invoicing')
    })

    it('names the target folder on the drop overlay, and asks for one when there is none', async () => {
      startPageMocks.folderPathFor.mockReturnValue('General / Invoicing')
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      expect(wrapper.find('.custom-content').text()).toContain('dropFileToLoad')

      await wrapper.vm.handleNavigateFolder('invoicing')
      await flushPromises()

      expect(wrapper.find('.custom-content').text()).toContain('dropFileToFolder')
    })
  })

  describe('the folder a tab remembers', () => {
    it('is the one its model lives in when it is opened from the list', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      wrapper.vm.openDiagram('<bpmn/>', 'p1', 'Proc', 'k1', 'bpmn-c7', true, false, false, 'invoicing')

      expect(tabManagerState.tabNavList.value.at(-1).folderId).toBe('invoicing')
    })

    it('follows the model when it is moved to another folder from the list', async () => {
      tabManagerState.tabNavList.value = [{ id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7', folderId: 'invoicing' }]
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      wrapper.vm.handleModelMoved('p1', 'archive')

      expect(tabManagerState.tabNavList.value[0].folderId).toBe('archive')
    })
  })
})
