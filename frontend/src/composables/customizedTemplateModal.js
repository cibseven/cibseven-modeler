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
import { nextTick, ref } from 'vue'
import {  translateValue } from "../i18n.js"

export default function useCustomizedTemplateModal() {
  const containerModeler = ref(null)
  const elementTemplatesModal = ref(null)
  let modeler = null

  const addCustomizeTemplateButton = async e => {
    if(e.element.type !== 'bpmn:UserTask' && e.element.type !== 'bpmn:ServiceTask' && e.element.type !== 'bpmn:StartEvent') return
    await nextTick()
    const divElementTemplateNotFound = containerModeler.value.querySelector(
      `[data-group-id="group-ElementTemplates__Template"]`
    )
    if (!divElementTemplateNotFound) return
    const button = divElementTemplateNotFound.querySelector(
       '.bio-properties-panel-select-template-button'
    )
    if (!button) return
    const modalButton = document.createElement('button')
    const spanButton = document.createElement('span')
    spanButton.classList.add('mdi','mdi-18px', 'mdi-plus')
    modalButton.appendChild(spanButton)
    modalButton.classList.add('btn', 'border-0', 'shadow-0')
    spanButton.textContent = translateValue('Select')
    modalButton.onclick = () => {
      elementTemplatesModal.value.show(e)
    }
    button.replaceWith(modalButton)
  }

  const applyTemplateToTask = (selectedTemplateId, e) => {
    const elementRegistry = modeler.get('elementRegistry') // Obtener el registro de elementos
    // i have to take it directly from the modeler to be able to modify it
    const element = elementRegistry.get(e.element.id)
    const elementTemplates = modeler.get('elementTemplates')
    const specificTemplate = elementTemplates.getAll().find((t) => t.id === selectedTemplateId)
    elementTemplates.applyTemplate(element, specificTemplate)
  }

  const customizedModalElementTemplatesData = (
    modelerRef,
    containerModelerRef,
    elementTemplatesModalRef
  ) => {
    containerModeler.value = containerModelerRef.value
    elementTemplatesModal.value = elementTemplatesModalRef.value
    modeler = modelerRef

    const templates = modeler.get('elementTemplates').getAll()

    const taskGroups = templates.reduce((groups, template) => {
      const version = template.id.split('-').pop()
      const appliesTo = template.appliesTo || []

      appliesTo.forEach((taskType) => {
        if (!groups[taskType]) {
          groups[taskType] = {}
        }
        // extracts name before the first
        const splitTemplate = template.name.split(/-(.+)/)
        const templateName = splitTemplate.length>1 ? splitTemplate[1].split('(')[0] : splitTemplate[0].split('(')[0]
        const groupName = splitTemplate.length >1 ? splitTemplate[0] : 'undefined'
        // initializes the array of templates in case it doesnt exists for that name
        if (!groups[taskType][groupName]) {
          groups[taskType][groupName] = [] // groups by templates name
        }
        const findExtern = template?.properties.find(obj => obj?.label?.toLowerCase() === 'implementation type')
        const externValue = findExtern?.value === 'external' ? true : false

        //add the template to its corresponding group
        groups[taskType][groupName].push({
          name: templateName ?? template.name,
          template,
          id: template.id,
          version,
          extern: externValue,
          tooltip: template.description ?? '',
          metaKeys: template.metaKeys
        })
      })
      return groups
    }, {})

    for (const taskType in taskGroups) {
      for (const templateName in taskGroups[taskType]) {
        // order templates by name
        taskGroups[taskType][templateName].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      )}
      // order templates by name inside task types
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

  return {
    customizedModalElementTemplatesData,
    applyTemplateToTask,
    addCustomizeTemplateButton
  }
}
