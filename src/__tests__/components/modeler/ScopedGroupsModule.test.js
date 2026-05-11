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
import { describe, it, expect } from 'vitest'
import {
    splitElementTemplateInputGroup,
    splitScopeGroupEntries
} from '../../../components/modeler/element-templates/ScopedGroupsModule.js'

describe('ScopedGroupsModule helpers', () => {
    it('groups element template input items by property.group and keeps defaults', () => {
        const group = {
            id: 'ElementTemplates__Input',
            label: 'Inputs',
            items: [
                { id: 'first', label: 'First' },
                { id: 'second', label: 'Second' },
                { id: 'third', label: 'Third' }
            ]
        }

        const template = {
            groups: [
                { id: 'alpha', label: 'Alpha Group', openByDefault: true },
                { id: 'beta', label: 'Beta Group' }
            ],
            properties: [
                { id: 'first', binding: { type: 'camunda:inputParameter' }, group: 'alpha' },
                { id: 'second', binding: { type: 'camunda:inputParameter' }, group: 'beta' },
                { id: 'third', binding: { type: 'camunda:inputParameter' } }
            ]
        }

        const templateGroups = template.groups
        const templateGroupsById = {
            alpha: template.groups[0],
            beta: template.groups[1]
        }

        const result = splitElementTemplateInputGroup({
            group,
            template,
            templateGroups,
            templateGroupsById,
            translate: (value) => value
        })

        expect(result).toHaveLength(3)
        expect(result[0].id).toBe('ElementTemplates__Input--alpha')
        expect(result[0].label).toBe('Alpha Group')
        expect(result[0].items).toEqual([{ id: 'first', label: 'First' }])
        expect(result[1].id).toBe('ElementTemplates__Input--beta')
        expect(result[1].items).toEqual([{ id: 'second', label: 'Second' }])
        expect(result[2].id).toBe('ElementTemplates__Input')
        expect(result[2].items).toEqual([{ id: 'third', label: 'Third' }])
    })

    it('keeps original input group when no grouped properties exist', () => {
        const group = {
            id: 'ElementTemplates__Input',
            label: 'Inputs',
            items: [{ id: 'single', label: 'Single' }]
        }

        const template = {
            groups: [{ id: 'alpha', label: 'Alpha Group' }],
            properties: [{ id: 'single', binding: { type: 'camunda:inputParameter' } }]
        }

        const result = splitElementTemplateInputGroup({
            group,
            template,
            templateGroups: template.groups,
            templateGroupsById: { alpha: template.groups[0] },
            translate: (value) => value
        })

        expect(result).toEqual([group])
    })

    it('splits custom scope groups by entry.property.group and keeps defaults', () => {
        const group = {
            id: 'ElementTemplates__CustomGroup-camunda-Connector',
            label: 'Connector',
            entries: [
                { id: 'one', property: { group: 'alpha' } },
                { id: 'two', property: { group: 'beta' } },
                { id: 'three' }
            ]
        }

        const templateGroups = [
            { id: 'alpha', label: 'Alpha Group' },
            { id: 'beta', label: 'Beta Group' }
        ]

        const result = splitScopeGroupEntries({
            group,
            templateGroups,
            templateGroupsById: {
                alpha: templateGroups[0],
                beta: templateGroups[1]
            },
            translate: (value) => value
        })

        expect(result).toHaveLength(3)
        expect(result[0].id).toBe('ElementTemplates__CustomGroup-camunda-Connector--alpha')
        expect(result[1].id).toBe('ElementTemplates__CustomGroup-camunda-Connector--beta')
        expect(result[2].id).toBe('ElementTemplates__CustomGroup-camunda-Connector')
        expect(result[2].entries).toEqual([{ id: 'three' }])
    })
})
