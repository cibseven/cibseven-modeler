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

const m = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../../axiosConfig', () => ({ getAxios: () => ({ get: m.get }) }))
vi.mock('../../services/servicesConfig', () => ({ getModelerServicePath: () => 'svc' }))

import { keyExistsRemote } from '../../services/processService'

describe('keyExistsRemote', () => {
    beforeEach(() => m.get.mockReset())

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
