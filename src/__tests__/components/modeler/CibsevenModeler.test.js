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

const tabManagerState = vi.hoisted(() => ({}))

const fileImportMocks = vi.hoisted(() => ({
  handleFile: vi.fn(),
  _addNewBpmnFromLoadedXml: vi.fn(),
  resolveConflict: vi.fn(),
}))

const pickerMocks = vi.hoisted(() => ({ show: vi.fn(), isShown: vi.fn() }))

const newDiagramMocks = vi.hoisted(() => ({ toggle: vi.fn() }))

const storeMocks = vi.hoisted(() => ({ dispatch: vi.fn() }))

const processServiceMocks = vi.hoisted(() => ({ fetchProcessByKey: vi.fn() }))

const folderServiceMocks = vi.hoisted(() => ({ fetchUserFolder: vi.fn() }))

const modelerStubMocks = vi.hoisted(() => ({ _validate: vi.fn(), _saveXmlAfterUpdate: vi.fn() }))

const modelerStub = vi.hoisted(() => (name, cls) => ({
  name,
  template: `<div class="${cls}"><slot /></div>`,
  methods: {
    _validate: (...args) => modelerStubMocks._validate(...args),
    _saveXmlAfterUpdate: (...args) => modelerStubMocks._saveXmlAfterUpdate(...args),
  },
}))

const toastMocks = vi.hoisted(() => ({ show: vi.fn() }))

const routerMocks = vi.hoisted(() => ({ route: null, replace: vi.fn() }))

const startPageMocks = vi.hoisted(() => ({
  folderNameFor: vi.fn(),
  folderPathFor: vi.fn(),
  folderOptions: vi.fn(),
  defaultDropFolderId: vi.fn(),
}))

const storeState = vi.hoisted(() => ({
  modeler: {
    processes: {
      processes: [],
      unifiedDiagrams: [{ id: '1', name: 'Diagram 1', processkey: 'key1', type: 'bpmn-c7' }],
      processSelected: null,
      error: null,
    },
    xml: { xmlFromExternalReturn: null, error: null },
    forms: { forms: [], formSelected: null },
    elementTemplates: { error: null },
  },
}))

vi.mock('../../../monaco-setup.js', () => ({
  editor: { setTheme: vi.fn(), create: vi.fn() },
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => routerMocks.route),
  useRouter: vi.fn(() => ({ replace: (...args) => routerMocks.replace(...args) })),
}))

vi.mock('vuex', () => ({
  useStore: vi.fn(() => ({
    state: storeState,
    getters: {
      'modeler/elementTemplates/allElementTemplateContents': [],
    },
    dispatch: (...args) => storeMocks.dispatch(...args),
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
  fetchProcessByKey: (...args) => processServiceMocks.fetchProcessByKey(...args),
}))

vi.mock('../../../services/folderService.js', () => ({
  fetchUserFolder: (...args) => folderServiceMocks.fetchUserFolder(...args),
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
  default: modelerStub('BpmnModeler', 'bpmn-modeler-stub'),
}))
vi.mock('../../../components/modeler/DmnModeler.vue', () => ({
  default: modelerStub('DmnModeler', 'dmn-modeler-stub'),
}))
vi.mock('../../../components/modeler/FormModeler.vue', () => ({
  default: { name: 'FormModeler', template: '<div class="form-modeler-stub" />' },
}))
vi.mock('../../../components/modeler/StartPage.vue', () => ({
  default: {
    name: 'StartPage',
    props: { initialFolderId: String },
    template: '<div class="start-page-stub" />',
    methods: {
      _toggleIsLoading: vi.fn(),
      folderNameFor: (...args) => startPageMocks.folderNameFor(...args),
      folderPathFor: (...args) => startPageMocks.folderPathFor(...args),
      folderOptions: (...args) => startPageMocks.folderOptions(...args),
      defaultDropFolderId: (...args) => startPageMocks.defaultDropFolderId(...args),
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
  default: { name: 'MonacoEditor', template: '<div class="monaco-editor-stub" />' },
}))
vi.mock('../../../components/ActionButtonsList.vue', () => ({
  default: { template: '<div class="action-buttons-stub" />' },
}))
vi.mock('../../../components/modals/ModalNewDiagram.vue', () => ({
  default: { template: '<div />', methods: { _toggleModalNewDiagram: (...args) => newDiagramMocks.toggle(...args) } },
}))
vi.mock('../../../components/modals/ModalDeploy.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../../../components/messages/ToastMessage.vue', () => ({
  default: { name: 'ToastMessage', props: ['headerText'], template: '<div class="toast-stub" />', methods: { _showToastTimeOut: (...args) => toastMocks.show(...args) } },
}))
vi.mock('../../../components/modals/ImportConflictModal.vue', () => ({
  default: { name: 'ImportConflictModal', props: ['showModal', 'modalData', 'functionAfterAccepting', 'functionAfterCanceling', 'functionAfterRenaming'], template: '<div />' },
}))
vi.mock('../../../components/modals/FolderPickerModal.vue', () => ({
  default: { name: 'FolderPickerModal', template: '<div />', methods: { show: (...args) => pickerMocks.show(...args), isShown: (...args) => pickerMocks.isShown(...args) } },
}))

import CibsevenModeler from '../../../components/modeler/CibsevenModeler.vue'
import { SKIP_CREATION_MODAL_KEY } from '../../../constants/diagramTypes.js'

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
    routerMocks.route = { params: {}, path: '/modeler', query: {} }
    routerMocks.replace.mockResolvedValue(undefined)
    // Clearing keeps whatever a test installed, and these two are installed per test
    fileImportMocks.handleFile.mockReset()
    startPageMocks.folderPathFor.mockReset()
    startPageMocks.defaultDropFolderId.mockReturnValue(null)
    pickerMocks.isShown.mockReturnValue(false)
    tabManagerState.tabNavList.value = []
    tabManagerState.tabNavListXml.value = []
    tabManagerState.editorXML.value = []
    startPageMocks.folderOptions.mockReturnValue([
      { id: 'invoicing', name: 'Invoicing', depth: 0 },
      { id: 'archive', name: 'Archive', depth: 0 },
      { id: 'general', name: 'General', depth: 0 },
    ])
    storeMocks.dispatch.mockResolvedValue(undefined)
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

    /** The tab knows what it holds; the XML from the editor may be half typed. */
    it.each([
      ['bpmn-c7', 'BpmnModeler', true],
      ['dmn', 'DmnModeler', false],
    ])('passes an edit from the XML editor of a %s tab on with the type of the tab', async (type, modelerName, isBpmn) => {
      tabManagerState.tabNavList.value = [
        { id: 'x1', key: 'k1', name: 'X', type, isPropertyPanelVisible: true, isModelerVisible: true },
      ]
      tabManagerState.tabNavListXml.value = ['<xml/>']
      tabManagerState.editorXML.value = ['<xml/>']
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.activeTab = 0
      await flushPromises()

      wrapper.findComponent({ name: modelerName }).vm.$emit('isValidated', { validation: true }, 0)
      await flushPromises()
      wrapper.findComponent({ name: 'MonacoEditor' }).vm.$emit('updateFromEditor', '<edited/>', 0)

      expect(modelerStubMocks._validate).toHaveBeenCalledWith('<edited/>')
      expect(modelerStubMocks._saveXmlAfterUpdate).toHaveBeenCalledWith(isBpmn, '<edited/>', 0)
      expect(tabManagerState.tabNavList.value[0].canSave).toBe(true)
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
    const drop = (...names) => ({
      dataTransfer: { files: (names.length ? names : ['a.bpmn']).map(name => new File(['<bpmn/>'], name)) }
    })

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

      await wrapper.vm.importFile(drop())

      expect(folder()).toBe('invoicing')
    })

    it('is the folder of the model on screen, whatever the list is browsing', async () => {
      openTab('archive')
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const folder = folderSeenByImport(wrapper)
      wrapper.vm.activeTab = 0
      await flushPromises()

      await wrapper.vm.importFile(drop())

      expect(folder()).toBe('archive')
    })

    it('is the default folder when the file is dropped on the top level', async () => {
      startPageMocks.defaultDropFolderId.mockReturnValue('archive')
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const folder = folderSeenByImport(wrapper)

      await wrapper.vm.importFile(drop())

      expect(folder()).toBe('archive')
      expect(pickerMocks.show).not.toHaveBeenCalled()
    })

    /** A default belongs to the list: a model on screen that has no folder yet still asks. */
    it('does not take the default while a model without a folder is on screen', async () => {
      startPageMocks.defaultDropFolderId.mockReturnValue('archive')
      openTab(null)
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.activeTab = 0
      await flushPromises()

      await wrapper.vm.importFile(drop())

      expect(fileImportMocks.handleFile).not.toHaveBeenCalled()
      expect(pickerMocks.show).toHaveBeenCalled()
    })

    it('is asked for at the top level, where the list is in no folder', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const folder = folderSeenByImport(wrapper)

      await wrapper.vm.importFile(drop())

      expect(fileImportMocks.handleFile).not.toHaveBeenCalled()
      expect(pickerMocks.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'folders.importTitle', selected: null, runAfterClose: true }))
      await pickerMocks.show.mock.calls[0][0].accept('chosen')
      expect(folder()).toBe('chosen')
    })

    /**
     * A file can be dropped on any tab, and the start page is a tab pane the browser hides
     * behind the one open: a dialog rendered in there shows its backdrop and nothing else.
     */
    it('is asked for in a dialog the open tab cannot hide', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      expect(picker.exists()).toBe(true)
      expect(wrapper.find('.tab-content').element.contains(picker.element)).toBe(false)
    })

    /**
     * The browser empties a drop as soon as its handler returns, and the folder is only
     * chosen afterwards: a dialog that hands the event on imports nothing at all.
     */
    it('still has the dropped files after the folder was chosen', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const event = drop('a.bpmn', 'b.bpmn')

      await wrapper.vm.importFile(event)
      event.dataTransfer.files = []
      await pickerMocks.show.mock.calls[0][0].accept('chosen')

      const imported = fileImportMocks.handleFile.mock.calls[0][0]
      expect(Array.from(imported.dataTransfer.files).map(file => file.name)).toEqual(['a.bpmn', 'b.bpmn'])
    })

    it('does nothing at all when the drop carries no file', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      await wrapper.vm.importFile({ dataTransfer: { files: [] } })

      expect(pickerMocks.show).not.toHaveBeenCalled()
      expect(fileImportMocks.handleFile).not.toHaveBeenCalled()
    })

    /**
     * Tabs kept from before the folder was carried would otherwise ask on every drop, and the
     * only cure would be closing them.
     */
    it('is looked up from the stored model when the tab kept from before does not know it', async () => {
      openTab(undefined)
      tabManagerState.tabNavList.value[0].isSaved = true
      storeMocks.dispatch.mockImplementation(action =>
        Promise.resolve(action === 'modeler/processes/fetchUnifiedDiagramById' ? { folderId: 'general' } : undefined))
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const folder = folderSeenByImport(wrapper)
      wrapper.vm.activeTab = 0
      await flushPromises()

      await wrapper.vm.importFile(drop())

      expect(pickerMocks.show).not.toHaveBeenCalled()
      expect(folder()).toBe('general')
      // Asked once: the tab keeps the answer
      expect(tabManagerState.tabNavList.value[0].folderId).toBe('general')
    })

    it('is asked for when the model on screen has no folder yet', async () => {
      openTab(undefined)
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.activeTab = 0
      await flushPromises()

      await wrapper.vm.importFile(drop())

      expect(fileImportMocks.handleFile).not.toHaveBeenCalled()
      expect(pickerMocks.show).toHaveBeenCalled()
    })

    it('offers the folder of the last import as the choice already made', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      await wrapper.vm.importFile(drop())
      await pickerMocks.show.mock.calls[0][0].accept('chosen')
      await wrapper.vm.importFile(drop())

      expect(pickerMocks.show.mock.calls[1][0].selected).toBe('chosen')
    })

    /** The folder asked for belongs to that import alone, even when the import fails. */
    /**
     * The dialog is gone by the time the import runs, so a failure has nowhere to appear
     * unless it is said here — and the folder it asked for belongs to that import alone.
     */
    it('reports an import that failed, and stops holding the folder it was given', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      fileImportMocks.handleFile.mockRejectedValueOnce(new Error('no'))

      await wrapper.vm.importFile(drop())
      await pickerMocks.show.mock.calls[0][0].accept('chosen')
      await wrapper.vm.handleNavigateFolder('invoicing')

      expect(wrapper.vm.toastText).toBe('toastLoadErrorFile')
      expect(wrapper.vm.importFolderId).toBe('invoicing')
    })

    /** A drop landing on the dialog would answer it with files it was not asked about. */
    it('leaves the dialog alone when another file is dropped while it is up', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      await wrapper.vm.importFile(drop('a.bpmn'))
      pickerMocks.isShown.mockReturnValue(true)

      await wrapper.vm.importFile(drop('b.bpmn'))

      expect(pickerMocks.show).toHaveBeenCalledOnce()
      expect(fileImportMocks.handleFile).not.toHaveBeenCalled()
    })

    /** Deleting the folder of an open model leaves the tab naming one that is not there. */
    it('does not import into a folder that is no longer in the tree', async () => {
      openTab('deleted-folder')
      tabManagerState.tabNavList.value[0].isSaved = true
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      wrapper.vm.activeTab = 0
      await flushPromises()

      await wrapper.vm.importFile(drop())

      expect(fileImportMocks.handleFile).not.toHaveBeenCalled()
      expect(pickerMocks.show).toHaveBeenCalled()
    })

    it('tells the user to create a folder when the tree holds none', async () => {
      startPageMocks.folderOptions.mockReturnValue([])
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      await wrapper.vm.importFile(drop())

      expect(pickerMocks.show).not.toHaveBeenCalled()
      expect(wrapper.vm.toastText).toBe('toastImportNoFolders')
    })

    it('runs the same resolution for a dropped file', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const folder = folderSeenByImport(wrapper)
      await wrapper.vm.handleNavigateFolder('invoicing')

      await wrapper.findComponent({ name: 'DropZone' }).vm.$emit('handleDropFile', drop())
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

    /** Opening it again is the moment to learn it: the tab is reused, not replaced. */
    it('is learned by a tab that was already open when the model is opened again', async () => {
      tabManagerState.tabNavList.value = [{ id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7' }]
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      wrapper.vm.openDiagram('<bpmn/>', 'p1', 'Proc', 'k1', 'bpmn-c7', true, false, false, 'invoicing')

      expect(tabManagerState.tabNavList.value).toHaveLength(1)
      expect(tabManagerState.tabNavList.value[0].folderId).toBe('invoicing')
    })

    /** The tab outlives the page, so a folder only learned in memory is lost on the next load. */
    it('is kept for the next page load whenever the tab learns or changes it', async () => {
      tabManagerState.tabNavList.value = [{ id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7' }]
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      tabManagerState._saveTabNavSavedLocalStorage.mockClear()

      wrapper.vm.openDiagram('<bpmn/>', 'p1', 'Proc', 'k1', 'bpmn-c7', true, false, false, 'invoicing')
      expect(tabManagerState._saveTabNavSavedLocalStorage).toHaveBeenCalledOnce()

      wrapper.vm.handleModelMoved('p1', 'archive')
      expect(tabManagerState._saveTabNavSavedLocalStorage).toHaveBeenCalledTimes(2)
    })

    it('follows the model when it is moved to another folder from the list', async () => {
      tabManagerState.tabNavList.value = [{ id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7', folderId: 'invoicing' }]
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      wrapper.vm.handleModelMoved('p1', 'archive')

      expect(tabManagerState.tabNavList.value[0].folderId).toBe('archive')
    })
  })
  /** A refresh keeps the URL, so the folder in it is where the page comes back to. */
  describe('the folder in the URL', () => {
    const startPage = wrapper => wrapper.findComponent({ name: 'StartPage' })

    it('hands the start page the folder of the page that was refreshed', async () => {
      routerMocks.route.query = { folder: 'invoicing' }
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      expect(startPage(wrapper).props('initialFolderId')).toBe('invoicing')
    })

    it('hands it none on a new visit, which starts in the own folder', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      expect(startPage(wrapper).props('initialFolderId')).toBeNull()
    })

    it('writes the folder that is opened into the URL', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      startPage(wrapper).vm.$emit('navigateFolder', 'invoicing')
      await flushPromises()

      expect(routerMocks.replace).toHaveBeenCalledWith({ query: { folder: 'invoicing' } })
    })

    it('writes the top level as an empty folder, so a refresh stays there too', async () => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()

      startPage(wrapper).vm.$emit('navigateFolder', null)
      await flushPromises()

      expect(routerMocks.replace).toHaveBeenCalledWith({ query: { folder: '' } })
    })

    it('keeps the folder when a tab writes its diagram into the URL', async () => {
      routerMocks.route.query = { folder: 'invoicing' }
      tabManagerState.tabNavList.value = [{ id: 'p1', key: 'k1', name: 'BPMN', type: 'bpmn-c7', isSaved: true }]
      tabManagerState.editorXML.value = ['<bpmn/>']
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      routerMocks.replace.mockClear()

      await wrapper.vm.switchTabFromTabNav(0)

      expect(routerMocks.replace).toHaveBeenCalledWith({ params: { diagramId: 'p1' }, query: { folder: 'invoicing' } })
    })
  })

  /** The start page keeps the clicked create button busy until it is told the creation is under way. */
  describe('creating a model from the start page', () => {
    const startPage = wrapper => wrapper.findComponent({ name: 'StartPage' })

    afterEach(() => {
      localStorage.removeItem(SKIP_CREATION_MODAL_KEY)
      vi.unstubAllGlobals()
    })

    it.each([
      ['createNewBpmnc7Diagram', 'bpmn-c7'],
      ['createNewDmnDiagram', 'dmn'],
      ['createNewFormDiagram', 'form'],
    ])('opens the name dialog for %s and then releases the button', async (event, type) => {
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const done = vi.fn()

      startPage(wrapper).vm.$emit(event, event === 'createNewFormDiagram' ? {} : 'diagram.xml', type, done)
      await flushPromises()

      expect(newDiagramMocks.toggle).toHaveBeenCalledWith(true, expect.any(Function), type)
      expect(done).toHaveBeenCalledTimes(1)
    })

    it('opens the new tab straight away when the dialog was turned off, and then releases the button', async () => {
      localStorage.setItem(SKIP_CREATION_MODAL_KEY, 'true')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('<bpmn:process id="x"/>') }))
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const done = vi.fn()

      startPage(wrapper).vm.$emit('createNewBpmnc7Diagram', 'diagram.xml', 'bpmn-c7', done)
      await flushPromises()

      expect(newDiagramMocks.toggle).not.toHaveBeenCalled()
      expect(tabManagerState.tabNavList.value).toHaveLength(1)
      expect(done).toHaveBeenCalledTimes(1)
    })

    it('releases the button even when the new model cannot be prepared', async () => {
      localStorage.setItem(SKIP_CREATION_MODAL_KEY, 'true')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountCibsevenModeler()
      await flushPromises()
      const done = vi.fn()

      await expect(wrapper.vm.createNewBpmnDiagram('diagram.xml', 'bpmn-c7', done)).rejects.toThrow()

      expect(tabManagerState.tabNavList.value).toHaveLength(0)
      expect(done).toHaveBeenCalledTimes(1)
      errorSpy.mockRestore()
    })
  })
})

/** Cockpit's "Open BPMN file in Modeler" opens the modeler with the deployed definition's id in the URL. */
describe('CibsevenModeler opened from Cockpit', () => {
  const NS = 'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn"'
  const processXml = (label = '') => `<bpmn:definitions ${NS} id="Defs"><bpmn:process id="invoice" name="${label}" isExecutable="true"/></bpmn:definitions>`
  const COLLABORATION_XML = `<bpmn:definitions ${NS} id="Defs"><bpmn:collaboration id="Collab_1"><bpmn:participant id="P1" processRef="invoice"/></bpmn:collaboration><bpmn:process id="invoice" isExecutable="true"/></bpmn:definitions>`
  const STORED = { id: 'm1', name: 'Invoice', processkey: 'invoice', type: 'bpmn-c7', folderId: 'archive' }

  const notFound = () => Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } })
  const toast = wrapper => wrapper.findComponent({ name: 'ToastMessage' })
  const conflictModal = wrapper => wrapper.findComponent({ name: 'ImportConflictModal' })

  /** The engine delivers `deployed`; the modeler holds `stored` for model m1. */
  const given = ({ deployed = processXml(), stored = processXml() } = {}) => {
    storeMocks.dispatch.mockImplementation(async action => {
      if (action === 'modeler/xml/fetchDiagram') storeState.modeler.xml.xmlFromExternalReturn = { bpmn20Xml: deployed }
      if (action === 'modeler/processes/fetchProcessById') storeState.modeler.processes.processSelected = stored
    })
  }

  const open = async () => {
    const wrapper = mountCibsevenModeler()
    await flushPromises()
    return wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
    routerMocks.route = { params: {}, path: '/modeler', query: {} }
    tabManagerState.tabNavList.value = []
    tabManagerState.tabNavListXml.value = []
    tabManagerState.editorXML.value = []
    storeState.modeler.xml = { xmlFromExternalReturn: null, error: null }
    storeState.modeler.processes.processSelected = null
    storeState.modeler.processes.error = null
    folderServiceMocks.fetchUserFolder.mockResolvedValue({ folder: { id: 'home', name: 'demo' } })
    window.location.hash = '#/modeler?processId=invoice%3A7%3Aabc'
  })

  afterEach(() => {
    window.location.hash = ''
  })

  it('opens the stored model from whichever folder it lives in, and remembers that folder', async () => {
    given()
    processServiceMocks.fetchProcessByKey.mockResolvedValue(STORED)

    await open()

    expect(processServiceMocks.fetchProcessByKey).toHaveBeenCalledWith('invoice')
    expect(tabManagerState.tabNavList.value).toEqual([expect.objectContaining({ id: 'm1', name: 'Invoice', key: 'invoice', folderId: 'archive' })])
    expect(fileImportMocks._addNewBpmnFromLoadedXml).not.toHaveBeenCalled()
  })

  /** Such a diagram is stored under its collaboration id, not under the process key in the URL. */
  it('finds a diagram with pools by its collaboration id', async () => {
    given({ deployed: COLLABORATION_XML, stored: COLLABORATION_XML })
    processServiceMocks.fetchProcessByKey.mockImplementation(async key => {
      if (key === 'Collab_1') return { ...STORED, id: 'm2', processkey: 'Collab_1' }
      throw notFound()
    })

    await open()

    expect(tabManagerState.tabNavList.value).toEqual([expect.objectContaining({ id: 'm2', key: 'Collab_1', folderId: 'archive' })])
  })

  /** A model of the bare process is a different one, e.g. the process before it got its pools. */
  it('prefers the key the diagram is stored under to the process key in the URL', async () => {
    given({ deployed: COLLABORATION_XML, stored: COLLABORATION_XML })
    processServiceMocks.fetchProcessByKey.mockImplementation(async key =>
      key === 'Collab_1' ? { ...STORED, id: 'm2', processkey: 'Collab_1' } : { ...STORED, id: 'other' })

    await open()

    expect(processServiceMocks.fetchProcessByKey.mock.calls.map(([key]) => key)).toEqual(['Collab_1'])
    expect(tabManagerState.tabNavList.value).toEqual([expect.objectContaining({ id: 'm2' })])
  })

  /** Without a folder the backend refuses the save. */
  it('opens a definition the modeler does not hold yet as a new model in the user folder', async () => {
    given()
    processServiceMocks.fetchProcessByKey.mockRejectedValue(notFound())

    await open()

    expect(fileImportMocks._addNewBpmnFromLoadedXml).toHaveBeenCalledWith('bpmn-c7', processXml(), 'invoice', true, 'home')
    expect(tabManagerState.tabNavList.value).toEqual([])
  })

  /** The diagram still opens to be looked at, though saving it fails without a folder. */
  it('opens a new model without a folder when the user folder cannot be had', async () => {
    given()
    processServiceMocks.fetchProcessByKey.mockRejectedValue(notFound())
    folderServiceMocks.fetchUserFolder.mockRejectedValue(new Error('boom'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await open()

    expect(fileImportMocks._addNewBpmnFromLoadedXml).toHaveBeenCalledWith('bpmn-c7', processXml(), 'invoice', true, null)
    errorSpy.mockRestore()
  })

  /** The engine gives a definition with a long key a bare UUID as its id. */
  it('names a new model after the key in its XML, not after the definition id', async () => {
    window.location.hash = '#/modeler?processId=6f1c2b7e-0d3a-11f0-9c4e-0242ac120002'
    given()
    processServiceMocks.fetchProcessByKey.mockRejectedValue(notFound())

    await open()

    expect(fileImportMocks._addNewBpmnFromLoadedXml).toHaveBeenCalledWith('bpmn-c7', processXml(), 'invoice', true, 'home')
  })

  /** Opening it as new would let the user save a duplicate of a model that exists. */
  it('says so when the lookup fails, rather than opening the definition as a new model', async () => {
    given()
    processServiceMocks.fetchProcessByKey.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 500 } }))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = await open()

    expect(toastMocks.show).toHaveBeenCalled()
    expect(toast(wrapper).props('headerText')).toBe('toastLoadErrorFile.title')
    expect(fileImportMocks._addNewBpmnFromLoadedXml).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('says so when the engine cannot deliver the definition', async () => {
    storeMocks.dispatch.mockImplementation(async action => {
      if (action === 'modeler/xml/fetchDiagram') storeState.modeler.xml.error = new Error('not deployed')
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = await open()

    expect(toastMocks.show).toHaveBeenCalled()
    expect(toast(wrapper).props('headerText')).toBe('toastLoadErrorFile.title')
    expect(processServiceMocks.fetchProcessByKey).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  describe('when the deployed version differs from the stored one', () => {
    beforeEach(() => {
      given({ deployed: processXml('deployed'), stored: processXml('stored') })
      processServiceMocks.fetchProcessByKey.mockResolvedValue(STORED)
    })

    it('asks which one to open, without opening either yet', async () => {
      const wrapper = await open()

      expect(conflictModal(wrapper).props('showModal')).toBe(true)
      expect(conflictModal(wrapper).props('modalData')).toMatchObject({ id: 'm1', processkey: 'invoice', folderId: 'archive', source: 'deployment' })
      expect(tabManagerState.tabNavList.value).toEqual([])
    })

    it('opens the stored model, in its folder, when it is kept', async () => {
      const wrapper = await open()

      conflictModal(wrapper).props('functionAfterCanceling')()

      expect(tabManagerState.tabNavList.value).toEqual([expect.objectContaining({ id: 'm1', folderId: 'archive' })])
      expect(fileImportMocks.resolveConflict).toHaveBeenCalledWith('skip')
    })

    it('opens the deployed version in the stored model\'s tab and folder when it is taken', async () => {
      const wrapper = await open()
      const { id, name, processkey, xmlExternalUrl, diagramType, folderId } = conflictModal(wrapper).props('modalData')

      conflictModal(wrapper).props('functionAfterAccepting')(xmlExternalUrl, id, name, processkey, diagramType, true, true, true, folderId)

      expect(tabManagerState.tabNavList.value).toEqual([expect.objectContaining({ id: 'm1', folderId: 'archive' })])
      expect(fileImportMocks.resolveConflict).toHaveBeenCalledWith('replace')
    })

    it('opens the stored model when the dialog is closed without an answer', async () => {
      const wrapper = await open()

      conflictModal(wrapper).vm.$emit('modalClosed')

      expect(tabManagerState.tabNavList.value).toEqual([expect.objectContaining({ id: 'm1', folderId: 'archive' })])
    })

    /** Otherwise skipping a later import would open this model out of nowhere. */
    it('forgets the model once the dialog is answered', async () => {
      const wrapper = await open()

      conflictModal(wrapper).props('functionAfterRenaming')('invoice2')
      conflictModal(wrapper).props('functionAfterCanceling')()

      expect(tabManagerState.tabNavList.value).toEqual([])
    })
  })
})
