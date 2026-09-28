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

// Synthetic bucket for templates whose content can't be grouped by task type (empty/invalid
// content, or missing the id/name fields the grouping logic itself needs) — shown to the user
// instead of silently disappearing from the categorized view.
export const UNCATEGORIZED_TASK_TYPE = 'uncategorized'
export const UNCATEGORIZED_GROUP_NAME = 'not-categorized'

// Fallback group for a template name with no "Group - Name" prefix.
export const UNDEFINED_GROUP_NAME = 'undefined'

/**
 * Parses a template's content and returns it only if it's usable for categorization
 * (valid JSON with both `id` and `name`). Returns null otherwise.
 */
export const parseCompleteTemplateContent = (template) => {
    try {
        if (!template.content || template.content.trim() === '') return null
        const parsed = JSON.parse(template.content)
        if (!parsed.id || !parsed.name) return null
        return parsed
    } catch {
        return null
    }
}

/**
 * Splits a template's display name into its group prefix and the name shown to the user,
 * e.g. "Email - Send Message" -> { groupName: 'Email', templateName: 'Send Message' }.
 * A name with no "prefix - " falls back to UNDEFINED_GROUP_NAME.
 */
export const parseTemplateNameGroup = (name) => {
    const splitTemplate = name.split(/-(.+)/)
    const templateName = splitTemplate.length > 1 ? splitTemplate[1].split('(')[0] : splitTemplate[0].split('(')[0]
    const groupName = splitTemplate.length > 1 ? splitTemplate[0] : UNDEFINED_GROUP_NAME
    return { groupName, templateName }
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

  // Parse template content, setting aside anything that can't be grouped (id suffix -> version,
  // name prefix -> group name) instead of dropping it from the view entirely.
  const templates = []
  const incomplete = []
  rawTemplates
    .filter(template => !filterActive || template.active)
    .forEach(template => {
      const parsed = parseCompleteTemplateContent(template)
      if (parsed) {
        templates.push(preserveOriginalTemplate ? { ...parsed, originalTemplate: template } : parsed)
      } else {
        incomplete.push(template)
      }
    })

  // Group templates by task type and group name
  const taskGroups = templates.reduce((groups, template) => {
    const version = template.id.split('-').pop()
    const appliesTo = template.appliesTo || []

    appliesTo.forEach((taskType) => {
      if (!groups[taskType]) {
        groups[taskType] = {}
      }
      const { groupName, templateName } = parseTemplateNameGroup(template.name)

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
        templateVersion: template.version,
        extern: externValue,
        tooltip: template.description ?? '',
        metaKeys: template.metaKeys,
        icon: template.icon?.contents ?? null
      })
    })
    return groups
  }, {})

  // Surface templates that couldn't be grouped instead of hiding them
  if (incomplete.length > 0) {
    console.warn('Element templates with invalid or incomplete content were not categorized:', incomplete.map(template => template.templateId))
    taskGroups[UNCATEGORIZED_TASK_TYPE] = {
      [UNCATEGORIZED_GROUP_NAME]: incomplete.map(template => ({
        name: template.name || template.templateId,
        // No parsed content exists for these (that's why they're here), so there's no `id` to
        // take a dash-suffix from the way normal entries do — `templateId` is the same business
        // key under a different name (see ElementTemplate's `@JsonAlias("id")`), so use that.
        version: template.templateId.split('-').pop(),
        // Same reason `template` is always the raw row here, unlike normal entries: there's no
        // parsed shape to offer instead, so `preserveOriginalTemplate` has nothing to toggle.
        template,
        id: template.templateId,
        templateVersion: template.version,
        extern: false,
        tooltip: template.description ?? '',
        metaKeys: undefined,
        icon: null,
        incomplete: true
      }))
    }
  }

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
