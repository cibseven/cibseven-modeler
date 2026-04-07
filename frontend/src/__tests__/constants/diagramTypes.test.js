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
import { DIAGRAM_TYPE, DIAGRAM_ICON, DIAGRAM_FILE_EXT, TAB_STORAGE_KEY } from '../../constants/diagramTypes.js'

describe('diagramTypes constants', () => {
    describe('DIAGRAM_TYPE', () => {
        it('has the expected string values', () => {
            expect(DIAGRAM_TYPE.BPMN_C7).toBe('bpmn-c7')
            expect(DIAGRAM_TYPE.DMN).toBe('dmn')
            expect(DIAGRAM_TYPE.FORM).toBe('form')
        })

        it('is frozen (immutable)', () => {
            expect(Object.isFrozen(DIAGRAM_TYPE)).toBe(true)
        })
    })

    describe('DIAGRAM_ICON', () => {
        it('has an icon for every DIAGRAM_TYPE value', () => {
            Object.values(DIAGRAM_TYPE).forEach(type => {
                expect(DIAGRAM_ICON[type]).toBeTruthy()
                expect(typeof DIAGRAM_ICON[type]).toBe('string')
            })
        })

        it('icon values start with "mdi-"', () => {
            Object.values(DIAGRAM_ICON).forEach(icon => {
                expect(icon).toMatch(/^mdi-/)
            })
        })

        it('is frozen (immutable)', () => {
            expect(Object.isFrozen(DIAGRAM_ICON)).toBe(true)
        })
    })

    describe('DIAGRAM_FILE_EXT', () => {
        it('has an extension for every DIAGRAM_TYPE value', () => {
            Object.values(DIAGRAM_TYPE).forEach(type => {
                expect(DIAGRAM_FILE_EXT[type]).toBeTruthy()
            })
        })

        it('extension values start with "."', () => {
            Object.values(DIAGRAM_FILE_EXT).forEach(ext => {
                expect(ext).toMatch(/^\./)
            })
        })

        it('returns expected extensions', () => {
            expect(DIAGRAM_FILE_EXT[DIAGRAM_TYPE.BPMN_C7]).toBe('.bpmn')
            expect(DIAGRAM_FILE_EXT[DIAGRAM_TYPE.DMN]).toBe('.dmn')
            expect(DIAGRAM_FILE_EXT[DIAGRAM_TYPE.FORM]).toBe('.form')
        })

        it('is frozen (immutable)', () => {
            expect(Object.isFrozen(DIAGRAM_FILE_EXT)).toBe(true)
        })
    })

    describe('TAB_STORAGE_KEY', () => {
        it('is a non-empty string', () => {
            expect(typeof TAB_STORAGE_KEY).toBe('string')
            expect(TAB_STORAGE_KEY.length).toBeGreaterThan(0)
        })
    })
})
