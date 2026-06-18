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

const m = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('../../axiosConfig', () => ({ getAxios: () => ({ get: m.get, post: m.post }) }))
vi.mock('../../services/servicesConfig', () => ({ getModelerServicePath: () => 'svc' }))

import { keyExistsRemote } from '../../services/processService'

describe('keyExistsRemote', () => {
    beforeEach(() => { m.get.mockReset(); m.post.mockReset() })

    // Processes/DMN → exact find-by-key (POST): 200 = exists, 404 = rejects = not found.
    it('returns true when find-by-key resolves (process exists)', async () => {
        m.post.mockResolvedValueOnce('<xml/>')
        expect(await keyExistsRemote('proc-1', 'bpmn-c7')).toBe(true)
        expect(m.post).toHaveBeenCalledWith(expect.stringContaining('/process/find-by-key/data'), expect.anything(), expect.anything())
    })

    it('returns false when find-by-key 404s (process not found)', async () => {
        m.post.mockRejectedValueOnce(Object.assign(new Error('not found'), { response: { status: 404 } }))
        expect(await keyExistsRemote('proc-1', 'bpmn-c7')).toBe(false)
    })

    // Forms → keyword search (GET), exact formId match required.
    it('matches forms by exact formId', async () => {
        m.get.mockResolvedValueOnce([{ formId: 'form-a' }])
        expect(await keyExistsRemote('form-a', 'form')).toBe(true)
    })

    it('ignores partial form matches (fuzzy keyword search)', async () => {
        m.get.mockResolvedValueOnce([{ formId: 'form-a-2' }])
        expect(await keyExistsRemote('form-a', 'form')).toBe(false)
    })

    it('returns false for an empty key without calling the backend', async () => {
        expect(await keyExistsRemote('', 'form')).toBe(false)
        expect(m.get).not.toHaveBeenCalled()
        expect(m.post).not.toHaveBeenCalled()
    })

    it('returns false (never throws) when the request fails', async () => {
        m.post.mockRejectedValueOnce(new Error('network'))
        expect(await keyExistsRemote('proc-1', 'bpmn-c7')).toBe(false)
    })
})
