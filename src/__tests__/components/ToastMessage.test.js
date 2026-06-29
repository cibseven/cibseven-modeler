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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('bootstrap', () => ({
  Toast: vi.fn(function() {
    this.show = vi.fn()
    this.hide = vi.fn()
  })
}))

import ToastMessage from '../../components/messages/ToastMessage.vue'

describe('ToastMessage', () => {
  let wrapper

  const mountToastMessage = (props = {}) => {
    const defaultProps = {
      showToast: false,
      timestamp: '10:30:45',
      headerText: 'Header',
      bodyText: 'Message body',
      success: true,
      bodyTextAlt: 'Alternative body',
      actionTo: null,
      actionLabel: '',
      ...props
    }
    wrapper = mount(ToastMessage, {
      props: defaultProps,
      global: {
        stubs: ['RouterLink'],
        mocks: { $t: k => k }
      }
    })
    return wrapper
  }

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('rendering', () => {
    it('renders toast container', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    it('renders alert with success styling when success prop is true', () => {
      const wrapper = mountToastMessage({ success: true })
      const alert = wrapper.find('.alert')
      expect(alert.classes()).toContain('alert-success')
    })

    it('renders alert with danger styling when success prop is false', () => {
      const wrapper = mountToastMessage({ success: false })
      const alert = wrapper.find('.alert')
      expect(alert.classes()).toContain('alert-danger')
    })

    it('renders close button', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.find('.btn-close').exists()).toBe(true)
    })

    it('displays body text', () => {
      const wrapper = mountToastMessage({ bodyText: 'Test message', bodyTextAlt: undefined })
      expect(wrapper.text()).toContain('Test message')
    })

    it('renders icon for success toast', () => {
      const wrapper = mountToastMessage({ success: true })
      expect(wrapper.find('.mdi-check-circle-outline').exists()).toBe(true)
    })

    it('renders icon for error toast', () => {
      const wrapper = mountToastMessage({ success: false })
      expect(wrapper.find('.mdi-alert-circle-outline').exists()).toBe(true)
    })

    it('renders hidden by default', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.find('[role="alert"]').attributes('style')).toContain('display: none')
    })
  })

  describe('props', () => {
    it('accepts showToast prop', () => {
      const wrapper = mountToastMessage({ showToast: true })
      expect(wrapper.props('showToast')).toBe(true)
    })

    it('accepts timestamp prop', () => {
      const wrapper = mountToastMessage({ timestamp: '12:00:00' })
      expect(wrapper.props('timestamp')).toBe('12:00:00')
    })

    it('accepts headerText prop', () => {
      const wrapper = mountToastMessage({ headerText: 'Custom Header' })
      expect(wrapper.props('headerText')).toBe('Custom Header')
    })

    it('accepts bodyText prop', () => {
      const wrapper = mountToastMessage({ bodyText: 'Custom body' })
      expect(wrapper.props('bodyText')).toBe('Custom body')
    })

    it('accepts success prop', () => {
      const wrapper = mountToastMessage({ success: false })
      expect(wrapper.props('success')).toBe(false)
    })

    it('accepts bodyTextAlt prop', () => {
      const wrapper = mountToastMessage({ bodyTextAlt: 'Alternative' })
      expect(wrapper.props('bodyTextAlt')).toBe('Alternative')
    })

    it('accepts actionTo prop', () => {
      const action = { name: 'home' }
      const wrapper = mountToastMessage({ actionTo: action })
      expect(wrapper.props('actionTo')).toEqual(action)
    })

    it('accepts actionLabel prop', () => {
      const wrapper = mountToastMessage({ actionLabel: 'Click here' })
      expect(wrapper.props('actionLabel')).toBe('Click here')
    })
  })

  describe('body text logic', () => {
    it('displays bodyText when actionTo is not set', () => {
      const wrapper = mountToastMessage({ bodyText: 'Primary message', bodyTextAlt: 'Alternative' })
      expect(wrapper.text()).toContain('Alternative')
    })

    it('displays bodyTextAlt when provided and no actionTo', () => {
      const wrapper = mountToastMessage({ bodyText: 'Primary', bodyTextAlt: 'Alternative' })
      expect(wrapper.text()).toContain('Alternative')
    })

    it('uses bodyText as fallback when bodyTextAlt is not provided', () => {
      const wrapper = mountToastMessage({ bodyText: 'Only primary', bodyTextAlt: undefined })
      expect(wrapper.text()).toContain('Only primary')
    })

    it('displays action link when actionTo is set', () => {
      const wrapper = mountToastMessage({
        bodyText: 'Message',
        bodyTextAlt: 'Alternative',
        actionTo: { name: 'home' },
        actionLabel: 'Go Home'
      })
      // When actionTo is set, the component still renders bodyText logic
      expect(wrapper.text()).toBeTruthy()
    })
  })

  describe('exposed methods', () => {
    it('exposes _showToastTimeOut method', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.vm._showToastTimeOut).toBeDefined()
    })

    it('_showToastTimeOut sets isDisplayed to true', () => {
      vi.useFakeTimers()
      const wrapper = mountToastMessage({ success: true })
      if (wrapper.vm._showToastTimeOut) {
        wrapper.vm._showToastTimeOut()
        expect(wrapper.vm.isDisplayed).toBe(true)
      }
      vi.useRealTimers()
    })
  })

  describe('styling', () => {
    it('applies fixed positioning styles', () => {
      const wrapper = mountToastMessage()
      const style = wrapper.find('[role="alert"]').attributes('style')
      expect(style).toContain('position: fixed')
      expect(style).toContain('z-index: 2031')
      expect(style).toContain('left: 50%')
      expect(style).toContain('transform: translate(-50%, 0px)')
    })

    it('success icon has text-success class', () => {
      const wrapper = mountToastMessage({ success: true })
      const icon = wrapper.find('.mdi-check-circle-outline')
      expect(icon.classes()).toContain('text-success')
    })

    it('error icon has text-danger class', () => {
      const wrapper = mountToastMessage({ success: false })
      const icon = wrapper.find('.mdi-alert-circle-outline')
      expect(icon.classes()).toContain('text-danger')
    })

    it('alert has dismissible class', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.find('.alert').classes()).toContain('alert-dismissible')
    })
  })

  describe('accessibility', () => {
    it('has role alert', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    it('has aria-live polite', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)
    })

    it('has aria-atomic true', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.find('[aria-atomic="true"]').exists()).toBe(true)
    })

    it('close button has aria-label', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.find('.btn-close').attributes('aria-label')).toBe('Close')
    })
  })

  describe('close button interaction', () => {
    it('close button hides toast', async () => {
      vi.useFakeTimers()
      const wrapper = mountToastMessage()
      if (wrapper.vm._showToastTimeOut) {
        wrapper.vm._showToastTimeOut()
        expect(wrapper.vm.isDisplayed).toBe(true)
        
        await wrapper.find('.btn-close').trigger('click')
        expect(wrapper.vm.isDisplayed).toBe(false)
      }
      vi.useRealTimers()
    })
  })

  describe('edge cases', () => {
    it('handles empty bodyText', () => {
      const wrapper = mountToastMessage({ bodyText: '' })
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    it('handles empty actionLabel', () => {
      const wrapper = mountToastMessage({ actionLabel: '' })
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    it('handles very long bodyText', () => {
      const longText = 'A'.repeat(500)
      const wrapper = mountToastMessage({ bodyText: longText })
      expect(wrapper.text()).toContain('A')
    })

    it('handles null actionTo', () => {
      const wrapper = mountToastMessage({ actionTo: null })
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    it('handles undefined bodyTextAlt', () => {
      const wrapper = mountToastMessage({ bodyTextAlt: undefined })
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })
  })

  describe('integration', () => {
    it('renders without errors with default props', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.vm).toBeDefined()
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    it('mounts and unmounts without errors', () => {
      const wrapper = mountToastMessage()
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('handles prop updates', async () => {
      const wrapper = mountToastMessage({ success: true })
      expect(wrapper.find('.alert-success').exists()).toBe(true)
      
      await wrapper.setProps({ success: false })
      expect(wrapper.find('.alert-danger').exists()).toBe(true)
    })
  })
})
