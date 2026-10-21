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
    getFormRefsFromBpmn,
    resolveTabIndexById,
    folderIcon,
    formatDate,
    modelName,
    toMoment,
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
        // The 3rd arg is now the items array (processes or forms), not the module state.
        const processList = [{ processkey: 'process-a' }, { processkey: 'process-b' }]
        const formList = [{ formId: 'form-a' }, { formId: 'form-b' }]

        it('Returns empty string when key is unique', () => {
            expect(checkBeforeAction('process-new', 'process-new', processList, 'processkey')).toBe('')
        })

        it('Returns empty string when new key matches the stored selected key', () => {
            expect(checkBeforeAction('process-a', 'process-a', processList, 'processkey')).toBe('')
        })

        it('Returns error key when a duplicate process exists and key changed', () => {
            expect(checkBeforeAction('process-a', 'process-old', processList, 'processkey')).toBe('toastSaveErrorDuplicateKey')
        })

        it('Detects duplicate forms by formId (the path that was broken)', () => {
            expect(checkBeforeAction('form-a', 'form-old', formList, 'formId')).toBe('toastSaveErrorDuplicateKey')
            expect(checkBeforeAction('form-new', 'form-old', formList, 'formId')).toBe('')
        })

        it('Returns empty string when the list is empty or missing', () => {
            expect(checkBeforeAction('process-a', 'process-old', [], 'processkey')).toBe('')
            expect(checkBeforeAction('process-a', 'process-old', undefined, 'processkey')).toBe('')
        })
    })

    describe('resolveTabIndexById', () => {
        const tabs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

        it('returns the active index when it already matches the id', () => {
            expect(resolveTabIndexById(1, tabs, 'b')).toBe(1)
        })

        it('falls back to findIndex when the active tab is a different one', () => {
            expect(resolveTabIndexById(0, tabs, 'c')).toBe(2)
        })

        it('does not read tabs[-1] on the dashboard (activeIndex -1) and finds the open tab', () => {
            expect(resolveTabIndexById(-1, tabs, 'b')).toBe(1)
        })

        it('returns -1 when the id is not open (closed tab)', () => {
            expect(resolveTabIndexById(0, tabs, 'gone')).toBe(-1)
            expect(resolveTabIndexById(-1, tabs, 'gone')).toBe(-1)
        })

        it('returns -1 for an empty or missing tab list', () => {
            expect(resolveTabIndexById(-1, [], 'a')).toBe(-1)
            expect(resolveTabIndexById(0, undefined, 'a')).toBe(-1)
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

        it('uses the element name when present', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
                    xmlns:camunda="http://camunda.org/schema/1.0/bpmn">
                    <process id="proc">
                        <serviceTask id="t1" name="My Task" camunda:modelerTemplate="unknown-template" />
                    </process>
                </definitions>`
            const result = checkJSON(xml, templates)
            expect(result[0].name).toBe('My Task')
        })

        it('falls back to the element id when the name attribute is missing', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
                    xmlns:camunda="http://camunda.org/schema/1.0/bpmn">
                    <process id="proc">
                        <serviceTask id="t1" camunda:modelerTemplate="unknown-template" />
                    </process>
                </definitions>`
            const result = checkJSON(xml, templates)
            expect(result[0].name).toBe('t1')
        })
    })

    describe('getFormRefsFromBpmn', () => {
        const bpmnWith = (...refs) => {
            const tasks = refs.map((r, i) =>
                `<bpmn:userTask id="t${i}" camunda:formRef="${r}"/>`
            ).join('')
            return `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ` +
                `xmlns:camunda="http://camunda.org/schema/1.0/bpmn">` +
                `<bpmn:process id="proc">${tasks}</bpmn:process>` +
                `</bpmn:definitions>`
        }

        it('returns empty array for null, undefined, and empty string', () => {
            expect(getFormRefsFromBpmn(null)).toEqual([])
            expect(getFormRefsFromBpmn(undefined)).toEqual([])
            expect(getFormRefsFromBpmn('')).toEqual([])
        })

        it('returns empty array when no formRef attributes are present', () => {
            expect(getFormRefsFromBpmn(
                '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">' +
                '<bpmn:process id="proc"><bpmn:userTask id="t1"/></bpmn:process>' +
                '</bpmn:definitions>'
            )).toEqual([])
        })

        it('returns a single formRef value', () => {
            expect(getFormRefsFromBpmn(bpmnWith('invoice-form'))).toEqual(['invoice-form'])
        })

        it('returns multiple distinct formRef values', () => {
            const result = getFormRefsFromBpmn(bpmnWith('form-a', 'form-b'))
            expect(result).toHaveLength(2)
            expect(result).toContain('form-a')
            expect(result).toContain('form-b')
        })

        it('deduplicates repeated formRef values', () => {
            expect(getFormRefsFromBpmn(bpmnWith('my-form', 'my-form'))).toEqual(['my-form'])
        })

        it('trims whitespace from formRef values', () => {
            expect(getFormRefsFromBpmn(bpmnWith('  my-form  '))).toEqual(['my-form'])
        })

        it('returns empty array for invalid XML', () => {
            expect(getFormRefsFromBpmn('not xml <<>>')).toEqual([])
        })
    })

    describe('toMoment', () => {
        it('reads a Java LocalDateTime array, whose month starts at 1', () => {
            const date = toMoment([2026, 10, 12, 9, 30, 15, 500_000_000])
            expect(date.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-10-12 09:30:15.500')
        })

        /** Jackson leaves out trailing zero fields, so a full minute has no seconds or nanos. */
        it('reads an array without seconds or nanos', () => {
            expect(toMoment([2026, 10, 12, 9, 30]).format('YYYY-MM-DD HH:mm:ss')).toBe('2026-10-12 09:30:00')
        })

        it('reads text and epoch milliseconds', () => {
            expect(toMoment('2026-10-12T09:30:00').isValid()).toBe(true)
            expect(toMoment(0)).toBeNull()
            expect(toMoment(1_000).valueOf()).toBe(1_000)
        })

        it('has nothing for a missing date', () => {
            expect(toMoment(null)).toBeNull()
            expect(formatDate(null)).toBe('')
            expect(formatDate('not a date')).toBe('')
        })

        it('formats with the given pattern', () => {
            expect(formatDate([2026, 10, 12, 9, 30], 'DD.MM.YYYY HH:mm')).toBe('12.10.2026 09:30')
        })
    })

    describe('folderIcon', () => {
        it('tells projects, folders and user folders apart', () => {
            expect(folderIcon({ parentId: null })).toBe('mdi-folder')
            expect(folderIcon({ parentId: 'p' })).toBe('mdi-folder-outline')
            expect(folderIcon({ parentId: null, userFolder: true })).toBe('mdi-folder-account-outline')
        })
    })

    describe('modelName', () => {
        it('names a form by its form id', () => {
            expect(modelName({ type: 'form', formId: 'request', name: 'ignored' })).toBe('request')
        })

        it('names a diagram by its name', () => {
            expect(modelName({ type: 'bpmn-c7', name: 'Invoice', processkey: 'invoice' })).toBe('Invoice')
        })

        /** Older diagrams were stored with the text "undefined" as their name. */
        it.each([undefined, '', 'undefined'])('falls back to the key when the name is %j', name => {
            expect(modelName({ type: 'dmn', name, processkey: 'approval' })).toBe('approval')
        })
    })
})
