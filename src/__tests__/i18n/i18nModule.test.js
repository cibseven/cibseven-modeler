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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('i18n module', () => {
    const originalLocation = window.location
    const originalLocalStorage = window.localStorage

    beforeEach(() => {
        vi.resetModules()
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
        Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, writable: true, configurable: true })
    })

    async function loadI18nModule(search = '', storedLang = null) {
        Object.defineProperty(window, 'location', {
            value: { search },
            writable: true,
            configurable: true,
        })
        window.localStorage.getItem = vi.fn((key) => (key === 'language' ? storedLang : null))
        return import('../../i18n.js')
    }

    it('createI18n uses locale from URL search param', async () => {
        const { createI18n } = await loadI18nModule('?locale=de')
        const instance = createI18n()
        expect(instance.global.locale.value).toBe('de')
    })

    it('createI18n falls back to localStorage language', async () => {
        const { createI18n } = await loadI18nModule('', 'es')
        const instance = createI18n()
        expect(instance.global.locale.value).toBe('es')
    })

    it('createI18n falls back to en for unsupported locale', async () => {
        const { createI18n } = await loadI18nModule('?locale=unsupported')
        const instance = createI18n()
        expect(instance.global.locale.value).toBe('en')
    })

    it('setLocale updates the active locale when supported', async () => {
        const { setLocale, i18n } = await loadI18nModule('?locale=en')
        setLocale('de')
        expect(i18n.global.locale.value).toBe('de')
    })

    it('setLocale ignores unsupported locales', async () => {
        const { setLocale, i18n } = await loadI18nModule('?locale=en')
        setLocale('xx')
        expect(i18n.global.locale.value).toBe('en')
    })

    it('translateValue resolves nested keys', async () => {
        const { translateValue, messages } = await loadI18nModule('?locale=en')
        const sampleKey = Object.keys(messages.en)[0]
        const nested = messages.en[sampleKey]
        if (typeof nested === 'object' && nested !== null) {
            const childKey = Object.keys(nested)[0]
            expect(translateValue(`${sampleKey}.${childKey}`, 'en')).toBe(nested[childKey])
        } else {
            expect(translateValue(sampleKey, 'en')).toBe(nested)
        }
    })

    it('translateValue returns the key when path is missing', async () => {
        const { translateValue } = await loadI18nModule('?locale=en')
        expect(translateValue('definitely.missing.key.path', 'en')).toBe('definitely.missing.key.path')
    })

    it('customTranslate replaces placeholders in template strings', async () => {
        const { customTranslate, setLocale } = await loadI18nModule('?locale=en')
        setLocale('en')
        expect(customTranslate('Hello {name}', { name: 'MyProc' })).toBe('Hello MyProc')
    })

    it('customTranslate keeps unknown placeholders', async () => {
        const { customTranslate, setLocale } = await loadI18nModule('?locale=en')
        setLocale('en')
        expect(customTranslate('unknown.template.key', { foo: 'bar' })).toBe('unknown.template.key')
    })
})
