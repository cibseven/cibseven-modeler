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
import { createStore } from 'vuex'
import AddElementTemplateModal from '../../../components/templates/AddElementTemplateModal.vue'

const modalShow = vi.fn()
const modalHide = vi.fn()

vi.mock('bootstrap', () => ({
    Modal: vi.fn(function() {
        this.show = modalShow
        this.hide = modalHide
        this.dispose = vi.fn()
    }),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key }),
}))

const storeDispatch = vi.fn()

vi.mock('vuex', () => ({
    useStore: () => ({
        dispatch: storeDispatch,
    }),
}))

const validContent = JSON.stringify({ id: 'com.example.template', name: 'Example', appliesTo: ['bpmn:ServiceTask'] })

function mountModal() {
    return mount(AddElementTemplateModal, {
        global: {
            mocks: { $t: (key) => key },
        },
        attachTo: document.body,
    })
}

describe('AddElementTemplateModal', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        storeDispatch.mockResolvedValue({ id: 'new-template' })
    })

    it('exposes show and setEditTemplate', () => {
        const wrapper = mountModal()
        expect(wrapper.vm.show).toBeTypeOf('function')
        expect(wrapper.vm.setEditTemplate).toBeTypeOf('function')
    })

    it('validates required fields and template id format', async () => {
        const wrapper = mountModal()
        wrapper.vm.form.templateId = 'bad id!'
        wrapper.vm.form.name = ''
        wrapper.vm.form.content = ''
        wrapper.vm.validateForm()

        expect(wrapper.vm.errors.templateId).toBeTruthy()
        expect(wrapper.vm.errors.name).toBeTruthy()
        expect(wrapper.vm.errors.content).toBeTruthy()
        expect(wrapper.vm.canSubmit).toBeFalsy()
    })

    it('accepts valid form data', async () => {
        const wrapper = mountModal()
        wrapper.vm.form.templateId = 'com.example.template'
        wrapper.vm.form.name = 'Example'
        wrapper.vm.form.content = validContent
        wrapper.vm.validateForm()

        expect(wrapper.vm.canSubmit).toBe(true)
    })

    it('creates a template on submit', async () => {
        const wrapper = mountModal()
        wrapper.vm.currentStep = 'form'
        wrapper.vm.form.templateId = 'com.example.template'
        wrapper.vm.form.name = 'Example'
        wrapper.vm.form.content = validContent

        await wrapper.vm.submitForm()
        await flushPromises()

        expect(storeDispatch).toHaveBeenCalledWith(
            'modeler/elementTemplates/createElementTemplate',
            expect.objectContaining({ templateId: 'com.example.template', name: 'Example' }),
        )
        expect(wrapper.emitted('templateCreated')).toBeTruthy()
    })

    it('updates a template in edit mode', async () => {
        const wrapper = mountModal()
        wrapper.vm.setEditTemplate({
            id: 'db-1',
            templateId: 'com.example.template',
            name: 'Example',
            description: 'Desc',
            content: validContent,
            active: true,
        })

        expect(wrapper.vm.isEditMode).toBe(true)
        expect(wrapper.vm.form.templateId).toBe('com.example.template')

        await wrapper.vm.submitForm()
        await flushPromises()

        expect(storeDispatch).toHaveBeenCalledWith(
            'modeler/elementTemplates/updateElementTemplateFull',
            expect.objectContaining({ templateId: 'db-1' }),
        )
    })

    it('rejects unsupported file types', async () => {
        const wrapper = mountModal()
        const file = new File(['{}'], 'template.xml', { type: 'application/xml' })
        wrapper.vm.handleFileSelection({ target: { files: [file] } })

        expect(wrapper.vm.uploadedFiles).toHaveLength(0)
        expect(wrapper.vm.errorMessage).toBe('templatesManagement.addTemplateDialog.unsupportedFileType')
    })

    it('formats JSON content', async () => {
        const wrapper = mountModal()
        wrapper.vm.form.content = '{"id":"x","name":"y"}'
        wrapper.vm.formatJson()
        expect(wrapper.vm.form.content).toContain('\n')
        expect(wrapper.vm.errors.content).toBe('')
    })

    it('shows store error on failed submit', async () => {
        storeDispatch.mockRejectedValueOnce(new Error('save failed'))
        const wrapper = mountModal()
        wrapper.vm.currentStep = 'form'
        wrapper.vm.form.templateId = 'com.example.template'
        wrapper.vm.form.name = 'Example'
        wrapper.vm.form.content = validContent

        await wrapper.vm.submitForm()
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('save failed')
    })

    it('processes a single JSON file into the form', async () => {
        const wrapper = mountModal()
        const file = new File([validContent], 'template.json', { type: 'application/json' })
        wrapper.vm.uploadedFiles = [file]

        await wrapper.vm.processFiles()
        await flushPromises()

        expect(wrapper.vm.form.templateId).toBe('com.example.template')
        expect(wrapper.vm.currentStep).toBe('form')
    })

    it('processes batch JSON array via import dispatch', async () => {
        storeDispatch.mockResolvedValueOnce({ imported: [{ id: 'x' }] })
        const wrapper = mountModal()
        wrapper.vm.importMode = 'batch'
        const batch = JSON.stringify([
            { id: 'com.example.one', name: 'One', appliesTo: ['bpmn:ServiceTask'] },
            { id: 'com.example.two', name: 'Two', appliesTo: ['bpmn:ServiceTask'] },
        ])
        wrapper.vm.uploadedFiles = [new File([batch], 'batch.json', { type: 'application/json' })]

        await wrapper.vm.processFiles()
        await flushPromises()

        expect(storeDispatch).toHaveBeenCalledWith(
            'modeler/elementTemplates/importTemplates',
            expect.any(Array),
        )
    })

    it('rejects files larger than 10MB', () => {
        const wrapper = mountModal()
        const bigContent = 'x'.repeat(11 * 1024 * 1024)
        const file = new File([bigContent], 'big.json', { type: 'application/json' })
        expect(wrapper.vm.validateFile(file)).toBe(false)
        expect(wrapper.vm.errorMessage).toBe('templatesManagement.addTemplateDialog.fileTooLarge')
    })

    it('accepts .txt template files', () => {
        const wrapper = mountModal()
        const file = new File(['{}'], 'template.txt', { type: 'text/plain' })
        expect(wrapper.vm.validateFile(file)).toBe(true)
    })

    it('removeFiles clears uploaded file state', () => {
        const wrapper = mountModal()
        wrapper.vm.uploadedFiles = [new File(['{}'], 'a.json')]
        wrapper.vm.importResults = [{ success: true }]
        wrapper.vm.removeFiles()
        expect(wrapper.vm.uploadedFiles).toHaveLength(0)
        expect(wrapper.vm.importResults).toHaveLength(0)
    })

    it('removeFile removes a single entry and clears when empty', () => {
        const wrapper = mountModal()
        const f1 = new File(['{}'], 'a.json')
        const f2 = new File(['{}'], 'b.json')
        wrapper.vm.uploadedFiles = [f1, f2]
        wrapper.vm.removeFile(0)
        expect(wrapper.vm.uploadedFiles).toHaveLength(1)
        wrapper.vm.removeFile(0)
        expect(wrapper.vm.uploadedFiles).toHaveLength(0)
    })

    it('formatFileSize renders human-readable units', () => {
        const wrapper = mountModal()
        expect(wrapper.vm.formatFileSize(0)).toContain('0')
        expect(wrapper.vm.formatFileSize(1024)).toMatch(/KB|kB/i)
    })

    it('closeModal hides bootstrap modal', () => {
        const wrapper = mountModal()
        wrapper.vm.closeModal()
        expect(modalHide).toHaveBeenCalled()
    })

    it('show resets form and opens modal', () => {
        const wrapper = mountModal()
        wrapper.vm.form.templateId = 'leftover'
        wrapper.vm.show()
        expect(wrapper.vm.isEditMode).toBe(false)
        expect(wrapper.vm.form.templateId).toBe('')
        expect(modalShow).toHaveBeenCalled()
    })

    it('processSingleFile rejects invalid JSON content', async () => {
        const wrapper = mountModal()
        wrapper.vm.uploadedFiles = [new File(['not-json'], 'bad.json', { type: 'application/json' })]
        await wrapper.vm.processFiles()
        await flushPromises()
        expect(wrapper.vm.errorMessage).toBeTruthy()
    })

    it('imports multiple files in multiple mode', async () => {
        storeDispatch.mockResolvedValueOnce({ imported: [{ id: 'a' }, { id: 'b' }] })
        const wrapper = mountModal()
        wrapper.vm.importMode = 'multiple'
        wrapper.vm.uploadedFiles = [
            new File([validContent], 'one.json', { type: 'application/json' }),
            new File([JSON.stringify({ id: 'com.example.two', name: 'Two', appliesTo: ['bpmn:ServiceTask'] })], 'two.json', { type: 'application/json' }),
        ]

        await wrapper.vm.processFiles()
        await flushPromises()

        expect(storeDispatch).toHaveBeenCalledWith(
            'modeler/elementTemplates/importTemplates',
            expect.arrayContaining([
                expect.objectContaining({ templateId: 'com.example.template' }),
                expect.objectContaining({ templateId: 'com.example.two' }),
            ]),
        )
    })

    it('handleContentInput clears content validation error', () => {
        const wrapper = mountModal()
        wrapper.vm.errors.content = 'bad json'
        wrapper.vm.form.content = validContent
        wrapper.vm.handleContentInput()
        expect(wrapper.vm.errors.content).toBe('')
    })
})
