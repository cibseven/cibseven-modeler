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
    categorizeTemplates,
    parseCompleteTemplateContent,
    UNCATEGORIZED_TASK_TYPE,
    UNCATEGORIZED_GROUP_NAME,
} from '../../components/templates/elementTemplateUtils.js'

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

describe('categorizeTemplates — templates with missing required fields', () => {
    // A parsed template without `id`/`name` used to crash the whole categorized view with
    // "Cannot read properties of undefined (reading 'split')" (id.split for the version
    // suffix, name.split for the group prefix) instead of just skipping that one template.
    it('excludes a template missing the id field from its normal task-type group', () => {
        const raw = [
            makeRawTemplate({ templateId: 'no-id', parsed: { id: undefined, name: 'No Id', appliesTo: ['bpmn:ServiceTask'] } }),
            makeRawTemplate({ templateId: 'has-id', parsed: { id: 'com.example.ok', name: 'Ok', appliesTo: ['bpmn:ServiceTask'] } }),
        ]

        const result = categorizeTemplates(raw)

        const names = result['bpmn:ServiceTask']['undefined'].map(entry => entry.name)
        expect(names).toEqual(['Ok'])
    })

    it('excludes a template missing the name field from its normal task-type group', () => {
        const raw = [
            makeRawTemplate({ templateId: 'no-name', parsed: { id: 'com.example.no-name', name: undefined, appliesTo: ['bpmn:ServiceTask'] } }),
            makeRawTemplate({ templateId: 'has-name', parsed: { id: 'com.example.ok', name: 'Ok', appliesTo: ['bpmn:ServiceTask'] } }),
        ]

        const result = categorizeTemplates(raw)

        const names = result['bpmn:ServiceTask']['undefined'].map(entry => entry.name)
        expect(names).toEqual(['Ok'])
    })
})

describe('categorizeTemplates — "Not categorized" bucket', () => {
    // Rather than vanish from the view, a template that can't be grouped is surfaced under a
    // dedicated uncategorized/not-categorized bucket so the user can see and fix it.
    it('places a template missing id under the uncategorized bucket', () => {
        const raw = [makeRawTemplate({ templateId: 'no-id', parsed: { id: undefined, name: 'No Id', appliesTo: ['bpmn:ServiceTask'] } })]

        const result = categorizeTemplates(raw)

        const entries = result[UNCATEGORIZED_TASK_TYPE][UNCATEGORIZED_GROUP_NAME]
        expect(entries).toHaveLength(1)
        expect(entries[0].incomplete).toBe(true)
    })

    it('places a template missing name under the uncategorized bucket', () => {
        const raw = [makeRawTemplate({ templateId: 'no-name', parsed: { id: 'com.example.no-name', name: undefined, appliesTo: ['bpmn:ServiceTask'] } })]

        const result = categorizeTemplates(raw)

        expect(result[UNCATEGORIZED_TASK_TYPE][UNCATEGORIZED_GROUP_NAME]).toHaveLength(1)
    })

    it('places a template with empty content under the uncategorized bucket', () => {
        const raw = [{ templateId: 'empty', name: 'Empty Template', content: '', active: true }]

        const result = categorizeTemplates(raw)

        const entry = result[UNCATEGORIZED_TASK_TYPE][UNCATEGORIZED_GROUP_NAME][0]
        expect(entry.name).toBe('Empty Template')
        expect(entry.incomplete).toBe(true)
    })

    it('places a template with invalid JSON content under the uncategorized bucket', () => {
        const raw = [{ templateId: 'broken', name: 'Broken Template', content: '{not valid json', active: true }]

        const result = categorizeTemplates(raw)

        expect(result[UNCATEGORIZED_TASK_TYPE][UNCATEGORIZED_GROUP_NAME][0].name).toBe('Broken Template')
    })

    it('falls back to templateId as the display name when the outer record has no name', () => {
        const raw = [{ templateId: 'no-outer-name', content: '', active: true }]

        const result = categorizeTemplates(raw)

        expect(result[UNCATEGORIZED_TASK_TYPE][UNCATEGORIZED_GROUP_NAME][0].name).toBe('no-outer-name')
    })

    it('groups every incomplete template together regardless of why it failed', () => {
        const raw = [
            { templateId: 'empty', name: 'Empty', content: '', active: true },
            { templateId: 'broken', name: 'Broken', content: '{bad', active: true },
            makeRawTemplate({ templateId: 'no-id', parsed: { id: undefined, name: 'No Id' } }),
        ]

        const result = categorizeTemplates(raw)

        expect(result[UNCATEGORIZED_TASK_TYPE][UNCATEGORIZED_GROUP_NAME]).toHaveLength(3)
    })

    it('omits the bucket entirely when every template is complete', () => {
        const raw = [makeRawTemplate({ parsed: { id: 'com.example.ok', name: 'Ok', appliesTo: ['bpmn:ServiceTask'] } })]

        const result = categorizeTemplates(raw)

        expect(result[UNCATEGORIZED_TASK_TYPE]).toBeUndefined()
    })

    it('does not mark a normally grouped template as incomplete', () => {
        const raw = [makeRawTemplate({ parsed: { id: 'com.example.ok', name: 'Ok', appliesTo: ['bpmn:ServiceTask'] } })]

        const result = categorizeTemplates(raw)

        expect(result['bpmn:ServiceTask']['undefined'][0].incomplete).toBeUndefined()
    })
})

describe('parseCompleteTemplateContent', () => {
    it('returns the parsed object when content has both id and name', () => {
        const template = makeRawTemplate({ parsed: { id: 'com.example.ok', name: 'Ok' } })
        expect(parseCompleteTemplateContent(template)).toMatchObject({ id: 'com.example.ok', name: 'Ok' })
    })

    it('returns null for empty content', () => {
        expect(parseCompleteTemplateContent({ content: '' })).toBeNull()
    })

    it('returns null for invalid JSON', () => {
        expect(parseCompleteTemplateContent({ content: '{not json' })).toBeNull()
    })

    it('returns null when id is missing', () => {
        expect(parseCompleteTemplateContent({ content: JSON.stringify({ name: 'Ok' }) })).toBeNull()
    })

    it('returns null when name is missing', () => {
        expect(parseCompleteTemplateContent({ content: JSON.stringify({ id: 'com.example.ok' }) })).toBeNull()
    })
})
