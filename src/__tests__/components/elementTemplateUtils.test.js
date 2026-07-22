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
import { categorizeTemplates, applicableTaskTypes } from '../../components/templates/elementTemplateUtils.js'

const ICON_DATA_URI = 'data:image/svg+xml;base64,PHN2Zy8+'

function makeRawTemplate(overrides = {}) {
    const content = JSON.stringify({
        id: 'com.example.template-1',
        name: 'My Template',
        version: 42,
        appliesTo: ['bpmn:ServiceTask'],
        properties: [],
        ...overrides.parsed,
    })
    return {
        templateId: overrides.templateId ?? 'tmpl-1',
        content,
        active: overrides.active ?? true,
    }
}

describe('categorizeTemplates — exposed icon and templateVersion fields', () => {
    it('exposes templateVersion from the parsed template `version` field', () => {
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.foo',
            name: 'Foo',
            version: 7,
            appliesTo: ['bpmn:ServiceTask'],
        } })]

        const result = categorizeTemplates(raw)

        const entry = result['bpmn:ServiceTask']['undefined'][0]
        expect(entry.templateVersion).toBe(7)
    })

    it('templateVersion is preserved as-is for string versions', () => {
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.foo',
            name: 'Foo',
            version: '1.0.0',
            appliesTo: ['bpmn:ServiceTask'],
        } })]

        const result = categorizeTemplates(raw)

        const entry = result['bpmn:ServiceTask']['undefined'][0]
        expect(entry.templateVersion).toBe('1.0.0')
    })

    it('templateVersion is independent of the legacy `version` field parsed from id suffix', () => {
        // The pre-existing `version` field comes from the id's trailing dash segment;
        // `templateVersion` must come from the template's `version` property.
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.foo-bar-99',
            name: 'Foo',
            version: 3,
            appliesTo: ['bpmn:ServiceTask'],
        } })]

        const result = categorizeTemplates(raw)

        const entry = result['bpmn:ServiceTask']['undefined'][0]
        expect(entry.version).toBe('99')
        expect(entry.templateVersion).toBe(3)
    })

    it('exposes icon contents when template has an icon', () => {
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.foo',
            name: 'Foo',
            version: 1,
            appliesTo: ['bpmn:ServiceTask'],
            icon: { contents: ICON_DATA_URI },
        } })]

        const result = categorizeTemplates(raw)

        const entry = result['bpmn:ServiceTask']['undefined'][0]
        expect(entry.icon).toBe(ICON_DATA_URI)
    })

    it('icon is null when template has no icon', () => {
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.foo',
            name: 'Foo',
            version: 1,
            appliesTo: ['bpmn:ServiceTask'],
        } })]

        const result = categorizeTemplates(raw)

        const entry = result['bpmn:ServiceTask']['undefined'][0]
        expect(entry.icon).toBeNull()
    })

    it('icon is null when template has an icon object without contents', () => {
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.foo',
            name: 'Foo',
            version: 1,
            appliesTo: ['bpmn:ServiceTask'],
            icon: {},
        } })]

        const result = categorizeTemplates(raw)

        const entry = result['bpmn:ServiceTask']['undefined'][0]
        expect(entry.icon).toBeNull()
    })

    it('templates with same id but different appliesTo expose icon for each task type', () => {
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.shared',
            name: 'Shared',
            version: 2,
            appliesTo: ['bpmn:ServiceTask', 'bpmn:UserTask'],
            icon: { contents: ICON_DATA_URI },
        } })]

        const result = categorizeTemplates(raw)

        expect(result['bpmn:ServiceTask']['undefined'][0].icon).toBe(ICON_DATA_URI)
        expect(result['bpmn:ServiceTask']['undefined'][0].templateVersion).toBe(2)
        expect(result['bpmn:UserTask']['undefined'][0].icon).toBe(ICON_DATA_URI)
        expect(result['bpmn:UserTask']['undefined'][0].templateVersion).toBe(2)
    })
})

describe('applicableTaskTypes', () => {
    it('maps BPMN task types to human-readable labels', () => {
        expect(applicableTaskTypes['bpmn:UserTask']).toBe('User Task')
        expect(applicableTaskTypes['bpmn:StartEvent']).toBe('Start Event')
    })
})

describe('categorizeTemplates — grouping and options', () => {
    it('parses group name from template name before first dash', () => {
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.template-1',
            name: 'MyGroup-Task Name (v1)',
            version: 1,
            appliesTo: ['bpmn:ServiceTask'],
        } })]

        const result = categorizeTemplates(raw)
        const entry = result['bpmn:ServiceTask']['MyGroup'][0]

        expect(entry.name).toBe('Task Name ')
    })

    it('sorts templates within a group alphabetically by name', () => {
        const raw = [
            makeRawTemplate({ templateId: 'b', parsed: {
                id: 'com.example.b-1',
                name: 'Zebra',
                appliesTo: ['bpmn:ServiceTask'],
            } }),
            makeRawTemplate({ templateId: 'a', parsed: {
                id: 'com.example.a-1',
                name: 'Alpha',
                appliesTo: ['bpmn:ServiceTask'],
            } }),
        ]

        const result = categorizeTemplates(raw)
        const names = result['bpmn:ServiceTask']['undefined'].map(t => t.name)

        expect(names).toEqual(['Alpha', 'Zebra'])
    })

    it('sorts group names alphabetically within a task type', () => {
        const raw = [
            makeRawTemplate({ templateId: 'z', parsed: {
                id: 'com.example.z-1',
                name: 'ZGroup-Task',
                appliesTo: ['bpmn:ServiceTask'],
            } }),
            makeRawTemplate({ templateId: 'a', parsed: {
                id: 'com.example.a-1',
                name: 'AGroup-Task',
                appliesTo: ['bpmn:ServiceTask'],
            } }),
        ]

        const result = categorizeTemplates(raw)

        expect(Object.keys(result['bpmn:ServiceTask'])).toEqual(['AGroup', 'ZGroup'])
    })

    it('filterActive excludes inactive templates', () => {
        const raw = [
            makeRawTemplate({ active: false, parsed: {
                id: 'com.example.inactive-1',
                name: 'Inactive',
                appliesTo: ['bpmn:ServiceTask'],
            } }),
            makeRawTemplate({ templateId: 'active', parsed: {
                id: 'com.example.active-1',
                name: 'Active',
                appliesTo: ['bpmn:ServiceTask'],
            } }),
        ]

        const result = categorizeTemplates(raw, { filterActive: true })

        expect(result['bpmn:ServiceTask']['undefined']).toHaveLength(1)
        expect(result['bpmn:ServiceTask']['undefined'][0].name).toBe('Active')
    })

    it('preserveOriginalTemplate keeps reference to raw template object', () => {
        const rawTemplate = makeRawTemplate({ parsed: {
            id: 'com.example.foo-1',
            name: 'Foo',
            appliesTo: ['bpmn:ServiceTask'],
        } })

        const result = categorizeTemplates([rawTemplate], { preserveOriginalTemplate: true })
        const entry = result['bpmn:ServiceTask']['undefined'][0]

        expect(entry.template).toBe(rawTemplate)
    })

    it('sets extern true when implementation type is external', () => {
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.ext-1',
            name: 'External Task',
            appliesTo: ['bpmn:ServiceTask'],
            properties: [{ label: 'Implementation Type', value: 'external' }],
        } })]

        const result = categorizeTemplates(raw)

        expect(result['bpmn:ServiceTask']['undefined'][0].extern).toBe(true)
    })

    it('sets extern false when implementation type is not external', () => {
        const raw = [makeRawTemplate({ parsed: {
            id: 'com.example.int-1',
            name: 'Internal Task',
            appliesTo: ['bpmn:ServiceTask'],
            properties: [{ label: 'Implementation Type', value: 'java' }],
        } })]

        const result = categorizeTemplates(raw)

        expect(result['bpmn:ServiceTask']['undefined'][0].extern).toBe(false)
    })

    it('skips templates with empty content and warns', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const raw = [{ templateId: 'empty', content: '   ', active: true }]

        const result = categorizeTemplates(raw)

        expect(result).toEqual({})
        expect(warnSpy).toHaveBeenCalledWith('Template empty has empty or null content')
        warnSpy.mockRestore()
    })

    it('skips templates with invalid JSON and logs error', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const raw = [{ templateId: 'bad', content: '{not json', active: true }]

        const result = categorizeTemplates(raw)

        expect(result).toEqual({})
        expect(errorSpy).toHaveBeenCalled()
        errorSpy.mockRestore()
    })
})
