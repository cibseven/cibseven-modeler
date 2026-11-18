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
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

vi.mock('bootstrap', () => ({
  Modal: vi.fn(function () { return { show: vi.fn(), hide: vi.fn() } }),
}))

import { Modal } from 'bootstrap'
import { useModal } from '../../composables/useModal.js'

/** A component with one modal element, exposing what useModal returns. */
const mountWith = (options) => {
  let modal
  const wrapper = mount(defineComponent({
    name: 'ModalHost',
    setup() {
      const root = ref(null)
      modal = useModal(root, options)
      return () => h('div', { ref: root, class: 'modal' })
    },
  }), { attachTo: document.body })
  return { wrapper, modal, bootstrapModal: Modal.mock.results.at(-1).value }
}

const fire = (wrapper, event) => wrapper.element.dispatchEvent(new Event(event))

describe('useModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds the Bootstrap modal on the element', () => {
    const { wrapper } = mountWith()

    expect(Modal).toHaveBeenCalledWith(wrapper.element)
  })

  it('closes a dialog that is fully shown at once', () => {
    const { wrapper, modal, bootstrapModal } = mountWith()
    modal.show()
    fire(wrapper, 'shown.bs.modal')

    modal.hide()

    expect(bootstrapModal.hide).toHaveBeenCalledOnce()
  })

  // Bootstrap ignores hide() during the fade-in, which left a dialog open after its action (CIB7-2827)
  it('closes a dialog asked to close during the fade-in once it is shown', () => {
    const { wrapper, modal, bootstrapModal } = mountWith()
    modal.show()

    modal.hide()
    expect(bootstrapModal.hide).not.toHaveBeenCalled()

    fire(wrapper, 'shown.bs.modal')
    expect(bootstrapModal.hide).toHaveBeenCalledOnce()
  })

  it('runs onShown once the dialog is shown', () => {
    const onShown = vi.fn()
    const { wrapper, modal } = mountWith({ onShown })
    modal.show()

    fire(wrapper, 'shown.bs.modal')

    expect(onShown).toHaveBeenCalledOnce()
  })

  it('leaves out onShown for a dialog that is closing again', () => {
    const onShown = vi.fn()
    const { wrapper, modal } = mountWith({ onShown })
    modal.show()
    modal.hide()

    fire(wrapper, 'shown.bs.modal')

    expect(onShown).not.toHaveBeenCalled()
  })

  it('forgets an early close once the dialog is opened again', () => {
    const { wrapper, modal, bootstrapModal } = mountWith()
    modal.show()
    modal.hide()
    fire(wrapper, 'shown.bs.modal')
    fire(wrapper, 'hidden.bs.modal')
    bootstrapModal.hide.mockClear()

    modal.show()
    fire(wrapper, 'shown.bs.modal')

    expect(bootstrapModal.hide).not.toHaveBeenCalled()
  })

  it('closes at once a dialog shown again while it is open', () => {
    const { wrapper, modal, bootstrapModal } = mountWith()
    modal.show()
    fire(wrapper, 'shown.bs.modal')

    // Bootstrap ignores a second show(), so no second shown event comes
    modal.show()
    modal.hide()

    expect(bootstrapModal.hide).toHaveBeenCalledOnce()
  })

  it('stops listening once unmounted', () => {
    const onShown = vi.fn()
    const { wrapper, modal } = mountWith({ onShown })
    const element = wrapper.element
    modal.show()
    wrapper.unmount()

    element.dispatchEvent(new Event('shown.bs.modal'))

    expect(onShown).not.toHaveBeenCalled()
  })

  it('does nothing without an element', () => {
    let modal
    mount(defineComponent({
      name: 'EmptyHost',
      setup() {
        modal = useModal(ref(null))
        return () => h('div')
      },
    }))

    expect(() => { modal.show(); modal.hide() }).not.toThrow()
    expect(Modal).not.toHaveBeenCalled()
  })
})
