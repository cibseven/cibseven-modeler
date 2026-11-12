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
  compareXML,
  generateUniqueId,
  rekeyXml,
} from '../utils.js'
import { DIAGRAM_TYPE } from '../constants/diagramTypes.js'
import { saveDiagramProcess, updateDiagramProcess, fetchProcessByKey } from '../services/processService.js'
import { saveForm, updateForm, fetchFormByFormId } from '../services/formService.js'
import { folderErrorMessage } from '../utils/folderErrors.js'
import { errorReason } from '../utils/toast.js'

/** The file was read, but the backend did not store it: reported as not saved, not as unreadable. */
class ImportSaveError extends Error {
  name = 'ImportSaveError'

  /** No answer at all (the backend is not reachable): the files after it would fail the same way. */
  get unreachable() {
    return !!this.cause && !this.cause.response
  }
}

/** How many failed file names a batch summary lists before it says how many more there are. */
const NAMES_LISTED = 3

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
 * @param {function} deps.openDiagramFromChild        - (xml, id, name, key, type, isSaved, canSave, replaceXml, folderId) => void
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
  // The folder the import goes into, pinned by the caller for as long as it runs
  importFolderId,
  // (folderId) => folder name, so a conflict can say where the model it found lives
  folderNameFor,
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

  /**
   * What is stored is what opens, and it stays in its own folder. Without this the import of a
   * file that is already there looks like it went nowhere, least of all into the folder asked for.
   */
  const _sayItIsAlreadyStored = (name, folderId) => {
    const folder = folderNameFor?.(folderId)
    showToastMessage({
      isSuccess: true,
      toastText: 'toastImportExists',
      bodyTextAlt: folder
        ? t('toastImportExists.bodyInFolder', { name, folder })
        : t('toastImportExists.body', { name }),
    })
  }

  // A key is unique within a folder only, so a tab is matched by the model it holds: a stored
  // model by its id, and one not stored yet by its key, its kind and the folder it goes into
  const _tabOfStored = id => tabNavList.value.findIndex(tab => tab.isSaved && tab.id === id)

  const _unsavedTab = (key, isForm) => tabNavList.value.findIndex(tab =>
    !tab.isSaved && tab.key === key && (tab.type === DIAGRAM_TYPE.FORM) === isForm
    && (tab.folderId ?? null) === (importFolderId?.value ?? null))

  /** The content of that tab when it has unsaved edits (canSave = true), or null.
   *  A clean tab answers null, so the caller fetches the DB version instead — avoiding
   *  false conflicts from bpmn-js XML normalisation. The live editor content comes first,
   *  so a conflict reflects the user's current edits. */
  const _editedContent = index => index > -1 && tabNavList.value[index].canSave
    ? editorXML.value[index] ?? tabNavListXml.value[index]
    : null

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
   * Also returned so that CibsevenModeler can call it from the external-return flow, which names its own folder.
   */
  const _addNewBpmnFromLoadedXml = (diagramType, xmlToLoad, foundExternalProcessKey, autoSwitch = true, folderId = importFolderId?.value) => {
    const keyOfTabNav = generateUniqueId()
    tabNavList.value.push({
      type: diagramType,
      name: foundExternalProcessKey,
      navId: foundExternalProcessKey,
      id: foundExternalProcessKey,
      key: foundExternalProcessKey,
      keyOfTabNav,
      // An import opens a tab first and is stored when it is saved: without this the save
      // names no folder and the backend files it under the default one
      folderId,
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

  /**
   * The reason the backend refused: in the user's words where the refusal is a known one. A refusal
   * of the modeler that is not known names the field first ({ type, params: [field, reason] }), which
   * says nothing to the user: then there is no reason rather than a field name.
   */
  const _refusalReason = error => {
    const refusal = folderErrorMessage(error)
    if (refusal) return t(refusal.key, refusal.params)
    const data = error?.response?.data
    if (data?.type && (data.params?.length ?? 0) > 1) return ''
    return errorReason(error)
  }

  /** Runs a save or update; a refusal becomes an ImportSaveError, so the file is reported as not saved. */
  const _store = async request => {
    try {
      return await request()
    } catch (error) {
      console.error('Import could not be saved:', error)
      throw new ImportSaveError(_refusalReason(error), { cause: error })
    }
  }

  /** Mark the tab of a newly stored import as saved. */
  const _markStored = (idx, id) => {
    if (idx < 0) return
    tabNavList.value[idx].id = id
    tabNavList.value[idx].isSaved = true
    tabNavList.value[idx].canSave = false
  }

  /** Save a newly imported BPMN/DMN file to the database and mark its tab as saved. Throws when it is not stored. */
  const _autoSaveProcess = async (xml, processKey, diagramType) => {
    const blob = new Blob([xml], { type: 'text/xml' })
    const response = await _store(() => saveDiagramProcess(processKey, processKey, blob, diagramType, importFolderId?.value))
    // An answer without an id stored nothing either; the tab stays unsaved, so Save can still store it
    if (!response?.id) throw new ImportSaveError('')
    _markStored(_unsavedTab(processKey, false), response.id)
  }

  /** Save a newly imported Form file to the database and mark its tab as saved. Throws when it is not stored. */
  const _autoSaveForm = async (jsonString, formId) => {
    // Parsed first: a file that is no JSON is unreadable, not refused by the backend
    const json = JSON.parse(jsonString)
    const response = await _store(() => saveForm(formId, json, importFolderId?.value))
    if (!response?.id) throw new ImportSaveError('')
    _markStored(_unsavedTab(formId, true), response.id)
  }

  /** Overwrite an existing BPMN/DMN record in the database (replace). Throws when it is not updated. */
  const _autoUpdateProcess = async (xml, id, processKey, diagramType) => {
    const blob = new Blob([xml], { type: 'text/xml' })
    await _store(() => updateDiagramProcess(id, processKey, processKey, blob, diagramType))
  }

  /** Overwrite an existing Form record in the database (replace). Throws when it is not updated. */
  const _autoUpdateForm = async (jsonString, id, formId) => {
    const json = JSON.parse(jsonString)
    await _store(() => updateForm(id, formId, json))
  }

  /**
   * Replace: update the stored model, then show the import in its tab when one is open. After a
   * failed update that tab shows the import with unsaved changes, so Save can store it later. A single
   * file always has that tab, as accepting the conflict dialog opens it; in a batch only a model the
   * user had open has one, and for the rest the summary names the file to import again.
   */
  const _replaceStored = async (update, openIdx, content, diagramType, isBatch) => {
    let failure = null
    try {
      await update()
    } catch (error) {
      if (!(error instanceof ImportSaveError)) throw error
      failure = error
    }
    if (openIdx > -1) {
      updateDiagramXml?.(content, openIdx, false, diagramType)
      // Wait for the editor's change event (it sets canSave=true), then set the state that holds
      await nextTick()
      tabNavList.value[openIdx].isSaved = true
      tabNavList.value[openIdx].canSave = !!failure
      if (!isBatch) await switchTabFromTabNav(openIdx)
    }
    if (failure) throw failure
  }

  const _openFormFromImportedFile = async (jsonExternal, isBatch = false) => {
    const jsonId = JSON.parse(jsonExternal)?.id
    // A form id is unique within a folder, so only a form in the one the import goes into
    // collides; the loaded list may not hold all of it, so the backend is asked too
    const folderId = importFolderId?.value ?? null
    let foundForm = forms.value?.find(form => form.formId === jsonId && form.folderId === folderId)
    if (!foundForm) foundForm = await _findFormRemotely(jsonId, folderId)

    if (foundForm) {
      const foundTabIndex = _tabOfStored(foundForm.id)
      let jsonFromEditor = _editedContent(foundTabIndex)
      if (!jsonFromEditor) {
        await store.dispatch('modeler/forms/fetchFormById', foundForm.id)
        jsonFromEditor = store.state.modeler.forms.formSelected
      }
      modalData.value = {
        id: foundForm.id,
        name: jsonId,
        processkey: foundForm.formId,
        xmlFromModeler: jsonFromEditor,
        xmlExternalUrl: jsonExternal,
        diagramType: DIAGRAM_TYPE.FORM,
        folderName: folderNameFor?.(foundForm.folderId) ?? null,
      }
      const isEqual = _canonicalFormJson(jsonFromEditor) === _canonicalFormJson(jsonExternal)

      if (!isEqual) {
        const { choice, payload } = await _awaitConflictModal(DIAGRAM_TYPE.FORM, isBatch)
        if (choice === 'replace') {
          // updateDiagramXml -> _validate -> importJson updates the form's `json` closure
          // synchronously, so a tab switch re-inits the editor with the new content.
          // Looked up again: accepting the conflict dialog may have opened the tab
          await _replaceStored(() => _autoUpdateForm(jsonExternal, foundForm.id, jsonId), _tabOfStored(foundForm.id), jsonExternal, DIAGRAM_TYPE.FORM, isBatch)
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
            // The stored form knows the folder a tab kept from before does not
            tabNavList.value[foundTabIndex].folderId = foundForm.folderId
            modelerTabNav.value.selectTab(foundTabIndex)
          } else {
            openDiagramFromChild(jsonExternal, foundForm.id, jsonId, jsonId, DIAGRAM_TYPE.FORM, true, false, false, foundForm.folderId)
          }
          _sayItIsAlreadyStored(jsonId, foundForm.folderId)
        }
        return 'unchanged'
      }
    } else {
      // Check for unsaved-tab conflict (re-import of a tab already open)
      const unsavedJson = _editedContent(_unsavedTab(jsonId, true))
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
            const idx = _unsavedTab(jsonId, true)
            if (idx > -1) modelerTabNav.value.selectTab(idx)
          }
          return 'unchanged'
        } else {
          const { choice } = await _awaitConflictModal(DIAGRAM_TYPE.FORM, isBatch)
          if (choice === 'replace') {
            const idx = _unsavedTab(jsonId, true)
            if (idx > -1) {
              // Overwrite the unsaved tab with the imported content through the editor:
              // updateDiagramXml -> _validate re-imports it. cansave=null leaves the tab
              // in its unsaved state (a re-import doesn't persist it to the DB).
              updateDiagramXml?.(jsonExternal, idx, null, DIAGRAM_TYPE.FORM)
              await nextTick()
              if (!isBatch) await switchTabFromTabNav(idx)
            }
            return 'replaced'
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

  /**
   * The stored diagram with that key in the folder, or null. Asked of the backend by exact key
   * rather than searched: key and folder are what the unique constraint is on, so a near match
   * is not a conflict. Without a folder the backend picks one, and refuses a key it holds already.
   */
  const _findProcessRemotely = async (key, folderId) => {
    if (!folderId) return null
    try {
      return await fetchProcessByKey(key, folderId)
    } catch (e) {
      // Only a 404 answers the question. Reading any other failure as "nothing there" would
      // import a second diagram under a key the database then refuses
      if (e?.response?.status === 404) return null
      // The file is fine, the backend could not be asked: nothing is stored, as with a refused save
      throw new ImportSaveError(t('importErrors.lookupFailed'), { cause: e })
    }
  }

  const _findFormRemotely = async (formId, folderId) => {
    if (!folderId) return null
    try {
      return await fetchFormByFormId(formId, folderId)
    } catch (e) {
      if (e?.response?.status === 404) return null
      throw new ImportSaveError(t('importErrors.lookupFailed'), { cause: e })
    }
  }

  // A valid extension is not enough: an empty or malformed file (no <definitions>)
  // would otherwise open as a broken tab that only fails later with a console-only
  // "no definitions loaded" on save. Reject it here so handleFile surfaces a load error.
  const _diagramProblem = xml => {
    if (!xml || !xml.trim()) return t('importErrors.empty')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return t('importErrors.notXml')
    if (!doc.querySelector('*|definitions')) return t('importErrors.noDefinitions')
    return null
  }

  const _openProcessFromImportedFile = async (resXmlExternalUrl, fileName, fileNameWithExtension, isBatch = false) => {
    const problem = _diagramProblem(resXmlExternalUrl)
    if (problem) throw new Error(problem)
    let foundExternalProcessKey = getProcessKeyFromBpmn(resXmlExternalUrl) ?? fileName
    let diagramType = null

    if (fileNameWithExtension.endsWith('.dmn')) {
      foundExternalProcessKey = getTagValueFromXml(resXmlExternalUrl, 'definitions', 'id') ?? fileName
      diagramType = DIAGRAM_TYPE.DMN
    } else if (foundExternalProcessKey) {
      diagramType = DIAGRAM_TYPE.BPMN_C7
    }

    // A process key is unique within a folder, so only a diagram in the one the import goes into
    // collides; the loaded list may not hold all of it, so the backend is asked too
    const folderId = importFolderId?.value ?? null
    let foundModelerProcess = processes.value?.find(process => process.processkey === foundExternalProcessKey && process.folderId === folderId)
    if (!foundModelerProcess) foundModelerProcess = await _findProcessRemotely(foundExternalProcessKey, folderId)

    if (foundModelerProcess) {
      let xmlFromModeler = _editedContent(_tabOfStored(foundModelerProcess.id))
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
        folderId: foundModelerProcess.folderId ?? null,
        folderName: folderNameFor?.(foundModelerProcess.folderId) ?? null,
      }
      const isEqual = compareXML(xmlFromModeler, resXmlExternalUrl)
      if (isEqual) {
        if (!isBatch) {
          openDiagramFromChild(resXmlExternalUrl, foundModelerProcess.id, foundModelerProcess.name, foundExternalProcessKey, diagramType, true, false, false, foundModelerProcess.folderId)
          _sayItIsAlreadyStored(foundModelerProcess.name ?? foundExternalProcessKey, foundModelerProcess.folderId)
        }
        return 'unchanged'
      } else {
        const { choice, payload } = await _awaitConflictModal(diagramType, isBatch)
        if (choice === 'replace') {
          await _replaceStored(
            () => _autoUpdateProcess(resXmlExternalUrl, foundModelerProcess.id, foundExternalProcessKey, diagramType),
            _tabOfStored(foundModelerProcess.id), resXmlExternalUrl, diagramType, isBatch)
          return true
        } else if (choice === 'rename' && payload?.newKey) {
          const renamedXml = rekeyXml(resXmlExternalUrl, payload.newKey, diagramType === DIAGRAM_TYPE.DMN)
          if (!isBatch) _addNewBpmnFromLoadedXml(diagramType, renamedXml, payload.newKey, true)
          await _autoSaveProcess(renamedXml, payload.newKey, diagramType)
          return true
        }
      }
    } else {
      // Check for unsaved-tab conflict (re-import of a tab already open)
      const unsavedXml = _editedContent(_unsavedTab(foundExternalProcessKey, false))
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
            const idx = _unsavedTab(foundExternalProcessKey, false)
            if (idx > -1) modelerTabNav.value.selectTab(idx)
          }
          return 'unchanged'
        } else {
          const { choice } = await _awaitConflictModal(diagramType, isBatch)
          if (choice === 'replace') {
            const idx = _unsavedTab(foundExternalProcessKey, false)
            if (idx > -1) {
              // Overwrite the unsaved tab with the imported content through the editor:
              // updateDiagramXml -> _validate re-imports it. cansave=null leaves the tab
              // in its unsaved state (a re-import doesn't persist it to the DB).
              updateDiagramXml?.(resXmlExternalUrl, idx, null, diagramType)
              await nextTick()
              if (!isBatch) await switchTabFromTabNav(idx)
            }
            return 'replaced'
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

  // The first few names, then how many more: a summary of a hundred failures stays readable
  const _listedNames = names => names.length > NAMES_LISTED
    ? t('importSummary.namesAndMore', { names: names.slice(0, NAMES_LISTED).join(', '), count: names.length - NAMES_LISTED })
    : names.join(', ')

  /** Handle a file drop or file-input change event — supports single and multiple files. */
  const handleFile = async e => {
    const files = Array.from(e.dataTransfer?.files || e.target.files)
    if (!files.length) return

    const isBatch = files.length > 1
    _batchPolicy.value = null

    let savedCount = 0
    let unchangedCount = 0
    let replacedCount = 0     // unsaved tab overwritten with imported content (not persisted to DB)
    const invalidNames = []   // wrong extension — not a supported diagram file
    const readErrorNames = [] // valid extension but failed to read/parse/import
    let readErrorReason = '' // what was wrong with the file, for a single-file import
    const notSavedNames = []  // read, but the backend refused to save or update it
    const notSavedReasons = []
    let unreachable = false   // a request got no answer at all

    for (const file of files) {
      if (isBatch && _batchPolicy.value === 'stop') break
      // Without an answer from the backend every further file would wait for its own timeout
      // and fail the same way; they count as skipped
      if (unreachable) break
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
        if (didSave === true) savedCount++
        else if (didSave === 'unchanged') unchangedCount++
        else if (didSave === 'replaced') replacedCount++
      } catch (err) {
        if (err instanceof ImportSaveError) {
          notSavedNames.push(file.name)
          notSavedReasons.push(err.message)
          unreachable = err.unreachable
          continue
        }
        // Valid extension but the file couldn't be read/parsed — distinct from a
        // wrong extension, so it gets the "could not be loaded" message, not "not a BPMN file".
        console.error('Error importing file:', file.name, err)
        readErrorNames.push(file.name)
        readErrorReason = `${file.name}: ${err?.message ?? ''}`.trim()
      }
    }

    if (savedCount > 0 && onBatchComplete) await onBatchComplete()

    if (!isBatch) {
      // Single-file: success opens a tab silently; toast only on failure.
      if (invalidNames.length) {
        showToastMessage({ isSuccess: false, toastText: 'toastLoadErrorFileExtension' })
      } else if (readErrorNames.length) {
        showToastMessage({ isSuccess: false, toastText: 'toastLoadErrorFile', bodyTextAlt: readErrorReason })
      } else if (notSavedNames.length) {
        // The reason replaces the body, so the body goes first: the user learns it is not stored
        const body = t('toastImportSaveError.body')
        const reason = notSavedReasons[0]
        showToastMessage({ isSuccess: false, toastText: 'toastImportSaveError', bodyTextAlt: reason ? `${body}: ${reason}` : '' })
      }
    } else {
      // Batch: compose a summary from all non-zero outcome counts
      // skippedCount covers both user-skipped conflicts AND files not reached due to "Cancel remaining"
      const failedCount = invalidNames.length + readErrorNames.length
      const validTotal = files.length - invalidNames.length
      const skippedCount = validTotal - savedCount - unchangedCount - replacedCount - readErrorNames.length - notSavedNames.length
      const parts = []
      if (savedCount > 0) parts.push(t('importSummary.imported', { count: savedCount }))
      if (replacedCount > 0) parts.push(t('importSummary.replaced', { count: replacedCount }))
      if (unchangedCount > 0) parts.push(t('importSummary.upToDate', { count: unchangedCount }))
      if (skippedCount > 0) parts.push(t('importSummary.skipped', { count: skippedCount }))
      if (notSavedNames.length > 0) parts.push(t('importSummary.notSaved', { count: notSavedNames.length, names: _listedNames(notSavedNames) }))
      if (failedCount > 0) parts.push(t('importSummary.failed', { count: failedCount }))
      // One reason for all of them is worth saying; different ones would make the summary a log
      const sharedReason = notSavedReasons.length && notSavedReasons.every(reason => reason && reason === notSavedReasons[0])
        ? ` ${notSavedReasons[0]}` : ''
      showToastMessage({
        // A file that was not stored is a loss the user has to see, whatever else went through
        isSuccess: notSavedNames.length === 0 && (savedCount > 0 || unchangedCount > 0 || replacedCount > 0),
        toastText: 'toastImportBatch',
        bodyTextAlt: parts.join(', ') + '.' + sharedReason,
      })
    }
  }

  return {
    handleFile,
    _addNewBpmnFromLoadedXml,
    resolveConflict,
  }
}
