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

const m = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
}))
vi.mock('../../axiosConfig', () => ({ getAxios: () => m }))
vi.mock('../../services/servicesConfig', () => ({ getModelerServicePath: () => 'svc' }))

import {
    keyExistsRemote,
    fetchProcesses,
    fetchProcessById,
    fetchProcessByName,
    getUnifiedDiagrams,
    saveDiagramProcess,
    updateDiagramProcess,
    deleteProcessById,
    fetchDiagram,
    fetchDecisionDiagram,
} from '../../services/processService'

describe('processService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('keyExistsRemote', () => {
        // Both types use an exact by-key GET: 200 resolves = exists, 404 rejects = not found.
        it('returns true and hits /process/find-by-key when a process exists', async () => {
            m.get.mockResolvedValueOnce({})
            expect(await keyExistsRemote('proc-1', 'bpmn-c7')).toBe(true)
            expect(m.get).toHaveBeenCalledWith(expect.stringContaining('/process/find-by-key'), { params: { key: 'proc-1' } })
        })

        it('returns true and hits /form/find-by-formid when a form exists', async () => {
            m.get.mockResolvedValueOnce({})
            expect(await keyExistsRemote('form-a', 'form')).toBe(true)
            expect(m.get).toHaveBeenCalledWith(expect.stringContaining('/form/find-by-formid'), { params: { formId: 'form-a' } })
        })

        it('returns false when the lookup 404s (not found)', async () => {
            m.get.mockRejectedValueOnce(Object.assign(new Error('not found'), { response: { status: 404 } }))
            expect(await keyExistsRemote('proc-1', 'bpmn-c7')).toBe(false)
        })

        it('returns false for an empty key without calling the backend', async () => {
            expect(await keyExistsRemote('', 'form')).toBe(false)
            expect(m.get).not.toHaveBeenCalled()
        })

        it('returns false (never throws) when the request fails', async () => {
            m.get.mockRejectedValueOnce(new Error('network'))
            expect(await keyExistsRemote('proc-1', 'bpmn-c7')).toBe(false)
        })
    })

    describe('fetchProcesses', () => {
        it('fetches processes with parameters', async () => {
            const processes = [{ id: 'p1', name: 'Process 1' }]
            m.get.mockResolvedValue({ data: processes })

            const result = await fetchProcesses(0, 10, 'search', 'bpmn-c7')

            expect(m.get).toHaveBeenCalled()
            expect(result.data).toEqual(processes)
        })

        it('handles empty results', async () => {
            m.get.mockResolvedValue({ data: [] })

            const result = await fetchProcesses(0, 10)

            expect(Array.isArray(result.data)).toBe(true)
            expect(result.data.length).toBe(0)
        })

        it('handles fetch errors', async () => {
            m.get.mockRejectedValue(new Error('Network error'))

            return expect(fetchProcesses(0, 10)).rejects.toThrow('Network error')
        })
    })

    describe('fetchProcessById', () => {
        it('fetches process by ID', async () => {
            const process = { id: 'p1', name: 'Process 1', xml: '<bpmn />' }
            m.get.mockResolvedValue({ data: process })

            const result = await fetchProcessById('p1')

            expect(m.get).toHaveBeenCalled()
            expect(result.data).toEqual(process)
        })

        it('returns process with XML content', async () => {
            const xml = '<bpmn:definitions><bpmn:process id="proc1"/></bpmn:definitions>'
            m.get.mockResolvedValue({ data: { id: 'p1', content: xml } })

            const result = await fetchProcessById('p1')

            expect(result.data.content).toContain('bpmn:process')
        })
    })

    describe('fetchProcessByName', () => {
        it('fetches process by name', async () => {
            const process = { id: 'p1', name: 'My Process' }
            m.post.mockResolvedValue({ data: process })

            const result = await fetchProcessByName('My Process')

            expect(m.post).toHaveBeenCalled()
            expect(result.data).toEqual(process)
        })
    })

    describe('getUnifiedDiagrams', () => {
        it('fetches unified diagrams (processes and forms)', async () => {
            const diagrams = [
                { id: 'p1', type: 'bpmn', name: 'Process' },
                { id: 'f1', type: 'form', name: 'Form' },
            ]
            m.get.mockResolvedValue({ data: diagrams })

            const result = await getUnifiedDiagrams(0, 20)

            expect(m.get).toHaveBeenCalled()
            expect(Array.isArray(result.data)).toBe(true)
        })

        it('supports pagination', async () => {
            m.get.mockResolvedValue({ data: [] })

            await getUnifiedDiagrams(50, 10)

            expect(m.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ params: expect.objectContaining({ firstResult: 50, maxResults: 10 }) })
            )
        })

        it('supports filtering by type', async () => {
            m.get.mockResolvedValue({ data: [] })

            await getUnifiedDiagrams(0, 10, '', 'bpmn-c7')

            expect(m.get).toHaveBeenCalledWith(
                'svc/unified-diagrams',
                expect.objectContaining({ params: expect.objectContaining({ type: 'bpmn-c7' }) })
            )
        })

        it('supports keyword search', async () => {
            m.get.mockResolvedValue({ data: [] })

            await getUnifiedDiagrams(0, 10, 'invoice')

            expect(m.get).toHaveBeenCalledWith(
                'svc/unified-diagrams',
                expect.objectContaining({ params: expect.objectContaining({ keyword: 'invoice' }) })
            )
        })
    })

    describe('saveDiagramProcess', () => {
        it('saves new process', async () => {
            const blob = new Blob(['<bpmn />'], { type: 'text/xml' })
            m.post.mockResolvedValue({ data: { id: 'p1', name: 'Process 1' } })

            const result = await saveDiagramProcess('proc1', 'Process 1', blob, 'bpmn-c7')

            expect(m.post).toHaveBeenCalled()
            expect(result.data).toEqual({ id: 'p1', name: 'Process 1' })
        })

        it('handles save errors', async () => {
            const blob = new Blob(['<bpmn />'], { type: 'text/xml' })
            m.post.mockRejectedValue(new Error('Save failed'))

            return expect(saveDiagramProcess('proc1', 'Process 1', blob, 'bpmn-c7')).rejects.toThrow('Save failed')
        })
    })

    describe('updateDiagramProcess', () => {
        it('updates existing process', async () => {
            const blob = new Blob(['<bpmn />'], { type: 'text/xml' })
            m.post.mockResolvedValue({ data: { id: 'p1', name: 'Updated Process' } })

            const result = await updateDiagramProcess('p1', 'Updated', 'proc1', blob, 'bpmn-c7')

            expect(m.post).toHaveBeenCalled()
            expect(result.data).toEqual({ id: 'p1', name: 'Updated Process' })
        })
    })

    describe('deleteProcessById', () => {
        it('deletes process by ID', async () => {
            m.delete.mockResolvedValue({})

            await deleteProcessById('p1')

            expect(m.delete).toHaveBeenCalled()
        })

        it('handles delete errors', async () => {
            m.delete.mockRejectedValue(new Error('Delete failed'))

            return expect(deleteProcessById('p1')).rejects.toThrow('Delete failed')
        })
    })

    describe('fetchDiagram', () => {
        it('fetches diagram XML', async () => {
            const xml = '<bpmn:definitions><bpmn:process id="proc1"/></bpmn:definitions>'
            m.get.mockResolvedValue({ data: xml })

            const result = await fetchDiagram('p1')

            expect(m.get).toHaveBeenCalled()
            expect(result.data).toContain('bpmn:process')
        })
    })

    describe('fetchDecisionDiagram', () => {
        it('fetches decision diagram XML', async () => {
            const xml = '<definitions><decision id="dec1"/></definitions>'
            m.get.mockResolvedValue({ data: xml })

            const result = await fetchDecisionDiagram('d1')

            expect(m.get).toHaveBeenCalled()
            expect(result.data).toContain('decision')
        })
    })

})
