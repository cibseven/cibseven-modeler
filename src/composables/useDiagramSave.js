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
import { inject } from 'vue'
import { checkBeforeAction } from '../utils.js'
import { keyExistsRemote } from '../services/processService.js'

/**
 * Shared save/update logic for BPMN, DMN and Form diagram composables.
 *
 * @param {object} props       - Component props (tabElement, tabElementIndex)
 * @param {function} emit      - Component emit function
 * @param {object} sessionHooks - { checkSessionHook, createSessionHook } — injected by the calling composable
 */
export default function useDiagramSave(props, emit, sessionHooks = {}) {
  const { createSessionHook = null } = sessionHooks
  // EE-only: notified after a successful autosave so it can surface a "saved at" indicator. No-op in OSS.
  const autosaveHook = inject('autosaveHook', null)

  /**
   * Create the edit-lock session after a successful save. The diagram is already
   * persisted at this point, so a session-creation failure must NOT fail the save:
   * it is awaited (no unhandled rejection) and surfaced as its own warning toast.
   */
  /**
   * A failed save is reported through the toast the user expects for a manual save, and
   * through the autosave status otherwise: a silent failure would leave the indicator on
   * the last successful time and let the user believe the work is saved.
   */
  const _reportFailure = (isAutosave) => {
    if (isAutosave) {
      if (autosaveHook) autosaveHook(props.tabElement, { state: 'failed' })
    } else {
      emit('showToastMessage', { isSuccess: false, toastText: 'toastSomethingWentWrong' })
    }
  }

  const _createSessionSafely = async (response, blob, sessionResponse, isAutosave = false) => {
    if (createSessionHook && sessionResponse?.message === 'NO_SESSION') {
      try {
        await createSessionHook(response, blob, props.tabElementIndex, props.tabElement)
      } catch (error) {
        console.error('Failed to create edit-lock session after save', error)
        // An autosave the user did not ask for must not raise a toast at them
        if (!isAutosave) emit('showToastMessage', { isSuccess: false, toastText: 'toastSessionLockFailed' })
      }
    }
  }

  /**
   * Persist a diagram (create or update) and emit the common success/error events.
   *
   * @param {object} opts
   * @param {string}   opts.newName            - Display name extracted from the canvas
   * @param {string}   opts.newKey             - Process/form key extracted from the canvas
   * @param {string}   opts.storedKey          - Key currently stored in the tab element
   * @param {string}   opts.xml                - Serialized XML/JSON string (used for editor sync)
   * @param {*}        opts.blob               - Blob or JSON passed to the session hook after save
   * @param {object}   opts.storeStateSlice    - The Vuex module state used for duplicate checking
   *                                             (e.g. store.state.modeler?.processes)
   * @param {string}   opts.itemKeyField       - Field name to check for duplicates (e.g. 'processkey')
   * @param {function} opts.createFn           - () => Promise<response> — creates a new diagram
   * @param {function} opts.updateFn           - () => Promise<response> — updates an existing diagram
   * @param {function} opts.toTabPayload       - (response) => { processId, processName, processKey, type }
   * @param {object}   opts.sessionResponse    - Response from checkSessionHook (may be null)
   * @param {function} [opts.afterSave]        - Optional async (response) => void, called after success
   * @param {function} [opts.functionToExecute]- Optional (xml) => void, called at the end on success
   * @returns {Promise<boolean>} true on success, false on validation error or exception
   */
  const save = async ({
    _newName,
    newKey,
    storedKey,
    xml,
    blob,
    storeStateSlice,
    itemKeyField,
    createFn,
    updateFn,
    toTabPayload,
    sessionResponse,
    afterSave = null,
    functionToExecute = null,
    isAutosave = false,
  }) => {
    const keyToCompare = props.tabElement.isSaved ? storedKey : ''
    // Instant check against the loaded list…
    let duplicate = !!checkBeforeAction(newKey, keyToCompare, storeStateSlice, itemKeyField)
    // …then an authoritative backend check, but only when the key is new/changed
    // (covers ids that exist on a not-yet-loaded page; the DB constraint is the final guard).
    if (!duplicate && newKey && newKey !== keyToCompare) {
      duplicate = await keyExistsRemote(newKey, itemKeyField === 'formId' ? 'form' : 'process')
    }

    if (duplicate) {
      emit('showToastMessage', { isSuccess: false, toastText: 'toastSaveErrorDuplicateKey', bodyTextAlt: '' })
      return false
    }

    if (props.tabElement.isSaved || props.tabElement.replaceXml) {
      try {
        const response = await updateFn()
        if (!response) {
          _reportFailure(isAutosave)
          return false
        }
        emit('updateStoredLocalStorageTabNavList', toTabPayload(response), props.tabElementIndex, xml)
        if (!isAutosave) emit('showToastMessage', { isSuccess: true, toastText: 'toastUpdateSuccessful', bodyTextAlt: '' })
        emit('toggleEnableSave', false, props.tabElementIndex)
        emit('toggleVersionNotSaved', false, props.tabElementIndex)
        if (afterSave) await afterSave(response)
        await _createSessionSafely(response, blob, sessionResponse, isAutosave)
        // Report autosave status (saved); a manual save clears any stale "skipped" state.
        if (autosaveHook) autosaveHook(props.tabElement, isAutosave ? { state: 'saved', at: Date.now() } : null)
        if (functionToExecute) functionToExecute(xml)
        return true
      } catch (error) {
        _reportFailure(isAutosave)
        console.error(error)
        return false
      }
    } else {
      try {
        const response = await createFn()
        if (!response) {
          emit('showToastMessage', { isSuccess: false, toastText: 'toastSomethingWentWrong' })
          return false
        }
        emit('updateStoredLocalStorageTabNavList', toTabPayload(response), props.tabElementIndex, xml)
        emit('showToastMessage', { isSuccess: true, toastText: 'toastSaveSuccessful' })
        emit('toggleEnableSave', false, props.tabElementIndex)
        emit('toggleIsSaved', true, props.tabElementIndex)
        emit('toggleVersionNotSaved', false, props.tabElementIndex)
        if (afterSave) await afterSave(response)
        await _createSessionSafely(response, blob, sessionResponse)
        if (functionToExecute) functionToExecute(xml)
        return true
      } catch (error) {
        emit('showToastMessage', { isSuccess: false, toastText: 'toastSomethingWentWrong' })
        console.error(error)
        return false
      }
    }
  }

  return { save }
}
