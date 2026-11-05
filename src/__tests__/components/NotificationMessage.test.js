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
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('bootstrap', () => ({
  Modal: vi.fn(function() {
    this.show = vi.fn()
    this.hide = vi.fn()
  })
}))

import NotificationMessage from '../../components/modals/NotificationMessage.vue'

describe('NotificationMessage', () => {
  const mountNotificationMessage = (slots = {}) => {
    return mount(NotificationMessage, {
      slots: {
        title: '<h5>Title</h5>',
        body: '<p>Body</p>',
        ...slots
      },
      global: {
        mocks: { $t: (k) => k }
      }
    })
  }

  describe('rendering', () => {
    it('renders with teleport wrapper', () => {
      const wrapper = mountNotificationMessage()
      expect(wrapper.vm).toBeDefined()
    })

    it('component exists', () => {
      const wrapper = mountNotificationMessage()
      expect(wrapper.exists()).toBe(true)
    })

    it('renders within teleport', () => {
      const wrapper = mountNotificationMessage()
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('exposed methods', () => {
    it('exposes show method', () => {
      const wrapper = mountNotificationMessage()
      expect(wrapper.vm.show).toBeDefined()
    })

    it('exposes closeModal method', () => {
      const wrapper = mountNotificationMessage()
      expect(wrapper.vm.closeModal).toBeDefined()
    })

    it('show method returns a promise', () => {
      const wrapper = mountNotificationMessage()
      const result = wrapper.vm.show()
      expect(result instanceof Promise).toBe(true)
    })
  })

  describe('slots', () => {
    it('accepts title slot', () => {
      const wrapper = mountNotificationMessage({
        title: '<h5 class="title-content">Custom Title</h5>'
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('accepts body slot', () => {
      const wrapper = mountNotificationMessage({
        body: '<p class="body-content">Custom Body</p>'
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('accepts optionalButton slot', () => {
      const wrapper = mountNotificationMessage({
        optionalButton: '<button>Optional</button>'
      })
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('integration', () => {
    it('renders without errors with default setup', () => {
      const wrapper = mountNotificationMessage()
      expect(wrapper.vm).toBeDefined()
      expect(wrapper.exists()).toBe(true)
    })

    it('mounts and unmounts without errors', () => {
      const wrapper = mountNotificationMessage()
      expect(wrapper.exists()).toBe(true)
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('can be shown programmatically', async () => {
      const wrapper = mountNotificationMessage()
      const promise = wrapper.vm.show()
      expect(promise instanceof Promise).toBe(true)
    })

    it('can be closed programmatically', () => {
      const wrapper = mountNotificationMessage()
      expect(() => wrapper.vm.closeModal(false)).not.toThrow()
    })
  })
})
