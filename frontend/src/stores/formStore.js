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
import { fetchForms, fetchFormById } from '../services/formService'

const state = () => ({
  forms: null,
  formSelected: null,
  formSelectedId: null,
  isLoading: false,
  error: null
})

const mutations = {
  setForms(state, forms) {
    state.forms = forms
  },
  setCurrentForm(state, form) {
    state.formSelected = JSON.stringify(form.formSelected)
  },
  setCurrentFormId(state, formId) {
    state.formSelectedId = formId
  },
  setResetFormSelected(state) {
    state.formSelected = null
    state.formSelectedId = null
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
  async fetchForms({ commit }, { firstResult, maxResults, keyword = '' }) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const forms = await fetchForms(firstResult, maxResults, keyword)
      commit('setForms', forms)
    } catch (error) {
      console.error(error)
      commit('setError', error)
    } finally {
      commit('setLoading', false)
    }
  },

  async fetchFormById({ commit }, id) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const formSelected = await fetchFormById(id)
      const updatedPayload = {
        formSelected: JSON.stringify(formSelected, null, 2)
      }
      commit('setCurrentForm', updatedPayload)
      commit('setCurrentFormId', id)
    } catch (error) {
      console.error(error)
      commit('setError', error)
    } finally {
      commit('setLoading', false)
    }
  },

  resetSelectedForm({ commit }) {
    try {
      commit('setResetFormSelected')
    } catch (error) {
      console.error(error)
      commit('setError', error)
    }
  },

  clearError({ commit }) {
    commit('clearError')
  }
}

const getters = {
  allForms: (state) => state.forms,
  selectedForm: (state) => state.formSelected,
  selectedFormId: (state) => state.formSelectedId,
  isLoading: (state) => state.isLoading,
  error: (state) => state.error,
  getFormById: (state) => (formId) => {
    if (!state.forms) return null
    return state.forms.find(form => form.id === formId)
  },
  formsCount: (state) => state.forms ? state.forms.length : 0,
  parsedSelectedForm: (state) => {
    if (!state.formSelected) return null
    try {
      return JSON.parse(state.formSelected)
    } catch (error) {
      console.error('Error parsing selected form:', error)
      return null
    }
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
