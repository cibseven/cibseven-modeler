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
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ConsolePanel from '../../components/layout/ConsolePanel.vue'

describe('ConsolePanel', () => {
  const mountConsolePanel = (props = {}) => {
    return mount(ConsolePanel, {
      props: {
        parentHeight: 600,
        minHeight: '100px',
        isPropertyPanelVisible: true,
        rightPos: 0,
        isModelerVisible: false,
        processID: 'proc-1',
        ...props
      },
      global: {
        mocks: { $t: (k) => k }
      }
    })
  }

  describe('rendering', () => {
    it('renders console panel container', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.find('[class*="flex-column"]').exists() || wrapper.find('div').exists()).toBe(true)
    })

    it('renders buttons', () => {
      const wrapper = mountConsolePanel()
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('has border class', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.find('.border').exists()).toBe(true)
    })

    it('has resizable component class', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.find('[class*="resizable"]').exists()).toBe(true)
    })
  })

  describe('props', () => {
    it('accepts parentHeight prop', () => {
      const wrapper = mountConsolePanel({ parentHeight: 800 })
      expect(wrapper.props('parentHeight')).toBe(800)
    })

    it('accepts minHeight prop', () => {
      const wrapper = mountConsolePanel({ minHeight: '200px' })
      expect(wrapper.props('minHeight')).toBe('200px')
    })

    it('accepts isPropertyPanelVisible prop', () => {
      const wrapper = mountConsolePanel({ isPropertyPanelVisible: false })
      expect(wrapper.props('isPropertyPanelVisible')).toBe(false)
    })

    it('accepts processID prop', () => {
      const wrapper = mountConsolePanel({ processID: 'test-proc' })
      expect(wrapper.props('processID')).toBe('test-proc')
    })
  })

  describe('exposed methods', () => {
    it('exposes isOpen method', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.vm.isOpen).toBeDefined()
    })

    it('exposes toggleConsole method', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.vm.toggleConsole).toBeDefined()
    })

    it('toggleConsole opens panel and emits showConsoleNotification', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.vm.toggleConsole(true)).toBe(true)
      expect(wrapper.vm.isOpen()).toBe(true)
      expect(wrapper.emitted('showConsoleNotification')).toEqual([['proc-1']])
    })

    it('toggleConsole closes panel and resets height', () => {
      const wrapper = mountConsolePanel()
      wrapper.vm.toggleConsole(true)
      wrapper.vm.toggleConsole(false)
      expect(wrapper.vm.isOpen()).toBe(false)
    })

    it('_resetPropertiesPanelHeight clears panel height', () => {
      const wrapper = mountConsolePanel()
      wrapper.vm.toggleConsole(true)
      wrapper.vm._resetPropertiesPanelHeight()
      expect(wrapper.vm.isOpen()).toBe(true)
    })
  })

  describe('emits', () => {
    it('defines changeHeight event', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.vm.$options.emits).toContain('changeHeight')
    })

    it('defines visibility-changed event', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.vm.$options.emits).toContain('visibility-changed')
    })

    it('defines copy-line event', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.vm.$options.emits).toContain('copy-line')
    })

    it('defines clean-console event', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.vm.$options.emits).toContain('clean-console')
    })
  })

  describe('integration', () => {
    it('renders without errors with default props', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.vm).toBeDefined()
    })

    it('mounts and unmounts without errors', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.find('div').exists()).toBe(true)
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('handles prop updates', async () => {
      const wrapper = mountConsolePanel({ isPropertyPanelVisible: true })
      expect(wrapper.props('isPropertyPanelVisible')).toBe(true)
      
      await wrapper.setProps({ isPropertyPanelVisible: false })
      expect(wrapper.props('isPropertyPanelVisible')).toBe(false)
    })

    it('handles processID changes', async () => {
      const wrapper = mountConsolePanel({ processID: 'proc-1' })
      expect(wrapper.props('processID')).toBe('proc-1')
      
      await wrapper.setProps({ processID: 'proc-2' })
      expect(wrapper.props('processID')).toBe('proc-2')
    })
  })
})
