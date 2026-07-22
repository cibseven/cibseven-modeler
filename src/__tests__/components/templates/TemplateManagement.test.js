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
import { createRouter, createMemoryHistory } from 'vue-router'
import elementTemplateStore from '../../../stores/elementTemplateStore.js'
import TemplateManagement from '../../../components/templates/TemplateManagement.vue'

vi.mock('../../../composables/useToast.js', () => ({
    default: () => ({
        toastRef: { value: null },
        toastProps: {},
        showError: vi.fn(),
    }),
}))

vi.mock('../../../services/elementTemplateService.js', () => ({
    getAllElementTemplates: vi.fn().mockResolvedValue([]),
    setTemplateIsActive: vi.fn().mockResolvedValue({}),
    updateElementTemplate: vi.fn().mockResolvedValue({}),
    addElementTemplate: vi.fn().mockResolvedValue({}),
    getElementTemplateById: vi.fn().mockResolvedValue({}),
    deleteElementTemplate: vi.fn().mockResolvedValue({}),
    duplicateElementTemplate: vi.fn().mockResolvedValue({}),
    bulkDeleteTemplates: vi.fn().mockResolvedValue({}),
    bulkUpdateTemplateVisibility: vi.fn().mockResolvedValue({}),
    searchTemplates: vi.fn().mockResolvedValue([]),
    filterTemplates: (templates) => templates,
    validateTemplate: vi.fn().mockResolvedValue(true),
    importTemplates: vi.fn().mockResolvedValue([]),
    exportTemplates: vi.fn().mockResolvedValue(''),
    getTemplateStatistics: vi.fn().mockResolvedValue({}),
    updateElementTemplateFull: vi.fn().mockResolvedValue({}),
}))

const sampleTemplates = [
    {
        id: 'db-1',
        templateId: 'com.example.alpha',
        name: 'Alpha Template',
        content: JSON.stringify({ id: 'com.example.alpha', name: 'Alpha', appliesTo: ['bpmn:ServiceTask'] }),
        active: true,
    },
    {
        id: 'db-2',
        templateId: 'com.example.beta',
        name: 'Beta Template',
        content: JSON.stringify({ id: 'com.example.beta', name: 'Beta', appliesTo: ['bpmn:UserTask'] }),
        active: true,
    },
]

function createTestStore(templates = sampleTemplates) {
    const store = createStore({
        modules: {
            modeler: {
                namespaced: true,
                modules: {
                    elementTemplates: {
                        namespaced: true,
                        ...elementTemplateStore,
                    },
                },
            },
        },
    })
    store.commit('modeler/elementTemplates/setElementTemplates', templates)
    return store
}

function mountTemplateManagement(store, config = {}) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', component: { template: '<div/>' } }],
    })

    return mount(TemplateManagement, {
        global: {
            plugins: [store, router],
            provide: { config },
            mocks: { $t: (key) => key },
            stubs: {
                CibsevenTable: {
                    template: '<div class="stub-table">{{ items.length }}</div>',
                    props: ['items'],
                },
                CategorizedTemplateView: {
                    template: '<div class="cat-view" />',
                },
                AddElementTemplateModal: {
                    template: '<div />',
                    methods: { show: vi.fn(), setEditTemplate: vi.fn() },
                },
                ToastMessage: true,
            },
        },
    })
}

describe('TemplateManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loads templates on mount and applies config exclusions', async () => {
        const store = createTestStore()
        const dispatchSpy = vi.spyOn(store, 'dispatch')
        mountTemplateManagement(store, { modeler: { excludeTemplates: ['com.example.beta'] } })
        await flushPromises()

        expect(dispatchSpy).toHaveBeenCalledWith(
            'modeler/elementTemplates/setExcludeTemplates',
            ['com.example.beta'],
        )
    })

    it('filters templates when searching', async () => {
        const wrapper = mountTemplateManagement(createTestStore())
        await flushPromises()

        const input = wrapper.find('input[type="text"]')
        await input.setValue('Beta')
        await input.trigger('input')

        expect(wrapper.text()).toContain('1 / 2')
        expect(wrapper.find('.stub-table').text()).toBe('1')
    })

    it('resets filtered list when search is cleared', async () => {
        const wrapper = mountTemplateManagement(createTestStore())
        await flushPromises()

        const input = wrapper.find('input[type="text"]')
        await input.setValue('Beta')
        await input.trigger('input')
        await input.setValue('')
        await input.trigger('input')

        expect(wrapper.find('.stub-table').text()).toBe('2')
    })

    it('paginates visible templates in table view', async () => {
        const manyTemplates = Array.from({ length: 25 }, (_, i) => ({
            id: `db-${i}`,
            templateId: `com.example.t${i}`,
            name: `Template ${i}`,
            content: '{}',
            active: true,
        }))
        const wrapper = mountTemplateManagement(createTestStore(manyTemplates))
        await flushPromises()

        expect(wrapper.find('.stub-table').text()).toBe('20')
    })

    it('dispatches visibility toggle through store', async () => {
        const store = createTestStore()
        const dispatchSpy = vi.spyOn(store, 'dispatch').mockResolvedValue(undefined)
        mountTemplateManagement(store)
        await flushPromises()

        await store.dispatch('modeler/elementTemplates/switchTemplateActiveState', sampleTemplates[0].id)
        expect(dispatchSpy).toHaveBeenCalledWith(
            'modeler/elementTemplates/switchTemplateActiveState',
            sampleTemplates[0].id,
        )
    })

    it('exports all templates via download link', async () => {
        const store = createTestStore()
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
        const wrapper = mountTemplateManagement(store)
        await flushPromises()

        await wrapper.findAll('button').find(btn => btn.text().includes('templatesManagement.exportAll')).trigger('click')

        expect(clickSpy).toHaveBeenCalled()
        clickSpy.mockRestore()
    })

    it('shows categorized view when selected from dropdown', async () => {
        const wrapper = mountTemplateManagement(createTestStore())
        await flushPromises()

        expect(wrapper.find('.cat-view').exists()).toBe(false)
        const categorizedLink = wrapper.findAll('a.dropdown-item').find(link => link.text().includes('templatesManagement.categorizedView'))
        await categorizedLink.trigger('click')
        expect(wrapper.find('.cat-view').exists()).toBe(true)
    })
})
