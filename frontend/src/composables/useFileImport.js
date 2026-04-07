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
  getTagValueFromXml,
  getProcessKeyFromBpmn,
  checkCamundaVersion,
  compareXML,
  generateUniqueId,
} from '../utils.js'
import { DIAGRAM_TYPE } from '../constants/diagramTypes.js'

/**
 * Encapsulates file drag-and-drop / file-input handling and the conflict-resolution
 * flow for importing BPMN/DMN/Form files into the modeler.
 *
 * @param {object} deps
 * @param {object}   deps.store                      - Vuex store
 * @param {import('vue').Ref} deps.tabNavList         - from useTabManager
 * @param {import('vue').Ref} deps.tabNavListXml      - from useTabManager
 * @param {import('vue').Ref} deps.editorXML          - from useTabManager
 * @param {import('vue').ComputedRef} deps.processes  - computed list of BPMN/DMN processes
 * @param {import('vue').ComputedRef} deps.forms      - computed list of forms
 * @param {function} deps.showToastMessage            - (toastInfo) => void
 * @param {function} deps.openDiagramFromChild        - (xml, id, name, key, type, isSaved, canSave, replaceXml) => void
 * @param {import('vue').Ref} deps.showModalAcceptCancelMessage - reactive: { show, type }
 * @param {import('vue').Ref} deps.modalData          - reactive modal payload
 * @param {import('vue').Ref} deps.modelerTabNav      - ref to TabNav component instance
 * @param {function} deps.switchTabFromTabNav         - (index) => Promise<void>
 */
export default function useFileImport({
  store,
  tabNavList,
  tabNavListXml,
  editorXML,
  processes,
  forms,
  showToastMessage,
  openDiagramFromChild,
  showModalAcceptCancelMessage,
  modalData,
  modelerTabNav,
  switchTabFromTabNav,
}) {
  /** Returns the current XML for the tab matching processKey, or null if not open. */
  const _checkIfProcessOpenInTab = processKey => {
    const foundTabIndex = tabNavList.value.findIndex(
      tab => tab.key === processKey && tab.type !== DIAGRAM_TYPE.FORM
    )
    if (foundTabIndex > -1) return editorXML.value[foundTabIndex] ?? tabNavListXml.value[foundTabIndex]
    return null
  }

  /** Returns the current JSON for the tab matching formId, or null if not open. */
  const _checkIfFormOpenInTab = formId => {
    const foundTabIndex = tabNavList.value.findIndex(
      tab => tab.key === formId && tab.type === DIAGRAM_TYPE.FORM
    )
    if (foundTabIndex > -1) return tabNavListXml.value[foundTabIndex]
    return null
  }

  /**
   * Open a diagram that is not yet persisted in the database as a new unsaved tab.
   * Also returned so that CibsevenModeler can call it from the external-return flow.
   */
  const _addNewBpmnFromLoadedXml = (diagramType, xmlToLoad, foundExternalProcessKey) => {
    const keyOfTabNav = generateUniqueId()
    tabNavList.value.push({
      type: diagramType,
      name: foundExternalProcessKey,
      navId: foundExternalProcessKey,
      id: foundExternalProcessKey,
      key: foundExternalProcessKey,
      keyOfTabNav,
      canSave: true,
      isSaved: false,
      isModelerVisible: false,
      isPropertyPanelVisible: false,
      isEditorVisible: false,
    })
    switchTabFromTabNav(tabNavList.value.length - 1)
    tabNavListXml.value.push(xmlToLoad)
  }

  const _openFormFromImportedFile = async jsonExternal => {
    const jsonId = JSON.parse(jsonExternal)?.id
    const foundForm = forms.value.find(form => form.formId === jsonId)

    if (foundForm) {
      let jsonFromEditor = _checkIfFormOpenInTab(jsonId)
      if (!jsonFromEditor) {
        await store.dispatch('modeler/forms/fetchFormById', foundForm.id)
        jsonFromEditor = store.state.modeler.forms.formSelected
      }
      const foundTabIndex = tabNavList.value.findIndex(el => el.key === jsonId)
      modalData.value = {
        id: foundForm.id,
        name: jsonId,
        processkey: foundForm.formId,
        xmlFromModeler: jsonFromEditor,
        xmlExternalUrl: jsonExternal,
        diagramType: DIAGRAM_TYPE.FORM,
      }
      let jsonFromEditorStringify = JSON.stringify(JSON.parse(jsonFromEditor)).replace(/\\/g, '')
      const jsonExternalStringify = JSON.stringify(JSON.parse(jsonExternal))
      if (jsonFromEditorStringify.startsWith('"') && jsonFromEditorStringify.endsWith('"')) {
        jsonFromEditorStringify = jsonFromEditorStringify.slice(1, -1)
      }
      const isEqual = jsonFromEditorStringify === jsonExternalStringify

      if (!isEqual) {
        showModalAcceptCancelMessage.value.show = true
        showModalAcceptCancelMessage.value.type = DIAGRAM_TYPE.FORM
      } else {
        if (foundTabIndex > -1) {
          modelerTabNav.value.selectTab(foundTabIndex)
        } else {
          openDiagramFromChild(jsonExternal, foundForm.id, jsonId, jsonId, DIAGRAM_TYPE.FORM, true, false, false)
        }
      }
    } else {
      _addNewBpmnFromLoadedXml(DIAGRAM_TYPE.FORM, jsonExternal, jsonId)
    }
  }

  const _openProcessFromImportedFile = async (resXmlExternalUrl, fileName, fileNameWithExtension) => {
    let foundExternalProcessKey = getProcessKeyFromBpmn(resXmlExternalUrl) ?? fileName
    let diagramType = null

    if (fileNameWithExtension.endsWith('.dmn')) {
      foundExternalProcessKey = getTagValueFromXml(resXmlExternalUrl, 'definitions', 'id')
      diagramType = DIAGRAM_TYPE.DMN
    } else if (foundExternalProcessKey) {
      diagramType = checkCamundaVersion(resXmlExternalUrl)
    }

    const foundModelerProcess = processes.value.find(process => process.processkey === foundExternalProcessKey)

    if (foundModelerProcess) {
      let xmlFromModeler = _checkIfProcessOpenInTab(foundExternalProcessKey)
      if (!xmlFromModeler) {
        await store.dispatch('modeler/processes/fetchProcessById', foundModelerProcess.id)
        xmlFromModeler = store.state.modeler.processes.processSelected
      }
      if (!xmlFromModeler) {
        _addNewBpmnFromLoadedXml(diagramType, resXmlExternalUrl, foundExternalProcessKey)
        return
      }
      modalData.value = {
        id: foundModelerProcess.id,
        name: foundModelerProcess.name,
        processkey: foundExternalProcessKey,
        xmlFromModeler,
        xmlExternalUrl: resXmlExternalUrl,
        diagramType,
      }

      const isEqual = compareXML(xmlFromModeler, resXmlExternalUrl)
      if (isEqual) {
        openDiagramFromChild(resXmlExternalUrl, foundModelerProcess.id, foundModelerProcess.name, foundExternalProcessKey, diagramType, true, false, false)
      } else {
        showModalAcceptCancelMessage.value.show = true
        showModalAcceptCancelMessage.value.type = diagramType
      }
    } else {
      _addNewBpmnFromLoadedXml(diagramType, resXmlExternalUrl, foundExternalProcessKey)
    }
  }

  /** Handle a file drop or file-input change event. */
  const handleFile = e => {
    const files = e.dataTransfer?.files || e.target.files
    const file = files[0]
    if (!file || (!file.name.endsWith('.bpmn') && !file.name.endsWith('.dmn') && !file.name.endsWith('.form'))) {
      showToastMessage({ isSuccess: false, toastText: 'toastLoadErrorFileExtension' })
      return
    }

    const reader = new FileReader()
    reader.onload = e => {
      const fileContent = e.target.result
      if (file.name.endsWith('.form')) {
        _openFormFromImportedFile(fileContent)
      } else {
        const fileNameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.'))
        _openProcessFromImportedFile(fileContent, fileNameWithoutExtension, file.name)
      }
    }
    reader.readAsText(file)
  }

  return {
    handleFile,
    _addNewBpmnFromLoadedXml,
  }
}
