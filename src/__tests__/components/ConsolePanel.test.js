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

    // The theme's $border-color ($gray-500) outline on its tertiary background ($gray-100, not $light) (CIB7-1283)
    it('outlines the whole console once, on the tertiary background', () => {
      const wrapper = mountConsolePanel()
      expect(wrapper.findAll('.border')).toHaveLength(1)
      expect(wrapper.find('.resizable-component').classes()).toContain('bg-body-tertiary')
      expect(wrapper.find('.resizable-component').classes()).not.toContain('bg-light')
    })

    it('draws copy, delete and close as plain 18px icon buttons', () => {
      const buttons = mountConsolePanel().findAll('button')
      expect(buttons.map(b => b.attributes('title'))).toEqual(['buttons.copy', 'buttons.delete', 'buttons.close'])
      buttons.forEach(b => {
        expect(b.classes()).toEqual(['btn', 'p-0', 'lh-1', 'border-0', 'text-secondary'])
        expect(b.find('.mdi-18px[aria-hidden="true"]').exists()).toBe(true)
      })
    })

    it('copies, clears and closes from its buttons', async () => {
      const wrapper = mountConsolePanel()
      wrapper.vm.toggleConsole(true)
      const [copy, clear, close] = wrapper.findAll('button')
      await copy.trigger('click')
      await clear.trigger('click')
      await close.trigger('click')
      expect(wrapper.emitted('copy-line')).toHaveLength(1)
      expect(wrapper.emitted('clean-console')).toHaveLength(1)
      expect(wrapper.vm.isOpen()).toBe(false)
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
