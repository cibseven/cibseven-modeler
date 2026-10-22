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
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
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
  fetchFolders: vi.fn(),
  fetchUserFolder: vi.fn(),
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

vi.mock('@cib/common-frontend', () => ({
  TaskPopper: {
    name: 'TaskPopper',
    template: '<div class="task-popper-stub" />',
    methods: { triggerDownload: vi.fn() },
  },
}))

import StartPage from '../../../components/modeler/StartPage.vue'

import { copyFormToFolder, copyProcessToFolder, fetchFolders, fetchUserFolder, moveFormToFolder, moveProcessToFolder } from '../../../services/folderService.js'

enableAutoUnmount(afterEach)

const filesTable = wrapper => wrapper.findComponent({ name: 'FilesTable' })
// The folders the table lists; none when it is not shown at all
const folderRows = wrapper => filesTable(wrapper).exists() ? filesTable(wrapper).props('folders') : []

const TREE = [
  { id: 'general', parentId: null, name: 'General' },
  { id: 'invoicing', parentId: 'general', name: 'Invoicing' },
]

const DIAGRAMS = [
  { id: 'p1', name: 'Process One', processkey: 'process-one', type: DIAGRAM_TYPE.BPMN_C7, folderId: 'general' },
]

async function mountStartPage(props = {}) {
  // The keys stand in for the texts; warning about each one only writes to the console, and a
  // warning that lands after a test has ended fails the run
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} }, missingWarn: false, fallbackWarn: false })

  const wrapper = mount(StartPage, {
    props: { diagrams: DIAGRAMS, hasMore: false, ...props },
    global: {
      plugins: [i18n],
      stubs: {
        FilesTable: {
          name: 'FilesTable',
          props: ['folders', 'models', 'isDefault', 'isLocked', 'locationOf', 'deletingId'],
          template: '<div class="files-table-stub" />',
        },
        ConfirmModal: { name: 'ConfirmModal', template: '<div class="confirm-modal-stub" />' },
        FolderNameModal: { name: 'FolderNameModal', template: '<div />', methods: { show: vi.fn() } },
        FolderPickerModal: { name: 'FolderPickerModal', template: '<div />', methods: { show: vi.fn() } },
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('StartPage folders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // A default folder kept by one test would decide where the next one starts
    localStorage.clear()
    fetchFolders.mockResolvedValue(TREE)
  })

  describe('browsing', () => {
    it('lists the folders of the top level', async () => {
      const wrapper = await mountStartPage()

      const rows = folderRows(wrapper)
      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe('General')
    })

    /** The host fetches the models, so it has to be told which folder is open. */
    it('reports the folder it was asked to open', async () => {
      const wrapper = await mountStartPage()

      await filesTable(wrapper).vm.$emit('openFolder', 'general')

      expect(wrapper.emitted('navigateFolder')).toEqual([['general']])
    })

    it('shows the folders below the one that was opened', async () => {
      const wrapper = await mountStartPage()

      await filesTable(wrapper).vm.$emit('openFolder', 'general')
      await flushPromises()

      expect(folderRows(wrapper).map(folder => folder.name)).toEqual(['Invoicing'])
    })

    /** Like the rows of the table, every step of the path shows what it is. */
    it('shows the icon of each folder on the path, the open one in bold', async () => {
      const wrapper = await mountStartPage()
      await filesTable(wrapper).vm.$emit('openFolder', 'invoicing')
      await flushPromises()

      const steps = wrapper.findAll('.breadcrumb-item')
      expect(steps[1].find('.mdi-briefcase').exists()).toBe(true)
      expect(steps[2].find('.mdi-folder-outline').exists()).toBe(true)
      expect(steps[2].find('.fw-semibold').text()).toBe('Invoicing')
    })

    it('walks back to the top level through the breadcrumb', async () => {
      const wrapper = await mountStartPage()
      await filesTable(wrapper).vm.$emit('openFolder', 'general')
      await flushPromises()

      await wrapper.findAll('.breadcrumb button')[0].trigger('click')

      expect(wrapper.emitted('navigateFolder').at(-1)).toEqual([null])
    })

    it('names the open folder in the breadcrumb', async () => {
      const wrapper = await mountStartPage()

      await filesTable(wrapper).vm.$emit('openFolder', 'general')
      await flushPromises()

      expect(wrapper.find('.breadcrumb').text()).toContain('General')
    })
  })

  describe('creating models', () => {
    /**
     * A model is always stored in a folder, so at the top level the actions are absent rather
     * than disabled: a disabled button cannot be focused, so its explanation never arrives.
     */
    it('offers no import or creation at the top level', async () => {
      const wrapper = await mountStartPage()

      const labels = wrapper.findAll('button').map(button => button.text())
      expect(labels).not.toContain('buttons.import')
      expect(labels).not.toContain('buttons.createBpmn')
    })

    it('offers them again inside a folder', async () => {
      const wrapper = await mountStartPage()

      await filesTable(wrapper).vm.$emit('openFolder', 'general')
      await flushPromises()

      const labels = wrapper.findAll('button').map(button => button.text())
      expect(labels).toContain('buttons.import')
      expect(labels).toContain('buttons.createBpmn')
      expect(labels).toContain('buttons.createDmn')
      expect(labels).toContain('buttons.createForm')
    })

    /** Opening the dialog or the new tab can take a moment, so the clicked button says it is busy. */
    it('shows the clicked button as busy until the dialog is open', async () => {
      const wrapper = await mountStartPage()
      await filesTable(wrapper).vm.$emit('openFolder', 'general')
      await flushPromises()
      const createButtons = () => wrapper.findAll('button').filter(button => button.text().startsWith('buttons.create'))

      await createButtons()[1].trigger('click')

      const [dmn] = wrapper.emitted('createNewDmnDiagram')
      expect(createButtons()[1].attributes('aria-busy')).toBe('true')
      expect(createButtons()[1].find('.spinner-border').exists()).toBe(true)
      expect(createButtons().every(button => button.attributes('disabled') !== undefined)).toBe(true)

      dmn[2]()
      await flushPromises()

      expect(createButtons()[1].attributes('aria-busy')).toBe('false')
      expect(wrapper.find('.spinner-border').exists()).toBe(false)
      expect(createButtons().every(button => button.attributes('disabled') === undefined)).toBe(true)
    })
  })

  // A folder at the top level is a project, and creating one is the page's main action there
  describe('creating a folder', () => {
    const createButton = wrapper => wrapper.find('button.create-folder')
    // The stub's own mock; the instance only holds a bound copy of it
    const showOf = wrapper => wrapper.findComponent({ name: 'FolderNameModal' }).vm.$options.methods.show
    const openGeneral = async wrapper => {
      await filesTable(wrapper).vm.$emit('openFolder', 'general')
      await flushPromises()
    }

    it('offers to create a project at the top level, as the main action', async () => {
      const wrapper = await mountStartPage()

      expect(createButton(wrapper).text()).toBe('folders.createProject')
      expect(createButton(wrapper).classes()).toContain('btn-secondary')
      expect(createButton(wrapper).find('.mdi-briefcase-plus').exists()).toBe(true)
      expect(createButton(wrapper).classes()).not.toContain('btn-sm')
    })

    it('offers a new folder inside a folder, as before', async () => {
      const wrapper = await mountStartPage()
      await openGeneral(wrapper)

      expect(createButton(wrapper).text()).toBe('folders.create')
      expect(createButton(wrapper).classes()).toContain('btn-outline-secondary')
      expect(createButton(wrapper).classes()).not.toContain('btn-secondary')
      expect(createButton(wrapper).find('.mdi-folder-plus-outline').exists()).toBe(true)
      // Same size as the project button, so the row does not jump when a folder is opened
      expect(createButton(wrapper).classes()).not.toContain('btn-sm')
    })

    it('asks for a project name at the top level', async () => {
      const wrapper = await mountStartPage()
      const show = showOf(wrapper)

      await createButton(wrapper).trigger('click')

      expect(show).toHaveBeenCalledWith('create', '', expect.any(Function), 'project')
    })

    it('asks for a folder name inside a folder', async () => {
      const wrapper = await mountStartPage()
      await openGeneral(wrapper)
      const show = showOf(wrapper)

      await createButton(wrapper).trigger('click')

      expect(show).toHaveBeenCalledWith('create', '', expect.any(Function), 'folder')
    })

    it('renames a folder at the top level as a project', async () => {
      const wrapper = await mountStartPage()
      const show = showOf(wrapper)

      await filesTable(wrapper).vm.$emit('renameFolder', TREE[0])

      expect(show).toHaveBeenCalledWith('rename', 'General', expect.any(Function), 'project')
    })

    it('renames a folder inside another as a folder', async () => {
      const wrapper = await mountStartPage()
      await openGeneral(wrapper)
      const show = showOf(wrapper)

      await filesTable(wrapper).vm.$emit('renameFolder', TREE[1])

      expect(show).toHaveBeenCalledWith('rename', 'Invoicing', expect.any(Function), 'folder')
    })
  })

  describe('copying a model', () => {
    const openPicker = async (wrapper, model) => {
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()
      await filesTable(wrapper).vm.$emit('copyModel', model)
      return picker.vm.show.mock.calls[0][0]
    }

    it('asks a diagram for a process key of its own', async () => {
      const wrapper = await mountStartPage()

      const options = await openPicker(wrapper, DIAGRAMS[0])

      expect(options.keyLabel).toBe('folders.copyKey')
      expect(options.defaultKey).toBe('process-one-copy')
      await options.accept('invoicing', 'process-one-copy')
      expect(copyProcessToFolder).toHaveBeenCalledWith('p1', 'invoicing', 'process-one-copy', 'Process One')
    })

    /** A form is referenced by its form id, so its copy needs one rather than a process key. */
    it('asks a form for a form id of its own', async () => {
      const form = { id: 'f1', formId: 'invoice-form', type: DIAGRAM_TYPE.FORM, folderId: 'general' }
      const wrapper = await mountStartPage({ diagrams: [form] })

      const options = await openPicker(wrapper, form)

      expect(options.keyLabel).toBe('folders.copyFormId')
      expect(options.defaultKey).toBe('invoice-form-copy')
      await options.accept('invoicing', 'invoice-form-copy')
      expect(copyFormToFolder).toHaveBeenCalledWith('f1', 'invoicing', 'invoice-form-copy')
      expect(copyProcessToFolder).not.toHaveBeenCalled()
    })
  })

  describe('when there is nothing to show', () => {
    const emptyText = wrapper => wrapper.find('.files-empty').text()

    /** The search is debounced, so nothing is searched until 300ms after the last keystroke. */
    const search = async (wrapper, keyword) => {
      vi.useFakeTimers()
      try {
        await wrapper.find('input[type="text"]').setValue(keyword)
        await vi.advanceTimersByTimeAsync(300)
      } finally {
        vi.useRealTimers()
      }
      await flushPromises()
    }

    it('says the top level has no folders yet', async () => {
      fetchFolders.mockResolvedValue([])
      const wrapper = await mountStartPage({ diagrams: [] })

      expect(emptyText(wrapper)).toContain('folders.emptyProjects')
    })

    it('says a folder is empty once you are inside one', async () => {
      const wrapper = await mountStartPage({ diagrams: [] })

      await filesTable(wrapper).vm.$emit('openFolder', 'invoicing')
      await flushPromises()

      expect(emptyText(wrapper)).toContain('folders.empty')
    })

    /**
     * A search hides this level's folders, so they must not count as content: otherwise a
     * search with no hits inside a folder that has subfolders renders nothing at all.
     */
    it('says a search found nothing, even in a folder that has subfolders', async () => {
      const wrapper = await mountStartPage({ diagrams: [] })
      await filesTable(wrapper).vm.$emit('openFolder', 'general')
      await flushPromises()

      await search(wrapper, 'invoice')

      expect(emptyText(wrapper)).toContain('folders.noMatches')
    })

    /**
     * Typing is not searching. The list still holds the folder until the debounce fires, so
     * saying "nothing matches" before then is a confident answer to a question not yet asked.
     */
    it('still describes the folder while a search is only being typed', async () => {
      const wrapper = await mountStartPage({ diagrams: [] })
      await filesTable(wrapper).vm.$emit('openFolder', 'invoicing')
      await flushPromises()

      await wrapper.find('input[type="text"]').setValue('invoice')

      expect(emptyText(wrapper)).toContain('folders.empty')
      expect(emptyText(wrapper)).not.toContain('folders.noMatches')
    })

    it('drops the scope line when the search matched nothing', async () => {
      const wrapper = await mountStartPage({ diagrams: [] })

      await search(wrapper, 'invoice')

      expect(wrapper.text()).not.toContain('folders.searchAcrossFolders')
    })

    it('keeps the scope line when the search did match something', async () => {
      const wrapper = await mountStartPage()

      await search(wrapper, 'invoice')

      expect(wrapper.text()).toContain('folders.searchAcrossFolders')
    })
  })

  describe('moving a model', () => {
    it('moves a diagram through the process endpoint', async () => {
      const wrapper = await mountStartPage()
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()

      await filesTable(wrapper).vm.$emit('moveModel', DIAGRAMS[0])
      await picker.vm.show.mock.calls[0][0].accept('invoicing')

      expect(moveProcessToFolder).toHaveBeenCalledWith('p1', 'invoicing')
      expect(moveFormToFolder).not.toHaveBeenCalled()
    })

    it('moves a form through the form endpoint', async () => {
      const form = { id: 'f1', formId: 'invoice-form', type: DIAGRAM_TYPE.FORM, folderId: 'general' }
      const wrapper = await mountStartPage({ diagrams: [form] })
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()

      await filesTable(wrapper).vm.$emit('moveModel', form)
      await picker.vm.show.mock.calls[0][0].accept('invoicing')

      expect(moveFormToFolder).toHaveBeenCalledWith('f1', 'invoicing')
      expect(moveProcessToFolder).not.toHaveBeenCalled()
    })

    /** The model keeps its tab open, and the tab has to be told where the model went. */
    it('reports the move so an open tab can follow it', async () => {
      const wrapper = await mountStartPage()
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()

      await filesTable(wrapper).vm.$emit('moveModel', DIAGRAMS[0])
      await picker.vm.show.mock.calls[0][0].accept('invoicing')

      expect(wrapper.emitted('modelMoved')).toEqual([['p1', 'invoicing']])
    })

    /** A model cannot sit at the top level, so that is not offered as a destination. */
    it('does not offer the top level as a destination for a model', async () => {
      const wrapper = await mountStartPage()
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()

      await filesTable(wrapper).vm.$emit('moveModel', DIAGRAMS[0])

      expect(picker.vm.show.mock.calls[0][0].allowTopLevel).toBeUndefined()
    })

    /** Moving a model to where it already is would be no move, so its folder is not offered. */
    it('marks the folder the model is in as its current location', async () => {
      const wrapper = await mountStartPage()
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()

      await filesTable(wrapper).vm.$emit('moveModel', DIAGRAMS[0])

      expect(picker.vm.show.mock.calls[0][0].current).toBe('general')
    })
  })

  describe('moving a folder', () => {
    const openPicker = async (wrapper, folder) => {
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()
      await filesTable(wrapper).vm.$emit('moveFolder', folder)
      return picker.vm.show.mock.calls[0][0]
    }

    it('marks the folder it sits in as its current location', async () => {
      const wrapper = await mountStartPage()

      const options = await openPicker(wrapper, TREE[1])

      expect(options.current).toBe('general')
      expect(options.allowTopLevel).toBe(true)
    })

    it('marks the top level as the current location of a project', async () => {
      const wrapper = await mountStartPage()

      const options = await openPicker(wrapper, TREE[0])

      expect(options.current).toBeNull()
      // The folder itself is no destination, and neither is anything inside it
      expect(options.folders).toEqual([])
    })
  })

  /** The tree is loaded here, so the rest of the modeler asks this page about folders. */
  describe('what it answers about folders', () => {
    it('spells out the whole path down to a folder', async () => {
      const wrapper = await mountStartPage()

      expect(wrapper.vm.folderPathFor('invoicing')).toBe('General / Invoicing')
      expect(wrapper.vm.folderNameFor('invoicing')).toBe('Invoicing')
    })

    it('has no path for the top level', async () => {
      const wrapper = await mountStartPage()

      expect(wrapper.vm.folderPathFor(null)).toBe(null)
    })

    it('hands the whole tree over for a dialog shown outside this page', async () => {
      const wrapper = await mountStartPage()

      expect(wrapper.vm.folderOptions()).toEqual([
        { id: 'general', name: 'General', depth: 0 },
        { id: 'invoicing', name: 'Invoicing', depth: 1 }
      ])
    })
  })

  describe('when the folders cannot be read', () => {
    it('still shows the page and says what went wrong', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      fetchFolders.mockRejectedValue(new Error('offline'))

      const wrapper = await mountStartPage()

      expect(folderRows(wrapper)).toHaveLength(0)
      expect(wrapper.emitted('showToastMessage')[0][0]).toMatchObject({
        isSuccess: false,
        toastText: 'toastFolderLoadFail',
      })
    })
  })
  describe('user folder', () => {
    const USER_FOLDER = { id: 'demo-folder', parentId: null, name: 'demo', userFolder: true }

    beforeEach(() => {
      fetchFolders.mockResolvedValue([...TREE, USER_FOLDER])
      fetchUserFolder.mockResolvedValue({ folder: USER_FOLDER, manageUserFolders: false })
    })

    it('opens the own folder when the page opens', async () => {
      const wrapper = await mountStartPage()

      expect(wrapper.emitted('navigateFolder')).toEqual([['demo-folder']])
      expect(wrapper.find('.breadcrumb').text()).toContain('demo')
    })

    it('comes back to the folder of the URL after a refresh', async () => {
      const wrapper = await mountStartPage({ initialFolderId: 'general' })

      expect(wrapper.emitted('navigateFolder')).toEqual([['general']])
    })

    it('stays on the top level when the URL says so', async () => {
      const wrapper = await mountStartPage({ initialFolderId: '' })

      expect(wrapper.emitted('navigateFolder')).toBeUndefined()
    })

    /** A folder deleted in another tab must not leave the page pointing at nothing. */
    it('opens the own folder when the folder of the URL is gone', async () => {
      const wrapper = await mountStartPage({ initialFolderId: 'deleted' })

      expect(wrapper.emitted('navigateFolder')).toEqual([['demo-folder']])
    })

    describe('default folder', () => {
      const KEY = 'cibseven-modeler.defaultFolder.demo'
      const star = wrapper => wrapper.find('button.default-folder')

      beforeEach(() => localStorage.clear())

      it('opens the default folder on a new visit', async () => {
        localStorage.setItem(KEY, 'general')

        const wrapper = await mountStartPage()

        expect(wrapper.emitted('navigateFolder')).toEqual([['general']])
      })

      it('stays on the top level when that is the default', async () => {
        localStorage.setItem(KEY, '')

        const wrapper = await mountStartPage()

        expect(wrapper.emitted('navigateFolder')).toBeUndefined()
      })

      it('leaves a refresh where it was, whatever the default', async () => {
        localStorage.setItem(KEY, 'general')

        const wrapper = await mountStartPage({ initialFolderId: 'demo-folder' })

        expect(wrapper.emitted('navigateFolder')).toEqual([['demo-folder']])
      })

      it('opens the own folder and forgets a default that is gone', async () => {
        localStorage.setItem(KEY, 'deleted')

        const wrapper = await mountStartPage()

        expect(wrapper.emitted('navigateFolder')).toEqual([['demo-folder']])
        expect(localStorage.getItem(KEY)).toBeNull()
      })

      it('sets the place on screen as default, and unsets it again', async () => {
        const wrapper = await mountStartPage({ initialFolderId: 'general' })

        await star(wrapper).trigger('click')
        expect(localStorage.getItem(KEY)).toBe('general')
        expect(star(wrapper).text()).toBe('folders.defaultFolder')
        expect(star(wrapper).attributes('title')).toBe('folders.unsetDefault')

        await star(wrapper).trigger('click')
        expect(localStorage.getItem(KEY)).toBeNull()
        expect(star(wrapper).text()).toBe('folders.setDefault')
        expect(star(wrapper).attributes('title')).toBe('folders.setDefault')
      })

      /** The user folder is the default when nothing else is chosen, so there is nothing to unset. */
      it('shows the user folder as the default, without a way to unset it', async () => {
        const wrapper = await mountStartPage()

        expect(star(wrapper).text()).toBe('folders.defaultFolder')
        expect(star(wrapper).attributes('aria-disabled')).toBe('true')
        expect(star(wrapper).attributes('title')).toBe('folders.defaultFolder')

        await star(wrapper).trigger('click')
        expect(localStorage.getItem(KEY)).toBeNull()
        expect(star(wrapper).text()).toBe('folders.defaultFolder')
      })

      it('marks the user folder in the list when no default is chosen', async () => {
        const wrapper = await mountStartPage({ initialFolderId: '' })

        const isDefault = filesTable(wrapper).props('isDefault')

        expect(isDefault('demo-folder')).toBe(true)
        expect(isDefault('general')).toBe(false)
      })

      it('sets the top level as default', async () => {
        const wrapper = await mountStartPage({ initialFolderId: '' })

        await star(wrapper).trigger('click')

        expect(localStorage.getItem(KEY)).toBe('')
      })

      it('marks the default folder in the list', async () => {
        localStorage.setItem(KEY, 'general')
        const wrapper = await mountStartPage({ initialFolderId: '' })

        const isDefault = filesTable(wrapper).props('isDefault')

        expect(isDefault('general')).toBe(true)
        expect(isDefault('demo-folder')).toBe(false)
      })

      it('offers no star without knowing the user', async () => {
        fetchUserFolder.mockResolvedValue(null)

        const wrapper = await mountStartPage()

        expect(star(wrapper).exists()).toBe(false)
      })

      it('sends a file dropped on the top level into the default folder, unless that is the top level', async () => {
        localStorage.setItem(KEY, 'general')
        const wrapper = await mountStartPage()
        expect(wrapper.vm.defaultDropFolderId()).toBe('general')

        localStorage.setItem(KEY, '')
        const onTop = await mountStartPage()
        expect(onTop.vm.defaultDropFolderId()).toBeNull()
      })
    })

    it('stays on the top level when there is no own folder', async () => {
      fetchUserFolder.mockResolvedValue(null)

      const wrapper = await mountStartPage()

      expect(wrapper.emitted('navigateFolder')).toBeUndefined()
    })

    it('lists the user folder like any folder, but without actions', async () => {
      const wrapper = await mountStartPage()
      await wrapper.findAll('.breadcrumb button')[0].trigger('click')
      await flushPromises()

      const rows = folderRows(wrapper)
      const isLocked = filesTable(wrapper).props('isLocked')
      expect(rows.map(folder => folder.name)).toEqual(['demo', 'General'])
      expect(isLocked(rows[0])).toBe(true)
      expect(isLocked(rows[1])).toBe(false)
    })
  })
})
