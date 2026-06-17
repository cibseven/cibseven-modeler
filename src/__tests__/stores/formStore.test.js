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

const m = vi.hoisted(() => ({ fetchFormById: vi.fn() }))
vi.mock('../../services/formService', () => ({
    fetchForms: vi.fn(),
    fetchFormById: m.fetchFormById,
}))

import { createStore } from 'vuex'
import formStore from '../../stores/formStore.js'

const makeStore = () => createStore({ modules: { forms: { namespaced: true, ...formStore } } })

describe('formStore.fetchFormById', () => {
    it('stores formSelected single-encoded (one JSON.parse yields the schema object)', async () => {
        const schema = { type: 'default', id: 'formA', components: [] }
        m.fetchFormById.mockResolvedValue(schema)
        const store = makeStore()

        await store.dispatch('forms/fetchFormById', 'fdb-1')

        const stored = store.state.forms.formSelected
        expect(typeof stored).toBe('string')
        // A single parse must return the object — not another string (would be double-encoded).
        expect(JSON.parse(stored)).toEqual(schema)
        expect(store.getters['forms/parsedSelectedForm']).toEqual(schema)
        expect(store.state.forms.formSelectedId).toBe('fdb-1')
    })
})
