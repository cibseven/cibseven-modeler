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
import { modelerTranslations, mergeModelerTranslations } from '../../utils/translations.js'

describe('translations.js', () => {
    describe('modelerTranslations', () => {
        it('exposes all supported locale keys', () => {
            expect(Object.keys(modelerTranslations).sort()).toEqual(['de', 'en', 'es', 'ru', 'ua'])
        })

        it('each locale has a non-empty translation object', () => {
            for (const lang of Object.keys(modelerTranslations)) {
                expect(typeof modelerTranslations[lang]).toBe('object')
                expect(Object.keys(modelerTranslations[lang]).length).toBeGreaterThan(0)
            }
        })
    })

    describe('mergeModelerTranslations', () => {
        it('merges the requested locale into i18n', () => {
            const mergeLocaleMessage = vi.fn()
            const i18n = { global: { mergeLocaleMessage } }

            mergeModelerTranslations(i18n, 'de')

            expect(mergeLocaleMessage).toHaveBeenCalledWith('de', modelerTranslations.de)
        })

        it('falls back to en for an unknown locale', () => {
            const mergeLocaleMessage = vi.fn()
            const i18n = { global: { mergeLocaleMessage } }

            mergeModelerTranslations(i18n, 'xx')

            expect(mergeLocaleMessage).toHaveBeenCalledWith('xx', modelerTranslations.en)
        })

        it('does nothing when mergeLocaleMessage is missing', () => {
            expect(() => mergeModelerTranslations({}, 'en')).not.toThrow()
            expect(() => mergeModelerTranslations({ global: {} }, 'en')).not.toThrow()
        })
    })
})
