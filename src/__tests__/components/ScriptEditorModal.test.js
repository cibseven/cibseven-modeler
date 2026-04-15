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
import ScriptEditorModal from '../../components/modals/ScriptEditorModal.vue'

// Stub BModal: expose show/hide and emit lifecycle events via the ref
vi.mock('@cib/common-frontend', () => ({
    BModal: {
        name: 'BModal',
        props: ['title', 'size', 'bodyClass'],
        emits: ['shown', 'hidden'],
        template: '<div><slot /><slot name="modal-footer" /></div>',
        methods: {
            show() { this.$emit('shown') },
            hide() { this.$emit('hidden') },
        },
    },
}))

// Minimal Monaco editor mock
const mockEditor = {
    getValue: vi.fn(() => 'editor content'),
    setValue: vi.fn(),
    dispose: vi.fn(),
}
const mockMonaco = {
    editor: {
        create: vi.fn(() => mockEditor),
    },
}

function mountModal() {
    return mount(ScriptEditorModal, {
        global: {
            provide: { monaco: mockMonaco },
            mocks: { $t: (k) => k },
        },
        attachTo: document.body,
    })
}

describe('ScriptEditorModal', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockEditor.getValue.mockReturnValue('editor content')
    })

    describe('language mapping', () => {
        // We test _mapLanguage indirectly via open() → monaco.editor.create language arg
        const cases = [
            ['javascript', 'javascript'],
            ['JavaScript', 'javascript'],
            ['python', 'python'],
            ['ruby', 'ruby'],
            ['xml', 'xml'],
            ['sql', 'sql'],
            ['groovy', 'java'],
            [null, 'java'],
            [undefined, 'java'],
            ['', 'java'],
        ]

        cases.forEach(([input, expected]) => {
            it(`maps "${input}" → "${expected}"`, async () => {
                const wrapper = mountModal()
                wrapper.vm.open('code', input)
                await flushPromises()
                const callArgs = mockMonaco.editor.create.mock.calls[0]
                expect(callArgs[1].language).toBe(expected)
            })
        })
    })

    describe('promise contract', () => {
        it('accept() resolves with the editor value', async () => {
            const wrapper = mountModal()
            const promise = wrapper.vm.open('initial code', 'javascript')
            await flushPromises()

            mockEditor.getValue.mockReturnValue('updated code')
            await wrapper.find('button.btn-primary').trigger('click')

            const result = await promise
            expect(result).toBe('updated code')
        })

        it('cancel() resolves with null', async () => {
            const wrapper = mountModal()
            const promise = wrapper.vm.open('initial code', 'javascript')
            await flushPromises()

            await wrapper.find('button.btn-secondary').trigger('click')

            const result = await promise
            expect(result).toBeNull()
        })

        it('hidden event (backdrop close) resolves with null', async () => {
            const wrapper = mountModal()
            const promise = wrapper.vm.open('some code', 'java')
            await flushPromises()

            // Simulate backdrop dismiss without accept/cancel
            await wrapper.findComponent({ name: 'BModal' }).vm.$emit('hidden')
            await flushPromises()

            const result = await promise
            expect(result).toBeNull()
        })

        it('disposes and recreates Monaco editor on re-open', async () => {
            const wrapper = mountModal()

            wrapper.vm.open('first', 'javascript')
            await flushPromises()
            expect(mockMonaco.editor.create).toHaveBeenCalledTimes(1)

            // Close via cancel then reopen
            await wrapper.find('button.btn-secondary').trigger('click')
            await flushPromises()

            wrapper.vm.open('second', 'python')
            await flushPromises()
            expect(mockEditor.dispose).toHaveBeenCalled()
            expect(mockMonaco.editor.create).toHaveBeenCalledTimes(2)
        })
    })
})
