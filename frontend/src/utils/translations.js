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
import translations_en from '../resources/translations/translations_en.json'
import translations_de from '../resources/translations/translations_de.json'
import translations_es from '../resources/translations/translations_es.json'
import translations_ua from '../resources/translations/translations_ua.json'
import translations_ru from '../resources/translations/translations_ru.json'

export const modelerTranslations = {
	en: translations_en,
	de: translations_de,
	es: translations_es,
	ua: translations_ua,
	ru: translations_ru
}

/**
 * Merge modeler translations into the consumer app's i18n instance.
 * @param {Object} i18n - The vue-i18n instance from the consumer app
 * @param {string} lang - The language code (en, de, es, ua, ru)
 */
export function mergeModelerTranslations(i18n, lang) {
	const translation = modelerTranslations[lang] || modelerTranslations.en
	if (i18n.global && i18n.global.mergeLocaleMessage) {
		i18n.global.mergeLocaleMessage(lang, translation)
	}
}
