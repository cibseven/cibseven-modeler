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

vi.mock('bootstrap', () => ({
    Modal: vi.fn(function() {
        this.show = vi.fn()
        this.hide = vi.fn()
    })
}))

import FolderNameModal from '../../components/modals/FolderNameModal.vue'
import FolderPickerModal from '../../components/modals/FolderPickerModal.vue'

const messages = {
    en: {
        folders: {
            createTitle: 'New folder', renameTitle: 'Rename folder', name: 'Folder name',
            nameRequired: 'A folder needs a name.', saveFailed: 'The folder could not be saved.',
            home: 'Home', destination: 'Destination', copyKey: 'Process key of the copy',
            copyKeyRequired: 'A copy needs a process key of its own.',
            copyFormId: 'Form id of the copy',
            copyFormIdRequired: 'A copy needs a form id of its own.',
            nameTaken: 'A folder with that name is already there.',
            nameTooLong: 'The name is longer than 255 characters.',
            keyTaken: '"{key}" is already taken.'
        },
        buttons: { accept: 'Accept', cancel: 'Cancel', close: 'Close' }
    }
}

const mountModal = component => mount(component, {
    global: { plugins: [createI18n({ legacy: false, locale: 'en', messages })] },
    attachTo: document.body,
})

const FOLDERS = [
    { id: 'general', name: 'General', depth: 0 },
    { id: 'invoicing', name: 'Invoicing', depth: 1 },
]

describe('FolderNameModal', () => {
    beforeEach(() => vi.clearAllMocks())

    it('starts empty when a folder is created', async () => {
        const wrapper = mountModal(FolderNameModal)

        wrapper.vm.show('create', '', vi.fn())
        await flushPromises()

        expect(wrapper.find('input').element.value).toBe('')
        expect(wrapper.find('.modal-title').text()).toBe('New folder')
    })

    it('starts from the current name when a folder is renamed', async () => {
        const wrapper = mountModal(FolderNameModal)

        wrapper.vm.show('rename', 'Invoicing', vi.fn())
        await flushPromises()

        expect(wrapper.find('input').element.value).toBe('Invoicing')
        expect(wrapper.find('.modal-title').text()).toBe('Rename folder')
    })

    it('passes the name on, trimmed', async () => {
        const accept = vi.fn().mockResolvedValue()
        const wrapper = mountModal(FolderNameModal)
        wrapper.vm.show('create', '', accept)
        await flushPromises()

        await wrapper.find('input').setValue('  Drafts  ')
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(accept).toHaveBeenCalledWith('Drafts')
    })

    it('refuses a name the column cannot hold', async () => {
        const accept = vi.fn()
        const wrapper = mountModal(FolderNameModal)
        wrapper.vm.show('create', '', accept)
        await flushPromises()

        await wrapper.find('input').setValue('x'.repeat(256))
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(accept).not.toHaveBeenCalled()
        expect(wrapper.find('.invalid-feedback').text()).toBe('The name is longer than 255 characters.')
    })

    it('asks for a name instead of sending an empty one', async () => {
        const accept = vi.fn()
        const wrapper = mountModal(FolderNameModal)
        wrapper.vm.show('create', '', accept)
        await flushPromises()

        await wrapper.find('input').setValue('   ')
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(accept).not.toHaveBeenCalled()
        expect(wrapper.find('.invalid-feedback').text()).toBe('A folder needs a name.')
    })

    /** The backend owns the duplicate rule, so the dialog stays open showing what it said. */
    it('keeps the dialog open and shows what the backend refused', async () => {
        const accept = vi.fn().mockRejectedValue({
            response: { data: { type: 'InvalidFolderException', params: ['name', 'a folder with that name is already there'] } }
        })
        const wrapper = mountModal(FolderNameModal)
        wrapper.vm.show('create', '', accept)
        await flushPromises()

        await wrapper.find('input').setValue('General')
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(wrapper.find('.invalid-feedback').text()).toBe('A folder with that name is already there.')
    })

    it('falls back to its own message when the failure carries none', async () => {
        const accept = vi.fn().mockRejectedValue(new Error('offline'))
        const wrapper = mountModal(FolderNameModal)
        wrapper.vm.show('create', '', accept)
        await flushPromises()

        await wrapper.find('input').setValue('Drafts')
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(wrapper.find('.invalid-feedback').text()).toBe('The folder could not be saved.')
    })
})

describe('FolderPickerModal', () => {
    beforeEach(() => vi.clearAllMocks())

    const open = async (wrapper, options = {}) => {
        wrapper.vm.show({ folders: FOLDERS, title: 'Move', accept: vi.fn(), ...options })
        await flushPromises()
    }

    it('lists the folders it was given, indented by depth', async () => {
        const wrapper = mountModal(FolderPickerModal)

        await open(wrapper)

        const labels = wrapper.findAll('.list-group-item')
        expect(labels).toHaveLength(2)
        expect(labels[1].text()).toContain('Invoicing')
    })

    /** A model cannot sit at the top level, so it is only offered when a folder may move there. */
    it('offers the top level only when it is allowed', async () => {
        const wrapper = mountModal(FolderPickerModal)

        await open(wrapper)
        expect(wrapper.text()).not.toContain('Home')

        await open(wrapper, { allowTopLevel: true })
        expect(wrapper.text()).toContain('Home')
    })

    it('refuses to submit until a destination is chosen', async () => {
        const wrapper = mountModal(FolderPickerModal)

        await open(wrapper)

        expect(wrapper.find('button.btn-primary').attributes('disabled')).toBeDefined()
    })

    /** Imports repeat, so the dialog can open on the folder the last one went into. */
    it('starts from the folder it was given, if that folder is still there', async () => {
        const wrapper = mountModal(FolderPickerModal)

        await open(wrapper, { selected: 'invoicing' })
        expect(wrapper.findAll('input[type="radio"]')[1].element.checked).toBe(true)
        expect(wrapper.find('button.btn-primary').attributes('disabled')).toBeUndefined()

        await open(wrapper, { selected: 'deleted' })
        expect(wrapper.find('button.btn-primary').attributes('disabled')).toBeDefined()
    })

    it('passes the chosen folder on', async () => {
        const accept = vi.fn().mockResolvedValue()
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { accept })

        await wrapper.findAll('input[type="radio"]')[1].setValue()
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(accept).toHaveBeenCalledWith('invoicing', '')
    })

    /**
     * An import opens a tab and can ask about a conflict of its own, so the dialog is out of
     * the way before it starts: bootstrap ignores a modal opened while another is hiding.
     */
    it('closes before the work it starts, when that work reports itself elsewhere', async () => {
        const accept = vi.fn().mockResolvedValue()
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { accept, runAfterClose: true })

        await wrapper.findAll('input[type="radio"]')[1].setValue()
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()
        expect(accept).not.toHaveBeenCalled()

        wrapper.element.dispatchEvent(new Event('hidden.bs.modal'))
        await flushPromises()

        expect(accept).toHaveBeenCalledWith('invoicing', '')
    })

    /** The button stays clickable while the dialog fades out, and the work must not be doubled. */
    it('answers once however often the button is clicked', async () => {
        const accept = vi.fn().mockResolvedValue()
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { accept, runAfterClose: true })
        await wrapper.findAll('input[type="radio"]')[1].setValue()

        await wrapper.find('button.btn-primary').trigger('click')
        await wrapper.find('button.btn-primary').trigger('click')
        wrapper.element.dispatchEvent(new Event('hidden.bs.modal'))
        await flushPromises()

        expect(accept).toHaveBeenCalledOnce()
    })

    it('can be answered again after a refusal kept it open', async () => {
        const accept = vi.fn().mockRejectedValueOnce(new Error('nope')).mockResolvedValue()
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { accept })
        await wrapper.findAll('input[type="radio"]')[1].setValue()

        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(accept).toHaveBeenCalledTimes(2)
    })

    /** The top level is an empty string in the form, but null to the caller. */
    it('reports the top level as no folder at all', async () => {
        const accept = vi.fn().mockResolvedValue()
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { allowTopLevel: true, accept })

        await wrapper.findAll('input[type="radio"]')[0].setValue()
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(accept).toHaveBeenCalledWith(null, '')
    })

    /** The dialog serves both kinds of copy, so it asks for whichever key applies. */
    it('asks for the form id when a form is being copied', async () => {
        const wrapper = mountModal(FolderPickerModal)

        await open(wrapper, { requireKey: true, keyLabel: 'folders.copyFormId' })

        expect(wrapper.text()).toContain('Form id of the copy')
        expect(wrapper.text()).not.toContain('Process key of the copy')
    })

    it('reports the missing key with the message it was given', async () => {
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { requireKey: true, keyRequired: 'folders.copyFormIdRequired' })

        await wrapper.findAll('input[type="radio"]')[0].setValue()
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(wrapper.find('.invalid-feedback').text()).toBe('A copy needs a form id of its own.')
    })

    it('asks for a key when the copy needs one', async () => {
        const accept = vi.fn()
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { requireKey: true, defaultKey: '', accept })

        await wrapper.findAll('input[type="radio"]')[0].setValue()
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(accept).not.toHaveBeenCalled()
        expect(wrapper.find('.invalid-feedback').text()).toBe('A copy needs a process key of its own.')
    })

    it('passes the key along with the folder', async () => {
        const accept = vi.fn().mockResolvedValue()
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { requireKey: true, defaultKey: 'invoice-copy', accept })

        await wrapper.findAll('input[type="radio"]')[0].setValue()
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(accept).toHaveBeenCalledWith('general', 'invoice-copy')
    })

    it('keeps the dialog open and shows what the backend refused', async () => {
        const accept = vi.fn().mockRejectedValue({
            response: { data: { type: 'ExistingProcessKeyException', params: ['invoice-copy'] } }
        })
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { accept })

        await wrapper.findAll('input[type="radio"]')[0].setValue()
        await wrapper.find('button.btn-primary').trigger('click')
        await flushPromises()

        expect(wrapper.find('.invalid-feedback').text()).toBe('"invoice-copy" is already taken.')
    })
})
