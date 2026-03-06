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

// Import CSS to ensure it is bundled with the package
import './assets/css/main.css'
import './assets/css/custom-bootstrap.css'

// Import Bootstrap JavaScript for interactive components (dropdowns, modals, etc.)
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Export modeler components
import CibsevenModeler from './components/modeler/CibsevenModeler.vue'
import BpmnModeler from './components/modeler/BpmnModeler.vue'
import DmnModeler from './components/modeler/DmnModeler.vue'
import FormModeler from './components/modeler/FormModeler.vue'

export { CibsevenModeler, BpmnModeler, DmnModeler, FormModeler }

export { default as store, createModelerStore } from './store.js'
export { i18n, setLocale, messages, createI18n } from './i18n.js'
export { parseXml, base64Decode, applyTheme, getTheme, loadFromPublic } from './utils.js'
export { setAxiosInstance, getAxios } from './axiosConfig.js'
export { setServicesBasePath, getServicesBasePath } from './services/servicesConfig.js'

// Export store modules for consumer apps to register in their own store
export { default as processStore } from './stores/processStore.js'
export { default as formStore } from './stores/formStore.js'
export { default as elementTemplateStore } from './stores/elementTemplateStore.js'
export { default as xmlStore } from './stores/xmlStore.js'

// Export translations for consumer apps to merge
import translations_en from './resources/translations/translations_en.json'
import translations_de from './resources/translations/translations_de.json'
import translations_es from './resources/translations/translations_es.json'
import translations_ua from './resources/translations/translations_ua.json'
import translations_ru from './resources/translations/translations_ru.json'

export const modelerTranslations = {
	en: translations_en,
	de: translations_de,
	es: translations_es,
	ua: translations_ua,
	ru: translations_ru
}

/**
 * Merge modeler translations into the consumer app's i18n instance
 * @param {Object} i18n - The vue-i18n instance from the consumer app
 * @param {string} lang - The language code (en, de, es, ua, ru)
 */
export function mergeModelerTranslations(i18n, lang) {
	const translation = modelerTranslations[lang] || modelerTranslations.en
	if (i18n.global && i18n.global.mergeLocaleMessage) {
		i18n.global.mergeLocaleMessage(lang, translation)
	}
}

// Vue plugin install function
const install = (app, _options = {}) => {
	// Register components globally
	app.component('CibsevenModeler', CibsevenModeler)
	app.component('BpmnModeler', BpmnModeler)
	app.component('DmnModeler', DmnModeler)
	app.component('FormModeler', FormModeler)
}

export default { install, CibsevenModeler, BpmnModeler, DmnModeler, FormModeler }
