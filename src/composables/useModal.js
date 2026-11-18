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
import * as bootstrap from 'bootstrap'
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * A Bootstrap modal on the element of rootRef that closes when asked, however early. Bootstrap's
 * hide() does nothing while the dialog is still fading in, so a dialog answered during the fade-in
 * ran its action and stayed open, ready to run it again (CIB7-2827). Asked then, it closes as soon
 * as it is fully shown. Unmounted, the component's dialog is closed and its Bootstrap instance disposed.
 *
 * @param {import('vue').Ref<HTMLElement|null>} rootRef the element with the class modal
 * @param {object} [options]
 * @param {Function} [options.onShown] runs once the dialog is fully shown, unless it is closing again
 * @param {Function} [options.onHide] runs when the dialog starts to close, by any button, Esc or code
 */
export function useModal(rootRef, { onShown, onHide } = {}) {
  let modal = null
  let element = null
  // 'hidden', 'showing' (fading in) or 'shown'
  let state = 'hidden'
  let closeWhenShown = false

  const handleShown = () => {
    state = 'shown'
    if (closeWhenShown) {
      closeWhenShown = false
      modal.hide()
      return
    }
    onShown?.()
  }
  const handleHide = () => {
    onHide?.()
  }
  const handleHidden = () => {
    state = 'hidden'
  }

  onMounted(() => {
    element = rootRef.value
    if (!element) return
    modal = new bootstrap.Modal(element)
    element.addEventListener('shown.bs.modal', handleShown)
    element.addEventListener('hide.bs.modal', handleHide)
    element.addEventListener('hidden.bs.modal', handleHidden)
  })

  const dispose = () => {
    element.removeEventListener('shown.bs.modal', handleShown)
    element.removeEventListener('hide.bs.modal', handleHide)
    element.removeEventListener('hidden.bs.modal', handleHidden)
    modal.dispose()
  }

  onBeforeUnmount(() => {
    if (!modal) return
    if (state === 'hidden') {
      dispose()
      return
    }
    // Still open: Bootstrap's dispose() leaves the scroll lock on the page and breaks a fade it
    // has under way, so the dialog closes first and is disposed once it is gone
    element.addEventListener('hidden.bs.modal', dispose, { once: true })
    hide()
  })

  const show = () => {
    if (state === 'hidden') state = 'showing'
    closeWhenShown = false
    modal?.show()
  }

  const hide = () => {
    if (state === 'showing') {
      closeWhenShown = true
      return
    }
    modal?.hide()
  }

  return { show, hide }
}
