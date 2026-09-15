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
  fetchFolderContents: vi.fn().mockResolvedValue({ folders: 0, diagrams: 0, forms: 0 }),
  createFolder: vi.fn().mockResolvedValue({}),
  renameFolder: vi.fn().mockResolvedValue({}),
  moveFolder: vi.fn().mockResolvedValue({}),
  deleteFolder: vi.fn().mockResolvedValue({}),
  moveProcessToFolder: vi.fn().mockResolvedValue({}),
  copyProcessToFolder: vi.fn().mockResolvedValue({}),
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
import { fetchFolders, moveFormToFolder, moveProcessToFolder } from '../../../services/folderService.js'

const TREE = [
  { id: 'general', parentId: null, name: 'General' },
  { id: 'invoicing', parentId: 'general', name: 'Invoicing' },
]

const DIAGRAMS = [
  { id: 'p1', name: 'Process One', processkey: 'process-one', type: DIAGRAM_TYPE.BPMN_C7, folderId: 'general' },
]

async function mountStartPage(props = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} } })

  const wrapper = mount(StartPage, {
    props: { diagrams: DIAGRAMS, hasMore: false, ...props },
    global: {
      plugins: [i18n],
      stubs: {
        DiagramListItem: {
          name: 'DiagramListItem',
          template: '<div class="diagram-list-item-stub" />',
          methods: { _processingDeletingItem: vi.fn() },
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
    fetchFolders.mockResolvedValue(TREE)
  })

  describe('browsing', () => {
    it('lists the folders of the top level', async () => {
      const wrapper = await mountStartPage()

      const rows = wrapper.findAllComponents({ name: 'FolderListItem' })
      expect(rows).toHaveLength(1)
      expect(rows[0].props('folder').name).toBe('General')
    })

    /** The host fetches the models, so it has to be told which folder is open. */
    it('reports the folder it was asked to open', async () => {
      const wrapper = await mountStartPage()

      await wrapper.findComponent({ name: 'FolderListItem' }).vm.$emit('open', 'general')

      expect(wrapper.emitted('navigateFolder')).toEqual([['general']])
    })

    it('shows the folders below the one that was opened', async () => {
      const wrapper = await mountStartPage()

      await wrapper.findComponent({ name: 'FolderListItem' }).vm.$emit('open', 'general')
      await flushPromises()

      const rows = wrapper.findAllComponents({ name: 'FolderListItem' })
      expect(rows.map(row => row.props('folder').name)).toEqual(['Invoicing'])
    })

    it('walks back to the top level through the breadcrumb', async () => {
      const wrapper = await mountStartPage()
      await wrapper.findComponent({ name: 'FolderListItem' }).vm.$emit('open', 'general')
      await flushPromises()

      await wrapper.findAll('.breadcrumb button')[0].trigger('click')

      expect(wrapper.emitted('navigateFolder').at(-1)).toEqual([null])
    })

    it('names the open folder in the breadcrumb', async () => {
      const wrapper = await mountStartPage()

      await wrapper.findComponent({ name: 'FolderListItem' }).vm.$emit('open', 'general')
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
      expect(labels).not.toContain('buttons.importFile')
      expect(labels).not.toContain('buttons.createBpmn')
    })

    it('offers them again inside a folder', async () => {
      const wrapper = await mountStartPage()

      await wrapper.findComponent({ name: 'FolderListItem' }).vm.$emit('open', 'general')
      await flushPromises()

      const labels = wrapper.findAll('button').map(button => button.text())
      expect(labels).toContain('buttons.importFile')
      expect(labels).toContain('buttons.createBpmn')
      expect(labels).toContain('buttons.createDmn')
      expect(labels).toContain('buttons.createForm')
    })
  })

  describe('when there is nothing to show', () => {
    const emptyText = wrapper => wrapper.find('.list-group-item.text-center').text()

    it('says the top level has no folders yet', async () => {
      fetchFolders.mockResolvedValue([])
      const wrapper = await mountStartPage({ diagrams: [] })

      expect(emptyText(wrapper)).toContain('folders.emptyHome')
    })

    it('says a folder is empty once you are inside one', async () => {
      const wrapper = await mountStartPage({ diagrams: [] })

      await wrapper.findComponent({ name: 'FolderListItem' }).vm.$emit('open', 'invoicing')
      await flushPromises()

      expect(emptyText(wrapper)).toContain('folders.empty')
    })

    /**
     * A search hides this level's folders, so they must not count as content: otherwise a
     * search with no hits inside a folder that has subfolders renders nothing at all.
     */
    it('says a search found nothing, even in a folder that has subfolders', async () => {
      const wrapper = await mountStartPage({ diagrams: [] })
      await wrapper.findComponent({ name: 'FolderListItem' }).vm.$emit('open', 'general')
      await flushPromises()

      await wrapper.find('input[type="text"]').setValue('invoice')

      expect(emptyText(wrapper)).toContain('folders.noMatches')
    })

    it('drops the scope line when the search matched nothing', async () => {
      const wrapper = await mountStartPage({ diagrams: [] })

      await wrapper.find('input[type="text"]').setValue('invoice')

      expect(wrapper.text()).not.toContain('folders.searchAcrossFolders')
    })

    it('keeps the scope line when the search did match something', async () => {
      const wrapper = await mountStartPage()

      await wrapper.find('input[type="text"]').setValue('invoice')

      expect(wrapper.text()).toContain('folders.searchAcrossFolders')
    })
  })

  describe('moving a model', () => {
    it('moves a diagram through the process endpoint', async () => {
      const wrapper = await mountStartPage()
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()

      await wrapper.findComponent({ name: 'DiagramListItem' }).vm.$emit('moveModel', DIAGRAMS[0])
      await picker.vm.show.mock.calls[0][0].accept('invoicing')

      expect(moveProcessToFolder).toHaveBeenCalledWith('p1', 'invoicing')
      expect(moveFormToFolder).not.toHaveBeenCalled()
    })

    it('moves a form through the form endpoint', async () => {
      const form = { id: 'f1', formId: 'invoice-form', type: DIAGRAM_TYPE.FORM, folderId: 'general' }
      const wrapper = await mountStartPage({ diagrams: [form] })
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()

      await wrapper.findComponent({ name: 'DiagramListItem' }).vm.$emit('moveModel', form)
      await picker.vm.show.mock.calls[0][0].accept('invoicing')

      expect(moveFormToFolder).toHaveBeenCalledWith('f1', 'invoicing')
      expect(moveProcessToFolder).not.toHaveBeenCalled()
    })

    /** A model cannot sit at the top level, so that is not offered as a destination. */
    it('does not offer the top level as a destination for a model', async () => {
      const wrapper = await mountStartPage()
      const picker = wrapper.findComponent({ name: 'FolderPickerModal' })
      picker.vm.show = vi.fn()

      await wrapper.findComponent({ name: 'DiagramListItem' }).vm.$emit('moveModel', DIAGRAMS[0])

      expect(picker.vm.show.mock.calls[0][0].allowTopLevel).toBeUndefined()
    })
  })

  describe('when the folders cannot be read', () => {
    it('still shows the page and says what went wrong', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      fetchFolders.mockRejectedValue(new Error('offline'))

      const wrapper = await mountStartPage()

      expect(wrapper.findAllComponents({ name: 'FolderListItem' })).toHaveLength(0)
      expect(wrapper.emitted('showToastMessage')[0][0]).toMatchObject({
        isSuccess: false,
        toastText: 'toastFolderLoadFail',
      })
    })
  })
})
