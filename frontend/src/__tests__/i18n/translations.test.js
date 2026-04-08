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
import en from '../../resources/translations/translations_en.json'
import de from '../../resources/translations/translations_de.json'
import es from '../../resources/translations/translations_es.json'
import ru from '../../resources/translations/translations_ru.json'
import ua from '../../resources/translations/translations_ua.json'

const locales = { en, de, es, ru, ua }
const REFERENCE = 'en'

/**
 * Recursively collect all key-path/value pairs from a nested object.
 * Returns an array of [pathArray, value] tuples where pathArray is an array of key segments.
 * Using arrays avoids ambiguity when key names themselves contain dots.
 */
function collectEntries(obj, prefix = []) {
    const entries = []
    for (const [key, value] of Object.entries(obj)) {
        const path = [...prefix, key]
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            entries.push(...collectEntries(value, path))
        } else {
            entries.push([path, value])
        }
    }
    return entries
}

/** Stable string ID for a path array (used for Set/comparison). */
const pathId = pathArray => JSON.stringify(pathArray)

/** Human-readable label for a path array (last segment is most meaningful). */
const pathLabel = pathArray => pathArray.join('.')

const referenceEntries = collectEntries(en)
const referenceIds = new Set(referenceEntries.map(([p]) => pathId(p)))

describe('i18n translation consistency', () => {
    it('reference locale (en) is non-empty', () => {
        expect(referenceEntries.length).toBeGreaterThan(0)
    })

    it('all translation files are valid JSON objects', () => {
        for (const [locale, messages] of Object.entries(locales)) {
            expect(typeof messages, `${locale} is not an object`).toBe('object')
            expect(messages).not.toBeNull()
        }
    })

    for (const [locale, messages] of Object.entries(locales)) {
        if (locale === REFERENCE) continue

        describe(`${locale} vs ${REFERENCE}`, () => {
            const localeEntries = collectEntries(messages)
            const localeIds = new Set(localeEntries.map(([p]) => pathId(p)))

            it(`has no extra keys not present in ${REFERENCE}`, () => {
                const extra = localeEntries
                    .filter(([p]) => !referenceIds.has(pathId(p)))
                    .map(([p]) => pathLabel(p))
                expect(extra, `Extra keys in ${locale}: ${extra.join(', ')}`).toEqual([])
            })

            it(`has no missing keys compared to ${REFERENCE}`, () => {
                const missing = referenceEntries
                    .filter(([p]) => !localeIds.has(pathId(p)))
                    .map(([p]) => pathLabel(p))
                expect(missing, `Missing keys in ${locale}: ${missing.join(', ')}`).toEqual([])
            })

            it(`all values are non-empty strings`, () => {
                const empty = localeEntries
                    .filter(([, val]) => typeof val !== 'string' || val.trim() === '')
                    .map(([p]) => pathLabel(p))
                expect(empty, `Empty/non-string values in ${locale}: ${empty.join(', ')}`).toEqual([])
            })
        })
    }

    it('en values are all non-empty strings', () => {
        const empty = referenceEntries
            .filter(([, val]) => typeof val !== 'string' || val.trim() === '')
            .map(([p]) => pathLabel(p))
        expect(empty, `Empty/non-string values in en: ${empty.join(', ')}`).toEqual([])
    })
})
