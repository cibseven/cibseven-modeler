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
import { createStore } from 'vuex'
import elementTemplateStore from './stores/elementTemplateStore'
import processStore from './stores/processStore'
import formStore from './stores/formStore'
import xmlStore from './stores/xmlStore'

// Factory function to create a new store instance
export const createModelerStore = (options = {}) => {
	return createStore({
		state() {
			return {
				// Global application state
				currentDiagram: null,
				diagrams: [],
				templates: [],
				...options.state
			}
		},

		mutations: {
			setCurrentDiagram(state, diagram) {
				state.currentDiagram = diagram
			},
			setDiagrams(state, diagrams) {
				state.diagrams = diagrams
			},
			setTemplates(state, templates) {
				state.templates = templates
			},
			...options.mutations
		},

		actions: {
			updateCurrentDiagram({ commit }, diagram) {
				commit('setCurrentDiagram', diagram)
			},
			updateDiagrams({ commit }, diagrams) {
				commit('setDiagrams', diagrams)
			},
			updateTemplates({ commit }, templates) {
				commit('setTemplates', templates)
			},
			...options.actions
		},

		modules: {
			elementTemplates: elementTemplateStore,
			processes: processStore,
			forms: formStore,
			xml: xmlStore,
			...options.modules
		}
	})
}

// Default store instance
const store = createModelerStore()

export default store
