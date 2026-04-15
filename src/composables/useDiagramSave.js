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
import { checkBeforeAction } from '../utils.js'

/**
 * Shared save/update logic for BPMN, DMN and Form diagram composables.
 *
 * @param {object} props       - Component props (tabElement, tabElementIndex)
 * @param {function} emit      - Component emit function
 * @param {object} sessionHooks - { checkSessionHook, createSessionHook } — injected by the calling composable
 */
export default function useDiagramSave(props, emit, sessionHooks = {}) {
  const { createSessionHook = null } = sessionHooks

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
  }) => {
    const keyToCompare = props.tabElement.isSaved ? storedKey : ''
    const toastErrorMessage = checkBeforeAction(newKey, keyToCompare, storeStateSlice, itemKeyField)

    if (toastErrorMessage) {
      emit('showToastMessage', { isSuccess: false, toastText: toastErrorMessage, bodyTextAlt: '' })
      return false
    }

    if (props.tabElement.isSaved || props.tabElement.replaceXml) {
      try {
        const response = await updateFn()
        if (response) {
          emit('updateStoredLocalStorageTabNavList', toTabPayload(response), props.tabElementIndex, xml)
          emit('showToastMessage', { isSuccess: true, toastText: 'toastUpdateSuccessful', bodyTextAlt: '' })
          emit('toggleEnableSave', false, props.tabElementIndex)
          emit('toggleVersionNotSaved', false, props.tabElementIndex)
          if (afterSave) await afterSave(response)
          if (createSessionHook && sessionResponse?.message === 'NO_SESSION') {
            createSessionHook(response, blob, props.tabElementIndex, props.tabElement)
          }
          if (functionToExecute) functionToExecute(xml)
          return true
        }
      } catch (error) {
        emit('showToastMessage', { isSuccess: false, toastText: 'toastSomethingWentWrong' })
        console.error(error)
        return false
      }
    } else {
      try {
        const response = await createFn()
        if (response) {
          emit('updateStoredLocalStorageTabNavList', toTabPayload(response), props.tabElementIndex, xml)
          emit('showToastMessage', { isSuccess: true, toastText: 'toastSaveSuccessful' })
          emit('toggleEnableSave', false, props.tabElementIndex)
          emit('toggleIsSaved', true, props.tabElementIndex)
          emit('toggleVersionNotSaved', false, props.tabElementIndex)
          if (afterSave) await afterSave(response)
          if (createSessionHook && sessionResponse?.message === 'NO_SESSION') {
            createSessionHook(response, blob, props.tabElementIndex, props.tabElement)
          }
          if (functionToExecute) functionToExecute(xml)
          return true
        }
      } catch (error) {
        emit('showToastMessage', { isSuccess: false, toastText: 'toastSomethingWentWrong' })
        console.error(error)
        return false
      }
    }
  }

  return { save }
}
