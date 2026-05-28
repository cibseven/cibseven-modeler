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
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getTagValueFromXml,
  getProcessKeyFromBpmn,
  checkCamundaVersion,
  compareXML,
  generateUniqueId,
} from '../utils.js'
import { DIAGRAM_TYPE } from '../constants/diagramTypes.js'
import { saveDiagramProcess, updateDiagramProcess } from '../services/processService.js'
import { saveForm, updateForm } from '../services/formService.js'

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
 * @param {import('vue').Ref} deps.showModalAcceptCancelMessage - reactive: { show, type, isBatch }
 * @param {import('vue').Ref} deps.modalData          - reactive modal payload
 * @param {import('vue').Ref} deps.modelerTabNav      - ref to TabNav component instance
 * @param {function} deps.switchTabFromTabNav         - (index) => Promise<void>
 * @param {function} [deps.onBatchComplete]           - () => Promise<void> — called after a batch import finishes
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
  onBatchComplete,
}) {
  const { t } = useI18n()

  // Holds the resolve fn of the currently pending conflict-modal Promise.
  // CibsevenModeler calls resolveConflict() after the modal accept/cancel callback fires.
  const _conflictResolve = ref(null)

  // 'replace' | 'skip' | null — set by "Apply to All" to skip subsequent modals in a batch.
  const _batchPolicy = ref(null)

  /**
   * Called by CibsevenModeler after the conflict modal is dismissed.
   * choice: 'replace' (accept) | 'skip' (cancel / backdrop)
   * applyAll: if true, stores choice as the policy for all remaining batch conflicts.
   */
  const resolveConflict = (choice = 'skip', applyAll = false) => {
    if (applyAll) _batchPolicy.value = choice
    _conflictResolve.value?.(choice)
    _conflictResolve.value = null
  }

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
   * Show the conflict modal and wait for the user to resolve it.
   * Returns 'replace' (accept) or 'skip' (cancel/backdrop).
   * In batch mode, skips the modal and returns the stored batchPolicy if already set.
   */
  const _awaitConflictModal = async (diagramType, isBatch = false) => {
    if (isBatch && _batchPolicy.value !== null) return _batchPolicy.value
    const conflictPromise = new Promise(resolve => { _conflictResolve.value = resolve })
    showModalAcceptCancelMessage.value = { show: true, type: diagramType, isBatch }
    return await conflictPromise
  }

  /**
   * Open a diagram that is not yet persisted in the database as a new unsaved tab.
   * autoSwitch controls whether to switch to the new tab immediately.
   * Also returned so that CibsevenModeler can call it from the external-return flow.
   */
  const _addNewBpmnFromLoadedXml = (diagramType, xmlToLoad, foundExternalProcessKey, autoSwitch = true) => {
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
    if (autoSwitch) switchTabFromTabNav(tabNavList.value.length - 1)
    tabNavListXml.value.push(xmlToLoad)
    return tabNavList.value.length - 1
  }

  /** Save a newly imported BPMN/DMN file to the database and mark its tab as saved. */
  const _autoSaveProcess = async (xml, processKey, diagramType) => {
    try {
      const blob = new Blob([xml], { type: 'text/xml' })
      const response = await saveDiagramProcess(processKey, processKey, blob, diagramType)
      if (response?.id) {
        const idx = tabNavList.value.findIndex(
          t => t.key === processKey && !t.isSaved && t.type !== DIAGRAM_TYPE.FORM
        )
        if (idx > -1) {
          tabNavList.value[idx].id = response.id
          tabNavList.value[idx].isSaved = true
          tabNavList.value[idx].canSave = false
        }
      }
    } catch { /* leave tab as unsaved on save failure */ }
  }

  /** Save a newly imported Form file to the database and mark its tab as saved. */
  const _autoSaveForm = async (jsonString, formId) => {
    try {
      const response = await saveForm(formId, JSON.parse(jsonString))
      if (response?.id) {
        const idx = tabNavList.value.findIndex(
          t => t.key === formId && !t.isSaved && t.type === DIAGRAM_TYPE.FORM
        )
        if (idx > -1) {
          tabNavList.value[idx].id = response.id
          tabNavList.value[idx].isSaved = true
          tabNavList.value[idx].canSave = false
        }
      }
    } catch { /* leave tab as unsaved on save failure */ }
  }

  /** Overwrite an existing BPMN/DMN record in the database (batch replace). */
  const _autoUpdateProcess = async (xml, id, processKey, diagramType) => {
    try {
      const blob = new Blob([xml], { type: 'text/xml' })
      await updateDiagramProcess(id, processKey, processKey, blob, diagramType)
    } catch { /* leave unchanged on failure */ }
  }

  /** Overwrite an existing Form record in the database (batch replace). */
  const _autoUpdateForm = async (jsonString, id, formId) => {
    try {
      await updateForm(id, formId, JSON.parse(jsonString))
    } catch { /* leave unchanged on failure */ }
  }

  const _openFormFromImportedFile = async (jsonExternal, isBatch = false) => {
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
        const choice = await _awaitConflictModal(DIAGRAM_TYPE.FORM, isBatch)
        if (isBatch && choice === 'replace') {
          await _autoUpdateForm(jsonExternal, foundForm.id, jsonId)
        }
      } else {
        if (!isBatch) {
          if (foundTabIndex > -1) {
            modelerTabNav.value.selectTab(foundTabIndex)
          } else {
            openDiagramFromChild(jsonExternal, foundForm.id, jsonId, jsonId, DIAGRAM_TYPE.FORM, true, false, false)
          }
        }
      }
    } else {
      // Check for unsaved-tab conflict (re-import of a tab already open)
      const unsavedJson = _checkIfFormOpenInTab(jsonId)
      if (unsavedJson !== null) {
        modalData.value = {
          id: jsonId,
          name: jsonId,
          processkey: jsonId,
          xmlFromModeler: unsavedJson,
          xmlExternalUrl: jsonExternal,
          diagramType: DIAGRAM_TYPE.FORM,
        }
        let unsavedStringify = JSON.stringify(JSON.parse(unsavedJson)).replace(/\\/g, '')
        const importedStringify = JSON.stringify(JSON.parse(jsonExternal))
        if (unsavedStringify.startsWith('"') && unsavedStringify.endsWith('"')) {
          unsavedStringify = unsavedStringify.slice(1, -1)
        }
        const isEqual = unsavedStringify === importedStringify
        if (isEqual) {
          if (!isBatch) {
            const idx = tabNavList.value.findIndex(t => t.key === jsonId && t.type === DIAGRAM_TYPE.FORM)
            if (idx > -1) modelerTabNav.value.selectTab(idx)
          }
        } else {
          const choice = await _awaitConflictModal(DIAGRAM_TYPE.FORM, isBatch)
          if (isBatch && choice === 'replace') {
            const idx = tabNavList.value.findIndex(t => t.key === jsonId && t.type === DIAGRAM_TYPE.FORM)
            if (idx > -1) tabNavListXml.value[idx] = jsonExternal
          }
        }
      } else {
        // Truly new form
        _addNewBpmnFromLoadedXml(DIAGRAM_TYPE.FORM, jsonExternal, jsonId, !isBatch)
        await _autoSaveForm(jsonExternal, jsonId)
      }
    }
  }

  const _openProcessFromImportedFile = async (resXmlExternalUrl, fileName, fileNameWithExtension, isBatch = false) => {
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
        _addNewBpmnFromLoadedXml(diagramType, resXmlExternalUrl, foundExternalProcessKey, !isBatch)
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
        if (!isBatch) openDiagramFromChild(resXmlExternalUrl, foundModelerProcess.id, foundModelerProcess.name, foundExternalProcessKey, diagramType, true, false, false)
      } else {
        const choice = await _awaitConflictModal(diagramType, isBatch)
        if (isBatch && choice === 'replace') {
          await _autoUpdateProcess(resXmlExternalUrl, foundModelerProcess.id, foundExternalProcessKey, diagramType)
        }
      }
    } else {
      // Check for unsaved-tab conflict (re-import of a tab already open)
      const unsavedXml = _checkIfProcessOpenInTab(foundExternalProcessKey)
      if (unsavedXml !== null) {
        modalData.value = {
          id: foundExternalProcessKey,
          name: foundExternalProcessKey,
          processkey: foundExternalProcessKey,
          xmlFromModeler: unsavedXml,
          xmlExternalUrl: resXmlExternalUrl,
          diagramType,
        }
        const isEqual = compareXML(unsavedXml, resXmlExternalUrl)
        if (isEqual) {
          if (!isBatch) {
            const idx = tabNavList.value.findIndex(t => t.key === foundExternalProcessKey && t.type !== DIAGRAM_TYPE.FORM)
            if (idx > -1) modelerTabNav.value.selectTab(idx)
          }
        } else {
          const choice = await _awaitConflictModal(diagramType, isBatch)
          if (isBatch && choice === 'replace') {
            const idx = tabNavList.value.findIndex(t => t.key === foundExternalProcessKey && t.type !== DIAGRAM_TYPE.FORM)
            if (idx > -1) tabNavListXml.value[idx] = resXmlExternalUrl
          }
        }
      } else {
        // Truly new process
        _addNewBpmnFromLoadedXml(diagramType, resXmlExternalUrl, foundExternalProcessKey, !isBatch)
        await _autoSaveProcess(resXmlExternalUrl, foundExternalProcessKey, diagramType)
      }
    }
  }

  /** Handle a file drop or file-input change event — supports single and multiple files. */
  const handleFile = async e => {
    const files = Array.from(e.dataTransfer?.files || e.target.files)
    if (!files.length) return

    const isBatch = files.length > 1
    if (isBatch) _batchPolicy.value = null

    let imported = 0
    const invalidNames = []

    for (const file of files) {
      const validExt = file.name.endsWith('.bpmn') || file.name.endsWith('.dmn') || file.name.endsWith('.form')
      if (!validExt) {
        invalidNames.push(file.name)
        continue
      }
      try {
        await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onerror = reject
          reader.onload = async evt => {
            try {
              const content = evt.target.result
              if (file.name.endsWith('.form')) {
                await _openFormFromImportedFile(content, isBatch)
              } else {
                const base = file.name.substring(0, file.name.lastIndexOf('.'))
                await _openProcessFromImportedFile(content, base, file.name, isBatch)
              }
              resolve()
            } catch (err) { reject(err) }
          }
          reader.readAsText(file)
        })
        imported++
      } catch {
        invalidNames.push(file.name)
      }
    }

    if (isBatch && onBatchComplete) await onBatchComplete()

    if (!isBatch) {
      // Single-file: success opens a tab silently; only toast on invalid extension.
      if (invalidNames.length) {
        showToastMessage({ isSuccess: false, toastText: 'toastLoadErrorFileExtension' })
      }
    } else {
      // Batch: one summary toast
      const failed = files.length - imported
      if (failed === 0) {
        showToastMessage({
          isSuccess: true,
          toastText: 'toastImportBatchSuccess',
          bodyTextAlt: t('toastImportBatchSuccess.body', { count: imported }),
        })
      } else {
        showToastMessage({
          isSuccess: imported > 0,
          toastText: 'toastImportBatchPartial',
          bodyTextAlt: t('toastImportBatchPartial.body', { imported, total: files.length }),
        })
      }
    }
  }

  return {
    handleFile,
    _addNewBpmnFromLoadedXml,
    resolveConflict,
  }
}
