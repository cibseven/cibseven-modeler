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
import {
  fetchProcesses,
  fetchProcessById,
  fetchProcessByName,
  fetchProcessHistory
} from '../services/processService'

const state = () => ({
  processes: null,
  processSelected: null,
  processSelectedId: null,
  processSelectedName: null,
  processSelectedProcesskey: null,
  processHistoryList: null,
  isLoading: false,
  error: null
})

const mutations = {
  setProcesses(state, processes) {
    state.processes = processes
  },
  setCurrentProcess(state, updatedPayload) {
    state.processSelected = updatedPayload.processSelected
    state.processSelectedId = updatedPayload.processId
    state.processSelectedName = updatedPayload.processName
    state.processSelectedProcesskey = updatedPayload.processKey
  },
  setResetProcessSelected(state) {
    state.processSelected = null
    state.processSelectedId = null
    state.processSelectedName = null
    state.processSelectedProcesskey = null
  },
  setProcessHistoryList(state, processHistoryList) {
    state.processHistoryList = processHistoryList
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
  async fetchProcesses({ commit }) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const processes = await fetchProcesses()
      commit('setProcesses', processes)
    } catch (error) {
      console.error(error)
      commit('setError', error)
    } finally {
      commit('setLoading', false)
    }
  },

  async fetchProcessById({ commit }, processId) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const processSelected = await fetchProcessById(processId)
      const updatedPayload = {
        processSelected: processSelected
      }
      commit('setCurrentProcess', updatedPayload)
    } catch (error) {
      console.error(error)
      commit('setError', error)
    } finally {
      commit('setLoading', false)
    }
  },

  async fetchProcessByName({ commit }, processName) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const processSelected = await fetchProcessByName(processName)
      const updatedPayload = {
        processSelected: processSelected
      }
      commit('setCurrentProcess', updatedPayload)
    } catch (error) {
      console.error(error)
      commit('setError', error)
    } finally {
      commit('setLoading', false)
    }
  },

  async fetchProcessHistoryList({ commit }, processId) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const processHistoryList = await fetchProcessHistory(processId)
      commit('setProcessHistoryList', processHistoryList)
    } catch (error) {
      console.error(error)
      commit('setError', error)
    } finally {
      commit('setLoading', false)
    }
  },

  resetSelectedProcess({ commit }) {
    try {
      commit('setResetProcessSelected', null)
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
  allProcesses: (state) => state.processes,
  selectedProcess: (state) => state.processSelected,
  selectedProcessId: (state) => state.processSelectedId,
  selectedProcessName: (state) => state.processSelectedName,
  selectedProcessKey: (state) => state.processSelectedProcesskey,
  processHistoryList: (state) => state.processHistoryList,
  isLoading: (state) => state.isLoading,
  error: (state) => state.error,
  getProcessById: (state) => (processId) => {
    if (!state.processes) return null
    return state.processes.find(process => process.id === processId)
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
