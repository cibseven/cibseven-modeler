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

export const applicableTaskTypes = {
    'bpmn:UserTask': 'User Task',
    'bpmn:ServiceTask': 'Service Task',
    'bpmn:ScriptTask': 'Script Task',
    'bpmn:BusinessRuleTask': 'Business Rule Task',
    'bpmn:ManualTask': 'Manual Task',
    'bpmn:SendTask': 'Send Task',
    'bpmn:ReceiveTask': 'Receive Task',
    'bpmn:CallActivity': 'Call Activity',
    'bpmn:StartEvent': 'Start Event',
    'bpmn:EndEvent': 'End Event',
}

/**
 * Consolidated template categorization utility function
 * Parses templates, groups them by task type and group name, and sorts the results
 * 
 * @param {Array} rawTemplates - Array of template objects with content field
 * @param {Object} options - Configuration options
 * @param {boolean} options.filterActive - Whether to filter only active templates
 * @param {boolean} options.preserveOriginalTemplate - Whether to preserve reference to original template
 * @returns {Object} Categorized and sorted template groups
 */
export const categorizeTemplates = (rawTemplates, options = {}) => {
  const { filterActive = false, preserveOriginalTemplate = false } = options

  // Parse template content and filter
  const templates = rawTemplates
    .filter(template => !filterActive || template.active)
    .map(template => {
      try {
        if (template.content && template.content.trim() !== '') {
          const parsed = JSON.parse(template.content)
          // Add reference to original template if requested
          return preserveOriginalTemplate ? { ...parsed, originalTemplate: template } : parsed
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

  // Group templates by task type and group name
  const taskGroups = templates.reduce((groups, template) => {
    const version = template.id.split('-').pop()
    const appliesTo = template.appliesTo || []

    appliesTo.forEach((taskType) => {
      if (!groups[taskType]) {
        groups[taskType] = {}
      }
      // extracts name before the first dash
      const splitTemplate = template.name.split(/-(.+)/)
      const templateName = splitTemplate.length > 1 ? splitTemplate[1].split('(')[0] : splitTemplate[0].split('(')[0]
      const groupName = splitTemplate.length > 1 ? splitTemplate[0] : 'undefined'
      
      // initializes the array of templates in case it doesn't exist for that name
      if (!groups[taskType][groupName]) {
        groups[taskType][groupName] = [] // groups by templates name
      }
      
      const findExtern = template?.properties?.find(obj => obj?.label?.toLowerCase() === 'implementation type')
      const externValue = findExtern?.value === 'external' ? true : false

      // add the template to its corresponding group
      groups[taskType][groupName].push({
        name: templateName ?? template.name,
        template: preserveOriginalTemplate ? template.originalTemplate : template,
        id: template.id,
        version,
        extern: externValue,
        tooltip: template.description ?? '',
        metaKeys: template.metaKeys
      })
    })
    return groups
  }, {})

  // Sort templates within groups and sort groups within task types
  for (const taskType in taskGroups) {
    for (const templateName in taskGroups[taskType]) {
      // order templates by name
      taskGroups[taskType][templateName].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    }
    // order template groups by name inside task types
    const sortedTemplateNames = Object.keys(taskGroups[taskType]).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )
    const sortedTaskGroup = {}
    sortedTemplateNames.forEach((templateName) => {
      sortedTaskGroup[templateName] = taskGroups[taskType][templateName]
    })
    taskGroups[taskType] = sortedTaskGroup
  }
  
  return taskGroups
}
