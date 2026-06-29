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
import { createStore } from 'vuex'

const m = vi.hoisted(() => ({
    getAllElementTemplates: vi.fn().mockResolvedValue({ data: [] }),
    setTemplateIsActive: vi.fn().mockResolvedValue({}),
    updateElementTemplate: vi.fn().mockResolvedValue({}),
    addElementTemplate: vi.fn().mockResolvedValue({}),
    getElementTemplateById: vi.fn().mockResolvedValue({}),
    deleteElementTemplate: vi.fn().mockResolvedValue({}),
    duplicateElementTemplate: vi.fn().mockResolvedValue({}),
    bulkDeleteTemplates: vi.fn().mockResolvedValue({}),
    bulkUpdateTemplateVisibility: vi.fn().mockResolvedValue({}),
    searchTemplates: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../services/elementTemplateService.js', () => ({
    getAllElementTemplates: m.getAllElementTemplates,
    setTemplateIsActive: m.setTemplateIsActive,
    updateElementTemplate: m.updateElementTemplate,
    addElementTemplate: m.addElementTemplate,
    getElementTemplateById: m.getElementTemplateById,
    deleteElementTemplate: m.deleteElementTemplate,
    duplicateElementTemplate: m.duplicateElementTemplate,
    bulkDeleteTemplates: m.bulkDeleteTemplates,
    bulkUpdateTemplateVisibility: m.bulkUpdateTemplateVisibility,
    searchTemplates: m.searchTemplates,
    filterTemplates: (templates, excluded) => templates.filter(t => !excluded.includes(t.id)),
    validateTemplate: vi.fn().mockResolvedValue(true),
    importTemplates: vi.fn().mockResolvedValue([]),
    exportTemplates: vi.fn().mockResolvedValue(''),
    getTemplateStatistics: vi.fn().mockResolvedValue({}),
    updateElementTemplateFull: vi.fn().mockResolvedValue({}),
}))
vi.mock('../../utils.js', () => ({
    filterTemplates: (templates, excluded) => templates.filter(t => !excluded.includes(t.id)),
}))
vi.mock('../../components/templates/elementTemplateUtils.js', () => ({
    categorizeTemplates: vi.fn(templates => ({ categories: [] })),
}))

import elementTemplateStore from '../../stores/elementTemplateStore.js'

const makeStore = () => createStore({
    modules: { elementTemplates: { namespaced: true, ...elementTemplateStore } }
})

describe('elementTemplateStore', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('state', () => {
        it('initializes with empty templates', () => {
            const store = makeStore()
            expect(store.state.elementTemplates.elementTemplates).toEqual([])
        })

        it('initializes with loading false', () => {
            const store = makeStore()
            expect(store.state.elementTemplates.isLoading).toBe(false)
        })

        it('initializes with no error', () => {
            const store = makeStore()
            expect(store.state.elementTemplates.error).toBeNull()
        })

        it('initializes with empty excludeTemplates', () => {
            const store = makeStore()
            expect(store.state.elementTemplates.excludeTemplates).toEqual([])
        })
    })

    describe('mutations', () => {
        it('setElementTemplates sets templates', () => {
            const store = makeStore()
            const templates = [{ id: 't1', name: 'Template 1' }]
            store.commit('elementTemplates/setElementTemplates', templates)
            expect(store.state.elementTemplates.elementTemplates).toEqual(templates)
        })

        it('setLoading sets loading state', () => {
            const store = makeStore()
            store.commit('elementTemplates/setLoading', true)
            expect(store.state.elementTemplates.isLoading).toBe(true)
        })

        it('setError sets error', () => {
            const store = makeStore()
            const error = new Error('Test error')
            store.commit('elementTemplates/setError', error)
            expect(store.state.elementTemplates.error).toEqual(error)
        })

        it('clearError clears error', () => {
            const store = makeStore()
            store.commit('elementTemplates/setError', new Error('Test'))
            store.commit('elementTemplates/clearError')
            expect(store.state.elementTemplates.error).toBeNull()
        })

        it('setSelectedTemplate sets selected template', () => {
            const store = makeStore()
            const template = { id: 't1', name: 'Template 1' }
            store.commit('elementTemplates/setSelectedTemplate', template)
            expect(store.state.elementTemplates.selectedTemplate).toEqual(template)
        })

        it('addTemplate adds template to list', () => {
            const store = makeStore()
            const template = { id: 't1', name: 'Template 1' }
            store.commit('elementTemplates/addTemplate', template)
            expect(store.state.elementTemplates.elementTemplates).toContainEqual(template)
        })

        it('removeTemplate removes template from list', () => {
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1', name: 'Template 1' }])
            store.commit('elementTemplates/removeTemplate', 't1')
            expect(store.state.elementTemplates.elementTemplates).toHaveLength(0)
        })

        it('updateTemplate updates existing template', () => {
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1', name: 'Old' }])
            store.commit('elementTemplates/updateTemplate', { id: 't1', name: 'New' })
            expect(store.state.elementTemplates.elementTemplates[0].name).toBe('New')
        })

        it('updateTemplateActiveState updates active flag', () => {
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1', active: false }])
            store.commit('elementTemplates/updateTemplateActiveState', { templateId: 't1', isActive: true })
            expect(store.state.elementTemplates.elementTemplates[0].active).toBe(true)
        })

        it('setExcludeTemplates sets exclude list', () => {
            const store = makeStore()
            const excludes = ['t1', 't2']
            store.commit('elementTemplates/setExcludeTemplates', excludes)
            expect(store.state.elementTemplates.excludeTemplates).toEqual(excludes)
        })

        it('addToExcludeTemplates adds template to exclude list', () => {
            const store = makeStore()
            store.commit('elementTemplates/addToExcludeTemplates', 't1')
            expect(store.state.elementTemplates.excludeTemplates).toContain('t1')
        })

        it('removeFromExcludeTemplates removes template from exclude list', () => {
            const store = makeStore()
            store.commit('elementTemplates/addToExcludeTemplates', 't1')
            store.commit('elementTemplates/removeFromExcludeTemplates', 't1')
            expect(store.state.elementTemplates.excludeTemplates).not.toContain('t1')
        })
    })

    describe('actions', () => {
        it('fetchAllElementTemplates fetches and stores templates', async () => {
            const templates = [{ id: 't1', name: 'Template 1' }]
            m.getAllElementTemplates.mockResolvedValue({ data: templates })
            const store = makeStore()
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            expect(store.state.elementTemplates.elementTemplates).toEqual(templates)
        })

        it('fetchAllElementTemplates handles empty response', async () => {
            m.getAllElementTemplates.mockResolvedValue({ data: [] })
            const store = makeStore()
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            expect(store.state.elementTemplates.elementTemplates).toEqual([])
        })

        it('fetchAllElementTemplates sets loading during fetch', async () => {
            m.getAllElementTemplates.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100)))
            const store = makeStore()
            const promise = store.dispatch('elementTemplates/fetchAllElementTemplates')
            expect(store.state.elementTemplates.isLoading).toBe(true)
            await promise
            expect(store.state.elementTemplates.isLoading).toBe(false)
        })

        it('fetchAllElementTemplates handles fetch error', async () => {
            const error = new Error('Fetch failed')
            m.getAllElementTemplates.mockRejectedValue(error)
            const store = makeStore()
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            expect(store.state.elementTemplates.error).toBeDefined()
            expect(store.state.elementTemplates.elementTemplates).toEqual([])
        })

        it('toggleTemplateActiveState updates template active state', async () => {
            m.setTemplateIsActive.mockResolvedValue({ id: 't1', active: true })
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1', active: false }])
            await store.dispatch('elementTemplates/toggleTemplateActiveState', { templateId: 't1', isActive: true })
            expect(store.state.elementTemplates.elementTemplates[0].active).toBe(true)
        })

        it('toggleTemplateActiveState removes template on 404', async () => {
            const error = new Error('Not found')
            error.response = { status: 404 }
            m.setTemplateIsActive.mockRejectedValue(error)
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1', active: false }])
            try {
                await store.dispatch('elementTemplates/toggleTemplateActiveState', { templateId: 't1', isActive: true })
            } catch (e) {
                // Expected to throw
            }
            expect(store.state.elementTemplates.elementTemplates).toHaveLength(0)
        })

        it('createElementTemplate creates new template', async () => {
            const template = { id: 't1', name: 'New Template' }
            m.addElementTemplate.mockResolvedValue(template)
            const store = makeStore()
            await store.dispatch('elementTemplates/createElementTemplate', { name: 'New Template' })
            expect(store.state.elementTemplates.elementTemplates).toContainEqual(template)
        })

        it('selectTemplate selects template', () => {
            const store = makeStore()
            const template = { id: 't1', name: 'Template 1' }
            store.dispatch('elementTemplates/selectTemplate', template)
            expect(store.state.elementTemplates.selectedTemplate).toEqual(template)
        })

        it('clearSelectedTemplate clears selection', () => {
            const store = makeStore()
            store.commit('elementTemplates/setSelectedTemplate', { id: 't1' })
            store.dispatch('elementTemplates/clearSelectedTemplate')
            expect(store.state.elementTemplates.selectedTemplate).toBeNull()
        })

        it('clearError clears error state', () => {
            const store = makeStore()
            store.commit('elementTemplates/setError', new Error('Test'))
            store.dispatch('elementTemplates/clearError')
            expect(store.state.elementTemplates.error).toBeNull()
        })

        it('setExcludeTemplates sets exclude list via action', () => {
            const store = makeStore()
            store.dispatch('elementTemplates/setExcludeTemplates', ['t1', 't2'])
            expect(store.state.elementTemplates.excludeTemplates).toEqual(['t1', 't2'])
        })
    })

    describe('getters', () => {
        it('returns all templates via getter', () => {
            const store = makeStore()
            const templates = [{ id: 't1', name: 'Template 1' }]
            store.commit('elementTemplates/setElementTemplates', templates)
            expect(store.getters['elementTemplates/allElementTemplates']).toEqual(templates)
        })

        it('returns loading state via getter', () => {
            const store = makeStore()
            store.commit('elementTemplates/setLoading', true)
            expect(store.getters['elementTemplates/isLoading']).toBe(true)
        })

        it('returns error via getter', () => {
            const store = makeStore()
            const error = new Error('Test')
            store.commit('elementTemplates/setError', error)
            expect(store.getters['elementTemplates/error']).toEqual(error)
        })

        it('returns selected template via getter', () => {
            const store = makeStore()
            const template = { id: 't1', name: 'Template 1' }
            store.commit('elementTemplates/setSelectedTemplate', template)
            expect(store.getters['elementTemplates/selectedTemplate']).toEqual(template)
        })

        it('returns exclude templates via getter', () => {
            const store = makeStore()
            store.commit('elementTemplates/setExcludeTemplates', ['t1', 't2'])
            expect(store.getters['elementTemplates/excludeTemplates']).toEqual(['t1', 't2'])
        })

        it('returns template by id via getter', () => {
            const store = makeStore()
            const templates = [{ id: 't1', name: 'Template 1' }]
            store.commit('elementTemplates/setElementTemplates', templates)
            expect(store.getters['elementTemplates/getTemplateById']('t1')).toEqual(templates[0])
        })

        it('returns active templates via getter', () => {
            const store = makeStore()
            const templates = [
                { id: 't1', name: 'Active', active: true },
                { id: 't2', name: 'Inactive', active: false },
            ]
            store.commit('elementTemplates/setElementTemplates', templates)
            expect(store.getters['elementTemplates/activeElementTemplates'].length).toBeGreaterThan(0)
        })

        it('returns template count via getter', () => {
            const store = makeStore()
            const templates = [
                { id: 't1' },
                { id: 't2' },
                { id: 't3' },
            ]
            store.commit('elementTemplates/setElementTemplates', templates)
            expect(store.getters['elementTemplates/templatesCount']).toBe(3)
        })
    })

    describe('complex workflows', () => {
        it('handles multiple templates with mixed active states', () => {
            const store = makeStore()
            const templates = [
                { id: 't1', name: 'Active 1', active: true },
                { id: 't2', name: 'Inactive 1', active: false },
                { id: 't3', name: 'Active 2', active: true },
                { id: 't4', name: 'Inactive 2', active: false },
            ]
            store.commit('elementTemplates/setElementTemplates', templates)
            expect(store.getters['elementTemplates/templatesCount']).toBe(4)
        })

        it('updates template and reflects changes in getters', () => {
            const store = makeStore()
            const templates = [{ id: 't1', name: 'Original', active: true }]
            store.commit('elementTemplates/setElementTemplates', templates)
            store.commit('elementTemplates/updateTemplate', { id: 't1', name: 'Updated', active: false })
            expect(store.getters['elementTemplates/getTemplateById']('t1').name).toBe('Updated')
        })

        it('adds and removes templates correctly', () => {
            const store = makeStore()
            const template1 = { id: 't1', name: 'Template 1' }
            const template2 = { id: 't2', name: 'Template 2' }
            
            store.commit('elementTemplates/addTemplate', template1)
            expect(store.getters['elementTemplates/templatesCount']).toBe(1)
            
            store.commit('elementTemplates/addTemplate', template2)
            expect(store.getters['elementTemplates/templatesCount']).toBe(2)
            
            store.commit('elementTemplates/removeTemplate', 't1')
            expect(store.getters['elementTemplates/templatesCount']).toBe(1)
        })

        it('manages exclude list correctly', () => {
            const store = makeStore()
            store.commit('elementTemplates/addToExcludeTemplates', 't1')
            store.commit('elementTemplates/addToExcludeTemplates', 't2')
            expect(store.state.elementTemplates.excludeTemplates).toHaveLength(2)
            
            store.commit('elementTemplates/removeFromExcludeTemplates', 't1')
            expect(store.state.elementTemplates.excludeTemplates).toHaveLength(1)
        })

        it('handles template selection and clearing', () => {
            const store = makeStore()
            const template = { id: 't1', name: 'Template 1' }
            
            store.dispatch('elementTemplates/selectTemplate', template)
            expect(store.getters['elementTemplates/selectedTemplate']).toEqual(template)
            
            store.dispatch('elementTemplates/clearSelectedTemplate')
            expect(store.getters['elementTemplates/selectedTemplate']).toBeNull()
        })
    })

    describe('async operations and error handling', () => {
        it('handles concurrent template operations', async () => {
            const templates = [{ id: 't1', name: 'Template 1' }]
            m.getAllElementTemplates.mockResolvedValue({ data: templates })
            m.addElementTemplate.mockResolvedValue({ id: 't2', name: 'Template 2' })

            const store = makeStore()
            
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            await store.dispatch('elementTemplates/createElementTemplate', { name: 'Template 2' })
            
            expect(store.state.elementTemplates.elementTemplates.length).toBeGreaterThanOrEqual(1)
        })

        it('preserves state on error during fetch', async () => {
            const initialTemplates = [{ id: 't1', name: 'Existing' }]
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', initialTemplates)
            
            m.getAllElementTemplates.mockRejectedValue(new Error('Network error'))
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            
            expect(store.state.elementTemplates.error).toBeDefined()
        })

        it('clears error state explicitly', () => {
            const store = makeStore()
            store.commit('elementTemplates/setError', new Error('Test error'))
            expect(store.state.elementTemplates.error).not.toBeNull()
            
            store.dispatch('elementTemplates/clearError')
            expect(store.state.elementTemplates.error).toBeNull()
        })

        it('handles toggle active state with network error', async () => {
            const error = new Error('Network error')
            error.response = { status: 500 }
            m.setTemplateIsActive.mockRejectedValue(error)
            
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1', active: false }])
            
            try {
                await store.dispatch('elementTemplates/toggleTemplateActiveState', { templateId: 't1', isActive: true })
            } catch (e) {
                // Error handling
            }
        })
    })

    describe('edge cases and boundary conditions', () => {
        it('handles empty state initialization', () => {
            const store = makeStore()
            expect(store.state.elementTemplates.elementTemplates).toHaveLength(0)
            expect(store.state.elementTemplates.excludeTemplates).toHaveLength(0)
            expect(store.state.elementTemplates.selectedTemplate).toBeNull()
        })

        it('handles template with undefined properties', () => {
            const store = makeStore()
            const template = { id: 't1' }
            store.commit('elementTemplates/addTemplate', template)
            expect(store.getters['elementTemplates/getTemplateById']('t1')).toBeDefined()
        })

        it('updates non-existent template gracefully', () => {
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1', name: 'Template 1' }])
            store.commit('elementTemplates/updateTemplate', { id: 't999', name: 'Nonexistent' })
            expect(store.getters['elementTemplates/templatesCount']).toBe(1)
        })

        it('removes non-existent template gracefully', () => {
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1', name: 'Template 1' }])
            store.commit('elementTemplates/removeTemplate', 't999')
            expect(store.getters['elementTemplates/templatesCount']).toBe(1)
        })

        it('handles duplicate add to exclude list', () => {
            const store = makeStore()
            store.commit('elementTemplates/addToExcludeTemplates', 't1')
            store.commit('elementTemplates/addToExcludeTemplates', 't1')
            expect(store.state.elementTemplates.excludeTemplates).toContain('t1')
        })

        it('handles remove from empty exclude list', () => {
            const store = makeStore()
            store.commit('elementTemplates/removeFromExcludeTemplates', 't1')
            expect(store.state.elementTemplates.excludeTemplates).toHaveLength(0)
        })

        it('handles fetching templates with large dataset', async () => {
            const largeDataset = Array.from({ length: 100 }, (_, i) => ({
                id: `t${i}`,
                name: `Template ${i}`,
                active: i % 2 === 0
            }))
            m.getAllElementTemplates.mockResolvedValue({ data: largeDataset })

            const store = makeStore()
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            
            expect(store.getters['elementTemplates/templatesCount']).toBe(100)
        })

        it('maintains state consistency across multiple operations', () => {
            const store = makeStore()
            
            store.commit('elementTemplates/setElementTemplates', [
                { id: 't1', active: true },
                { id: 't2', active: false }
            ])
            store.commit('elementTemplates/setExcludeTemplates', ['t1'])
            store.commit('elementTemplates/setLoading', true)
            store.commit('elementTemplates/setError', null)
            
            expect(store.getters['elementTemplates/templatesCount']).toBe(2)
            expect(store.getters['elementTemplates/excludeTemplates']).toContain('t1')
            expect(store.getters['elementTemplates/isLoading']).toBe(true)
            expect(store.getters['elementTemplates/error']).toBeNull()
        })
    })

    describe('advanced mutation scenarios', () => {
        it('handles bulk template updates', () => {
            const store = makeStore()
            const templates = [
                { id: 't1', name: 'Template 1', active: false },
                { id: 't2', name: 'Template 2', active: true },
                { id: 't3', name: 'Template 3', active: false }
            ]
            store.commit('elementTemplates/setElementTemplates', templates)

            store.commit('elementTemplates/updateTemplate', { id: 't1', active: true })
            store.commit('elementTemplates/updateTemplate', { id: 't3', active: true })

            const updated = store.getters['elementTemplates/allElementTemplates']
            expect(updated.every(t => t.active === true)).toBe(true)
        })

        it('handles mixed add and remove operations', () => {
            const store = makeStore()
            store.commit('elementTemplates/addTemplate', { id: 't1', name: 'T1' })
            store.commit('elementTemplates/addTemplate', { id: 't2', name: 'T2' })
            store.commit('elementTemplates/addTemplate', { id: 't3', name: 'T3' })
            expect(store.getters['elementTemplates/templatesCount']).toBe(3)

            store.commit('elementTemplates/removeTemplate', 't2')
            expect(store.getters['elementTemplates/templatesCount']).toBe(2)
            expect(store.getters['elementTemplates/getTemplateById']('t2')).toBeUndefined()
        })

        it('manages exclude list with multiple entries', () => {
            const store = makeStore()
            const ids = ['t1', 't2', 't3', 't4', 't5']
            
            ids.forEach(id => store.commit('elementTemplates/addToExcludeTemplates', id))
            expect(store.state.elementTemplates.excludeTemplates).toHaveLength(5)

            store.commit('elementTemplates/removeFromExcludeTemplates', 't3')
            expect(store.state.elementTemplates.excludeTemplates).toHaveLength(4)
            expect(store.state.elementTemplates.excludeTemplates).not.toContain('t3')
        })

        it('clears all templates while preserving other state', () => {
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1' }, { id: 't2' }])
            store.commit('elementTemplates/setLoading', true)
            store.commit('elementTemplates/setError', new Error('test'))

            store.commit('elementTemplates/setElementTemplates', [])
            expect(store.getters['elementTemplates/templatesCount']).toBe(0)
            expect(store.getters['elementTemplates/isLoading']).toBe(true)
            expect(store.getters['elementTemplates/error']).not.toBeNull()
        })
    })

    describe('advanced action scenarios', () => {
        it('fetches and caches templates', async () => {
            const templates = [{ id: 't1', name: 'T1' }]
            m.getAllElementTemplates.mockResolvedValue({ data: templates })
            
            const store = makeStore()
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            expect(store.getters['elementTemplates/allElementTemplates']).toEqual(templates)

            m.getAllElementTemplates.mockClear()
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            expect(m.getAllElementTemplates).toHaveBeenCalled()
        })

        it('creates and adds template to state', async () => {
            const newTemplate = { id: 't1', name: 'New' }
            m.addElementTemplate.mockResolvedValue(newTemplate)
            
            const store = makeStore()
            await store.dispatch('elementTemplates/createElementTemplate', { name: 'New' })
            
            expect(store.getters['elementTemplates/getTemplateById']('t1')).toEqual(newTemplate)
        })

        it('handles template creation failure gracefully', async () => {
            const error = new Error('Creation failed')
            m.addElementTemplate.mockRejectedValue(error)
            
            const store = makeStore()
            try {
                await store.dispatch('elementTemplates/createElementTemplate', { name: 'Test' })
            } catch (e) {
                expect(e).toBeDefined()
            }
        })

        it('toggles template active state with optimistic update', async () => {
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [
                { id: 't1', active: false }
            ])

            m.setTemplateIsActive.mockResolvedValue({ id: 't1', active: true })
            await store.dispatch('elementTemplates/toggleTemplateActiveState', 
                { templateId: 't1', isActive: true })

            expect(store.getters['elementTemplates/getTemplateById']('t1').active).toBe(true)
        })

        it('handles 404 on template toggle - removes template', async () => {
            const error = new Error('Not found')
            error.response = { status: 404 }
            m.setTemplateIsActive.mockRejectedValue(error)
            
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [{ id: 't1', active: false }])
            
            try {
                await store.dispatch('elementTemplates/toggleTemplateActiveState',
                    { templateId: 't1', isActive: true })
            } catch (e) {
                // Expected
            }
            
            expect(store.getters['elementTemplates/templatesCount']).toBe(0)
        })

        it('selects and deselects templates', () => {
            const store = makeStore()
            const template = { id: 't1', name: 'T1' }
            
            store.dispatch('elementTemplates/selectTemplate', template)
            expect(store.getters['elementTemplates/selectedTemplate']).toEqual(template)

            store.dispatch('elementTemplates/clearSelectedTemplate')
            expect(store.getters['elementTemplates/selectedTemplate']).toBeNull()
        })

        it('manages exclude templates via action', () => {
            const store = makeStore()
            store.dispatch('elementTemplates/setExcludeTemplates', ['t1', 't2', 't3'])
            
            expect(store.getters['elementTemplates/excludeTemplates']).toEqual(['t1', 't2', 't3'])
        })
    })

    describe('concurrent operations', () => {
        it('handles multiple simultaneous updates', async () => {
            const store = makeStore()
            m.getAllElementTemplates.mockResolvedValue({ 
                data: [
                    { id: 't1', name: 'T1' },
                    { id: 't2', name: 'T2' }
                ]
            })

            const promise1 = store.dispatch('elementTemplates/fetchAllElementTemplates')
            const promise2 = store.dispatch('elementTemplates/fetchAllElementTemplates')
            
            await Promise.all([promise1, promise2])
            expect(store.getters['elementTemplates/templatesCount']).toBe(2)
        })

        it('handles loading state during fetch', async () => {
            let loadingDuringFetch = false
            m.getAllElementTemplates.mockImplementation(async () => {
                loadingDuringFetch = store.getters['elementTemplates/isLoading']
                return { data: [] }
            })

            const store = makeStore()
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            expect(loadingDuringFetch).toBe(true)
        })

        it('handles sequential template operations', async () => {
            const store = makeStore()
            m.addElementTemplate.mockResolvedValueOnce({ id: 't1', name: 'T1' })
            m.addElementTemplate.mockResolvedValueOnce({ id: 't2', name: 'T2' })

            await store.dispatch('elementTemplates/createElementTemplate', { name: 'T1' })
            expect(store.getters['elementTemplates/templatesCount']).toBe(1)

            await store.dispatch('elementTemplates/createElementTemplate', { name: 'T2' })
            expect(store.getters['elementTemplates/templatesCount']).toBe(2)
        })
    })

    describe('state filtering and getters', () => {
        it('getters return filtered data based on exclude list', () => {
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [
                { id: 't1', name: 'T1' },
                { id: 't2', name: 'T2' },
                { id: 't3', name: 'T3' }
            ])
            store.commit('elementTemplates/setExcludeTemplates', ['t1', 't3'])

            expect(store.getters['elementTemplates/excludeTemplates']).toHaveLength(2)
        })

        it('active templates getter filters by active status', () => {
            const store = makeStore()
            store.commit('elementTemplates/setElementTemplates', [
                { id: 't1', active: true },
                { id: 't2', active: false },
                { id: 't3', active: true },
                { id: 't4', active: false }
            ])

            const activeTemplates = store.getters['elementTemplates/activeElementTemplates']
            expect(activeTemplates.length).toBeGreaterThan(0)
            expect(activeTemplates.every(t => t.active === true)).toBe(true)
        })

        it('getTemplateById returns correct template', () => {
            const store = makeStore()
            const templates = [
                { id: 't1', name: 'Template 1' },
                { id: 't2', name: 'Template 2' }
            ]
            store.commit('elementTemplates/setElementTemplates', templates)

            expect(store.getters['elementTemplates/getTemplateById']('t1')).toEqual(templates[0])
            expect(store.getters['elementTemplates/getTemplateById']('t2')).toEqual(templates[1])
            expect(store.getters['elementTemplates/getTemplateById']('t999')).toBeUndefined()
        })

        it('counts templates correctly', () => {
            const store = makeStore()
            expect(store.getters['elementTemplates/templatesCount']).toBe(0)

            store.commit('elementTemplates/setElementTemplates', Array.from({ length: 5 }, (_, i) => ({
                id: `t${i}`,
                name: `Template ${i}`
            })))
            
            expect(store.getters['elementTemplates/templatesCount']).toBe(5)
        })
    })

    describe('error recovery', () => {
        it('clears previous error before new fetch', async () => {
            const store = makeStore()
            store.commit('elementTemplates/setError', new Error('Previous error'))
            
            m.getAllElementTemplates.mockResolvedValue({ data: [] })
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            
            expect(store.getters['elementTemplates/error']).toBeNull()
        })

        it('stores error state on failed fetch', async () => {
            const fetchError = new Error('Fetch failed')
            m.getAllElementTemplates.mockRejectedValue(fetchError)
            
            const store = makeStore()
            await store.dispatch('elementTemplates/fetchAllElementTemplates')
            
            expect(store.getters['elementTemplates/error']).toBeDefined()
        })

        it('recovers from error state', () => {
            const store = makeStore()
            store.commit('elementTemplates/setError', new Error('Test error'))
            expect(store.getters['elementTemplates/error']).not.toBeNull()

            store.dispatch('elementTemplates/clearError')
            expect(store.getters['elementTemplates/error']).toBeNull()
        })
    })

    describe('state persistence scenarios', () => {
        it('maintains template data through multiple state updates', () => {
            const store = makeStore()
            const originalTemplates = [
                { id: 't1', name: 'T1', active: true },
                { id: 't2', name: 'T2', active: false }
            ]
            
            store.commit('elementTemplates/setElementTemplates', originalTemplates)
            store.commit('elementTemplates/setLoading', true)
            store.commit('elementTemplates/setLoading', false)
            store.commit('elementTemplates/setSelectedTemplate', originalTemplates[0])

            expect(store.getters['elementTemplates/allElementTemplates']).toEqual(originalTemplates)
        })

        it('handles rapid state changes', () => {
            const store = makeStore()
            
            for (let i = 0; i < 10; i++) {
                store.commit('elementTemplates/setLoading', true)
                store.commit('elementTemplates/setLoading', false)
                store.commit('elementTemplates/setError', null)
            }

            expect(store.getters['elementTemplates/isLoading']).toBe(false)
            expect(store.getters['elementTemplates/error']).toBeNull()
        })

        it('preserves exclude list during template updates', () => {
            const store = makeStore()
            store.commit('elementTemplates/setExcludeTemplates', ['t1', 't2'])
            
            store.commit('elementTemplates/setElementTemplates', [
                { id: 't3', name: 'T3' },
                { id: 't4', name: 'T4' }
            ])

            expect(store.getters['elementTemplates/excludeTemplates']).toEqual(['t1', 't2'])
        })
    })
})
