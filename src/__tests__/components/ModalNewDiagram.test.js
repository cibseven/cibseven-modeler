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

import { Modal } from 'bootstrap'
import ModalNewDiagram from '../../components/modals/ModalNewDiagram.vue'
import { SKIP_CREATION_MODAL_KEY } from '../../constants/diagramTypes.js'

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

describe('ModalNewDiagram footer', () => {
    // As everywhere in the webclient, the main action comes last
    it('puts "Do it later" first and Accept last', () => {
        const wrapper = mountModal()
        const footer = wrapper.findAll('.modal-footer button').map(button => button.text())
        expect(footer).toEqual(['modalNewDiagram.cancel', 'buttons.accept'])
        wrapper.unmount()
    })
})

describe('ModalNewDiagram skip preference', () => {
    // The page keeps running while the preference changes elsewhere, e.g. in another tab
    it('shows the stored preference each time it opens', async () => {
        localStorage.setItem(SKIP_CREATION_MODAL_KEY, 'true')
        const wrapper = mountModal()
        const checkbox = () => wrapper.find('#dontShowAgainModalCheck').element

        localStorage.setItem(SKIP_CREATION_MODAL_KEY, 'false')
        await open(wrapper, vi.fn())
        expect(checkbox().checked).toBe(false)

        localStorage.setItem(SKIP_CREATION_MODAL_KEY, 'true')
        await open(wrapper, vi.fn())
        expect(checkbox().checked).toBe(true)

        localStorage.removeItem(SKIP_CREATION_MODAL_KEY)
        wrapper.unmount()
    })
})

// The id becomes the id of the process or definitions, so it follows the XML id rules (CIB7-2689)
describe('ModalNewDiagram id format', () => {
    const errorFor = async id => {
        const wrapper = mountModal(() => false)
        await open(wrapper, vi.fn())
        await wrapper.find('#processIdInput').setValue(id)
        const error = wrapper.findAll('.invalid-feedback').map(e => e.text()).find(text => text.includes('qnameError'))
        wrapper.unmount()
        return error ?? null
    }

    it.each(['Process_1', '_draft', 'invoice-2.1'])('accepts %s', async id => {
        expect(await errorFor(id)).toBeNull()
    })

    it.each(['-invoice', '.invoice', '1invoice', 'my invoice', 'a:b'])('refuses %s', async id => {
        expect(await errorFor(id)).toContain('modalNewDiagram.qnameError')
    })
})

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

// Every answer opens a diagram tab, so the dialog takes one per opening (CIB7-2827)
describe('ModalNewDiagram one answer per opening', () => {
    /** A duplicate check that answers every pending call only when told to, as a slow backend does. */
    const slowCheck = () => {
        const pending = []
        const check = vi.fn(() => new Promise(done => pending.push(done)))
        return { check, answer: duplicated => pending.forEach(done => done(duplicated)) }
    }
    const withId = async (wrapper, id = 'Process_1') => {
        await wrapper.find('#processIdInput').setValue(id)
    }
    const accept = wrapper => wrapper.find('.btn-primary').trigger('click')
    const later = wrapper => wrapper.find('.btn-secondary').trigger('click')
    const lastModal = () => Modal.mock.results.at(-1).value

    it('opens one diagram however often Accept is clicked', async () => {
        const { check, answer } = slowCheck()
        const cb = vi.fn()
        const wrapper = mountModal(check)
        await open(wrapper, cb)
        await withId(wrapper)

        await accept(wrapper)
        await accept(wrapper)
        answer(false)
        await flushPromises()

        expect(cb).toHaveBeenCalledOnce()
        wrapper.unmount()
    })

    it('opens one diagram however often Enter is pressed', async () => {
        const { check, answer } = slowCheck()
        const cb = vi.fn()
        const wrapper = mountModal(check)
        await open(wrapper, cb)
        await withId(wrapper)

        await wrapper.find('#processIdInput').trigger('keyup.enter')
        await wrapper.find('#processIdInput').trigger('keyup.enter')
        answer(false)
        await flushPromises()

        expect(cb).toHaveBeenCalledOnce()
        wrapper.unmount()
    })

    it('opens one diagram however often "Do it later" is clicked', async () => {
        const cb = vi.fn()
        const wrapper = mountModal()
        await open(wrapper, cb)

        // Called directly: the disabled button would not pass the second click on at all
        await later(wrapper)
        wrapper.vm.$.setupState.handleCancel()
        await flushPromises()

        expect(cb).toHaveBeenCalledOnce()
        expect(cb).toHaveBeenCalledWith(null, null)
        wrapper.unmount()
    })

    it('ignores "Do it later" while an Accept is being checked', async () => {
        const { check, answer } = slowCheck()
        const cb = vi.fn()
        const wrapper = mountModal(check)
        await open(wrapper, cb)
        await withId(wrapper)

        await accept(wrapper)
        wrapper.vm.$.setupState.handleCancel()
        answer(false)
        await flushPromises()

        expect(cb).toHaveBeenCalledOnce()
        expect(cb).toHaveBeenCalledWith('', 'Process_1')
        wrapper.unmount()
    })

    it('disables both answers once one is given', async () => {
        const { check } = slowCheck()
        const wrapper = mountModal(check)
        await open(wrapper, vi.fn())
        await withId(wrapper)

        await accept(wrapper)

        expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
        expect(wrapper.find('.btn-secondary').attributes('disabled')).toBeDefined()
        wrapper.unmount()
    })

    it('can be answered again after the id was taken', async () => {
        const check = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false)
        const cb = vi.fn()
        const wrapper = mountModal(check)
        await open(wrapper, cb)
        await withId(wrapper, 'Taken')
        await accept(wrapper)
        await flushPromises()

        await withId(wrapper, 'Free')
        await accept(wrapper)
        await flushPromises()

        expect(cb).toHaveBeenCalledOnce()
        expect(cb).toHaveBeenCalledWith('', 'Free')
        wrapper.unmount()
    })

    it('takes an answer again when it is opened again', async () => {
        const first = vi.fn()
        const second = vi.fn()
        const wrapper = mountModal()
        await open(wrapper, first)
        await later(wrapper)

        await open(wrapper, second)
        await later(wrapper)

        expect(second).toHaveBeenCalledOnce()
        wrapper.unmount()
    })

    // Bootstrap ignores hide() during the fade-in, which left the dialog open for a second click
    it('closes once fully shown when answered during the fade-in', async () => {
        const wrapper = mountModal()
        await open(wrapper, vi.fn())

        await later(wrapper)
        expect(lastModal().hide).not.toHaveBeenCalled()

        wrapper.element.dispatchEvent(new Event('shown.bs.modal'))
        expect(lastModal().hide).toHaveBeenCalledOnce()
        wrapper.unmount()
    })
})
