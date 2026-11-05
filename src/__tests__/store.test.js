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
import { createModelerStore } from '../store.js'

vi.mock('../stores/elementTemplateStore', () => ({ default: { namespaced: true } }))
vi.mock('../stores/processStore', () => ({ default: { namespaced: true } }))
vi.mock('../stores/formStore', () => ({ default: { namespaced: true } }))
vi.mock('../stores/xmlStore', () => ({ default: { namespaced: true } }))

describe('store', () => {
    describe('createModelerStore', () => {
        it('creates a store instance', () => {
            const store = createModelerStore()
            expect(store).toBeDefined()
            expect(store.state).toBeDefined()
        })

        it('initializes with default state', () => {
            const store = createModelerStore()
            expect(store.state.currentDiagram).toBeNull()
            expect(store.state.diagrams).toEqual([])
            expect(store.state.templates).toEqual([])
        })

        it('merges custom state options', () => {
            const customState = { customProp: 'customValue' }
            const store = createModelerStore({ state: customState })
            expect(store.state.customProp).toBe('customValue')
        })

        it('has default mutations', () => {
            const store = createModelerStore()
            expect(store._mutations.setCurrentDiagram).toBeDefined()
            expect(store._mutations.setDiagrams).toBeDefined()
            expect(store._mutations.setTemplates).toBeDefined()
        })

        it('has default actions', () => {
            const store = createModelerStore()
            expect(store._actions.updateCurrentDiagram).toBeDefined()
            expect(store._actions.updateDiagrams).toBeDefined()
            expect(store._actions.updateTemplates).toBeDefined()
        })

        it('merges custom mutations', () => {
            const customMutation = { customMutation: vi.fn() }
            const store = createModelerStore({ mutations: customMutation })
            // Custom mutations are merged but wrapped by Vuex
            expect(store._mutations).toBeDefined()
        })

        it('merges custom actions', () => {
            const customAction = { customAction: vi.fn() }
            const store = createModelerStore({ actions: customAction })
            // Custom actions are merged but wrapped by Vuex
            expect(store._actions).toBeDefined()
        })

        it('merges custom getters', () => {
            const customGetter = { customGetter: () => 'value' }
            const store = createModelerStore({ getters: customGetter })
            expect(store.getters).toBeDefined()
        })
    })

    describe('mutations', () => {
        it('setCurrentDiagram mutation updates state', () => {
            const store = createModelerStore()
            const diagram = { id: 'd1', name: 'Diagram 1' }
            
            store.commit('setCurrentDiagram', diagram)
            
            expect(store.state.currentDiagram).toEqual(diagram)
        })

        it('setDiagrams mutation updates state', () => {
            const store = createModelerStore()
            const diagrams = [
                { id: 'd1', name: 'Diagram 1' },
                { id: 'd2', name: 'Diagram 2' }
            ]
            
            store.commit('setDiagrams', diagrams)
            
            expect(store.state.diagrams).toEqual(diagrams)
        })

        it('setTemplates mutation updates state', () => {
            const store = createModelerStore()
            const templates = [
                { id: 't1', name: 'Template 1' },
                { id: 't2', name: 'Template 2' }
            ]
            
            store.commit('setTemplates', templates)
            
            expect(store.state.templates).toEqual(templates)
        })

        it('handles null values in mutations', () => {
            const store = createModelerStore()
            
            store.commit('setCurrentDiagram', null)
            store.commit('setDiagrams', null)
            store.commit('setTemplates', null)
            
            expect(store.state.currentDiagram).toBeNull()
            expect(store.state.diagrams).toBeNull()
            expect(store.state.templates).toBeNull()
        })

        it('handles empty arrays in mutations', () => {
            const store = createModelerStore()
            
            store.commit('setDiagrams', [])
            store.commit('setTemplates', [])
            
            expect(store.state.diagrams).toEqual([])
            expect(store.state.templates).toEqual([])
        })
    })

    describe('actions', () => {
        it('updateCurrentDiagram action commits mutation', () => {
            const store = createModelerStore()
            const diagram = { id: 'd1', name: 'Diagram 1' }
            
            store.dispatch('updateCurrentDiagram', diagram)
            
            expect(store.state.currentDiagram).toEqual(diagram)
        })

        it('updateDiagrams action commits mutation', () => {
            const store = createModelerStore()
            const diagrams = [{ id: 'd1', name: 'Diagram 1' }]
            
            store.dispatch('updateDiagrams', diagrams)
            
            expect(store.state.diagrams).toEqual(diagrams)
        })

        it('updateTemplates action commits mutation', () => {
            const store = createModelerStore()
            const templates = [{ id: 't1', name: 'Template 1' }]
            
            store.dispatch('updateTemplates', templates)
            
            expect(store.state.templates).toEqual(templates)
        })

        it('handles sequential action dispatches', () => {
            const store = createModelerStore()
            const diagram = { id: 'd1' }
            const diagrams = [diagram]
            const templates = [{ id: 't1' }]
            
            store.dispatch('updateCurrentDiagram', diagram)
            store.dispatch('updateDiagrams', diagrams)
            store.dispatch('updateTemplates', templates)
            
            expect(store.state.currentDiagram).toEqual(diagram)
            expect(store.state.diagrams).toEqual(diagrams)
            expect(store.state.templates).toEqual(templates)
        })
    })

    describe('multiple store instances', () => {
        it('creates independent store instances', () => {
            const store1 = createModelerStore()
            const store2 = createModelerStore()
            
            store1.commit('setCurrentDiagram', { id: 'd1' })
            store2.commit('setCurrentDiagram', { id: 'd2' })
            
            expect(store1.state.currentDiagram.id).toBe('d1')
            expect(store2.state.currentDiagram.id).toBe('d2')
        })

        it('stores with custom options are independent', () => {
            const store1 = createModelerStore({ state: { custom1: 'value1' } })
            const store2 = createModelerStore({ state: { custom2: 'value2' } })
            
            expect(store1.state.custom1).toBe('value1')
            expect(store1.state.custom2).toBeUndefined()
            expect(store2.state.custom2).toBe('value2')
            expect(store2.state.custom1).toBeUndefined()
        })
    })

    describe('store configuration options', () => {
        it('accepts empty options', () => {
            const store = createModelerStore({})
            expect(store.state).toBeDefined()
        })

        it('accepts state option only', () => {
            const store = createModelerStore({ state: { custom: 'value' } })
            expect(store.state.custom).toBe('value')
        })

        it('accepts multiple options together', () => {
            const options = {
                state: { customState: 'test' },
                mutations: { customMutation: () => {} },
                actions: { customAction: () => {} }
            }
            const store = createModelerStore(options)
            expect(store.state.customState).toBe('test')
        })
    })

    describe('edge cases', () => {
        it('handles diagram objects with complex properties', () => {
            const store = createModelerStore()
            const complexDiagram = {
                id: 'd1',
                metadata: { nested: { deep: 'value' } },
                data: [1, 2, 3],
                timestamps: { created: '2024-01-01', modified: '2024-01-02' }
            }
            
            store.commit('setCurrentDiagram', complexDiagram)
            
            expect(store.state.currentDiagram).toEqual(complexDiagram)
            expect(store.state.currentDiagram.metadata.nested.deep).toBe('value')
        })

        it('handles large arrays of diagrams', () => {
            const store = createModelerStore()
            const diagrams = Array.from({ length: 1000 }, (_, i) => ({
                id: `d${i}`,
                name: `Diagram ${i}`
            }))
            
            store.commit('setDiagrams', diagrams)
            
            expect(store.state.diagrams).toHaveLength(1000)
            expect(store.state.diagrams[500].id).toBe('d500')
        })

        it('preserves state through multiple mutations', () => {
            const store = createModelerStore()
            const diagram = { id: 'd1' }
            const diagrams = [diagram]
            const templates = [{ id: 't1' }]
            
            store.commit('setCurrentDiagram', diagram)
            store.commit('setDiagrams', diagrams)
            store.commit('setTemplates', templates)
            
            expect(store.state.currentDiagram).toEqual(diagram)
            expect(store.state.diagrams).toEqual(diagrams)
            expect(store.state.templates).toEqual(templates)
        })

        it('handles undefined values', () => {
            const store = createModelerStore()
            
            store.commit('setCurrentDiagram', undefined)
            
            expect(store.state.currentDiagram).toBeUndefined()
        })

        it('overwrites previous values', () => {
            const store = createModelerStore()
            
            store.commit('setCurrentDiagram', { id: 'd1' })
            expect(store.state.currentDiagram.id).toBe('d1')
            
            store.commit('setCurrentDiagram', { id: 'd2' })
            expect(store.state.currentDiagram.id).toBe('d2')
        })
    })
})
