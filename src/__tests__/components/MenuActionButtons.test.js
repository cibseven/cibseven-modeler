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

import MenuActionButtons from '../../components/layout/MenuActionButtons.vue'

describe('MenuActionButtons', () => {
  const mountMenuActionButtons = (props = {}, slots = {}) => {
    return mount(MenuActionButtons, {
      props,
      slots
    })
  }

  describe('rendering', () => {
    it('renders main container', () => {
      const wrapper = mountMenuActionButtons()
      const container = wrapper.find('div')
      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('d-flex')
    })

    it('applies layout classes', () => {
      const wrapper = mountMenuActionButtons()
      const container = wrapper.find('div')
      expect(container.classes()).toContain('flex-row')
      expect(container.classes()).toContain('flex-wrap')
      expect(container.classes()).toContain('justify-content-between')
      expect(container.classes()).toContain('align-items-center')
      expect(container.classes()).toContain('bg-secondary')
      expect(container.classes()).toContain('position-relative')
    })

    it('applies sizing styles', () => {
      const wrapper = mountMenuActionButtons()
      const container = wrapper.find('div')
      const style = container.attributes('style')
      expect(style).toContain('z-index: 11')
      expect(style).toContain('min-width: 200px')
      expect(style).toContain('min-height: 44px')
    })
  })

  describe('slots', () => {
    it('renders left buttons slot', () => {
      const wrapper = mountMenuActionButtons(
        {},
        { leftButtons: '<button class="left-btn">Left</button>' }
      )
      expect(wrapper.find('.left-btn').text()).toBe('Left')
    })

    it('renders right buttons slot', () => {
      const wrapper = mountMenuActionButtons(
        {},
        { rightButtons: '<button class="right-btn">Right</button>' }
      )
      expect(wrapper.find('.right-btn').text()).toBe('Right')
    })

    it('renders both slots together', () => {
      const wrapper = mountMenuActionButtons(
        {},
        {
          leftButtons: '<button class="left">L</button>',
          rightButtons: '<button class="right">R</button>'
        }
      )
      expect(wrapper.find('.left').exists()).toBe(true)
      expect(wrapper.find('.right').exists()).toBe(true)
    })

    it('left buttons section has flex-row layout', () => {
      const wrapper = mountMenuActionButtons()
      const leftSection = wrapper.findAll('div').find(el => 
        el.classes().includes('justify-content-start')
      )
      expect(leftSection.classes()).toContain('d-flex')
      expect(leftSection.classes()).toContain('flex-row')
      expect(leftSection.classes()).toContain('justify-content-start')
    })

    it('right buttons section has correct alignment', () => {
      const wrapper = mountMenuActionButtons()
      const sections = wrapper.findAll('div')
      const rightSection = sections.at(-1)
      expect(rightSection.classes()).toContain('d-flex')
      expect(rightSection.classes()).toContain('align-items-center')
      expect(rightSection.classes()).toContain('px-2')
    })
  })

  describe('props', () => {
    it('accepts width prop', () => {
      const wrapper = mountMenuActionButtons({ width: 300 })
      expect(wrapper.props('width')).toBe(300)
    })

    it('applies width prop to style', () => {
      const wrapper = mountMenuActionButtons({ width: 400 })
      const style = wrapper.attributes('style')
      expect(style).toContain('width: 400px !important')
    })

    it('handles dynamic width changes', async () => {
      const wrapper = mountMenuActionButtons({ width: 200 })
      expect(wrapper.attributes('style')).toContain('200px')
      
      await wrapper.setProps({ width: 500 })
      expect(wrapper.attributes('style')).toContain('500px')
    })

    it('handles zero width', () => {
      const wrapper = mountMenuActionButtons({ width: 0 })
      expect(wrapper.attributes('style')).toContain('0px')
    })

    it('handles large width', () => {
      const wrapper = mountMenuActionButtons({ width: 5000 })
      expect(wrapper.attributes('style')).toContain('5000px !important')
    })
  })

  describe('styling', () => {
    it('has secondary background color', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.find('div').classes()).toContain('bg-secondary')
    })

    it('has relative positioning', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.find('div').classes()).toContain('position-relative')
    })

    it('has minimum dimensions', () => {
      const wrapper = mountMenuActionButtons()
      const style = wrapper.attributes('style')
      expect(style).toContain('min-width: 200px')
      expect(style).toContain('min-height: 44px')
    })

    it('has high z-index', () => {
      const wrapper = mountMenuActionButtons()
      const style = wrapper.attributes('style')
      expect(style).toContain('z-index: 11')
    })
  })

  describe('layout', () => {
    it('uses flex layout for main container', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.find('div').classes()).toContain('d-flex')
      expect(wrapper.find('div').classes()).toContain('flex-row')
    })

    it('wraps content when needed', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.find('div').classes()).toContain('flex-wrap')
    })

    it('spaces buttons between left and right', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.find('div').classes()).toContain('justify-content-between')
    })

    it('centers items vertically', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.find('div').classes()).toContain('align-items-center')
    })
  })

  describe('edge cases', () => {
    it('renders without width prop', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.find('div').exists()).toBe(true)
    })

    it('renders without slot content', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.find('div').exists()).toBe(true)
    })

    it('renders with empty slot content', () => {
      const wrapper = mountMenuActionButtons(
        {},
        { leftButtons: '', rightButtons: '' }
      )
      expect(wrapper.find('div').exists()).toBe(true)
    })

    it('renders with only left buttons', () => {
      const wrapper = mountMenuActionButtons(
        {},
        { leftButtons: '<button>Left only</button>' }
      )
      expect(wrapper.find('button').text()).toBe('Left only')
    })

    it('renders with only right buttons', () => {
      const wrapper = mountMenuActionButtons(
        {},
        { rightButtons: '<button>Right only</button>' }
      )
      expect(wrapper.find('button').text()).toBe('Right only')
    })
  })

  describe('integration', () => {
    it('renders without errors with default setup', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.vm).toBeDefined()
      expect(wrapper.find('div').exists()).toBe(true)
    })

    it('mounts and unmounts without errors', () => {
      const wrapper = mountMenuActionButtons()
      expect(wrapper.find('div').exists()).toBe(true)
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('handles prop updates', async () => {
      const wrapper = mountMenuActionButtons({ width: 100 })
      expect(wrapper.attributes('style')).toContain('100px')
      
      await wrapper.setProps({ width: 300 })
      expect(wrapper.attributes('style')).toContain('300px')
    })

    it('handles slot updates', async () => {
      const wrapper = mountMenuActionButtons(
        {},
        { leftButtons: '<button>Initial</button>' }
      )
      expect(wrapper.text()).toContain('Initial')
      
      await wrapper.vm.$forceUpdate()
      expect(wrapper.find('button').exists()).toBe(true)
    })
  })
})
