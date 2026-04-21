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
import {
    wildcardCleanupRegex,
    cleanupTemplateCriteria,
    filterTemplates,
    mergeTemplates,
    getTimeStamp,
    checkBeforeAction,
    getTagValueFromXml,
    getProcessKeyFromBpmn,
    generateUniqueId,
    checkJSON,
} from '../../utils.js'

describe('Utils', () => {

    describe('wildcardCleanupRegex', () => {
        it('Undefined or empty input', () => {
            expect(wildcardCleanupRegex.test(undefined)).toBe(false)
            expect(wildcardCleanupRegex.test('')).toBe(false)
        })

        it('Single wildcard cases', () => {
            expect(wildcardCleanupRegex.test('*')).toBe(true)
            expect(wildcardCleanupRegex.test(' *')).toBe(true)
            expect(wildcardCleanupRegex.test('* ')).toBe(true)
            expect(wildcardCleanupRegex.test(' * ')).toBe(true)
        })

        it('Multiple wildcards cases', () => {
            expect(wildcardCleanupRegex.test('**')).toBe(true)
            expect(wildcardCleanupRegex.test(' **')).toBe(true)
            expect(wildcardCleanupRegex.test('** ')).toBe(true)
            expect(wildcardCleanupRegex.test(' ** ')).toBe(true)
        })

        it('Other wildcard placements / other allowed characters', () => {
            expect(wildcardCleanupRegex.test('a*')).toBe(false)
            expect(wildcardCleanupRegex.test('a**')).toBe(false)
            expect(wildcardCleanupRegex.test('a*b')).toBe(false)
        })
    })

    describe('cleanupTemplateCriteria', () => {
        it('Undefined or empty input', () => {
            expect(cleanupTemplateCriteria(undefined)).toEqual([])
            expect(cleanupTemplateCriteria([])).toEqual([])
        })

        it('Non-empty input with invalid criteria', () => {
            expect(cleanupTemplateCriteria([
                '*',
                ' ',
                ' *',
                '**'
            ])).toEqual([])
        })

        it('Valid criteria', () => {
            expect(cleanupTemplateCriteria([
                '*something*', // with wildcard
                'some-template-id',
                'Some Category!'
            ])).toEqual([
                '*something*', // keeps wildcard
                'some-template-id',
                'Some Category!'
            ])
        })
    })

    describe('filterTemplates', () => {
        it('Undefined or empty templates', () => {
            expect(filterTemplates(undefined, {})).toEqual([])
            expect(filterTemplates([], {})).toEqual([])
        })

        it('Undefined or invalid config', () => {
            expect(filterTemplates([], undefined)).toEqual([])
            expect(filterTemplates([], {})).toEqual([])
            expect(filterTemplates([], { excludeTemplates: undefined })).toEqual([])
            expect(filterTemplates([], { excludeTemplates: [] })).toEqual([])
            expect(filterTemplates([], { excludeTemplates: {} })).toEqual([])
        })

        it('Valid templates with no exclusions', () => {
            const templates = [
                { id: 'template1', name: 'My Category - Some name' },
                { id: 'template2', name: 'My Category - Some name 2' }
            ]
            expect(filterTemplates(templates, {})).toEqual(templates)
        })

        it('Valid templates (by exact ID)', () => {
            const template1 = { id: 'template1', name: 'My Category - Some name' }
            const template2 = { id: 'template2', name: 'My Category - Some name 2' }
            const template3 = { id: 'template3', name: 'Other Category - Another name' }
            
            const templates = [
                template1,
                template2,
                template3,
            ]
            const config = {
                excludeTemplates: [template2.id]
            }
            expect(filterTemplates(templates, config)).toEqual([
                template1,
                template3
            ])
        })

        describe('Valid templates (by wildcard ID)', () => {
            it('Wildcard at start', () => {
                const template1 = { id: 'template', name: 'My Category - Some name' }
                
                const templates = [
                    template1,
                    { id: 'ex-template', name: 'My Category - Some name 2' },
                    { id: 'ex-template', name: 'Other Category - Another name' },
                ]
                const config = {
                    modeler: {
                        excludeTemplates: ['*-template']
                    }
                }

                expect(filterTemplates(templates, config)).toEqual([template1])

                config.modeler.excludeTemplates = ['*template'] // Without dash "-"
                expect(filterTemplates(templates, config)).toEqual([])
            })

            it('Wildcards at start and end', () => {
                const template1 = { id: 'template1', name: 'My Category - Some name' }
                const template2 = { id: 'a-template2', name: 'My Category - Some name' }
                const template3 = { id: 'b-template3', name: 'Other Category - Another name' }
                
                const templates = [
                    template1,
                    template2,
                    template3,
                ]

                const config = {
                    modeler: {
                        excludeTemplates: ['*template*']
                    }
                }

                expect(filterTemplates(templates, config)).toEqual([])
            })

            it('Wildcard at end', () => {
                const template1 = { id: 'template1', name: 'My Category - Some name' }
            
                const templates = [
                    template1,
                    { id: 'ex-template2', name: 'My Category - Some name 2' },
                    { id: 'ex-template3', name: 'Other Category - Another name' },
                ]
                const config = {
                    modeler: {
                        excludeTemplates: ['ex-*']
                    }
                }
                expect(filterTemplates(templates, config)).toEqual([template1])

                config.modeler.excludeTemplates = ['ex*']
                expect(filterTemplates(templates, config)).toEqual([template1])
            })

            it('Starts with', () => {
                const template1 = { id: 'my-template-one', name: 'My Category - Some name' }
                const template2 = { id: 'my-template-two', name: 'My Category - Some name 2' }
                const template3 = { id: 'three-template-my', name: 'Other Category - Another name' }
                
                const templates = [
                    template1,
                    template2,
                    template3,
                ]
                const config = {
                    excludeTemplates: ['my*']
                }
                expect(filterTemplates(templates, config)).toEqual([template3])
            })
        })

        it('Valid templates (by category in name)', () => {
            const myTemplate1 = { id: 'template1', name: 'My Category - Some name' }
            const myTemplate2 = { id: 'template2', name: 'My Category - Some name 2' }
            const myTemplate3 = { id: 'template3', name: '- Some name 2' }
            const myTemplate4 = { id: 'template4', name: 'Some name 2' }
            
            const templates = [
                myTemplate1,
                myTemplate2,
                myTemplate3,
                myTemplate4
            ]
            const config = {
                excludeTemplates: ['My Category']
            }
            expect(filterTemplates(templates, config)).toEqual([
                myTemplate3,
                myTemplate4
            ])
        })

        it('Valid templates (ID and category matches)', () => {
            const otherTemplate = { id: 'template3', name: 'Other Category - Another name' }
            
            const templates = [
                { id: 'template1', name: 'My Category - Some name' },
                { id: 'template2', name: 'My Category - Some name 2' },
                otherTemplate,
            ]
            const config = {
                excludeTemplates: [otherTemplate.id, 'My Category']
            }
            expect(filterTemplates(templates, config)).toEqual([])
        })
    })

    describe('mergeTemplates', () => {
        it('Non-clashing new templates', () => {
            const defaultTemplates = [
                { id: 'default1', name: 'Default Template 1' },
                { id: 'default2', name: 'Default Template 2' }
            ]
            const customTemplates = [
                { id: 'custom1', name: 'Custom Template 1' },
                { id: 'custom2', name: 'Custom Template 2' }
            ]

            const merged = mergeTemplates(defaultTemplates, customTemplates)
            expect(merged).toEqual([
                ...defaultTemplates,
                ...customTemplates
            ])
        })

        it('Clashing templates', () => {
            const def1 = { id: 'default1', name: 'Default Template 1' }
            const def2 = { id: 'default2', name: 'Default Template 2' }

            const defaultTemplates = [ def1, def2 ]

            const cust1 = { id: 'default1', name: 'Overridden Default Template 1' } // Should override
            const cust2 = { id: 'custom1', name: 'Custom Template 1' }

            const customTemplates = [ cust1, cust2]

            const merged = mergeTemplates(defaultTemplates, customTemplates)
            expect(merged).toContain(cust1, def2, cust2)
        })

        it('Empty lists', () => {
            expect(mergeTemplates([], [])).toEqual([])
        })
    })

    describe('getTimeStamp', () => {
        it('Returns a string in HH:MM:SS format', () => {
            const ts = getTimeStamp()
            expect(ts).toMatch(/^\d{2}:\d{2}:\d{2}$/)
        })

        it('Each part is within valid range', () => {
            const [h, m, s] = getTimeStamp().split(':').map(Number)
            expect(h).toBeGreaterThanOrEqual(0)
            expect(h).toBeLessThanOrEqual(23)
            expect(m).toBeGreaterThanOrEqual(0)
            expect(m).toBeLessThanOrEqual(59)
            expect(s).toBeGreaterThanOrEqual(0)
            expect(s).toBeLessThanOrEqual(59)
        })
    })

    describe('checkBeforeAction', () => {
        const storeList = {
            processes: [
                { key: 'process-a' },
                { key: 'process-b' },
            ]
        }

        it('Returns empty string when key is unique', () => {
            expect(checkBeforeAction('process-new', 'process-new', storeList, 'key')).toBe('')
        })

        it('Returns empty string when new key matches the stored selected key', () => {
            expect(checkBeforeAction('process-a', 'process-a', storeList, 'key')).toBe('')
        })

        it('Returns error key when a duplicate exists and key changed', () => {
            expect(checkBeforeAction('process-a', 'process-old', storeList, 'key')).toBe('toastSaveErrorDuplicateKey')
        })

        it('Returns empty string when storeList is empty', () => {
            expect(checkBeforeAction('process-a', 'process-old', { processes: [] }, 'key')).toBe('')
        })
    })

    describe('getTagValueFromXml', () => {
        // jsdom does not support the *|tag namespace-wildcard selector used
        // internally by getTagValueFromXml. We test via a DOMParser mock so
        // the surrounding logic is exercised without hitting that limitation.
        it('Returns attribute value when tag and attribute exist', () => {
            const mockEl = { getAttribute: vi.fn((attr) => attr === 'id' ? 'my-process' : null) }
            const mockDoc = { querySelector: vi.fn(() => mockEl) }
            const OriginalDOMParser = globalThis.DOMParser
            globalThis.DOMParser = vi.fn(function () { return { parseFromString: () => mockDoc } })

            expect(getTagValueFromXml('<xml/>', 'process', 'id')).toBe('my-process')

            globalThis.DOMParser = OriginalDOMParser
        })

        it('Returns null when tag does not exist', () => {
            const mockDoc = { querySelector: vi.fn(() => null) }
            const OriginalDOMParser = globalThis.DOMParser
            globalThis.DOMParser = vi.fn(function () { return { parseFromString: () => mockDoc } })

            expect(getTagValueFromXml('<xml/>', 'collaboration', 'id')).toBeNull()

            globalThis.DOMParser = OriginalDOMParser
        })
    })

    describe('getProcessKeyFromBpmn', () => {
        it('Returns collaboration id when present', () => {
            const mockEl = { getAttribute: vi.fn(() => 'collab-id') }
            const mockDoc = { querySelector: vi.fn(() => mockEl) }
            const OriginalDOMParser = globalThis.DOMParser
            globalThis.DOMParser = vi.fn(function () { return { parseFromString: () => mockDoc } })

            expect(getProcessKeyFromBpmn('<xml/>')).toBe('collab-id')

            globalThis.DOMParser = OriginalDOMParser
        })

        it('Falls back to process id when collaboration is absent', () => {
            const mockProcess = { getAttribute: vi.fn(() => 'process-id') }
            const mockDoc = { querySelector: vi.fn((sel) => sel.includes('collaboration') ? null : mockProcess) }
            const OriginalDOMParser = globalThis.DOMParser
            globalThis.DOMParser = vi.fn(function () { return { parseFromString: () => mockDoc } })

            expect(getProcessKeyFromBpmn('<xml/>')).toBe('process-id')

            globalThis.DOMParser = OriginalDOMParser
        })

        it('Returns null when neither tag is present', () => {
            const mockDoc = { querySelector: vi.fn(() => null) }
            const OriginalDOMParser = globalThis.DOMParser
            globalThis.DOMParser = vi.fn(function () { return { parseFromString: () => mockDoc } })

            expect(getProcessKeyFromBpmn('<xml/>')).toBeNull()

            globalThis.DOMParser = OriginalDOMParser
        })
    })

    describe('generateUniqueId', () => {
        it('Returns a non-empty string', () => {
            expect(typeof generateUniqueId()).toBe('string')
            expect(generateUniqueId().length).toBeGreaterThan(0)
        })

        it('Returns different values on successive calls', () => {
            const ids = new Set(Array.from({ length: 20 }, generateUniqueId))
            expect(ids.size).toBe(20)
        })
    })

    describe('checkJSON', () => {
        const templates = [
            { id: 'my-template-1', appliesTo: ['bpmn:ServiceTask'] },
        ]

        it('Returns empty array when XML has no modelerTemplate attributes', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
                    <process id="proc"><serviceTask id="t1" /></process>
                </definitions>`
            expect(checkJSON(xml, templates)).toEqual([])
        })

        it('Returns empty array when modelerTemplate id matches a known template', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
                    xmlns:camunda="http://camunda.org/schema/1.0/bpmn">
                    <process id="proc">
                        <serviceTask id="t1" camunda:modelerTemplate="my-template-1" />
                    </process>
                </definitions>`
            expect(checkJSON(xml, templates)).toEqual([])
        })

        it('Returns entry when modelerTemplate id does not match any template', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
                    xmlns:camunda="http://camunda.org/schema/1.0/bpmn">
                    <process id="proc">
                        <serviceTask id="t1" camunda:modelerTemplate="unknown-template" />
                    </process>
                </definitions>`
            const result = checkJSON(xml, templates)
            expect(result.length).toBe(1)
            expect(result[0].nameOfTemplate).toBe('unknown-template')
        })
    })
})
