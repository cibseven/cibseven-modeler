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
    fetchFormsByFormId: vi.fn(),
    keyInUseElsewhere: vi.fn(),
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
    fetchFormsByFormId: m.fetchFormsByFormId,
}))
vi.mock('../../services/processService', () => ({
    keyInUseElsewhere: m.keyInUseElsewhere,
}))
vi.mock('min-dash', () => ({ debounce: fn => fn }))

import ModalDeploy from '../../components/modals/ModalDeploy.vue'
import { deployProcess, startProcess } from '../../services/deployService'
import { DEPLOY_STORAGE_KEYS } from '../../constants/diagramTypes'

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

function mountModal({ type = 'bpmn-c7', diagram = BPMN_NO_REF, folderId = null, isSaved = false } = {}) {
    return mount(ModalDeploy, {
        props: {
            diagram,
            showModal: false,
            tabNavList: { type, id: 'tab-1', name: 'My Process', folderId, isSaved },
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
        m.fetchFormsByFormId.mockResolvedValue([])
        m.keyInUseElsewhere.mockResolvedValue(false)
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
            m.fetchFormsByFormId.mockResolvedValue(FORM_LIST)
            const wrapper = mountModal({ diagram: BPMN_WITH_REF })
            await openModal(wrapper)

            expect(m.fetchFormsByFormId).toHaveBeenCalledWith('invoice-form')
            expect(wrapper.find('[title="invoice-form.form"]').exists()).toBe(true)
        })

        it('does not look forms up when the BPMN has no formRef attributes', async () => {
            const wrapper = mountModal({ diagram: BPMN_NO_REF })
            await openModal(wrapper)
            expect(m.fetchFormsByFormId).not.toHaveBeenCalled()
        })

        it('silently skips auto-add when the form is not found in the modeler', async () => {
            const wrapper = mountModal({ diagram: BPMN_WITH_REF })
            await openModal(wrapper)
            expect(wrapper.find('[title="invoice-form.form"]').exists()).toBe(false)
        })

        it('resets the resource list on each modal open', async () => {
            m.fetchFormsByFormId.mockResolvedValue(FORM_LIST)
            const wrapper = mountModal({ diagram: BPMN_WITH_REF })

            await openModal(wrapper)
            expect(wrapper.findAll('[title="invoice-form.form"]')).toHaveLength(1)

            // Open again — list should not accumulate
            await wrapper.setProps({ showModal: false })
            await openModal(wrapper)
            expect(wrapper.findAll('[title="invoice-form.form"]')).toHaveLength(1)
        })

        /** A form id repeats across folders: the form beside the diagram is the one it means (CIB7-2277). */
        it('adds the form in the folder of the diagram when several have the form id, and says so', async () => {
            m.fetchFormsByFormId.mockResolvedValue([
                { id: 'f2', formId: 'invoice-form', folderId: 'archive' },
                { id: 'f1', formId: 'invoice-form', folderId: 'sales' },
            ])
            const wrapper = mountModal({ diagram: BPMN_WITH_REF, folderId: 'sales' })
            await openModal(wrapper)

            expect(m.fetchFormById).toHaveBeenCalledWith('f1')
            expect(m.fetchFormById).not.toHaveBeenCalledWith('f2')
            expect(wrapper.text()).toContain('deployForm.forms.ambiguous')
        })

        it('adds the latest form and warns of nothing when only one has the form id', async () => {
            m.fetchFormsByFormId.mockResolvedValue([{ id: 'f2', formId: 'invoice-form', folderId: 'archive' }])
            const wrapper = mountModal({ diagram: BPMN_WITH_REF, folderId: 'sales' })
            await openModal(wrapper)

            expect(m.fetchFormById).toHaveBeenCalledWith('f2')
            expect(wrapper.text()).not.toContain('deployForm.forms.ambiguous')
        })
    })

    describe('another model with the key', () => {
        it('warns when another model uses the process key, leaving a model not saved yet out', async () => {
            m.keyInUseElsewhere.mockResolvedValue(true)
            const wrapper = mountModal({ diagram: BPMN_NO_REF })
            await openModal(wrapper)

            expect(m.keyInUseElsewhere).toHaveBeenCalledWith('proc', 'process', null)
            expect(wrapper.text()).toContain('deployForm.keyInUse.process')
        })

        it('asks about the form id of a form, leaving the saved form itself out', async () => {
            m.keyInUseElsewhere.mockResolvedValue(true)
            const wrapper = mountModal({ type: 'form', diagram: JSON.stringify({ id: 'invoice-form' }), isSaved: true })
            await openModal(wrapper)

            expect(m.keyInUseElsewhere).toHaveBeenCalledWith('invoice-form', 'form', 'tab-1')
            expect(wrapper.text()).toContain('deployForm.keyInUse.form')
        })

        /** A DMN model has no process key, so its warning speaks of the decisions it deploys. */
        it('warns about a DMN model in its own words', async () => {
            m.keyInUseElsewhere.mockResolvedValue(true)
            const dmn = '<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="invoice-rules"><decision id="d1"/></definitions>'
            const wrapper = mountModal({ type: 'dmn', diagram: dmn })
            await openModal(wrapper)

            expect(m.keyInUseElsewhere).toHaveBeenCalledWith('invoice-rules', 'process', null)
            expect(wrapper.text()).toContain('deployForm.keyInUse.decision')
            expect(wrapper.text()).not.toContain('deployForm.keyInUse.process')
        })

        /** An answer slower than the user belongs to the opening that asked, not to the next one. */
        it('drops the answer of an earlier opening', async () => {
            let answerFirst
            m.keyInUseElsewhere.mockReturnValueOnce(new Promise(resolve => { answerFirst = resolve }))
            m.fetchFormsByFormId.mockReturnValueOnce(new Promise(() => {}))
            const wrapper = mountModal({ diagram: BPMN_WITH_REF })
            await openModal(wrapper)

            await wrapper.setProps({ showModal: false })
            m.fetchFormsByFormId.mockResolvedValue([])
            await openModal(wrapper)
            answerFirst(true)
            await flushPromises()

            expect(wrapper.text()).not.toContain('deployForm.keyInUse')
        })

        it('says nothing when no other model has it, or when there is no answer', async () => {
            const wrapper = mountModal({ diagram: BPMN_NO_REF })
            await openModal(wrapper)
            expect(wrapper.text()).not.toContain('deployForm.keyInUse')

            await wrapper.setProps({ showModal: false })
            m.keyInUseElsewhere.mockRejectedValue(new Error('network'))
            await openModal(wrapper)
            expect(wrapper.text()).not.toContain('deployForm.keyInUse')
        })
    })
})

// --- deploy and start ---

const BPMN_COLLABORATION =
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">' +
    '<bpmn:collaboration id="collab"><bpmn:participant id="p1" processRef="order"/></bpmn:collaboration>' +
    '<bpmn:process id="order" isExecutable="true"/>' +
    '</bpmn:definitions>'

const BPMN_TWO_POOLS =
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">' +
    '<bpmn:collaboration id="collab"/>' +
    '<bpmn:process id="order" name="Order" isExecutable="true"/>' +
    '<bpmn:process id="shipping" name="Shipping" isExecutable="true"/>' +
    '</bpmn:definitions>'

const button = (wrapper, label) => wrapper.findAll('button').find(b => b.text() === label)
const deployButton = wrapper => button(wrapper, 'buttons.deploy')
const startButton = wrapper => button(wrapper, 'buttons.startProcess')
const startedKey = () => startProcess.mock.calls[0][4]
const toasts = wrapper => (wrapper.emitted('showToastMessage') ?? []).map(([payload]) => payload)

describe('ModalDeploy — deploy and start', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.setItem('token', 'user-token')
        m.fetchFormsByFormId.mockResolvedValue([])
        m.keyInUseElsewhere.mockResolvedValue(false)
        deployProcess.mockResolvedValue({ id: 'deployment-1' })
        startProcess.mockResolvedValue({ id: 'instance-1' })
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    it('starts the process of a diagram with a pool by its process id, not by the collaboration id', async () => {
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)
        expect(wrapper.find('#deployment-name').element.value).toBe('collab')

        await startButton(wrapper).trigger('click')
        await flushPromises()

        expect(deployProcess).toHaveBeenCalledTimes(1)
        expect(startedKey()).toBe('order')
        expect(toasts(wrapper)).toEqual([{ isSuccess: true, toastText: 'toastStartProcessSucess', bodyTextAlt: '' }])
    })

    it('starts by the process id whatever the deployment is named', async () => {
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)
        await wrapper.find('#deployment-name').setValue('My release')

        await startButton(wrapper).trigger('click')
        await flushPromises()

        expect(deployProcess.mock.calls[0][4]).toBe('My release')
        expect(startedKey()).toBe('order')
    })

    it('deploys for the tenant typed, trimmed, and starts for the tenant the engine deployed for', async () => {
        deployProcess.mockResolvedValue({ id: 'deployment-1', tenantId: 'acme' })
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)
        await wrapper.find('#tenant-id').setValue('  acme  ')

        await startButton(wrapper).trigger('click')
        await flushPromises()

        expect(deployProcess.mock.calls[0][6]).toBe('acme')
        expect(startProcess.mock.calls[0][7]).toBe('acme')
    })

    // The engine may set the tenant itself (a tenant id provider), or match an existing deployment
    it('starts for the tenant of the deployment also when none was typed', async () => {
        deployProcess.mockResolvedValue({ id: 'deployment-1', tenantId: 'set-by-engine' })
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)

        await startButton(wrapper).trigger('click')
        await flushPromises()

        expect(deployProcess.mock.calls[0][6]).toBe('')
        expect(startProcess.mock.calls[0][7]).toBe('set-by-engine')
    })

    it('starts with no tenant when the deployment has none', async () => {
        deployProcess.mockResolvedValue({ id: 'deployment-1', tenantId: null })
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)

        await startButton(wrapper).trigger('click')
        await flushPromises()

        expect(startProcess.mock.calls[0][7]).toBeNull()
    })

    it('lets the user pick the process when several pools are executable, the first by default', async () => {
        const wrapper = mountModal({ diagram: BPMN_TWO_POOLS })
        await openModal(wrapper)
        const select = wrapper.find('#start-process-id')
        expect(select.findAll('option').map(o => o.text())).toEqual(['Order (order)', 'Shipping (shipping)'])
        expect(select.element.value).toBe('order')

        await select.setValue('shipping')
        await startButton(wrapper).trigger('click')
        await flushPromises()

        expect(startedKey()).toBe('shipping')
    })

    it('offers no picker for a single process, and no start for a process the engine would not deploy', async () => {
        const single = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(single)
        expect(single.find('#start-process-id').exists()).toBe(false)
        expect(startButton(single).attributes('disabled')).toBeUndefined()

        const notMarked = mountModal({ diagram: BPMN_NO_REF })
        await openModal(notMarked)
        expect(startButton(notMarked).attributes('disabled')).toBeDefined()
    })

    it('says the diagram was deployed but not started when the start fails, with the reason', async () => {
        startProcess.mockRejectedValue({ response: { data: { message: 'No process definition with key order' } } })
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)

        await startButton(wrapper).trigger('click')
        await flushPromises()

        expect(toasts(wrapper)).toEqual([{
            isSuccess: false,
            toastText: 'toastStartProcessError',
            bodyTextAlt: 'toastStartProcessError.body: No process definition with key order',
        }])
        expect(wrapper.emitted('addErrorMessageToConsole')[0]).toEqual(['tab-1', 'No process definition with key order\n'])
        expect(startButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('reports a start that answers without an instance, never as [object Object]', async () => {
        startProcess.mockResolvedValue({ status: 'ok' })
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)

        await startButton(wrapper).trigger('click')
        await flushPromises()

        expect(toasts(wrapper)).toEqual([{ isSuccess: false, toastText: 'toastStartProcessError', bodyTextAlt: '' }])
        expect(wrapper.emitted('addErrorMessageToConsole')).toBeUndefined()
    })

    it('starts the process chosen at the click, though the choice changes while the deploy runs', async () => {
        let finishDeploy
        deployProcess.mockReturnValue(new Promise(resolve => { finishDeploy = resolve }))
        const wrapper = mountModal({ diagram: BPMN_TWO_POOLS })
        await openModal(wrapper)

        await startButton(wrapper).trigger('click')
        await wrapper.find('#start-process-id').setValue('shipping')
        finishDeploy({ id: 'deployment-1' })
        await flushPromises()

        expect(startedKey()).toBe('order')
    })

    it('remembers the authentication chosen at the click, though it changes while the deploy runs', async () => {
        let finishDeploy
        deployProcess.mockReturnValue(new Promise(resolve => { finishDeploy = resolve }))
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)
        await wrapper.find('#asAnotherUser').setValue(true)
        await wrapper.find('#token-auth').setValue(true)
        await wrapper.find('#token').setValue('other-token')

        await deployButton(wrapper).trigger('click')
        await wrapper.find('#http-auth').setValue(true)
        finishDeploy({ id: 'deployment-1' })
        await flushPromises()

        expect(localStorage.getItem(DEPLOY_STORAGE_KEYS.AUTH)).toBe('token')
    })

    it('writes a failed start to the console of the tab it was started from, though the dialog opened for another tab meanwhile', async () => {
        let failStart
        startProcess.mockReturnValue(new Promise((_, reject) => { failStart = reject }))
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)
        await startButton(wrapper).trigger('click')
        await flushPromises()

        await wrapper.setProps({ showModal: false, tabNavList: { type: 'bpmn-c7', id: 'tab-2', name: 'Other', folderId: null, isSaved: false } })
        await openModal(wrapper)
        failStart({ message: 'Network Error' })
        await flushPromises()

        expect(wrapper.emitted('addErrorMessageToConsole')).toEqual([['tab-1', 'Network Error\n']])
    })

    it('does not start when the deploy fails, and reports the reason of the engine', async () => {
        deployProcess.mockRejectedValue({ response: { data: { params: ['ENGINE-09005 Could not parse BPMN process'] } } })
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)

        await startButton(wrapper).trigger('click')
        await flushPromises()

        expect(startProcess).not.toHaveBeenCalled()
        expect(toasts(wrapper)).toEqual([
            { isSuccess: false, toastText: 'toastDeployErrorDeploy', bodyTextAlt: 'ENGINE-09005 Could not parse BPMN process' },
        ])
        expect(deployButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('says the login entered was not accepted, rather than the user name the refusal carries', async () => {
        deployProcess.mockRejectedValue({ response: { status: 401, data: { type: 'AuthenticationException', params: ['demo'] } } })
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)
        await wrapper.find('#asAnotherUser').setValue(true)
        await wrapper.find('#http-auth').setValue(true)
        await wrapper.find('#username').setValue('demo')
        await wrapper.find('#password').setValue('wrong')

        await deployButton(wrapper).trigger('click')
        await flushPromises()

        expect(toasts(wrapper)).toEqual([{ isSuccess: false, toastText: 'toastDeployErrorDeploy', bodyTextAlt: 'deployForm.loginRefused' }])
    })

    // The user's own session ran out: the webclient takes them to the login page, no login was entered here
    it('blames no entered login when the user deployed with their own session', async () => {
        deployProcess.mockRejectedValue({ response: { status: 401, data: { type: 'AuthenticationException', params: ['Bearer tok'] } } })
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)

        await deployButton(wrapper).trigger('click')
        await flushPromises()

        expect(toasts(wrapper)).toEqual([{ isSuccess: false, toastText: 'toastDeployErrorDeploy', bodyTextAlt: '' }])
        expect(wrapper.emitted('addErrorMessageToConsole')).toBeUndefined()
    })

    it('reports a deploy that answers without a deployment', async () => {
        deployProcess.mockResolvedValue(undefined)
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)

        await deployButton(wrapper).trigger('click')
        await flushPromises()

        expect(toasts(wrapper)).toEqual([{ isSuccess: false, toastText: 'toastDeployErrorDeploy', bodyTextAlt: '' }])
        expect(wrapper.emitted('addErrorMessageToConsole')).toBeUndefined()
    })

    it('deploys once on a double click and disables both buttons while it runs', async () => {
        let finishDeploy
        deployProcess.mockReturnValue(new Promise(resolve => { finishDeploy = resolve }))
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)

        await deployButton(wrapper).trigger('click')
        await deployButton(wrapper).trigger('click')
        await startButton(wrapper).trigger('click')
        expect(deployButton(wrapper).attributes('disabled')).toBeDefined()
        expect(startButton(wrapper).attributes('disabled')).toBeDefined()

        finishDeploy({ id: 'deployment-1' })
        await flushPromises()

        expect(deployProcess).toHaveBeenCalledTimes(1)
        expect(startProcess).not.toHaveBeenCalled()
        expect(toasts(wrapper).map(t => t.toastText)).toEqual(['toastDeploySucessDeploy'])
        expect(deployButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('deploys and starts once on a double click of Deploy and start', async () => {
        let finishStart
        startProcess.mockReturnValue(new Promise(resolve => { finishStart = resolve }))
        const wrapper = mountModal({ diagram: BPMN_COLLABORATION })
        await openModal(wrapper)

        await startButton(wrapper).trigger('click')
        await flushPromises()
        await startButton(wrapper).trigger('click')
        finishStart({ id: 'instance-1' })
        await flushPromises()

        expect(deployProcess).toHaveBeenCalledTimes(1)
        expect(startProcess).toHaveBeenCalledTimes(1)
    })
})
