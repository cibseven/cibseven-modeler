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
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * Package consistency tests — ensure all documented public exports are present.
 * These tests guard against accidental removal of exports that downstream consumers
 * (e.g. cibseven-modeler-ee, cibseven-webclient) depend on.
 *
 * This test uses static source analysis rather than dynamic import so that Vite-specific
 * import syntax (e.g. ?worker&inline workers, monaco-editor browser entry) does not
 * interfere with the unit test environment.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const librarySource = readFileSync(path.resolve(__dirname, '../../library.js'), 'utf-8')

/**
 * Extract all exported names from an ES module source string.
 * Handles:
 *   export { name1, name2 }
 *   export { default as name }
 *   export { original as alias }
 *   export { monaco }           (re-exported namespace)
 */
function getExportedNames(src) {
    const names = new Set()
    for (const match of src.matchAll(/export\s*\{([^}]+)\}/g)) {
        for (const item of match[1].split(',')) {
            const trimmed = item.trim()
            if (!trimmed) continue
            // Extract the name after optional "as" keyword
            const asMatch = trimmed.match(/\bas\s+(\w+)$/)
            names.add(asMatch ? asMatch[1] : trimmed)
        }
    }
    return names
}

let exportedNames

beforeAll(() => {
    exportedNames = getExportedNames(librarySource)
})

const expectExport = name => () => expect(exportedNames.has(name), `"${name}" not found in exports`).toBe(true)

describe('library.js — public API contract', () => {
    describe('Vue components', () => {
        it('exports CibsevenModeler component', expectExport('CibsevenModeler'))
        it('exports BpmnModeler component', expectExport('BpmnModeler'))
        it('exports DmnModeler component', expectExport('DmnModeler'))
        it('exports FormModeler component', expectExport('FormModeler'))
        it('exports NotificationMessage component', expectExport('NotificationMessage'))
    })

    describe('Store', () => {
        it('exports createModelerStore factory', expectExport('createModelerStore'))
        it('exports processStore module', expectExport('processStore'))
        it('exports formStore module', expectExport('formStore'))
        it('exports elementTemplateStore module', expectExport('elementTemplateStore'))
        it('exports xmlStore module', expectExport('xmlStore'))
    })

    describe('i18n', () => {
        it('exports i18n instance', expectExport('i18n'))
        it('exports setLocale function', expectExport('setLocale'))
        it('exports createI18n function', expectExport('createI18n'))
        it('exports modelerTranslations', expectExport('modelerTranslations'))
        it('exports mergeModelerTranslations function', expectExport('mergeModelerTranslations'))
    })

    describe('Services config', () => {
        it('exports setServicesBasePath', expectExport('setServicesBasePath'))
        it('exports getServicesBasePath', expectExport('getServicesBasePath'))
        it('exports getModelerServicePath', expectExport('getModelerServicePath'))
    })

    describe('Axios', () => {
        it('exports setAxiosInstance', expectExport('setAxiosInstance'))
        it('exports getAxios', expectExport('getAxios'))
    })

    describe('Utils', () => {
        it('exports parseXml', expectExport('parseXml'))
        it('exports base64Decode', expectExport('base64Decode'))
        it('exports applyTheme', expectExport('applyTheme'))
        it('exports getTheme', expectExport('getTheme'))
        it('exports loadFromPublic', expectExport('loadFromPublic'))
    })

    describe('Plugins', () => {
        it('exports registerPlugin', expectExport('registerPlugin'))
        it('exports getPlugin', expectExport('getPlugin'))
    })
})

