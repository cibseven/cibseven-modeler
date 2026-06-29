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
    fetchProcesses: vi.fn().mockResolvedValue([]),
    getUnifiedDiagrams: vi.fn().mockResolvedValue([]),
    fetchProcessById: vi.fn().mockResolvedValue({}),
    fetchProcessByName: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../services/processService.js', () => ({
    fetchProcesses: m.fetchProcesses,
    getUnifiedDiagrams: m.getUnifiedDiagrams,
    fetchProcessById: m.fetchProcessById,
    fetchProcessByName: m.fetchProcessByName,
}))

import processStore from '../../stores/processStore.js'

const makeStore = () => createStore({
    state: { modeler: { forms: { setForms: vi.fn() } } },
    modules: {
        processes: { namespaced: true, ...processStore },
        modeler: {
            modules: {
                forms: {
                    namespaced: true,
                    mutations: { setForms: (state, forms) => {} },
                }
            }
        }
    },
})

describe('processStore', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('state', () => {
        it('initializes with null processes', () => {
            const store = makeStore()
            expect(store.state.processes.processes).toBeNull()
        })

        it('initializes with null unified diagrams', () => {
            const store = makeStore()
            expect(store.state.processes.unifiedDiagrams).toBeNull()
        })

        it('initializes with null processSelected', () => {
            const store = makeStore()
            expect(store.state.processes.processSelected).toBeNull()
        })

        it('initializes with loading false', () => {
            const store = makeStore()
            expect(store.state.processes.isLoading).toBe(false)
        })

        it('initializes with no error', () => {
            const store = makeStore()
            expect(store.state.processes.error).toBeNull()
        })
    })

    describe('mutations', () => {
        it('setProcesses sets processes', () => {
            const store = makeStore()
            const processes = [{ id: 'p1', name: 'Process 1' }]
            store.commit('processes/setProcesses', processes)
            expect(store.state.processes.processes).toEqual(processes)
        })

        it('setUnifiedDiagrams sets unified diagrams', () => {
            const store = makeStore()
            const diagrams = [
                { id: 'p1', type: 'bpmn' },
                { id: 'f1', type: 'form' },
            ]
            store.commit('processes/setUnifiedDiagrams', diagrams)
            expect(store.state.processes.unifiedDiagrams).toEqual(diagrams)
        })

        it('setCurrentProcess sets processSelected', () => {
            const store = makeStore()
            const process = { id: 'p1', name: 'Process 1' }
            store.commit('processes/setCurrentProcess', { processSelected: process })
            expect(store.state.processes.processSelected).toEqual(process)
        })

        it('setResetProcessSelected resets processSelected', () => {
            const store = makeStore()
            store.commit('processes/setCurrentProcess', { processSelected: { id: 'p1' } })
            store.commit('processes/setResetProcessSelected')
            expect(store.state.processes.processSelected).toBeNull()
        })

        it('setProcessHistoryList sets history', () => {
            const store = makeStore()
            const history = [{ id: 'p1', version: 1 }]
            store.commit('processes/setProcessHistoryList', history)
            expect(store.state.processes.processHistoryList).toEqual(history)
        })

        it('setLoading sets loading state', () => {
            const store = makeStore()
            store.commit('processes/setLoading', true)
            expect(store.state.processes.isLoading).toBe(true)
        })

        it('setError sets error', () => {
            const store = makeStore()
            const error = new Error('Test error')
            store.commit('processes/setError', error)
            expect(store.state.processes.error).toEqual(error)
        })

        it('clearError clears error', () => {
            const store = makeStore()
            store.commit('processes/setError', new Error('Test'))
            store.commit('processes/clearError')
            expect(store.state.processes.error).toBeNull()
        })
    })

    describe('actions', () => {
        it('fetchUnifiedDiagrams fetches and stores diagrams', async () => {
            const diagrams = [
                { id: 'p1', name: 'Process 1', type: 'bpmn' },
                { id: 'f1', name: 'Form 1', type: 'form' },
            ]
            m.getUnifiedDiagrams.mockResolvedValue(diagrams)
            const store = makeStore()
            await store.dispatch('processes/fetchUnifiedDiagrams', {
                firstResult: 0,
                maxResults: 10,
            })
            expect(store.state.processes.unifiedDiagrams).toEqual(diagrams)
        })

        it('fetchUnifiedDiagrams separates processes and forms', async () => {
            const diagrams = [
                { id: 'p1', name: 'Process 1', type: 'bpmn' },
                { id: 'f1', name: 'Form 1', type: 'form' },
            ]
            m.getUnifiedDiagrams.mockResolvedValue(diagrams)
            const store = makeStore()
            await store.dispatch('processes/fetchUnifiedDiagrams', {
                firstResult: 0,
                maxResults: 10,
            })
            expect(store.state.processes.processes.length).toBe(1)
            expect(store.state.processes.processes[0].type).toBe('bpmn')
        })

        it('fetchUnifiedDiagrams sets loading during fetch', async () => {
            m.getUnifiedDiagrams.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve([]), 50))
            )
            const store = makeStore()
            const promise = store.dispatch('processes/fetchUnifiedDiagrams', {
                firstResult: 0,
                maxResults: 10,
            })
            expect(store.state.processes.isLoading).toBe(true)
            await promise
            expect(store.state.processes.isLoading).toBe(false)
        })

        it('fetchUnifiedDiagrams handles errors', async () => {
            const error = new Error('Fetch failed')
            m.getUnifiedDiagrams.mockRejectedValue(error)
            const store = makeStore()
            await store.dispatch('processes/fetchUnifiedDiagrams', {
                firstResult: 0,
                maxResults: 10,
            })
            expect(store.state.processes.error).toBeDefined()
            expect(store.state.processes.isLoading).toBe(false)
        })

        it('fetchProcesses fetches processes with filter', async () => {
            const processes = [{ id: 'p1', name: 'Process 1', type: 'bpmn-c7' }]
            m.fetchProcesses.mockResolvedValue(processes)
            const store = makeStore()
            await store.dispatch('processes/fetchProcesses', {
                firstResult: 0,
                maxResults: 10,
                keyword: 'test',
            })
            expect(m.fetchProcesses).toHaveBeenCalled()
        })

        it('fetchProcesses by name', async () => {
            const process = { id: 'p1', name: 'My Process' }
            m.fetchProcessByName.mockResolvedValue(process)
            const store = makeStore()
            const result = await store.dispatch('processes/fetchProcessByName', 'My Process')
            expect(m.fetchProcessByName).toHaveBeenCalledWith('My Process')
        })
    })

    describe('getters', () => {
        it('returns processes via getter', () => {
            const store = makeStore()
            const processes = [{ id: 'p1', name: 'Process 1' }]
            store.commit('processes/setProcesses', processes)
            expect(store.getters['processes/allProcesses']).toEqual(processes)
        })

        it('returns unified diagrams via getter', () => {
            const store = makeStore()
            const diagrams = [{ id: 'p1' }, { id: 'f1' }]
            store.commit('processes/setUnifiedDiagrams', diagrams)
            expect(store.getters['processes/processHistoryList']).toBeDefined()
        })

        it('returns current process via getter', () => {
            const store = makeStore()
            const process = { id: 'p1', name: 'Process 1' }
            store.commit('processes/setCurrentProcess', { processSelected: process })
            expect(store.getters['processes/selectedProcess']).toEqual(process)
        })

        it('returns loading state via getter', () => {
            const store = makeStore()
            store.commit('processes/setLoading', true)
            expect(store.getters['processes/isLoading']).toBe(true)
        })

        it('returns error via getter', () => {
            const store = makeStore()
            const error = new Error('Test')
            store.commit('processes/setError', error)
            expect(store.getters['processes/error']).toEqual(error)
        })

        it('returns process by id via getter', () => {
            const store = makeStore()
            const processes = [{ id: 'p1', name: 'Process 1' }]
            store.commit('processes/setProcesses', processes)
            expect(store.getters['processes/getProcessById']('p1')).toEqual(processes[0])
        })
    })
})
