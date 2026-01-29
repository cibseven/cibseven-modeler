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
  getAllElementTemplates,
  setTemplateIsActive,
  updateElementTemplate,
  addElementTemplate,
  getElementTemplateById,
  deleteElementTemplate,
  duplicateElementTemplate,
  bulkDeleteTemplates,
  bulkUpdateTemplateVisibility,
  searchTemplates,
  filterTemplates as filterTemplatesService,
  validateTemplate,
  importTemplates,
  exportTemplates,
  getTemplateStatistics,
  updateElementTemplateFull
} from '../services/elementTemplateService'
import { filterTemplates } from '../utils'
import { categorizeTemplates } from '../components/templates/elementTemplateUtils'

const state = () => ({
  elementTemplates: [],
  excludeTemplates: [],
  isLoading: false,
  error: null,
  selectedTemplate: null
})

const mutations = {
  setElementTemplates(state, templates) {
    state.elementTemplates = templates
  },
  setLoading(state, isLoading) {
    state.isLoading = isLoading
  },
  setError(state, error) {
    state.error = error
  },
  setSelectedTemplate(state, template) {
    state.selectedTemplate = template
  },
  updateTemplateActiveState(state, { templateId, isActive }) {
    const template = state.elementTemplates.find(t => t.id === templateId)
    if (template) {
      template.active = isActive
    }
  },
  addTemplate(state, template) {
    state.elementTemplates.push(template)
  },
  removeTemplate(state, templateId) {
    const index = state.elementTemplates.findIndex(t => t.id === templateId)
    if (index !== -1) {
      state.elementTemplates.splice(index, 1)
    }
  },
  updateTemplate(state, updatedTemplate) {
    const index = state.elementTemplates.findIndex(t => t.id === updatedTemplate.id)
    if (index !== -1) {
      state.elementTemplates[index] = { ...state.elementTemplates[index], ...updatedTemplate }
    }
  },
  clearError(state) {
    state.error = null
  },
  setExcludeTemplates(state, excludeTemplates) {
    state.excludeTemplates = excludeTemplates || []
  },
  addToExcludeTemplates(state, templateIdentifier) {
    if (!state.excludeTemplates.includes(templateIdentifier)) {
      state.excludeTemplates.push(templateIdentifier)
    }
  },
  removeFromExcludeTemplates(state, templateIdentifier) {
    const index = state.excludeTemplates.indexOf(templateIdentifier)
    if (index !== -1) {
      state.excludeTemplates.splice(index, 1)
    }
  }
}

const actions = {
  async fetchAllElementTemplates({ commit }) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const response = await getAllElementTemplates()
      const templates = response.data || response || []
      commit('setElementTemplates', templates)
    } catch (error) {
      console.error('Error fetching element templates:', error)
      commit('setError', error)
      commit('setElementTemplates', [])
    } finally {
      commit('setLoading', false)
    }
  },

  async toggleTemplateActiveState({ commit }, { templateId, isActive }) {
    try {
      const updatedTemplate = await setTemplateIsActive(templateId, isActive)
      if (updatedTemplate) {
        commit('updateTemplate', updatedTemplate)
        return updatedTemplate
      } else {
        console.error('Failed to update template active state. Likely nothing was modified.')
        return null
      }
    } catch (error) {
      console.error('Error toggling template visibility:', error)
      
      if (error.response && error.response.status === 404) {
        // Template no longer exists, remove from store
        commit('removeTemplate', templateId)
      }
      
      commit('setError', error)
      throw error
    }
  },

  async updateElementTemplate({ commit }, { templateId, updateParams }) {
    try {
      const updatedTemplate = await updateElementTemplate(templateId, updateParams)
      if (updatedTemplate) {
        commit('updateTemplate', updatedTemplate)
        return updatedTemplate
      } else {
        console.error('Failed to update element template. Likely nothing was modified.')
        return null
      }
    } catch (error) {
      console.error('Error updating element template:', error)
      
      if (error.response && error.response.status === 404) {
        // Template no longer exists, remove from store
        commit('removeTemplate', templateId)
      }
      
      commit('setError', error)
      throw error
    }
  },

  async switchTemplateActiveState({ commit, state }, templateId) {
    try {
      // Find the template to get its current active state
      const template = state.elementTemplates.find(t => t.id === templateId)
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`)
      }
      
      // Switch to the opposite state
      const newActiveState = !template.active
      const updatedTemplate = await setTemplateIsActive(templateId, newActiveState)
      
      if (updatedTemplate) {
        commit('updateTemplate', updatedTemplate)
        
        // Manage excludeTemplates list based on active state
        // Use template.templateId (the ID from template content) for excludeTemplates
        // since that's what filterTemplates function matches against
        const templateContentId = template.templateId
        
        if (!newActiveState) {
          // Template was deactivated, add to excludeTemplates
          commit('addToExcludeTemplates', templateContentId)
        } else {
          // Template was activated, remove from excludeTemplates
          commit('removeFromExcludeTemplates', templateContentId)
        }
        
        return updatedTemplate
      } else {
        console.error('Failed to switch template active state. Likely nothing was modified.')
        return null
      }
    } catch (error) {
      console.error('Error switching template active state:', error)
      
      if (error.response && error.response.status === 404) {
        // Template no longer exists, remove from store
        commit('removeTemplate', templateId)
      }
      
      commit('setError', error)
      throw error
    }
  },

  async createElementTemplate({ commit }, templateData) {
    commit('setLoading', true)
    commit('clearError')
    
    try {
      const newTemplate = await addElementTemplate(templateData)
      if (newTemplate) {
        commit('addTemplate', newTemplate)
        return newTemplate
      }
    } catch (error) {
      console.error('Error creating element template:', error)
      commit('setError', error)
      throw error
    } finally {
      commit('setLoading', false)
    }
  },

  selectTemplate({ commit }, template) {
    commit('setSelectedTemplate', template)
  },

  clearSelectedTemplate({ commit }) {
    commit('setSelectedTemplate', null)
  },

  clearError({ commit }) {
    commit('clearError')
  },

  setExcludeTemplates({ commit }, excludeTemplates) {
    commit('setExcludeTemplates', excludeTemplates)
  },

  async getElementTemplateById({ commit }, templateId) {
    try {
      const template = await getElementTemplateById(templateId)
      return template
    } catch (error) {
      console.error('Error fetching template by ID:', error)
      commit('setError', error)
      throw error
    }
  },

  async deleteElementTemplate({ commit }, templateId) {
    try {
      await deleteElementTemplate(templateId)
      commit('removeTemplate', templateId)
      return true
    } catch (error) {
      console.error('Error deleting template:', error)
      commit('setError', error)
      throw error
    }
  },

  async duplicateElementTemplate({ commit }, templateId) {
    try {
      const duplicatedTemplate = await duplicateElementTemplate(templateId)
      if (duplicatedTemplate) {
        commit('addTemplate', duplicatedTemplate)
        return duplicatedTemplate
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
      commit('setError', error)
      throw error
    }
  },

  async bulkDeleteTemplates({ commit }, templateIds) {
    try {
      const result = await bulkDeleteTemplates(templateIds)
      
      // Remove successfully deleted templates from store
      if (result.deleted && result.deleted.length > 0) {
        result.deleted.forEach(id => commit('removeTemplate', id))
      }
      
      return result
    } catch (error) {
      console.error('Error bulk deleting templates:', error)
      commit('setError', error)
      throw error
    }
  },

  async bulkUpdateTemplateVisibility({ commit }, { templateIds, active }) {
    try {
      const result = await bulkUpdateTemplateVisibility(templateIds, active)
      
      // Update successfully updated templates in store
      if (result.updated && result.updated.length > 0) {
        result.updated.forEach(id => {
          commit('updateTemplateActiveState', { templateId: id, isActive: active })
        })
      }
      
      return result
    } catch (error) {
      console.error('Error bulk updating template visibility:', error)
      commit('setError', error)
      throw error
    }
  },

  async searchTemplates({ commit }, searchParams) {
    commit('setLoading', true)
    try {
      const templates = await searchTemplates(searchParams)
      return templates
    } catch (error) {
      console.error('Error searching templates:', error)
      commit('setError', error)
      throw error
    } finally {
      commit('setLoading', false)
    }
  },

  async filterTemplatesFromService({ commit }, filterParams) {
    commit('setLoading', true)
    try {
      const templates = await filterTemplatesService(filterParams)
      return templates
    } catch (error) {
      console.error('Error filtering templates:', error)
      commit('setError', error)
      throw error
    } finally {
      commit('setLoading', false)
    }
  },

  async validateTemplate({ commit }, templateData) {
    try {
      const result = await validateTemplate(templateData)
      return result
    } catch (error) {
      console.error('Error validating template:', error)
      commit('setError', error)
      throw error
    }
  },

  async importTemplates({ commit }, templates) {
    commit('setLoading', true)
    try {
      const result = await importTemplates(templates)
      
      // Add successfully imported templates to store
      if (result.imported && result.imported.length > 0) {
        result.imported.forEach(template => commit('addTemplate', template))
      }
      
      return result
    } catch (error) {
      console.error('Error importing templates:', error)
      commit('setError', error)
      throw error
    } finally {
      commit('setLoading', false)
    }
  },

  async exportTemplates({ commit }, exportParams = {}) {
    try {
      const templates = await exportTemplates(exportParams)
      return templates
    } catch (error) {
      console.error('Error exporting templates:', error)
      commit('setError', error)
      throw error
    }
  },

  async getTemplateStatistics({ commit }) {
    try {
      const stats = await getTemplateStatistics()
      return stats
    } catch (error) {
      console.error('Error getting template statistics:', error)
      commit('setError', error)
      throw error
    }
  },

  async updateElementTemplateFull({ commit }, { templateId, templateData }) {
    try {
      const updatedTemplate = await updateElementTemplateFull(templateId, templateData)
      if (updatedTemplate) {
        commit('updateTemplate', updatedTemplate)
        return updatedTemplate
      }
    } catch (error) {
      console.error('Error updating template (full):', error)
      
      if (error.response && error.response.status === 404) {
        // Template no longer exists, remove from store
        commit('removeTemplate', templateId)
      }
      
      commit('setError', error)
      throw error
    }
  },

  async setGroupVisibility({ state, dispatch }, { taskType, groupName, isVisible }) {
    try {
      // Get categorized template data
      const categorizedData = state.elementTemplates
        .map(template => {
          try {
            if (template.content && template.content.trim() !== '') {
              return { parsed: JSON.parse(template.content), original: template }
            }
            return null
          } catch {
            return null
          }
        })
        .filter(item => item !== null)

      // Find templates in the specified group
      const templatesToUpdate = []
      categorizedData.forEach(({ parsed, original }) => {
        const appliesTo = parsed.appliesTo || []
        if (appliesTo.includes(taskType)) {
          const splitTemplate = parsed.name.split(/-(.+)/)
          const currentGroupName = splitTemplate.length > 1 ? splitTemplate[0] : 'undefined'
          if (currentGroupName === groupName) {
            templatesToUpdate.push(original)
          }
        }
      })

      // Update visibility for all templates in the group
      const updatePromises = templatesToUpdate.map(template => 
        dispatch('toggleTemplateActiveState', { 
          templateId: template.id, 
          isActive: isVisible 
        })
      )

      await Promise.all(updatePromises)
      
      return {
        updated: templatesToUpdate.length,
        templates: templatesToUpdate.map(t => t.id)
      }
    } catch (error) {
      console.error('Error setting group visibility:', error)
      throw error
    }
  },

  async bulkSetGroupVisibility({ dispatch }, groupVisibilityUpdates) {
    try {
      const updatePromises = groupVisibilityUpdates.map(update => 
        dispatch('setGroupVisibility', update)
      )
      
      const results = await Promise.all(updatePromises)
      
      return {
        groupsUpdated: results.length,
        totalTemplatesUpdated: results.reduce((sum, result) => sum + result.updated, 0)
      }
    } catch (error) {
      console.error('Error in bulk group visibility update:', error)
      throw error
    }
  }
}

const getters = {
  allElementTemplates: (state) => state.elementTemplates,
  activeElementTemplates: (state) => state.elementTemplates.filter(template => template.active),
  allElementTemplateContents: (state) => {
    return state.elementTemplates
      .filter(template => template.active)
      .map(template => {
        try {
          if (template.content && template.content.trim() !== '') {
            return JSON.parse(template.content)
          } else {
            console.warn(`Template ${template.templateId} has empty or null content`)
            return null
          }
        } catch (error) {
          console.error(`Failed to parse content for template ${template.templateId}:`, error)
          return null
        }
      })
      .filter(content => content !== null)
  },
  inactiveElementTemplates: (state) => state.elementTemplates.filter(template => !template.active),
  isLoading: (state) => state.isLoading,
  error: (state) => state.error,
  selectedTemplate: (state) => state.selectedTemplate,
  getTemplateById: (state) => (templateId) => state.elementTemplates.find(template => template.id === templateId),
  templatesCount: (state) => state.elementTemplates.length,
  activeTemplatesCount: (state) => state.elementTemplates.filter(template => template.active).length,
  excludeTemplates: (state) => state.excludeTemplates,
  isTemplateExcluded: (state) => (template) => {
    if (!state.excludeTemplates || state.excludeTemplates.length === 0) {
      return false
    }
    // Use filterTemplates function to check if template is excluded
    // If filterTemplates returns empty array, the template is excluded
    const config = { excludeTemplates: state.excludeTemplates }
    return filterTemplates([template], config).length === 0
  },
  categorizedTemplateData: (state) => {
    return categorizeTemplates(state.elementTemplates, { filterActive: true })
  },
  allCategorizedTemplateData: (state) => {
    return categorizeTemplates(state.elementTemplates, { preserveOriginalTemplate: true })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
