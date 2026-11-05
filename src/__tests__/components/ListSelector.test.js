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

vi.mock('min-dash', () => ({
  debounce: (fn) => fn
}))

import ListSelector from '../../components/modals/ListSelector.vue'

describe('ListSelector', () => {
  const defaultProps = {
    showModal: false,
    rowTemplate: [
      { id: 1, name: 'Item 1', version: '1.0' },
      { id: 2, name: 'Item 2', version: '2.0' }
    ],
    typeOfSelector: 'templates',
    headers: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'version', label: 'Version', sortable: true }
    ],
    showHeaders: true,
    sortBy: null,
    sortDesc: false
  }

  const mountListSelector = (props = {}) => {
    return mount(ListSelector, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: ['CibsevenTable'],
        mocks: { $t: (k) => k }
      }
    })
  }

  describe('rendering', () => {
    it('renders modal component', () => {
      const wrapper = mountListSelector()
      expect(wrapper.vm).toBeDefined()
    })

    it('renders search input', () => {
      const wrapper = mountListSelector()
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    })

    it('renders search icon', () => {
      const wrapper = mountListSelector()
      expect(wrapper.find('.mdi-magnify').exists()).toBe(true)
    })

    it('renders close button', () => {
      const wrapper = mountListSelector()
      expect(wrapper.find('.btn-close').exists()).toBe(true)
    })
  })

  describe('props', () => {
    it('accepts showModal prop', () => {
      const wrapper = mountListSelector({ showModal: true })
      expect(wrapper.props('showModal')).toBe(true)
    })

    it('accepts rowTemplate prop', () => {
      const wrapper = mountListSelector()
      expect(wrapper.props('rowTemplate')).toEqual(defaultProps.rowTemplate)
    })

    it('accepts typeOfSelector prop', () => {
      const wrapper = mountListSelector({ typeOfSelector: 'changeVersion' })
      expect(wrapper.props('typeOfSelector')).toBe('changeVersion')
    })

    it('accepts headers prop', () => {
      const wrapper = mountListSelector()
      expect(wrapper.props('headers')).toEqual(defaultProps.headers)
    })

    it('accepts showHeaders prop', () => {
      const wrapper = mountListSelector({ showHeaders: false })
      expect(wrapper.props('showHeaders')).toBe(false)
    })

    it('accepts sortBy prop', () => {
      const wrapper = mountListSelector({ sortBy: 'name' })
      expect(wrapper.props('sortBy')).toBe('name')
    })

    it('accepts sortDesc prop', () => {
      const wrapper = mountListSelector({ sortDesc: true })
      expect(wrapper.props('sortDesc')).toBe(true)
    })
  })

  describe('empty state', () => {
    it('computes empty state for templates', () => {
      const wrapper = mountListSelector({ typeOfSelector: 'templates' })
      expect(wrapper.vm.emptyStateText).toBe('noTemplates')
    })

    it('computes empty state for changeVersion', () => {
      const wrapper = mountListSelector({ typeOfSelector: 'changeVersion' })
      expect(wrapper.vm.emptyStateText).toBe('noVersions')
    })

    it('computes default empty state', () => {
      const wrapper = mountListSelector({ typeOfSelector: 'other' })
      expect(wrapper.vm.emptyStateText).toBe('noItems')
    })
  })

  describe('exposed methods', () => {
    it('exposes _hideModal method', () => {
      const wrapper = mountListSelector()
      expect(wrapper.vm._hideModal).toBeDefined()
    })
  })

  describe('emits', () => {
    it('defines toggleModalListSelector event', () => {
      const wrapper = mountListSelector()
      expect(wrapper.vm.$options.emits).toContain('toggleModalListSelector')
    })

    it('defines itemSelected event', () => {
      const wrapper = mountListSelector()
      expect(wrapper.vm.$options.emits).toContain('itemSelected')
    })
  })

  describe('integration', () => {
    it('renders without errors with default props', () => {
      const wrapper = mountListSelector()
      expect(wrapper.vm).toBeDefined()
    })

    it('mounts and unmounts without errors', () => {
      const wrapper = mountListSelector()
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('handles prop updates', async () => {
      const wrapper = mountListSelector()
      await wrapper.setProps({ showHeaders: false })
      expect(wrapper.props('showHeaders')).toBe(false)
    })

    it('handles empty rowTemplate', () => {
      const wrapper = mountListSelector({ rowTemplate: [] })
      expect(wrapper.props('rowTemplate')).toEqual([])
    })

    it('handles rowTemplate with multiple items', () => {
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ]
      const wrapper = mountListSelector({ rowTemplate: items })
      expect(wrapper.props('rowTemplate')).toEqual(items)
    })
  })
})
