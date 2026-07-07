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

const m = vi.hoisted(() => ({ getAllElementTemplates: vi.fn() }))
vi.mock('../../services/elementTemplateService', () => ({
    getAllElementTemplates: m.getAllElementTemplates,
}))

import { createStore } from 'vuex'
import elementTemplateStore from '../../stores/elementTemplateStore.js'

const makeStore = () => createStore({ modules: { et: { namespaced: true, ...elementTemplateStore } } })

describe('elementTemplateStore non-array guard', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    it('setElementTemplates coerces a non-array payload to []', () => {
        const store = makeStore()
        store.commit('et/setElementTemplates', '<!doctype html><html>not an array</html>')
        expect(store.state.et.elementTemplates).toEqual([])
    })

    it('fetchAllElementTemplates stores [] when the endpoint returns HTML (disabled backend)', async () => {
        m.getAllElementTemplates.mockResolvedValue('<!doctype html><html>SPA fallback</html>')
        const store = makeStore()

        await store.dispatch('et/fetchAllElementTemplates')

        expect(store.state.et.elementTemplates).toEqual([])
        expect(store.getters['et/allElementTemplateContents']).toEqual([])
        expect(console.warn).toHaveBeenCalled()
    })

    it('fetchAllElementTemplates stores a valid array response', async () => {
        const templates = [{ id: '1', active: true, content: '{}' }]
        m.getAllElementTemplates.mockResolvedValue(templates)
        const store = makeStore()

        await store.dispatch('et/fetchAllElementTemplates')

        expect(store.state.et.elementTemplates).toEqual(templates)
        expect(console.warn).not.toHaveBeenCalled()
    })
})
