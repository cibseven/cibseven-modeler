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
import { createDragEvent } from '../helpers/modelerTestUtils.js'

import DropZone from '../../components/DropZone.vue'

describe('DropZone', () => {
  const mountDropZone = (slots = {}) => {
    return mount(DropZone, {
      slots: { default: '<div>Drop files here</div>', ...slots }
    })
  }

  describe('rendering', () => {
    it('renders drop zone container', () => {
      const wrapper = mountDropZone()
      expect(wrapper.find('.drop-zone').exists()).toBe(true)
    })

    it('applies fullscreen positioning classes', () => {
      const wrapper = mountDropZone()
      const dropZone = wrapper.find('.drop-zone')
      expect(dropZone.classes()).toContain('h-100')
      expect(dropZone.classes()).toContain('w-100')
      expect(dropZone.classes()).toContain('position-fixed')
      expect(dropZone.classes()).toContain('top-0')
      expect(dropZone.classes()).toContain('start-0')
    })

    it('renders slot content', () => {
      const wrapper = mountDropZone()
      expect(wrapper.text()).toContain('Drop files here')
    })

    it('renders default content when no slot provided', () => {
      const wrapper = mount(DropZone)
      expect(wrapper.find('.drop-zone__content').exists()).toBe(true)
    })
  })

  describe('event listeners', () => {
    it('registers drag event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(globalThis, 'addEventListener')
      mountDropZone()
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragenter', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragleave', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function))
      
      addEventListenerSpy.mockRestore()
    })

    it('removes drag event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(globalThis, 'removeEventListener')
      const wrapper = mountDropZone()
      wrapper.unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragenter', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragleave', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function))
      
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('emits', () => {
    it('defines drop and handleDropFile events', () => {
      const wrapper = mountDropZone()
      expect(wrapper.vm.$options.emits).toContain('drop')
      expect(wrapper.vm.$options.emits).toContain('handleDropFile')
    })
  })

  describe('styling', () => {
    it('has fullscreen overlay styles', () => {
      const wrapper = mountDropZone()
      const dropZone = wrapper.find('.drop-zone')
      expect(dropZone.classes()).toContain('position-fixed')
    })

    it('default drop zone content is centered', () => {
      const wrapper = mount(DropZone)
      const content = wrapper.find('.drop-zone__content')
      expect(content.classes()).toContain('align-content-center')
      expect(content.classes()).toContain('justify-content-center')
      expect(content.classes()).toContain('text-center')
    })
  })

  describe('drag events', () => {
    it('shows visible class on dragenter with files', async () => {
      const wrapper = mountDropZone()
      const dropZone = wrapper.find('.drop-zone').element
      const event = createDragEvent('dragenter', {
        dataTransfer: { types: ['Files'] },
        target: dropZone,
      })
      globalThis.dispatchEvent(event)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.drop-zone--visible').exists()).toBe(true)
    })

    it('does not show visible class on dragenter without files', async () => {
      const wrapper = mountDropZone()
      const event = createDragEvent('dragenter', {
        dataTransfer: { types: ['text/plain'] },
      })
      globalThis.dispatchEvent(event)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.drop-zone--visible').exists()).toBe(false)
    })

    it('hides visible class on dragleave from target', async () => {
      const wrapper = mountDropZone()
      const dropZone = wrapper.find('.drop-zone').element
      globalThis.dispatchEvent(createDragEvent('dragenter', {
        dataTransfer: { types: ['Files'] },
        target: dropZone,
      }))
      await wrapper.vm.$nextTick()
      globalThis.dispatchEvent(createDragEvent('dragleave', { target: dropZone }))
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.drop-zone--visible').exists()).toBe(false)
    })

    it('prevents default on dragover', () => {
      mountDropZone()
      const preventDefault = vi.fn()
      const event = createDragEvent('dragover')
      event.preventDefault = preventDefault
      globalThis.dispatchEvent(event)
      expect(preventDefault).toHaveBeenCalled()
    })

    it('emits handleDropFile on drop when visible', async () => {
      const wrapper = mountDropZone()
      const dropZone = wrapper.find('.drop-zone').element
      globalThis.dispatchEvent(createDragEvent('dragenter', {
        dataTransfer: { types: ['Files'] },
        target: dropZone,
      }))
      await wrapper.vm.$nextTick()
      const dropEvent = createDragEvent('drop')
      dropEvent.preventDefault = vi.fn()
      globalThis.dispatchEvent(dropEvent)
      expect(wrapper.emitted('handleDropFile')).toBeTruthy()
    })

    it('does not emit handleDropFile when drop zone is not visible', () => {
      const wrapper = mountDropZone()
      const dropEvent = createDragEvent('drop')
      dropEvent.preventDefault = vi.fn()
      globalThis.dispatchEvent(dropEvent)
      expect(wrapper.emitted('handleDropFile')).toBeFalsy()
    })
  })

  describe('integration', () => {
    it('renders without errors with default setup', () => {
      const wrapper = mountDropZone()
      expect(wrapper.vm).toBeDefined()
      expect(wrapper.find('.drop-zone').exists()).toBe(true)
    })

    it('mounts and unmounts without errors', () => {
      const wrapper = mountDropZone()
      expect(wrapper.find('.drop-zone').exists()).toBe(true)
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('renders custom slot content', () => {
      const wrapper = mountDropZone({ default: '<div class="custom">Custom Content</div>' })
      expect(wrapper.find('.custom').exists()).toBe(true)
    })
  })
})
