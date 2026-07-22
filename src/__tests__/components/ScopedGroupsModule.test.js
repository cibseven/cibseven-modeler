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
import ScopedGroupsModule from '../../components/modeler/element-templates/ScopedGroupsModule.js'

describe('ScopedGroupsModule', () => {
    it('registers scoped template groups provider on init', () => {
        const registerProvider = vi.fn()
        const elementTemplates = { get: vi.fn(() => ({
            groups: [{ id: 'g1', label: 'Group 1', openByDefault: true }],
        })) }
        const translate = vi.fn((label) => label)

        const provider = new ScopedGroupsModule.scopedTemplateGroupsProvider[1](
            elementTemplates,
            { registerProvider },
            translate,
        )

        expect(registerProvider).toHaveBeenCalledWith(200, provider)

        const groups = [{
            id: 'ElementTemplates__CustomGroup-connector',
            label: 'Connector',
            entries: [
                { property: { group: 'g1' }, id: 'entry1' },
                { property: {}, id: 'entry2' },
            ],
        }]

        const transform = provider.getGroups({})
        const result = transform(groups)

        expect(result.length).toBeGreaterThan(1)
        expect(translate).toHaveBeenCalled()
    })

    it('passes through non-scope groups unchanged', () => {
        const registerProvider = vi.fn()
        const provider = new ScopedGroupsModule.scopedTemplateGroupsProvider[1](
            { get: vi.fn(() => null) },
            { registerProvider },
            (x) => x,
        )

        const groups = [{ id: 'general', entries: [] }]
        const result = provider.getGroups({})(groups)
        expect(result).toEqual(groups)
    })
})
