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
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('bootstrap', () => ({
    Modal: vi.fn(function () { return { show: vi.fn(), hide: vi.fn() } }),
    Tooltip: vi.fn(),
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: k => k }) }))

import ModalNewDiagram from '../../components/modals/ModalNewDiagram.vue'

const mountModal = (checkDuplicateId = () => false) =>
    mount(ModalNewDiagram, {
        attachTo: document.body,
        props: { checkDuplicateId },
        global: { mocks: { $t: k => k } },
    })

const open = async (wrapper, cb, type = 'bpmn-c7') => {
    await wrapper.vm._toggleModalNewDiagram(true, cb, type)
    await flushPromises()
}

describe('ModalNewDiagram duplicate-id validation', () => {
    it('shows the inline error and blocks Accept when the id already exists', async () => {
        const cb = vi.fn()
        const wrapper = mountModal(() => true) // every id is a duplicate
        await open(wrapper, cb)

        await wrapper.find('#processIdInput').setValue('existing-id')
        await wrapper.find('.btn-primary').trigger('click')
        await flushPromises()

        expect(wrapper.find('.invalid-feedback').text()).toContain('modalNewDiagram.duplicatedId')
        expect(cb).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('accepts and fires the callback when the id is unique', async () => {
        const cb = vi.fn()
        const wrapper = mountModal(() => false)
        await open(wrapper, cb)

        await wrapper.find('#processNameInput').setValue('My Process')
        await wrapper.find('#processIdInput').setValue('unique-id')
        await wrapper.find('.btn-primary').trigger('click')
        await flushPromises()

        expect(cb).toHaveBeenCalledWith('My Process', 'unique-id')
        wrapper.unmount()
    })

    it('checks the id (with type) only on Create click', async () => {
        const check = vi.fn(() => false)
        const wrapper = mountModal(check)
        await open(wrapper, vi.fn(), 'form')

        await wrapper.find('#processIdInput').setValue('some-form')
        expect(check).not.toHaveBeenCalled() // not while typing

        await wrapper.find('.btn-primary').trigger('click')
        await flushPromises()

        expect(check).toHaveBeenCalledWith('some-form', 'form')
        wrapper.unmount()
    })
})
