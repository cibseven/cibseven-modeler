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
import { createI18n } from 'vue-i18n'
import { DIAGRAM_TYPE } from '../../../constants/diagramTypes.js'

vi.mock('../../../services/processService.js', () => ({
  fetchProcessById: vi.fn().mockResolvedValue('<bpmn/>'),
  deleteProcessById: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../../services/formService.js', () => ({
  fetchFormById: vi.fn().mockResolvedValue({ id: 'form1' }),
  deleteFormById: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../../services/folderService.js', () => ({
  fetchFolders: vi.fn().mockResolvedValue([]),
  fetchUserFolder: vi.fn().mockResolvedValue(null),
  fetchFolderAccess: vi.fn().mockResolvedValue({ projects: {}, movesBetweenProjects: true }),
  fetchFolderContents: vi.fn().mockResolvedValue({ folders: 0, diagrams: 0, forms: 0 }),
  createFolder: vi.fn().mockResolvedValue({}),
  renameFolder: vi.fn().mockResolvedValue({}),
  moveFolder: vi.fn().mockResolvedValue({}),
  deleteFolder: vi.fn().mockResolvedValue({}),
  moveProcessToFolder: vi.fn().mockResolvedValue({}),
  copyProcessToFolder: vi.fn().mockResolvedValue({}),
  copyFormToFolder: vi.fn().mockResolvedValue({}),
  moveFormToFolder: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../../resources/camunda7.bpmn', () => ({ default: '<bpmn-c7/>' }))
vi.mock('../../../resources/dmn.dmn', () => ({ default: '<dmn/>' }))
vi.mock('../../../resources/formSchema.json', () => ({ default: { id: 'newForm' } }))
vi.mock('../../../assets/images/start/modeler.svg', () => ({ default: 'modeler.svg' }))

// Opening a model loads it through the store first
const store = vi.hoisted(() => ({
  dispatch: vi.fn(),
  state: { modeler: { processes: { processSelected: '<bpmn/>' }, forms: { formSelected: { id: 'schema' } } } },
}))
vi.mock('vuex', () => ({ useStore: () => store }))

vi.mock('@cib/common-frontend', () => ({
  TaskPopper: {
    name: 'TaskPopper',
    template: '<div class="task-popper-stub" />',
    methods: { triggerDownload: vi.fn() },
  },
}))

import StartPage from '../../../components/modeler/StartPage.vue'
import { deleteProcessById, fetchProcessById } from '../../../services/processService.js'
import { deleteFormById, fetchFormById } from '../../../services/formService.js'
import { registerPlugin } from '../../../plugins/pluginsConfig.js'

const SAMPLE_DIAGRAMS = [
  { id: 'p1', name: 'Process One', type: DIAGRAM_TYPE.BPMN_C7 },
  { id: 'd1', name: 'Decision One', type: DIAGRAM_TYPE.DMN },
]

function mountStartPage(props = {}, options = {}) {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en: {} },
  })

  return mount(StartPage, {
    props: {
      diagrams: SAMPLE_DIAGRAMS,
      hasMore: false,
      ...props,
    },
    global: {
      plugins: [i18n],
      stubs: {
        FilesTable: {
          name: 'FilesTable',
          props: ['folders', 'models', 'deletingId', 'sort'],
          template: '<div class="files-table-stub"><div v-for="model in models" :key="model.id" class="model-row" /></div>',
        },
        ConfirmModal: {
          name: 'ConfirmModal',
          template: '<div class="confirm-modal-stub" />',
        },
      },
      ...options.global,
    },
    ...options,
  })
}

describe('StartPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders search input', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      expect(wrapper.find('.start-page-search-field').exists()).toBe(true)
    })

    it('renders diagram list when not loading', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      expect(wrapper.findAll('.model-row').length).toBe(2)
    })

    /** The table is rebuilt while a folder loads, and the order picked must outlast that. */
    it('keeps the chosen order when the table is shown again', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      expect(wrapper.findComponent({ name: 'FilesTable' }).props('sort')).toEqual({ by: 'updated', desc: true })

      await wrapper.findComponent({ name: 'FilesTable' }).vm.$emit('update:sort', { by: 'name', desc: false })
      wrapper.vm._toggleIsLoading(true)
      await flushPromises()
      expect(wrapper.findComponent({ name: 'FilesTable' }).exists()).toBe(false)
      wrapper.vm._toggleIsLoading(false)
      await flushPromises()

      expect(wrapper.findComponent({ name: 'FilesTable' }).props('sort')).toEqual({ by: 'name', desc: false })
    })

    it('shows loading spinner when diagrams is null', async () => {
      const wrapper = mountStartPage({ diagrams: null })
      expect(wrapper.find('.spinner-border').exists()).toBe(true)
    })
  })

  describe('search', () => {
    it('updates inputSearchValue on input', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      const input = wrapper.find('.start-page-search-field')
      await input.setValue('abc')
      expect(input.element.value).toBe('abc')
    })

    it('emits search when keyword length is at least 3', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      const input = wrapper.find('.start-page-search-field')
      await input.setValue('proc')
      vi.advanceTimersByTime(350)
      expect(wrapper.emitted('search')).toBeTruthy()
      expect(wrapper.emitted('search')[0][0]).toEqual({ keyword: 'proc', diagramType: '' })
    })

    it('emits search when keyword is cleared', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      const input = wrapper.find('.start-page-search-field')
      await input.setValue('x')
      await input.setValue('')
      vi.advanceTimersByTime(350)
      const searches = wrapper.emitted('search')
      expect(searches?.some(([payload]) => payload.keyword === '')).toBe(true)
    })
  })

  describe('filter', () => {
    it('emits search with bpmn diagramType when filter changes', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      await wrapper.vm.filterElements('bpmn')
      expect(wrapper.emitted('search')).toBeTruthy()
      expect(wrapper.emitted('search').at(-1)[0]).toEqual({ keyword: '', diagramType: 'bpmn' })
    })

    it('emits search with dmn diagramType', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      await wrapper.vm.filterElements('dmn')
      expect(wrapper.emitted('search').at(-1)[0].diagramType).toBe('dmn')
    })

    it('emits search with form diagramType', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      await wrapper.vm.filterElements('form')
      expect(wrapper.emitted('search').at(-1)[0].diagramType).toBe('form')
    })

    it('does not re-emit when filter type is unchanged', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      const countBefore = wrapper.emitted('search')?.length ?? 0
      await wrapper.vm.filterElements('all')
      await wrapper.vm.filterElements('all')
      const countAfter = wrapper.emitted('search')?.length ?? 0
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('file import', () => {
    it('handleOpenFileInput triggers file input click', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      const clickSpy = vi.spyOn(wrapper.vm.fileInput, 'click')
      wrapper.vm.handleOpenFileInput()
      expect(clickSpy).toHaveBeenCalled()
    })

    it('handleFileChange emits openSelectedFile', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      const file = new File(['content'], 'test.bpmn')
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', { value: [file] })
      const event = { target: input }
      wrapper.vm.handleFileChange(event)
      expect(wrapper.emitted('openSelectedFile')).toBeTruthy()
      expect(input.value).toBe('')
    })
  })

  describe('create diagrams', () => {
    // The click is answered at once: no timer has to run before the dialog is asked for
    it('emits createNewBpmnc7Diagram', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      wrapper.vm.handleClickCreateBpmnc7Diagram()
      expect(wrapper.emitted('createNewBpmnc7Diagram')).toBeTruthy()
      expect(wrapper.emitted('createNewBpmnc7Diagram')[0][1]).toBe(DIAGRAM_TYPE.BPMN_C7)
    })

    it('emits createNewDmnDiagram', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      wrapper.vm.handleClickCreateDmnDiagram()
      expect(wrapper.emitted('createNewDmnDiagram')[0][1]).toBe(DIAGRAM_TYPE.DMN)
    })

    it('emits createNewFormDiagram', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      wrapper.vm.handleClickCreateFormDiagram()
      expect(wrapper.emitted('createNewFormDiagram')[0][1]).toBe(DIAGRAM_TYPE.FORM)
    })

    it('ignores further clicks until the listener is done', async () => {
      const wrapper = mountStartPage()
      await flushPromises()

      wrapper.vm.handleClickCreateBpmnc7Diagram()
      wrapper.vm.handleClickCreateBpmnc7Diagram()
      wrapper.vm.handleClickCreateFormDiagram()

      expect(wrapper.emitted('createNewBpmnc7Diagram')).toHaveLength(1)
      expect(wrapper.emitted('createNewFormDiagram')).toBeUndefined()

      const done = wrapper.emitted('createNewBpmnc7Diagram')[0][2]
      done()
      wrapper.vm.handleClickCreateFormDiagram()

      expect(wrapper.emitted('createNewFormDiagram')).toHaveLength(1)
    })
  })

  describe('scroll', () => {
    it('emits loadMore when scrolled near bottom', async () => {
      const wrapper = mountStartPage({ hasMore: true })
      await flushPromises()
      const list = wrapper.find('.files-list').element
      Object.defineProperty(list, 'scrollTop', { value: 500, configurable: true })
      Object.defineProperty(list, 'scrollHeight', { value: 550, configurable: true })
      Object.defineProperty(list, 'clientHeight', { value: 100, configurable: true })
      wrapper.vm.handleListScroll()
      expect(wrapper.emitted('loadMore')).toBeTruthy()
    })
  })

  describe('open diagram', () => {
    /** The tab opens with the model already loaded, and knows the folder it came from. */
    it('loads a diagram from the table before opening it', async () => {
      const wrapper = mountStartPage()
      await flushPromises()

      await wrapper.findComponent({ name: 'FilesTable' }).vm.$emit('openModel',
        { id: 'p1', name: 'Process One', processkey: 'process-one', type: DIAGRAM_TYPE.BPMN_C7, folderId: 'general' })
      await flushPromises()

      expect(store.dispatch).toHaveBeenCalledWith('modeler/processes/fetchProcessById', 'p1')
      expect(wrapper.emitted('openDiagram')[0]).toEqual([
        '<bpmn/>', 'p1', 'Process One', 'process-one', DIAGRAM_TYPE.BPMN_C7, true, false, false, 'general',
      ])
    })

    it('loads a form from the table by its form id', async () => {
      const wrapper = mountStartPage()
      await flushPromises()

      await wrapper.findComponent({ name: 'FilesTable' }).vm.$emit('openModel',
        { id: 'f1', formId: 'request', type: DIAGRAM_TYPE.FORM, folderId: null })
      await flushPromises()

      expect(store.dispatch).toHaveBeenCalledWith('modeler/forms/fetchFormById', 'f1')
      expect(wrapper.emitted('openDiagram')[0]).toEqual([
        { id: 'schema' }, 'f1', 'request', 'request', DIAGRAM_TYPE.FORM, true, false, false, null,
      ])
    })

    it('openDiagramEmitFromChild emits openDiagram', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      wrapper.vm.openDiagramEmitFromChild(true, 'id1', 'Name', 'key1', 0, DIAGRAM_TYPE.BPMN_C7)
      expect(wrapper.emitted('openDiagram')).toBeTruthy()
      expect(wrapper.emitted('openDiagram')[0]).toEqual([
        true, 'id1', 'Name', 'key1', DIAGRAM_TYPE.BPMN_C7, true, false, false, null,
      ])
    })

    /** The tab has to know the folder, and the list is where the model comes from. */
    it('passes on the folder the model was opened from', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      wrapper.vm.openDiagramEmitFromChild(true, 'id1', 'Name', 'key1', 0, DIAGRAM_TYPE.BPMN_C7, 'invoicing')
      expect(wrapper.emitted('openDiagram')[0].at(-1)).toBe('invoicing')
    })
  })

  describe('exposed methods', () => {
    it('_toggleIsLoading updates loading state', async () => {
      const wrapper = mountStartPage({ diagrams: null })
      wrapper.vm._toggleIsLoading(false)
      expect(wrapper.vm.isLoading).toBe(false)
    })
  })

  describe('download', () => {
    it('handleDownloadDiagram downloads process', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      wrapper.vm.downloadPopper = { triggerDownload: vi.fn() }
      await wrapper.vm.handleDownloadDiagram(SAMPLE_DIAGRAMS[0])
      expect(fetchProcessById).toHaveBeenCalledWith('p1')
      expect(wrapper.emitted('showToastMessage')).toBeTruthy()
    })

    it('handleDownloadDiagram downloads form', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      wrapper.vm.downloadPopper = { triggerDownload: vi.fn() }
      const formItem = { id: 'f1', formId: 'form-id', type: DIAGRAM_TYPE.FORM }
      await wrapper.vm.handleDownloadDiagram(formItem)
      expect(fetchFormById).toHaveBeenCalledWith('f1')
    })
  })

  describe('modal', () => {
    it('asks before deleting a diagram from the table', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      await wrapper.findComponent({ name: 'FilesTable' }).vm.$emit('removeModel', SAMPLE_DIAGRAMS[0])
      expect(wrapper.vm.showModalAcceptCancelMessage).toBe(true)
      expect(wrapper.vm.processIdForDelete).toBe('p1')
      expect(wrapper.vm.processNameForDelete).toBe('Process One')
      expect(wrapper.vm.itemKey).toBe('process')
    })

    it('asks before deleting a form, named by its form id', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      await wrapper.findComponent({ name: 'FilesTable' }).vm.$emit('removeModel', { id: 'f1', formId: 'request', type: DIAGRAM_TYPE.FORM })
      expect(wrapper.vm.itemKey).toBe('form')
      expect(wrapper.vm.processNameForDelete).toBe('request')
    })

    /** The row shows that it is going, and cannot be opened while it does. */
    it('marks the model as being deleted until the deletion is done', async () => {
      let finish
      deleteProcessById.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      const wrapper = mountStartPage()
      await flushPromises()

      const deletion = wrapper.vm.deleteProcessWithId('p1')
      await flushPromises()
      expect(wrapper.findComponent({ name: 'FilesTable' }).props('deletingId')).toBe('p1')

      finish({})
      await deletion
      await flushPromises()
      expect(wrapper.findComponent({ name: 'FilesTable' }).props('deletingId')).toBeNull()
    })

    it('stops marking the model when the deletion fails', async () => {
      deleteFormById.mockRejectedValueOnce(new Error('gone'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountStartPage()
      await flushPromises()

      await wrapper.vm.deleteFormWithId('f1')

      expect(wrapper.vm.deletingId).toBeNull()
      expect(wrapper.emitted('showToastMessage')).toEqual([[{ isSuccess: false, toastText: 'toastDeleteFormFail' }]])
    })

    it('hideModal closes modal', async () => {
      const wrapper = mountStartPage()
      await flushPromises()
      wrapper.vm.showModalAcceptCancelMessage = true
      wrapper.vm.hideModal()
      expect(wrapper.vm.showModalAcceptCancelMessage).toBe(false)
    })
  })
})

describe('StartPage host actions slot', () => {
  it('renders nothing extra when no host action is registered', () => {
    const w = mountStartPage()
    expect(w.find('.host-action-stub').exists()).toBe(false)
  })

  it('renders a component registered in the start-page-tools slot', async () => {
    registerPlugin('start-page-tools', {
      name: 'HostAction',
      template: '<button class="host-action-stub">manage</button>'
    })
    const w = mountStartPage()
    await flushPromises()
    expect(w.find('.host-action-stub').exists()).toBe(true)
    // Next to the heading, apart from the actions on the open folder
    expect(w.find('h4').element.parentElement.contains(w.find('.host-action-stub').element)).toBe(true)
    registerPlugin('start-page-tools', null)
  })
})
