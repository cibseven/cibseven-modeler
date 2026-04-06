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

// Kept as an external peer dependency — not bundled, resolved by the consumer.
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Export modeler components
import CibsevenModeler from './components/modeler/CibsevenModeler.vue'
import BpmnModeler from './components/modeler/BpmnModeler.vue'
import DmnModeler from './components/modeler/DmnModeler.vue'
import FormModeler from './components/modeler/FormModeler.vue'
import NotificationMessage from './components/modals/NotificationMessage.vue'

export { CibsevenModeler, BpmnModeler, DmnModeler, FormModeler, NotificationMessage }
export { default as ListSelector } from './components/modals/ListSelector.vue'
export { default as ConfirmModal } from './components/modals/ConfirmModal.vue'

export { default as store, createModelerStore } from './store.js'
export { i18n, setLocale, messages, createI18n } from './i18n.js'
export { parseXml, base64Decode, applyTheme, getTheme, loadFromPublic } from './utils.js'
export { setAxiosInstance, getAxios } from './axiosConfig.js'
export { setServicesBasePath, getServicesBasePath, getModelerServicePath } from './services/servicesConfig.js'
export { registerPlugin, getPlugin } from './plugins/pluginsConfig.js'

// Export store modules for consumer apps to register in their own store
export { default as processStore } from './stores/processStore.js'
export { default as formStore } from './stores/formStore.js'
export { default as elementTemplateStore } from './stores/elementTemplateStore.js'
export { default as xmlStore } from './stores/xmlStore.js'

// Export translations utilities
export { modelerTranslations, mergeModelerTranslations } from './utils/translations.js'

// Re-export monaco so consumer packages can use the same bundled instance
import * as monaco from 'monaco-editor'
export { monaco }

// Vue plugin install function
const install = (app, _options = {}) => {
	// Register components globally
	app.component('CibsevenModeler', CibsevenModeler)
	app.component('BpmnModeler', BpmnModeler)
	app.component('DmnModeler', DmnModeler)
	app.component('FormModeler', FormModeler)
}

export default { install, CibsevenModeler, BpmnModeler, DmnModeler, FormModeler }
