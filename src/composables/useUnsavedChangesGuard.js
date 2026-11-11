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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Keeps the user from losing unsaved changes by leaving the modeler: the browser
 * asks before a reload or closing the page, and leaving the route (e.g. the browser's
 * back button) waits for the user to confirm.
 *
 * @param {() => boolean} hasUnsavedChanges
 * @returns {{ showLeaveModal: import('vue').Ref<boolean>, confirmLeave: () => void, cancelLeave: () => void }}
 */
export function useUnsavedChangesGuard(hasUnsavedChanges) {
  const showLeaveModal = ref(false)
  let resolveLeave = null

  const settleLeave = canLeave => {
    resolveLeave?.(canLeave)
    resolveLeave = null
  }

  const confirmLeave = () => settleLeave(true)
  const cancelLeave = () => settleLeave(false)

  const onBeforeUnload = e => {
    if (!hasUnsavedChanges()) return
    // The browser shows its own message, the text of which cannot be set
    e.preventDefault()
    e.returnValue = ''
  }

  onBeforeRouteLeave(() => {
    if (!hasUnsavedChanges()) return true
    // A navigation started while the dialog is open replaces the one it was asked for
    settleLeave(false)
    showLeaveModal.value = true
    return new Promise(resolve => { resolveLeave = resolve })
  })

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    settleLeave(false)
  })

  return { showLeaveModal, confirmLeave, cancelLeave }
}
