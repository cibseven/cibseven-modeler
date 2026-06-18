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

    it('returns true on an exact processkey match', async () => {
        m.get.mockResolvedValueOnce([{ processkey: 'proc-1' }, { processkey: 'proc-1-other' }])
        expect(await keyExistsRemote('proc-1', 'bpmn-c7')).toBe(true)
    })

    it('ignores partial matches (keyword search is fuzzy)', async () => {
        m.get.mockResolvedValueOnce([{ processkey: 'proc-1-other' }])
        expect(await keyExistsRemote('proc-1', 'bpmn-c7')).toBe(false)
    })

    it('matches forms by formId', async () => {
        m.get.mockResolvedValueOnce([{ formId: 'form-a' }])
        expect(await keyExistsRemote('form-a', 'form')).toBe(true)
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
