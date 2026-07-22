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
    fetchDiagram: vi.fn().mockResolvedValue('<bpmn />'),
    fetchDecisionDiagram: vi.fn().mockResolvedValue('<dmn />'),
}))

vi.mock('../../services/processService.js', () => ({
    fetchDiagram: m.fetchDiagram,
    fetchDecisionDiagram: m.fetchDecisionDiagram,
}))

import xmlStore from '../../stores/xmlStore.js'

const makeStore = () => createStore({
    modules: { xml: { namespaced: true, ...xmlStore } }
})

describe('xmlStore', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('state', () => {
        it('initializes with null xmlFromExternalReturn', () => {
            const store = makeStore()
            expect(store.state.xml.xmlFromExternalReturn).toBeNull()
        })

        it('initializes with null xmlFromModeler', () => {
            const store = makeStore()
            expect(store.state.xml.xmlFromModeler).toBeNull()
        })

        it('initializes with loading false', () => {
            const store = makeStore()
            expect(store.state.xml.isLoading).toBe(false)
        })

        it('initializes with no error', () => {
            const store = makeStore()
            expect(store.state.xml.error).toBeNull()
        })
    })

    describe('mutations', () => {
        it('setXmlFromExternalReturn sets external XML', () => {
            const store = makeStore()
            const xml = '<bpmn />'
            store.commit('xml/setXmlFromExternalReturn', xml)
            expect(store.state.xml.xmlFromExternalReturn).toBe(xml)
        })

        it('setXmlFromModeler sets modeler XML', () => {
            const store = makeStore()
            const xml = '<bpmn />'
            store.commit('xml/setXmlFromModeler', xml)
            expect(store.state.xml.xmlFromModeler).toBe(xml)
        })

        it('clearXmlFromExternalReturn clears external XML', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<bpmn />')
            store.commit('xml/clearXmlFromExternalReturn')
            expect(store.state.xml.xmlFromExternalReturn).toBeNull()
        })

        it('clearXmlFromModeler clears modeler XML', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromModeler', '<bpmn />')
            store.commit('xml/clearXmlFromModeler')
            expect(store.state.xml.xmlFromModeler).toBeNull()
        })

        it('clearAllXml clears both XMLs', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<bpmn />')
            store.commit('xml/setXmlFromModeler', '<bpmn />')
            store.commit('xml/clearAllXml')
            expect(store.state.xml.xmlFromExternalReturn).toBeNull()
            expect(store.state.xml.xmlFromModeler).toBeNull()
        })

        it('setLoading sets loading state', () => {
            const store = makeStore()
            store.commit('xml/setLoading', true)
            expect(store.state.xml.isLoading).toBe(true)
        })

        it('setError sets error', () => {
            const store = makeStore()
            const error = new Error('Test error')
            store.commit('xml/setError', error)
            expect(store.state.xml.error).toEqual(error)
        })

        it('clearError clears error', () => {
            const store = makeStore()
            store.commit('xml/setError', new Error('Test'))
            store.commit('xml/clearError')
            expect(store.state.xml.error).toBeNull()
        })
    })

    describe('actions', () => {
        it('fetchDiagram fetches BPMN diagram XML', async () => {
            const xml = '<bpmn:definitions><bpmn:process id="proc1"/></bpmn:definitions>'
            m.fetchDiagram.mockResolvedValue(xml)
            const store = makeStore()
            await store.dispatch('xml/fetchDiagram', 'proc-1')
            expect(store.state.xml.xmlFromExternalReturn).toBe(xml)
        })

        it('fetchDiagram sets loading during fetch', async () => {
            m.fetchDiagram.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve('<bpmn />'), 50))
            )
            const store = makeStore()
            const promise = store.dispatch('xml/fetchDiagram', 'proc-1')
            expect(store.state.xml.isLoading).toBe(true)
            await promise
            expect(store.state.xml.isLoading).toBe(false)
        })

        it('fetchDiagram handles errors', async () => {
            const error = new Error('Fetch failed')
            m.fetchDiagram.mockRejectedValue(error)
            const store = makeStore()
            await store.dispatch('xml/fetchDiagram', 'proc-1')
            expect(store.state.xml.error).toBeDefined()
            expect(store.state.xml.isLoading).toBe(false)
        })

        it('fetchDecisionDiagram fetches DMN diagram XML', async () => {
            const xml = '<definitions><decision id="dec1"/></definitions>'
            m.fetchDecisionDiagram.mockResolvedValue(xml)
            const store = makeStore()
            await store.dispatch('xml/fetchDecisionDiagram', 'dec-1')
            expect(store.state.xml.xmlFromExternalReturn).toBe(xml)
        })

        it('fetchDecisionDiagram sets loading during fetch', async () => {
            m.fetchDecisionDiagram.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve('<dmn />'), 50))
            )
            const store = makeStore()
            const promise = store.dispatch('xml/fetchDecisionDiagram', 'dec-1')
            expect(store.state.xml.isLoading).toBe(true)
            await promise
            expect(store.state.xml.isLoading).toBe(false)
        })

        it('storeXmlFromModeler stores XML from modeler', async () => {
            const store = makeStore()
            const xml = '<bpmn />'
            await store.dispatch('xml/setModelerXml', xml)
            expect(store.state.xml.xmlFromModeler).toBe(xml)
        })

        it('clearExternalXml and clearModelerXml actions clear respective state', async () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<external />')
            store.commit('xml/setXmlFromModeler', '<modeler />')
            await store.dispatch('xml/clearExternalXml')
            expect(store.state.xml.xmlFromExternalReturn).toBeNull()
            await store.dispatch('xml/clearModelerXml')
            expect(store.state.xml.xmlFromModeler).toBeNull()
        })

        it('clearError action clears error state', async () => {
            const store = makeStore()
            store.commit('xml/setError', new Error('oops'))
            await store.dispatch('xml/clearError')
            expect(store.state.xml.error).toBeNull()
        })
    })

    describe('getters', () => {
        it('returns external XML via getter', () => {
            const store = makeStore()
            const xml = '<bpmn />'
            store.commit('xml/setXmlFromExternalReturn', xml)
            expect(store.getters['xml/xmlFromExternalReturn']).toBe(xml)
        })

        it('returns modeler XML via getter', () => {
            const store = makeStore()
            const xml = '<bpmn />'
            store.commit('xml/setXmlFromModeler', xml)
            expect(store.getters['xml/xmlFromModeler']).toBe(xml)
        })

        it('returns loading state via getter', () => {
            const store = makeStore()
            store.commit('xml/setLoading', true)
            expect(store.getters['xml/isLoading']).toBe(true)
        })

        it('returns error via getter', () => {
            const store = makeStore()
            const error = new Error('Test')
            store.commit('xml/setError', error)
            expect(store.getters['xml/error']).toEqual(error)
        })

        it('returns hasExternalXml via getter', () => {
            const store = makeStore()
            expect(store.getters['xml/hasExternalXml']).toBe(false)
            store.commit('xml/setXmlFromExternalReturn', '<bpmn />')
            expect(store.getters['xml/hasExternalXml']).toBe(true)
        })

        it('returns hasModelerXml via getter', () => {
            const store = makeStore()
            expect(store.getters['xml/hasModelerXml']).toBe(false)
            store.commit('xml/setXmlFromModeler', '<bpmn />')
            expect(store.getters['xml/hasModelerXml']).toBe(true)
        })

        it('returns hasAnyXml when either source is populated', () => {
            const store = makeStore()
            expect(store.getters['xml/hasAnyXml']).toBe(false)
            store.commit('xml/setXmlFromExternalReturn', '<bpmn />')
            expect(store.getters['xml/hasAnyXml']).toBe(true)
        })

        it('getCurrentXml prefers modeler xml over external', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<external />')
            store.commit('xml/setXmlFromModeler', '<modeler />')
            expect(store.getters['xml/getCurrentXml']).toBe('<modeler />')
        })
    })

    describe('XML content validation', () => {
        it('distinguishes between BPMN and DMN XML', async () => {
            const bpmnXml = '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"/>'
            const dmnXml = '<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL"/>'
            
            m.fetchDiagram.mockResolvedValue(bpmnXml)
            m.fetchDecisionDiagram.mockResolvedValue(dmnXml)
            
            const store = makeStore()
            
            await store.dispatch('xml/fetchDiagram', 'proc-1')
            const fetchedBpmn = store.state.xml.xmlFromExternalReturn
            expect(fetchedBpmn).toContain('bpmn:definitions')
            
            await store.dispatch('xml/fetchDecisionDiagram', 'dec-1')
            const fetchedDmn = store.state.xml.xmlFromExternalReturn
            expect(fetchedDmn).toContain('definitions')
        })

        it('preserves XML structure during storage', () => {
            const store = makeStore()
            const complexXml = '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="proc1"><bpmn:startEvent id="start1"/></bpmn:process></bpmn:definitions>'
            store.commit('xml/setXmlFromModeler', complexXml)
            expect(store.state.xml.xmlFromModeler).toBe(complexXml)
            expect(store.state.xml.xmlFromModeler).toContain('<bpmn:startEvent')
        })
    })

    describe('concurrent operations', () => {
        it('handles multiple concurrent fetches', async () => {
            m.fetchDiagram.mockResolvedValue('<bpmn />')
            m.fetchDecisionDiagram.mockResolvedValue('<dmn />')
            
            const store = makeStore()
            
            await Promise.all([
                store.dispatch('xml/fetchDiagram', 'proc-1'),
                store.dispatch('xml/fetchDecisionDiagram', 'dec-1'),
            ])
            
            expect(store.state.xml.isLoading).toBe(false)
        })
    })

    describe('branch coverage - error paths', () => {
        it('sets error state on fetchDecisionDiagram failure', async () => {
            const error = new Error('DMN fetch failed')
            m.fetchDecisionDiagram.mockRejectedValue(error)
            const store = makeStore()
            
            await store.dispatch('xml/fetchDecisionDiagram', 'dec-1')
            
            expect(store.state.xml.error).toBeDefined()
            expect(store.state.xml.isLoading).toBe(false)
        })

        it('clears error before new fetch', async () => {
            const store = makeStore()
            store.commit('xml/setError', new Error('Previous'))
            
            m.fetchDiagram.mockResolvedValue('<bpmn />')
            await store.dispatch('xml/fetchDiagram', 'proc-1')
            
            expect(store.state.xml.error).toBeNull()
        })
    })

    describe('branch coverage - hasExternalXml getter', () => {
        it('returns false when xmlFromExternalReturn is null', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', null)
            expect(store.getters['xml/hasExternalXml']).toBe(false)
        })

        it('returns true when xmlFromExternalReturn has content', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<bpmn />')
            expect(store.getters['xml/hasExternalXml']).toBe(true)
        })

        it('handles empty string as false', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '')
            expect(store.getters['xml/hasExternalXml']).toBe(false)
        })
    })

    describe('branch coverage - hasModelerXml getter', () => {
        it('returns false when xmlFromModeler is null', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromModeler', null)
            expect(store.getters['xml/hasModelerXml']).toBe(false)
        })

        it('returns true when xmlFromModeler has content', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromModeler', '<bpmn />')
            expect(store.getters['xml/hasModelerXml']).toBe(true)
        })
    })

    describe('branch coverage - XML state transitions', () => {
        it('transitions from no XML to external XML', () => {
            const store = makeStore()
            expect(store.getters['xml/hasExternalXml']).toBe(false)
            
            store.commit('xml/setXmlFromExternalReturn', '<bpmn />')
            expect(store.getters['xml/hasExternalXml']).toBe(true)
        })

        it('transitions from external to modeler XML', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<bpmn />')
            expect(store.getters['xml/hasExternalXml']).toBe(true)
            
            store.commit('xml/setXmlFromModeler', '<bpmn />')
            expect(store.getters['xml/hasModelerXml']).toBe(true)
        })

        it('maintains separate XML states', () => {
            const store = makeStore()
            const externalXml = '<external />'
            const modelerXml = '<modeler />'
            
            store.commit('xml/setXmlFromExternalReturn', externalXml)
            store.commit('xml/setXmlFromModeler', modelerXml)
            
            expect(store.state.xml.xmlFromExternalReturn).toBe(externalXml)
            expect(store.state.xml.xmlFromModeler).toBe(modelerXml)
        })

        it('clears external without affecting modeler', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<external />')
            store.commit('xml/setXmlFromModeler', '<modeler />')
            
            store.commit('xml/clearXmlFromExternalReturn')
            
            expect(store.state.xml.xmlFromExternalReturn).toBeNull()
            expect(store.state.xml.xmlFromModeler).toBe('<modeler />')
        })

        it('clears modeler without affecting external', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<external />')
            store.commit('xml/setXmlFromModeler', '<modeler />')
            
            store.commit('xml/clearXmlFromModeler')
            
            expect(store.state.xml.xmlFromExternalReturn).toBe('<external />')
            expect(store.state.xml.xmlFromModeler).toBeNull()
        })
    })

    describe('branch coverage - loading state transitions', () => {
        it('sets loading true then false on successful fetch', async () => {
            const store = makeStore()
            m.fetchDiagram.mockResolvedValue('<bpmn />')
            
            const fetchPromise = store.dispatch('xml/fetchDiagram', 'proc-1')
            expect(store.state.xml.isLoading).toBe(true)
            
            await fetchPromise
            expect(store.state.xml.isLoading).toBe(false)
        })

        it('sets loading true then false on failed fetch', async () => {
            const store = makeStore()
            m.fetchDiagram.mockRejectedValue(new Error('Fetch failed'))
            
            const fetchPromise = store.dispatch('xml/fetchDiagram', 'proc-1')
            expect(store.state.xml.isLoading).toBe(true)
            
            await fetchPromise
            expect(store.state.xml.isLoading).toBe(false)
        })

        it('maintains loading state through multiple mutations', () => {
            const store = makeStore()
            store.commit('xml/setLoading', true)
            store.commit('xml/setXmlFromModeler', '<bpmn />')
            expect(store.state.xml.isLoading).toBe(true)
            
            store.commit('xml/setLoading', false)
            expect(store.state.xml.isLoading).toBe(false)
        })
    })

    describe('branch coverage - error state transitions', () => {
        it('sets error state on fetch failure', async () => {
            const store = makeStore()
            const testError = new Error('Network error')
            m.fetchDiagram.mockRejectedValue(testError)
            
            await store.dispatch('xml/fetchDiagram', 'proc-1')
            expect(store.state.xml.error).toBeDefined()
        })

        it('clears error on subsequent successful fetch', async () => {
            const store = makeStore()
            store.commit('xml/setError', new Error('Previous'))
            
            m.fetchDiagram.mockResolvedValue('<bpmn />')
            await store.dispatch('xml/fetchDiagram', 'proc-1')
            
            expect(store.state.xml.error).toBeNull()
        })

        it('handles clearError mutation', () => {
            const store = makeStore()
            store.commit('xml/setError', new Error('Test'))
            expect(store.state.xml.error).not.toBeNull()
            
            store.commit('xml/clearError')
            expect(store.state.xml.error).toBeNull()
        })
    })

    describe('branch coverage - clear operations', () => {
        it('clearAllXml clears both XML types', () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<external />')
            store.commit('xml/setXmlFromModeler', '<modeler />')
            
            store.commit('xml/clearAllXml')
            
            expect(store.state.xml.xmlFromExternalReturn).toBeNull()
            expect(store.state.xml.xmlFromModeler).toBeNull()
        })

        it('clearAllXml action also clears both', async () => {
            const store = makeStore()
            store.commit('xml/setXmlFromExternalReturn', '<external />')
            store.commit('xml/setXmlFromModeler', '<modeler />')
            
            await store.dispatch('xml/clearAllXml')
            
            expect(store.state.xml.xmlFromExternalReturn).toBeNull()
            expect(store.state.xml.xmlFromModeler).toBeNull()
        })

        it('clear operations are idempotent', () => {
            const store = makeStore()
            store.commit('xml/clearXmlFromExternalReturn')
            store.commit('xml/clearXmlFromExternalReturn')
            expect(store.state.xml.xmlFromExternalReturn).toBeNull()
            
            store.commit('xml/clearXmlFromModeler')
            store.commit('xml/clearXmlFromModeler')
            expect(store.state.xml.xmlFromModeler).toBeNull()
        })
    })

    describe('branch coverage - fetch action variants', () => {
        it('fetchDiagram stores result in xmlFromExternalReturn', async () => {
            const xml = '<bpmn>process</bpmn>'
            m.fetchDiagram.mockResolvedValue(xml)
            
            const store = makeStore()
            await store.dispatch('xml/fetchDiagram', 'proc-1')
            
            expect(store.state.xml.xmlFromExternalReturn).toBe(xml)
        })

        it('fetchDecisionDiagram stores result in xmlFromExternalReturn', async () => {
            const xml = '<dmn>decision</dmn>'
            m.fetchDecisionDiagram.mockResolvedValue(xml)
            
            const store = makeStore()
            await store.dispatch('xml/fetchDecisionDiagram', 'dec-1')
            
            expect(store.state.xml.xmlFromExternalReturn).toBe(xml)
        })

        it('setModelerXml stores in xmlFromModeler', async () => {
            const xml = '<bpmn>modified</bpmn>'
            const store = makeStore()
            
            await store.dispatch('xml/setModelerXml', xml)
            
            expect(store.state.xml.xmlFromModeler).toBe(xml)
        })
    })
})
