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
import { fetchDiagram, fetchDecisionDiagram } from '../services/processService'

const state = () => ({
  xmlFromExternalReturn: null,
  xmlFromModeler: null,
  isLoading: false,
  error: null
})

const mutations = {
  setXmlFromExternalReturn(state, xml) {
    state.xmlFromExternalReturn = xml
  },
  setXmlFromModeler(state, xml) {
    state.xmlFromModeler = xml
  },
  clearXmlFromExternalReturn(state) {
    state.xmlFromExternalReturn = null
  },
  clearXmlFromModeler(state) {
    state.xmlFromModeler = null
  },
  clearAllXml(state) {
    state.xmlFromExternalReturn = null
    state.xmlFromModeler = null
  },
  setLoading(state, isLoading) {
    state.isLoading = isLoading
  },
  setError(state, error) {
    state.error = error
  },
  clearError(state) {
    state.error = null
  }
}

const actions = {
  async fetchDiagram({ commit }, processId) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const xmlFromExternalReturn = await fetchDiagram(processId)
      commit('setXmlFromExternalReturn', xmlFromExternalReturn)
    } catch (error) {
      console.error(error)
      commit('setError', error)
    } finally {
      commit('setLoading', false)
    }
  },

  async fetchDecisionDiagram({ commit }, decisionId) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const xmlFromExternalReturn = await fetchDecisionDiagram(decisionId)
      commit('setXmlFromExternalReturn', xmlFromExternalReturn)
    } catch (error) {
      console.error(error)
      commit('setError', error)
    } finally {
      commit('setLoading', false)
    }
  },

  setModelerXml({ commit }, xml) {
    commit('setXmlFromModeler', xml)
  },

  clearExternalXml({ commit }) {
    commit('clearXmlFromExternalReturn')
  },

  clearModelerXml({ commit }) {
    commit('clearXmlFromModeler')
  },

  clearAllXml({ commit }) {
    commit('clearAllXml')
  },

  clearError({ commit }) {
    commit('clearError')
  }
}

const getters = {
  xmlFromExternalReturn: (state) => state.xmlFromExternalReturn,
  xmlFromModeler: (state) => state.xmlFromModeler,
  isLoading: (state) => state.isLoading,
  error: (state) => state.error,
  hasExternalXml: (state) => !!state.xmlFromExternalReturn,
  hasModelerXml: (state) => !!state.xmlFromModeler,
  hasAnyXml: (state) => !!(state.xmlFromExternalReturn || state.xmlFromModeler),
  getCurrentXml: (state) => {
    // Return modeler XML if available, otherwise external XML
    return state.xmlFromModeler || state.xmlFromExternalReturn
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
