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
import { createI18n as _createI18n } from 'vue-i18n'

// Import translations from JSON files
import translations_en from './resources/translations/translations_en.json'
import translations_de from './resources/translations/translations_de.json'
import translations_es from './resources/translations/translations_es.json'
import translations_ua from './resources/translations/translations_ua.json'
import translations_ru from './resources/translations/translations_ru.json'

const defaultLanguage = 'en'
let language = null

// Load translations from JSON files
const messages = {
	en: translations_en,
	de: translations_de,
	es: translations_es,
	ua: translations_ua,
	ru: translations_ru
}

export function createI18n() {
	const urlParams = new URLSearchParams(window.location.search)
	language = urlParams.get('locale') || navigator.language.split('-')[0] || navigator.userLanguage

	if (!Object.hasOwn(messages, language)) {
		language = defaultLanguage
	}

	localStorage.setItem('language', language)

	return _createI18n({
		legacy: false,
		globalInjection: true,
		locale: language,
		fallbackLocale: 'en',
		messages
	})
}

// Create default i18n instance
export const i18n = createI18n()

export function setLocale(locale) {
	if (Object.hasOwn(messages, locale)) {
		language = locale
		localStorage.setItem('language', language)
		if (i18n.global) {
			i18n.global.locale.value = locale
		}
	}
}

export function translateValue(value, lang = language) {
	const keys = value.split('.')
	let result = messages[lang || defaultLanguage]
	for (const key of keys) {
		if (result && result[key]) {
			result = result[key]
		} else {
			return value
		}
	}
	return result
}

// Used in bpmn-js modeler to translate strings with optional replacements
export function customTranslate(template, replacements) {
	replacements = replacements || {}

	// Get current translations
	const currentMessages = messages[language] || messages[defaultLanguage]
	
	// Translate template
	template = currentMessages[template] || template

	// Replace placeholders
	return template.replace(/{([^}]+)}/g, function (_, key) {
		return replacements[key] || '{' + key + '}'
	})
}

export { language, messages }
