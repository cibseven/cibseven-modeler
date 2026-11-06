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
            createProject: 'Create project', renameProject: 'Rename project', projectName: 'Project name',
            projectNameRequired: 'A project needs a name.',
            projectNameTaken: 'A project with that name is already there.',
            projectSaveFailed: 'The project could not be saved.',
            nameRequired: 'A folder needs a name.', saveFailed: 'The folder could not be saved.',
            projects: 'Projects', destination: 'Destination', currentLocation: 'current location',
            copyKey: 'Process key of the copy',
            copyKeyRequired: 'A copy needs a process key of its own.',
            copyFormId: 'Form id of the copy',
            copyFormIdRequired: 'A copy needs a form id of its own.',
            nameTaken: 'A folder with that name is already there.',
            nameTooLong: 'The name is longer than 255 characters.',
            keyTaken: '"{key}" is already taken.',
            filterFolders: 'Filter folders', filterNoMatch: 'No folder matches "{keyword}".',
            selectedDestination: 'Selected'
        },
        buttons: { accept: 'Accept', cancel: 'Cancel', close: 'Close' }
    }
}

const mountModal = component => mount(component, {
    global: { plugins: [createI18n({ legacy: false, locale: 'en', messages })] },
    attachTo: document.body,
})

/** Fills in the parent and the path of rows in tree order, as useFolders.flatten gives them. */
const asRows = list => {
    const parents = []
    return list.map(row => {
        parents.length = row.depth
        const parent = parents.at(-1) ?? null
        parents.push(row)
        return { userFolder: false, ...row, parentId: parent?.id ?? null, path: parents.map(p => p.name).join(' / ') }
    })
}

const FOLDERS = asRows([
    { id: 'general', name: 'General', depth: 0 },
    { id: 'invoicing', name: 'Invoicing', depth: 1 },
])

describe('FolderNameModal', () => {
    beforeEach(() => vi.clearAllMocks())

    it('starts empty when a folder is created', async () => {
        const wrapper = mountModal(FolderNameModal)

        wrapper.vm.show('create', '', vi.fn())
        await flushPromises()

        expect(wrapper.find('input').element.value).toBe('')
        expect(wrapper.find('.modal-title').text()).toBe('New folder')
    })

    // As everywhere in the webclient, the main action comes last
    it('puts Cancel first and Accept last', () => {
        const wrapper = mountModal(FolderNameModal)

        expect(wrapper.findAll('.modal-footer button').map(button => button.text())).toEqual(['Cancel', 'Accept'])
    })

    // A folder at the top level is a project, and every text of the dialog calls it one
    describe('for a project', () => {
        const showProject = async (mode, name, accept) => {
            const wrapper = mountModal(FolderNameModal)
            wrapper.vm.show(mode, name, accept, 'project')
            await flushPromises()
            return wrapper
        }
        const accept = async wrapper => {
            await wrapper.find('button.btn-primary').trigger('click')
            await flushPromises()
        }

        it('asks for a project name when one is created', async () => {
            const wrapper = await showProject('create', '', vi.fn())

            expect(wrapper.find('.modal-title').text()).toBe('Create project')
            expect(wrapper.find('label').text()).toBe('Project name')
            expect(wrapper.find('input').element.value).toBe('')
        })

        it('speaks of renaming the project', async () => {
            const wrapper = await showProject('rename', 'Invoicing', vi.fn())

            expect(wrapper.find('.modal-title').text()).toBe('Rename project')
            expect(wrapper.find('input').element.value).toBe('Invoicing')
        })

        it('says a project needs a name', async () => {
            const wrapper = await showProject('create', '', vi.fn())

            await accept(wrapper)

            expect(wrapper.find('[role="alert"]').text()).toBe('A project needs a name.')
        })

        it('says a project with that name is already there', async () => {
            const refuse = vi.fn().mockRejectedValue({
                response: { data: { type: 'InvalidFolderException', params: ['name', 'a folder with that name is already there'] } }
            })
            const wrapper = await showProject('create', '', refuse)
            await wrapper.find('input').setValue('Invoicing')

            await accept(wrapper)

            expect(wrapper.find('[role="alert"]').text()).toBe('A project with that name is already there.')
        })

        it('says the project could not be saved', async () => {
            const wrapper = await showProject('create', '', vi.fn().mockRejectedValue(new Error('offline')))
            await wrapper.find('input').setValue('Invoicing')

            await accept(wrapper)

            expect(wrapper.find('[role="alert"]').text()).toBe('The project could not be saved.')
        })

        it('speaks of a folder again when the next one is opened without a kind', async () => {
            const wrapper = await showProject('create', '', vi.fn())

            wrapper.vm.show('create', '', vi.fn())
            await flushPromises()

            expect(wrapper.find('.modal-title').text()).toBe('New folder')
            expect(wrapper.find('label').text()).toBe('Folder name')
        })
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

        const labels = wrapper.findAll('.folder-picker-row')
        expect(labels).toHaveLength(2)
        expect(labels[1].text()).toContain('Invoicing')
    })

    /** The whole row moves in, radio included, so a subfolder reads as nested (CIB7-2591). */
    it('indents the whole row by depth, and the folders one more under the top level', async () => {
        const wrapper = mountModal(FolderPickerModal)
        const indents = () => wrapper.findAll('.folder-picker-row').map(row => row.element.style.paddingLeft)

        await open(wrapper)
        expect(indents()).toEqual(['calc(0.75rem)', 'calc(2.25rem)'])

        await open(wrapper, { allowTopLevel: true })
        expect(indents()).toEqual(['calc(0.75rem)', 'calc(2.25rem)', 'calc(3.75rem)'])
    })

    it('shows projects, folders and user folders with the icons of the start page', async () => {
        const wrapper = mountModal(FolderPickerModal)

        await open(wrapper, { folders: [...FOLDERS, ...asRows([{ id: 'adrian', name: 'adrian', depth: 0, userFolder: true }])] })

        const icons = wrapper.findAll('.folder-picker-row .mdi').map(icon => icon.classes().find(c => c.startsWith('mdi-')))
        expect(icons).toEqual(['mdi-briefcase', 'mdi-folder-outline', 'mdi-folder-account-outline'])
    })

    describe('the choice', () => {
        it('marks the chosen row and names its path under the list', async () => {
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper)
            expect(wrapper.find('.folder-picker-choice').text()).toBe('')

            await wrapper.findAll('input[type="radio"]')[1].setValue()

            expect(wrapper.findAll('.folder-picker-row')[1].classes()).toEqual(expect.arrayContaining(['is-selected', 'bg-primary-subtle']))
            expect(wrapper.findAll('.folder-picker-row')[0].classes()).not.toContain('is-selected')
            expect(wrapper.find('.folder-picker-choice').text()).toMatch(/Selected:\s*General \/ Invoicing/)
        })

        it('names the top level as the projects', async () => {
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, { allowTopLevel: true })

            await wrapper.findAll('input[type="radio"]')[0].setValue()

            expect(wrapper.find('.folder-picker-choice').text()).toMatch(/Selected:\s*Projects$/)
        })

        it('tells apart folders that share a name by their parents', async () => {
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, {
                folders: asRows([
                    { id: 'a', name: 'Sales', depth: 0 }, { id: 'a-2024', name: '2024', depth: 1 },
                    { id: 'b', name: 'Support', depth: 0 }, { id: 'b-2024', name: '2024', depth: 1 }
                ]),
                selected: 'b-2024'
            })

            expect(wrapper.find('.folder-picker-choice').text()).toMatch(/Support \/ 2024/)
        })
    })

    describe('the filter', () => {
        const MANY = asRows([
            { id: 'sales', name: 'Sales', depth: 0 },
            { id: 'invoices', name: 'Invoices', depth: 1 },
            { id: 'archive', name: 'Archive', depth: 2 },
            { id: 'orders', name: 'Orders', depth: 1 },
            { id: 'support', name: 'Support', depth: 0 },
            { id: 'tickets', name: 'Tickets', depth: 1 },
            { id: 'hr', name: 'HR', depth: 0 },
            { id: 'payroll', name: 'Payroll', depth: 1 },
        ])
        const names = wrapper => wrapper.findAll('.folder-picker-row').map(row => row.text())
        const filterBy = async (wrapper, text) => {
            await wrapper.find('input[type="search"]').setValue(text)
            await flushPromises()
        }

        it('is offered only once the list is long', async () => {
            const wrapper = mountModal(FolderPickerModal)

            await open(wrapper)
            expect(wrapper.find('input[type="search"]').exists()).toBe(false)

            await open(wrapper, { folders: MANY })
            expect(wrapper.find('input[type="search"]').exists()).toBe(true)
            expect(wrapper.find(`label[for="${wrapper.find('input[type="search"]').attributes('id')}"]`).text())
                .toBe('Filter folders')
        })

        it('keeps the matching folders with their parents, ignoring case', async () => {
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, { folders: MANY })

            await filterBy(wrapper, 'ARCH')

            expect(names(wrapper)).toEqual(['Sales', 'Invoices', 'Archive'])
        })

        it('keeps the top level, which is no folder to match', async () => {
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, { folders: MANY, allowTopLevel: true })

            await filterBy(wrapper, 'payroll')

            expect(names(wrapper)).toEqual(['Projects', 'HR', 'Payroll'])
        })

        it('says when nothing matches', async () => {
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, { folders: MANY })

            await filterBy(wrapper, 'nothing')

            expect(names(wrapper)).toEqual([])
            expect(wrapper.text()).toContain('No folder matches "nothing".')
        })

        /** A filter must not hide where the model is about to go. */
        it('keeps the choice listed, with its parents, whatever the filter', async () => {
            const accept = vi.fn().mockResolvedValue()
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, { folders: MANY, selected: 'tickets', accept })

            await filterBy(wrapper, 'payroll')
            expect(names(wrapper)).toEqual(['Support', 'Tickets', 'HR', 'Payroll'])
            expect(wrapper.find('.is-selected').text()).toBe('Tickets')

            await wrapper.find('button.btn-primary').trigger('click')
            await flushPromises()
            expect(accept).toHaveBeenCalledWith('tickets', '')
        })

        it('lets go of a former choice once another folder is chosen', async () => {
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, { folders: MANY, selected: 'tickets' })
            await filterBy(wrapper, 'payroll')

            await wrapper.findAll('input[type="radio"]')[3].setValue()

            expect(names(wrapper)).toEqual(['HR', 'Payroll'])
        })

        /** Esc on a search box clears it; closing the dialog would throw away a dropped file. */
        it('is emptied by Esc, which then does not reach the dialog', async () => {
            const wrapper = mountModal(FolderPickerModal)
            const dialogHeard = vi.fn()
            await open(wrapper, { folders: MANY })
            wrapper.element.addEventListener('keydown', dialogHeard)
            await filterBy(wrapper, 'payroll')

            await wrapper.find('input[type="search"]').trigger('keydown', { key: 'Escape' })
            expect(wrapper.find('input[type="search"]').element.value).toBe('')
            expect(dialogHeard).not.toHaveBeenCalled()

            await wrapper.find('input[type="search"]').trigger('keydown', { key: 'Escape' })
            expect(dialogHeard).toHaveBeenCalledOnce()
        })

        it('scrolls back to the choice once it is cleared', async () => {
            const scrollIntoView = vi.fn()
            Element.prototype.scrollIntoView = scrollIntoView
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, { folders: MANY, selected: 'payroll' })
            await filterBy(wrapper, 'arch')
            expect(scrollIntoView).not.toHaveBeenCalled()

            await filterBy(wrapper, '')

            expect(scrollIntoView).toHaveBeenCalledOnce()
            expect(scrollIntoView.mock.contexts[0].textContent).toBe('Payroll')
            delete Element.prototype.scrollIntoView
        })

        it('stays outside the group of destinations', async () => {
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, { folders: MANY })

            expect(wrapper.find('[role="radiogroup"] input[type="search"]').exists()).toBe(false)
        })

        it('starts empty every time the dialog opens', async () => {
            const wrapper = mountModal(FolderPickerModal)
            await open(wrapper, { folders: MANY })
            await filterBy(wrapper, 'payroll')

            await open(wrapper, { folders: MANY })

            expect(wrapper.find('input[type="search"]').element.value).toBe('')
            expect(names(wrapper)).toHaveLength(MANY.length)
        })
    })

    /** One group is one tab stop, and the arrow keys move between the folders. */
    it('makes the destinations one radio group, labelled by the destination', async () => {
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { allowTopLevel: true })

        const group = wrapper.find('[role="radiogroup"]')
        const names = group.findAll('input[type="radio"]').map(radio => radio.attributes('name'))
        expect(names).toHaveLength(3)
        expect(new Set(names).size).toBe(1)
        expect(names[0]).toBeTruthy()
        expect(document.getElementById(group.attributes('aria-labelledby')).textContent).toBe('Destination')
    })

    /** The radio just chosen has said it already; reading the path again would double every step. */
    it('does not announce the path of the choice', async () => {
        const wrapper = mountModal(FolderPickerModal)
        await open(wrapper, { selected: 'invoicing' })

        expect(wrapper.find('.folder-picker-choice').attributes('aria-live')).toBeUndefined()
    })

    /** An import opened on the folder the last one went into shows that folder, however far down. */
    it('scrolls the choice already made into view', async () => {
        const scrollIntoView = vi.fn()
        Element.prototype.scrollIntoView = scrollIntoView
        const wrapper = mountModal(FolderPickerModal)

        await open(wrapper, { selected: 'invoicing' })
        expect(scrollIntoView).not.toHaveBeenCalled()

        wrapper.element.dispatchEvent(new Event('shown.bs.modal'))

        expect(scrollIntoView).toHaveBeenCalledOnce()
        expect(scrollIntoView.mock.contexts[0].textContent).toContain('Invoicing')
        delete Element.prototype.scrollIntoView
    })

    /** A model cannot sit at the top level, so it is only offered when a folder may move there. */
    it('offers the top level only when it is allowed', async () => {
        const wrapper = mountModal(FolderPickerModal)

        await open(wrapper)
        expect(wrapper.text()).not.toContain('Projects')

        await open(wrapper, { allowTopLevel: true })
        expect(wrapper.text()).toContain('Projects')
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

    /** A copy keeps its key elsewhere, but beside the original it needs one of its own (CIB7-2277). */
    it('suggests the key for the folder chosen until the user types one', async () => {
        const wrapper = mountModal(FolderPickerModal)
        const keyFor = folderId => folderId === 'invoicing' ? 'invoice-copy' : 'invoice'
        await open(wrapper, { requireKey: true, defaultKey: 'invoice', keyFor })
        const key = () => wrapper.find('input[type="text"]').element.value

        expect(key()).toBe('invoice')
        await wrapper.findAll('input[type="radio"]')[1].setValue()
        await flushPromises()
        expect(key()).toBe('invoice-copy')

        await wrapper.find('input[type="text"]').setValue('mine')
        await wrapper.findAll('input[type="radio"]')[0].setValue()
        await flushPromises()
        expect(key()).toBe('mine')
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

    it('puts Cancel first and Accept last', () => {
        const wrapper = mountModal(FolderPickerModal)

        expect(wrapper.findAll('.modal-footer button').map(button => button.text())).toEqual(['Cancel', 'Accept'])
    })

    describe('the current location', () => {
        const radios = wrapper => wrapper.findAll('input[type="radio"]')

        it('is listed but cannot be chosen', async () => {
            const wrapper = mountModal(FolderPickerModal)

            await open(wrapper, { current: 'invoicing' })

            expect(radios(wrapper)[0].attributes('disabled')).toBeUndefined()
            expect(radios(wrapper)[1].attributes('disabled')).toBeDefined()
            expect(wrapper.findAll('.folder-picker-row')[1].text()).toContain('Invoicing')
            expect(wrapper.findAll('.folder-picker-row')[1].text()).toContain('(current location)')
        })

        it('is the top level for a folder that sits there', async () => {
            const wrapper = mountModal(FolderPickerModal)

            await open(wrapper, { allowTopLevel: true, current: null })

            expect(radios(wrapper)[0].attributes('disabled')).toBeDefined()
            expect(wrapper.findAll('.folder-picker-row')[0].text()).toMatch(/Projects\s*\(current location\)/)
            expect(radios(wrapper).slice(1).every(radio => radio.attributes('disabled') === undefined)).toBe(true)
        })

        it('is never the choice already made', async () => {
            const wrapper = mountModal(FolderPickerModal)

            await open(wrapper, { current: 'invoicing', selected: 'invoicing' })

            expect(radios(wrapper)[1].element.checked).toBe(false)
            expect(wrapper.find('button.btn-primary').attributes('disabled')).toBeDefined()
        })

        it('leaves every folder selectable when none is given', async () => {
            const wrapper = mountModal(FolderPickerModal)

            await open(wrapper, { current: 'invoicing' })
            await open(wrapper, { allowTopLevel: true })

            expect(radios(wrapper).every(radio => radio.attributes('disabled') === undefined)).toBe(true)
            expect(wrapper.text()).not.toContain('current location')
        })
    })
})
