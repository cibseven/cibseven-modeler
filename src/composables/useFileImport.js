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
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getTagValueFromXml,
  getProcessKeyFromBpmn,
  checkCamundaVersion,
  compareXML,
  generateUniqueId,
  setTagValueOfXml,
} from '../utils.js'
import { DIAGRAM_TYPE } from '../constants/diagramTypes.js'
import { saveDiagramProcess, updateDiagramProcess, getUnifiedDiagrams } from '../services/processService.js'
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
  nextModalHiddenPromise,
  updateDiagramXml,
}) {
  const { t } = useI18n()

  // Holds the resolve fn of the currently pending conflict-modal Promise.
  // CibsevenModeler calls resolveConflict() after the modal accept/cancel callback fires.
  const _conflictResolve = ref(null)

  // Promise that resolves when the previous conflict modal finishes its hide animation.
  // Prevents Bootstrap from ignoring show() called while a hide is still in progress.
  let _prevHidePromise = null

  // 'replace' | 'skip' | null — set by "Apply to All" to skip subsequent modals in a batch.
  const _batchPolicy = ref(null)

  /**
   * Called by CibsevenModeler after the conflict modal is dismissed.
   * choice: 'replace' (accept) | 'skip' (cancel / backdrop) | 'rename'
   * applyAll: if true, stores choice as the policy for all remaining batch conflicts.
   * payload: optional extra data, e.g. { newKey } for rename.
   */
  const resolveConflict = (choice = 'skip', applyAll = false, payload = null) => {
    if (applyAll) _batchPolicy.value = choice
    _conflictResolve.value?.({ choice, payload })
    _conflictResolve.value = null
  }

  /** Returns the current XML for the tab matching processKey, or null if not open.
   *  Only returns the tab XML if the tab has unsaved edits (canSave = true).
   *  When the tab is open but clean, returning null causes the caller to fetch
   *  the DB version instead — avoiding false conflicts from bpmn-js XML normalisation. */
  const _checkIfProcessOpenInTab = processKey => {
    const foundTabIndex = tabNavList.value.findIndex(
      tab => tab.key === processKey && tab.type !== DIAGRAM_TYPE.FORM
    )
    if (foundTabIndex > -1 && tabNavList.value[foundTabIndex].canSave)
      return editorXML.value[foundTabIndex] ?? tabNavListXml.value[foundTabIndex]
    return null
  }

  /** Returns the current JSON for the tab matching formId, or null if not open.
   *  Only returns tab JSON when canSave = true (unsaved edits present). */
  const _checkIfFormOpenInTab = formId => {
    const foundTabIndex = tabNavList.value.findIndex(
      tab => tab.key === formId && tab.type === DIAGRAM_TYPE.FORM
    )
    // Prefer the live editor content (editorXML) over the originally-loaded snapshot
    // so a conflict reflects the user's current unsaved edits — mirrors the process check.
    if (foundTabIndex > -1 && tabNavList.value[foundTabIndex].canSave)
      return editorXML.value[foundTabIndex] ?? tabNavListXml.value[foundTabIndex]
    return null
  }

  /**
   * Normalize any form representation to a canonical compact JSON string for
   * comparison. Handles a plain object, a JSON string, or the double-encoded
   * JSON string that the forms store produces (JSON.stringify of an already
   * stringified value). Unwraps up to a few levels until it reaches the object.
   */
  const _canonicalFormJson = val => {
    let v = val
    for (let i = 0; i < 3 && typeof v === 'string'; i++) {
      try { v = JSON.parse(v) } catch { break }
    }
    try { return JSON.stringify(v) } catch { return String(val) }
  }

  /**
   * Show the conflict modal and wait for the user to resolve it.
   * Returns { choice, payload } where choice is 'replace' | 'skip' | 'rename'.
   * In batch mode, skips the modal and returns the stored batchPolicy if already set.
   */
  const _awaitConflictModal = async (diagramType, isBatch = false) => {
    if (isBatch && _batchPolicy.value !== null) return { choice: _batchPolicy.value, payload: null }
    // Wait for the previous modal's hide animation before showing the next one.
    // (Bootstrap ignores show() called while a hide is still in progress.)
    if (_prevHidePromise) { await _prevHidePromise; _prevHidePromise = null }
    // Register a promise for when THIS modal eventually hides — the next call will await it.
    if (nextModalHiddenPromise) _prevHidePromise = nextModalHiddenPromise()
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
      const isEqual = _canonicalFormJson(jsonFromEditor) === _canonicalFormJson(jsonExternal)

      if (!isEqual) {
        const { choice, payload } = await _awaitConflictModal(DIAGRAM_TYPE.FORM, isBatch)
        if (choice === 'replace') {
          await _autoUpdateForm(jsonExternal, foundForm.id, jsonId)
          const openIdx = tabNavList.value.findIndex(t => t.key === jsonId && t.type === DIAGRAM_TYPE.FORM)
          if (openIdx > -1) {
            // updateDiagramXml -> _validate -> importJson updates the form's `json` closure
            // synchronously, so a tab switch re-inits the editor with the new content.
            updateDiagramXml?.(jsonExternal, openIdx, false, DIAGRAM_TYPE.FORM)
            await nextTick()
            tabNavList.value[openIdx].isSaved = true
            tabNavList.value[openIdx].canSave = false
            if (!isBatch) await switchTabFromTabNav(openIdx)
          }
          return true
        } else if (choice === 'rename' && payload?.newKey) {
          const renamedJson = JSON.stringify({ ...JSON.parse(jsonExternal), id: payload.newKey })
          if (!isBatch) _addNewBpmnFromLoadedXml(DIAGRAM_TYPE.FORM, renamedJson, payload.newKey, true)
          await _autoSaveForm(renamedJson, payload.newKey)
          return true
        }
      } else {
        if (!isBatch) {
          if (foundTabIndex > -1) {
            modelerTabNav.value.selectTab(foundTabIndex)
          } else {
            openDiagramFromChild(jsonExternal, foundForm.id, jsonId, jsonId, DIAGRAM_TYPE.FORM, true, false, false)
          }
        }
        return 'unchanged'
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
        const isEqual = _canonicalFormJson(unsavedJson) === _canonicalFormJson(jsonExternal)
        if (isEqual) {
          if (!isBatch) {
            const idx = tabNavList.value.findIndex(t => t.key === jsonId && t.type === DIAGRAM_TYPE.FORM)
            if (idx > -1) modelerTabNav.value.selectTab(idx)
          }
          return 'unchanged'
        } else {
          const { choice } = await _awaitConflictModal(DIAGRAM_TYPE.FORM, isBatch)
          if (isBatch && choice === 'replace') {
            const idx = tabNavList.value.findIndex(t => t.key === jsonId && t.type === DIAGRAM_TYPE.FORM)
            if (idx > -1) tabNavListXml.value[idx] = jsonExternal
          }
        }
      } else {
        // Truly new form
        if (isBatch && _batchPolicy.value === 'stop') return false
        if (!isBatch) _addNewBpmnFromLoadedXml(DIAGRAM_TYPE.FORM, jsonExternal, jsonId, true)
        await _autoSaveForm(jsonExternal, jsonId)
        return true
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

    let foundModelerProcess = processes.value.find(process => process.processkey === foundExternalProcessKey)
    if (!foundModelerProcess) {
      try {
        const results = await getUnifiedDiagrams(0, 1, foundExternalProcessKey, '')
        foundModelerProcess = results?.find(p => p.processkey === foundExternalProcessKey) ?? null
      } catch { /* fall through to new-process path */ }
    }

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
        return 'unchanged'
      } else {
        const { choice, payload } = await _awaitConflictModal(diagramType, isBatch)
        if (choice === 'replace') {
          await _autoUpdateProcess(resXmlExternalUrl, foundModelerProcess.id, foundExternalProcessKey, diagramType)
          const openIdx = tabNavList.value.findIndex(t => t.key === foundExternalProcessKey && t.type !== DIAGRAM_TYPE.FORM)
          if (openIdx > -1) {
            updateDiagramXml?.(resXmlExternalUrl, openIdx, false, diagramType)
            // Wait for bpmn-js commandStack.changed to fire (it sets canSave=true), then override back to saved state
            await nextTick()
            tabNavList.value[openIdx].isSaved = true
            tabNavList.value[openIdx].canSave = false
            if (!isBatch) await switchTabFromTabNav(openIdx)
          }
          return true
        } else if (choice === 'rename' && payload?.newKey) {
          let renamedXml = resXmlExternalUrl
          if (diagramType === DIAGRAM_TYPE.DMN) {
            renamedXml = setTagValueOfXml(renamedXml, 'definitions', 'id', payload.newKey)
          } else {
            if (getTagValueFromXml(renamedXml, 'collaboration', 'id'))
              renamedXml = setTagValueOfXml(renamedXml, 'collaboration', 'id', payload.newKey)
            renamedXml = setTagValueOfXml(renamedXml, 'process', 'id', payload.newKey)
          }
          if (!isBatch) _addNewBpmnFromLoadedXml(diagramType, renamedXml, payload.newKey, true)
          await _autoSaveProcess(renamedXml, payload.newKey, diagramType)
          return true
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
          return 'unchanged'
        } else {
          const { choice } = await _awaitConflictModal(diagramType, isBatch)
          if (isBatch && choice === 'replace') {
            const idx = tabNavList.value.findIndex(t => t.key === foundExternalProcessKey && t.type !== DIAGRAM_TYPE.FORM)
            if (idx > -1) tabNavListXml.value[idx] = resXmlExternalUrl
          }
        }
      } else {
        // Truly new process
        if (isBatch && _batchPolicy.value === 'stop') return false
        if (!isBatch) _addNewBpmnFromLoadedXml(diagramType, resXmlExternalUrl, foundExternalProcessKey, true)
        await _autoSaveProcess(resXmlExternalUrl, foundExternalProcessKey, diagramType)
        return true
      }
    }
  }

  /** Handle a file drop or file-input change event — supports single and multiple files. */
  const handleFile = async e => {
    const files = Array.from(e.dataTransfer?.files || e.target.files)
    if (!files.length) return

    const isBatch = files.length > 1
    _batchPolicy.value = null

    let imported = 0
    let savedCount = 0
    let unchangedCount = 0
    const invalidNames = []

    for (const file of files) {
      if (isBatch && _batchPolicy.value === 'stop') break
      const validExt = file.name.endsWith('.bpmn') || file.name.endsWith('.dmn') || file.name.endsWith('.form')
      if (!validExt) {
        invalidNames.push(file.name)
        continue
      }
      try {
        let didSave = false
        await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onerror = reject
          reader.onload = async evt => {
            try {
              const content = evt.target.result
              if (file.name.endsWith('.form')) {
                didSave = await _openFormFromImportedFile(content, isBatch) ?? false
              } else {
                const base = file.name.substring(0, file.name.lastIndexOf('.'))
                didSave = await _openProcessFromImportedFile(content, base, file.name, isBatch) ?? false
              }
              resolve()
            } catch (err) { reject(err) }
          }
          reader.readAsText(file)
        })
        imported++
        if (didSave === true) savedCount++
        else if (didSave === 'unchanged') unchangedCount++
      } catch {
        invalidNames.push(file.name)
      }
    }

    if (savedCount > 0 && onBatchComplete) await onBatchComplete()

    if (!isBatch) {
      // Single-file: success opens a tab silently; only toast on invalid extension.
      if (invalidNames.length) {
        showToastMessage({ isSuccess: false, toastText: 'toastLoadErrorFileExtension' })
      }
    } else {
      // Batch: compose a summary from all non-zero outcome counts
      // skippedCount covers both user-skipped conflicts AND files not reached due to "Cancel remaining"
      const validTotal = files.length - invalidNames.length
      const skippedCount = validTotal - savedCount - unchangedCount
      const parts = []
      if (savedCount > 0) parts.push(t('importSummary.imported', { count: savedCount }))
      if (unchangedCount > 0) parts.push(t('importSummary.upToDate', { count: unchangedCount }))
      if (skippedCount > 0) parts.push(t('importSummary.skipped', { count: skippedCount }))
      if (invalidNames.length > 0) parts.push(t('importSummary.failed', { count: invalidNames.length }))
      showToastMessage({
        isSuccess: savedCount > 0 || unchangedCount > 0,
        toastText: 'toastImportBatch',
        bodyTextAlt: parts.join(', ') + '.',
      })
    }
  }

  return {
    handleFile,
    _addNewBpmnFromLoadedXml,
    resolveConflict,
  }
}
