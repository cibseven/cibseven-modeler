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
import { axios } from '../axiosConfig'
import { getElementTemplatesPath } from './servicesConfig'

export const getAllElementTemplates = async () => {
  return await axios.get(getElementTemplatesPath())
}

/**
 * Retrieves only the content fields of all active element templates.
 * This is optimized for BPMN.js integration where only template definitions are needed.
 * @returns {Promise} Array of template content objects ready for bpmn.js
 */
export const getAllElementTemplateContents = async () => {
  return await axios.get(`${getElementTemplatesPath()}/content`)
}

/**
 * Updates an element template with the provided parameters
 * @param {String} elementTemplateId - The ID of the element template to update
 * @param {Object} updateParams - Object containing the fields to update
 * @returns {Promise} The updated element template
 */
export const updateElementTemplate = async (elementTemplateId, updateParams) => {
  return await axios.patch(`${getElementTemplatesPath()}/${elementTemplateId}`, updateParams)
}

/**
 * Sets the active status of an element template (backward compatibility)
 * @param {String} elementTemplateId
 * @param {Boolean} isActive
 * @returns
 */
export const setTemplateIsActive = async (elementTemplateId, isActive) => {
  return await updateElementTemplate(elementTemplateId, { 'active': isActive })
}

/**
 * 
 * @param {Map<String, any>} elementTemplate
 * @returns {Map<String, any>} The recently created element template
 */
export const addElementTemplate = async (elementTemplate) => {
  return await axios.post(getElementTemplatesPath(), elementTemplate)
}

/**
 * Gets a single element template by ID
 * @param {String} templateId - The ID of the template to retrieve
 * @returns {Promise} The element template
 */
export const getElementTemplateById = async (templateId) => {
  return await axios.get(`${getElementTemplatesPath()}/${templateId}`)
}

/**
 * Deletes an element template by ID
 * @param {String} templateId - The ID of the template to delete
 * @returns {Promise} The deletion result
 */
export const deleteElementTemplate = async (templateId) => {
  return await axios.delete(`${getElementTemplatesPath()}/${templateId}`)
}

/**
 * Duplicates an element template
 * @param {String} templateId - The ID of the template to duplicate
 * @returns {Promise} The duplicated template
 */
export const duplicateElementTemplate = async (templateId) => {
  return await axios.post(`${getElementTemplatesPath()}/${templateId}/duplicate`, {})
}

/**
 * Bulk delete multiple templates
 * @param {Array<String>} templateIds - Array of template IDs to delete
 * @returns {Promise} The bulk deletion result
 */
export const bulkDeleteTemplates = async (templateIds) => {
  return await axios.post(`${getElementTemplatesPath()}/bulk-delete`, templateIds)
}

/**
 * Bulk update visibility for multiple templates
 * @param {Array<String>} templateIds - Array of template IDs to update
 * @param {Boolean} active - The active status to set
 * @returns {Promise} The bulk update result
 */
export const bulkUpdateTemplateVisibility = async (templateIds, active) => {
  return await axios.patch(`${getElementTemplatesPath()}/bulk-update-visibility`, { templateIds, active })
}

/**
 * Search templates with multiple criteria
 * @param {Object} searchParams - Search parameters
 * @param {String} searchParams.name - Filter by name
 * @param {String} searchParams.creator - Filter by creator
 * @param {Boolean} searchParams.active - Filter by active status
 * @param {String} searchParams.templateId - Filter by template ID
 * @param {String} searchParams.description - Filter by description
 * @returns {Promise} The search results
 */
export const searchTemplates = async (searchParams = {}) => {
  const params = new URLSearchParams()
  
  Object.keys(searchParams).forEach(key => {
    if (searchParams[key] !== null && searchParams[key] !== undefined && searchParams[key] !== '') {
      params.append(key, searchParams[key])
    }
  })
  
  return await axios.get(`${getElementTemplatesPath()}/search?${params.toString()}`)
}

/**
 * Filter templates with basic criteria
 * @param {Object} filterParams - Filter parameters
 * @param {Boolean} filterParams.activeOnly - Show only active templates
 * @param {String} filterParams.createdBy - Filter by creator
 * @returns {Promise} The filtered results
 */
export const filterTemplates = async (filterParams = {}) => {
  const params = new URLSearchParams()
  
  Object.keys(filterParams).forEach(key => {
    if (filterParams[key] !== null && filterParams[key] !== undefined && filterParams[key] !== '') {
      params.append(key, filterParams[key])
    }
  })
  
  return await axios.get(`${getElementTemplatesPath()}/filter?${params.toString()}`)
}

/**
 * Validate a template before saving
 * @param {Object} templateData - The template data to validate
 * @returns {Promise} The validation result
 */
export const validateTemplate = async (templateData) => {
  return await axios.post(`${getElementTemplatesPath()}/validate`, templateData)
}

/**
 * Import multiple templates
 * @param {Array<Object>} templates - Array of template data to import
 * @returns {Promise} The import result
 */
export const importTemplates = async (templates) => {
  return await axios.post(`${getElementTemplatesPath()}/import`, templates)
}

/**
 * Export templates
 * @param {Object} exportParams - Export parameters
 * @param {Array<String>} exportParams.templateIds - Specific template IDs to export (optional)
 * @param {Boolean} exportParams.activeOnly - Export only active templates
 * @returns {Promise} The exported templates
 */
export const exportTemplates = async (exportParams = {}) => {
  const params = new URLSearchParams()
  
  if (exportParams.templateIds && exportParams.templateIds.length > 0) {
    exportParams.templateIds.forEach(id => params.append('templateIds', id))
  }
  
  if (exportParams.activeOnly !== undefined) {
    params.append('activeOnly', exportParams.activeOnly)
  }
  
  return await axios.get(`${getElementTemplatesPath()}/export?${params.toString()}`)
}

/**
 * Get template statistics
 * @returns {Promise} The template statistics
 */
export const getTemplateStatistics = async () => {
  return await axios.get(`${getElementTemplatesPath()}/statistics`)
}

/**
 * Full update of an element template (PUT)
 * @param {String} templateId - The ID of the template to update
 * @param {Object} templateData - The complete template data
 * @returns {Promise} The updated template
 */
export const updateElementTemplateFull = async (templateId, templateData) => {
  return await axios.put(`${getElementTemplatesPath()}/${templateId}`, templateData)
}
