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
import DiagramListItem from '../../components/modeler/DiagramListItem.vue'
import { DIAGRAM_TYPE, DIAGRAM_ICON } from '../../constants/diagramTypes.js'

const PROCESS_ITEM = {
    id: 'proc-1',
    name: 'My Process',
    processkey: 'my-process-key',
    type: DIAGRAM_TYPE.BPMN_C7,
}

const DMN_ITEM = {
    id: 'dmn-1',
    name: 'My Decision',
    processkey: 'my-dmn-key',
    type: DIAGRAM_TYPE.DMN,
}

const FORM_ITEM = {
    id: 'form-1',
    formId: 'my-form-id',
    type: DIAGRAM_TYPE.FORM,
}

function makeStore({ dispatchFn = vi.fn() } = {}) {
    return createStore({
        modules: {
            modeler: {
                namespaced: true,
                modules: {
                    processes: {
                        namespaced: true,
                        state: () => ({ processSelected: { xml: '<xml/>' } }),
                        actions: {
                            fetchProcessById: dispatchFn,
                        },
                    },
                    forms: {
                        namespaced: true,
                        state: () => ({ formSelected: { formId: 'my-form-id' } }),
                        actions: {
                            fetchFormById: dispatchFn,
                        },
                    },
                },
            },
        },
    })
}

function mountItem(item, { isHovered = false, index = 0, store = makeStore() } = {}) {
    return mount(DiagramListItem, {
        props: { item, isHovered, index },
        global: {
            plugins: [store],
            mocks: { $t: (k) => k },
        },
    })
}

describe('DiagramListItem', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('rendering — BPMN process item', () => {
        it('renders display name and processkey', () => {
            const wrapper = mountItem(PROCESS_ITEM)
            const text = wrapper.text()
            expect(text).toContain('My Process')
            expect(text).toContain('my-process-key')
        })

        it('renders correct icon class for bpmn-c7', () => {
            const wrapper = mountItem(PROCESS_ITEM)
            const icon = wrapper.find('span.mdi')
            expect(icon.classes()).toContain(DIAGRAM_ICON[DIAGRAM_TYPE.BPMN_C7])
        })

        it('shows file extension "bpmn" for BPMN item', () => {
            const wrapper = mountItem(PROCESS_ITEM)
            expect(wrapper.text()).toContain('.bpmn')
        })
    })

    describe('rendering — DMN item', () => {
        it('renders correct icon for dmn', () => {
            const wrapper = mountItem(DMN_ITEM)
            const icon = wrapper.find('span.mdi')
            expect(icon.classes()).toContain(DIAGRAM_ICON[DIAGRAM_TYPE.DMN])
        })

        it('shows file extension "dmn"', () => {
            const wrapper = mountItem(DMN_ITEM)
            expect(wrapper.text()).toContain('.dmn')
        })
    })

    describe('rendering — Form item', () => {
        it('renders formId as display name (not "undefined")', () => {
            const wrapper = mountItem(FORM_ITEM)
            expect(wrapper.text()).toContain('my-form-id')
            expect(wrapper.text()).not.toContain('undefined')
        })

        it('does not render processkey for forms', () => {
            const wrapper = mountItem(FORM_ITEM)
            expect(wrapper.text()).not.toContain('my-process-key')
        })

        it('renders correct icon for form', () => {
            const wrapper = mountItem(FORM_ITEM)
            const icon = wrapper.find('span.mdi')
            expect(icon.classes()).toContain(DIAGRAM_ICON[DIAGRAM_TYPE.FORM])
        })

        it('shows file extension "form"', () => {
            const wrapper = mountItem(FORM_ITEM)
            expect(wrapper.text()).toContain('.form')
        })
    })

    describe('button visibility', () => {
        it('hides action buttons when isHovered is false', () => {
            const wrapper = mountItem(PROCESS_ITEM, { isHovered: false })
            const buttons = wrapper.findAll('button')
            buttons.forEach(btn => expect(btn.classes()).toContain('invisible'))
        })

        it('shows action buttons when isHovered is true', () => {
            const wrapper = mountItem(PROCESS_ITEM, { isHovered: true })
            const buttons = wrapper.findAll('button')
            buttons.forEach(btn => expect(btn.classes()).not.toContain('invisible'))
        })
    })

    describe('click on item — process', () => {
        it('dispatches fetchProcessById and emits openDiagram', async () => {
            const dispatchFn = vi.fn()
            const store = makeStore({ dispatchFn })
            const wrapper = mountItem(PROCESS_ITEM, { store, index: 2 })

            await wrapper.trigger('click')
            await flushPromises()

            expect(dispatchFn).toHaveBeenCalled()
            expect(wrapper.emitted('openDiagram')).toHaveLength(1)
            const [payload] = wrapper.emitted('openDiagram')[0]
            // payload is the processSelected state
            expect(payload).toBeDefined()
        })
    })

    describe('click on item — form', () => {
        it('dispatches fetchFormById and emits openDiagram with formId args', async () => {
            const dispatchFn = vi.fn()
            const store = makeStore({ dispatchFn })
            const wrapper = mountItem(FORM_ITEM, { store, index: 0 })

            await wrapper.trigger('click')
            await flushPromises()

            expect(dispatchFn).toHaveBeenCalled()
            expect(wrapper.emitted('openDiagram')).toHaveLength(1)
            const args = wrapper.emitted('openDiagram')[0]
            // args: [selectedForm, id, formId, formId, index, type]
            expect(args[2]).toBe(FORM_ITEM.formId)
            expect(args[5]).toBe(DIAGRAM_TYPE.FORM)
        })
    })

    describe('delete button', () => {
        it('emits toggleModal with item details when delete clicked', async () => {
            const wrapper = mountItem(PROCESS_ITEM, { isHovered: true, index: 3 })

            const deleteBtn = wrapper.findAll('button')[1] // second button is delete
            await deleteBtn.trigger('click')

            expect(wrapper.emitted('toggleModal')).toHaveLength(1)
            const args = wrapper.emitted('toggleModal')[0]
            expect(args[0]).toBe(true)
            expect(args[1]).toBe(PROCESS_ITEM.id)
            expect(args[4]).toBe(DIAGRAM_TYPE.BPMN_C7)
        })
    })

    describe('_processingDeletingItem expose', () => {
        it('shows spinner when called with true', async () => {
            const wrapper = mountItem(PROCESS_ITEM, { isHovered: true })

            wrapper.vm._processingDeletingItem(true)
            await wrapper.vm.$nextTick()

            expect(wrapper.find('[role="status"]').exists()).toBe(true)
            // action buttons should be replaced by spinner
            expect(wrapper.find('button').exists()).toBe(false)
        })

        it('hides spinner when called with false', async () => {
            const wrapper = mountItem(PROCESS_ITEM, { isHovered: true })

            wrapper.vm._processingDeletingItem(true)
            await wrapper.vm.$nextTick()
            wrapper.vm._processingDeletingItem(false)
            await wrapper.vm.$nextTick()

            expect(wrapper.find('[role="status"]').exists()).toBe(false)
        })
    })
})
