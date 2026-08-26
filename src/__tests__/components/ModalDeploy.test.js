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

const m = vi.hoisted(() => ({
    fetchForms: vi.fn(),
    fetchFormById: vi.fn(),
    modalShow: vi.fn(),
}))

vi.mock('bootstrap', () => ({
    Modal: vi.fn(function () { return { show: m.modalShow } }),
    Tooltip: vi.fn(),
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: k => k }) }))
vi.mock('../../services/deployService', () => ({
    deployProcess: vi.fn(),
    startProcess: vi.fn(),
}))
vi.mock('../../services/formService', () => ({
    fetchForms: m.fetchForms,
    fetchFormById: m.fetchFormById,
}))
vi.mock('min-dash', () => ({ debounce: fn => fn }))

import ModalDeploy from '../../components/modals/ModalDeploy.vue'

// --- fixtures ---

const BPMN_WITH_REF =
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
    'xmlns:camunda="http://camunda.org/schema/1.0/bpmn">' +
    '<bpmn:process id="proc">' +
    '<bpmn:userTask id="t1" camunda:formRef="invoice-form"/>' +
    '</bpmn:process>' +
    '</bpmn:definitions>'

const BPMN_NO_REF =
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">' +
    '<bpmn:process id="proc"><bpmn:userTask id="t1"/></bpmn:process>' +
    '</bpmn:definitions>'

const FORM_LIST = [{ id: 'f1', formId: 'invoice-form', name: 'Invoice Form' }]
const FORM_CONTENT = { id: 'invoice-form', components: [], schemaVersion: 4 }

// --- helpers ---

function mountModal({ type = 'bpmn-c7', diagram = BPMN_NO_REF } = {}) {
    return mount(ModalDeploy, {
        props: {
            diagram,
            showModal: false,
            tabNavList: { type, id: 'tab-1', name: 'My Process' },
        },
        global: { mocks: { $t: k => k } },
    })
}

const searchInput = wrapper =>
    wrapper.find('input[placeholder="deployForm.forms.search"]')

// Trigger modal open via prop
async function openModal(wrapper) {
    await wrapper.setProps({ showModal: true })
    await flushPromises()
}

// --- tests ---

describe('ModalDeploy — form picker', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        m.fetchForms.mockResolvedValue([])
        m.fetchFormById.mockResolvedValue(FORM_CONTENT)
    })

    describe('panel visibility', () => {
        it('shows the form picker search input for BPMN diagrams', () => {
            expect(searchInput(mountModal({ type: 'bpmn-c7' })).exists()).toBe(true)
        })

        it('hides the form picker for DMN diagrams', () => {
            expect(searchInput(mountModal({ type: 'dmn' })).exists()).toBe(false)
        })

        it('hides the form picker for form diagrams', () => {
            expect(searchInput(mountModal({ type: 'form' })).exists()).toBe(false)
        })
    })

    describe('search', () => {
        it('shows typeToSearch hint initially', () => {
            expect(mountModal().text()).toContain('deployForm.forms.typeToSearch')
        })

        it('does not call fetchForms when fewer than 3 characters are typed', async () => {
            const wrapper = mountModal()
            await searchInput(wrapper).setValue('ab')
            await flushPromises()
            expect(m.fetchForms).not.toHaveBeenCalled()
        })

        it('calls fetchForms with the search term when 3+ characters are typed', async () => {
            m.fetchForms.mockResolvedValue(FORM_LIST)
            const wrapper = mountModal()
            await searchInput(wrapper).setValue('inv')
            await flushPromises()
            expect(m.fetchForms).toHaveBeenCalledWith(0, 10, 'inv')
        })

        it('renders form results returned by fetchForms', async () => {
            m.fetchForms.mockResolvedValue(FORM_LIST)
            const wrapper = mountModal()
            await searchInput(wrapper).setValue('inv')
            await flushPromises()
            expect(wrapper.text()).toContain('Invoice Form')
        })

        it('shows empty message when search returns no results', async () => {
            m.fetchForms.mockResolvedValue([])
            const wrapper = mountModal()
            await searchInput(wrapper).setValue('xyz')
            await flushPromises()
            expect(wrapper.text()).toContain('deployForm.forms.empty')
        })
    })

    describe('adding a form', () => {
        it('fetches form content and adds the resource when a row is clicked', async () => {
            m.fetchForms.mockResolvedValue(FORM_LIST)
            const wrapper = mountModal()
            await searchInput(wrapper).setValue('inv')
            await flushPromises()

            await wrapper.find('[role="button"]').trigger('click')
            await flushPromises()

            expect(m.fetchFormById).toHaveBeenCalledWith('f1')
            expect(wrapper.find('[title="invoice-form.form"]').exists()).toBe(true)
        })

        it('adds the resource on Enter key as well', async () => {
            m.fetchForms.mockResolvedValue(FORM_LIST)
            const wrapper = mountModal()
            await searchInput(wrapper).setValue('inv')
            await flushPromises()

            await wrapper.find('[role="button"]').trigger('keyup.enter')
            await flushPromises()

            expect(wrapper.find('[title="invoice-form.form"]').exists()).toBe(true)
        })

        it('does not add the same form twice', async () => {
            m.fetchForms.mockResolvedValue(FORM_LIST)
            const wrapper = mountModal()
            await searchInput(wrapper).setValue('inv')
            await flushPromises()

            const row = wrapper.find('[role="button"]')
            await row.trigger('click')
            await flushPromises()
            await row.trigger('click')
            await flushPromises()

            expect(m.fetchFormById).toHaveBeenCalledOnce()
        })

        it('shows an error toast when fetchFormById fails', async () => {
            m.fetchForms.mockResolvedValue(FORM_LIST)
            m.fetchFormById.mockRejectedValue(new Error('network error'))
            const wrapper = mountModal()
            await searchInput(wrapper).setValue('inv')
            await flushPromises()

            await wrapper.find('[role="button"]').trigger('click')
            await flushPromises()

            const emitted = wrapper.emitted('showToastMessage')
            expect(emitted).toBeTruthy()
            expect(emitted[0][0].isSuccess).toBe(false)
            expect(emitted[0][0].toastText).toBe('deployForm.forms.addError')
        })
    })

    describe('auto-add on modal open', () => {
        it('auto-adds forms matching camunda:formRef on modal open', async () => {
            m.fetchForms.mockResolvedValue(FORM_LIST)
            const wrapper = mountModal({ diagram: BPMN_WITH_REF })
            await openModal(wrapper)

            expect(m.fetchForms).toHaveBeenCalledWith(0, 1, 'invoice-form')
            expect(wrapper.find('[title="invoice-form.form"]').exists()).toBe(true)
        })

        it('does not call fetchForms when the BPMN has no formRef attributes', async () => {
            const wrapper = mountModal({ diagram: BPMN_NO_REF })
            await openModal(wrapper)
            expect(m.fetchForms).not.toHaveBeenCalled()
        })

        it('silently skips auto-add when the form is not found in the modeler', async () => {
            m.fetchForms.mockResolvedValue([]) // no match
            const wrapper = mountModal({ diagram: BPMN_WITH_REF })
            await openModal(wrapper)
            expect(wrapper.find('[title="invoice-form.form"]').exists()).toBe(false)
        })

        it('resets the resource list on each modal open', async () => {
            m.fetchForms.mockResolvedValue(FORM_LIST)
            const wrapper = mountModal({ diagram: BPMN_WITH_REF })

            await openModal(wrapper)
            expect(wrapper.findAll('[title="invoice-form.form"]')).toHaveLength(1)

            // Open again — list should not accumulate
            await wrapper.setProps({ showModal: false })
            m.fetchForms.mockResolvedValue(FORM_LIST)
            await openModal(wrapper)
            expect(wrapper.findAll('[title="invoice-form.form"]')).toHaveLength(1)
        })
    })
})
