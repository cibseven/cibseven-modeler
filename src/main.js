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
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import * as monaco from './monaco-setup.js'

import { createApp } from 'vue'
import App from './App.vue'
import { createI18n } from './i18n.js'
import router from './router'
import store from './store'
import { axios } from './axiosConfig'
import { loadFromPublic } from './utils.js'
import { setServicesBasePath, getInfoPath } from './services/servicesConfig.js'

const app = createApp(App)
monaco.editor.setTheme('vs')
app.provide('monaco', monaco)

const i18n = createI18n()
app.use(store)
app.use(i18n)
app.use(router)

let config = null

async function initApp() {
	config = await loadFromPublic('assets', 'config.json')

	// Fetch backend properties for services configuration
	console.info('[Config] Requesting properties from', getInfoPath() + '/properties')
	try {
		const properties = await axios.get(getInfoPath() + '/properties')
		console.info('[Config] Properties response:', properties)
		
		// Set the services base path from backend config
		if (properties && properties.servicesBasePath) {
			setServicesBasePath(properties.servicesBasePath)
			console.info('[Config] Services base path set to:', properties.servicesBasePath)
		}
	} catch (err) {
		console.warn('[Config] Failed to load backend properties, using defaults', err)
	}

	mountApp()
}

const mountApp = () => {
	app.provide('config', config)
	app.mount('#app')
}

initApp()

export default {
	i18n
}
