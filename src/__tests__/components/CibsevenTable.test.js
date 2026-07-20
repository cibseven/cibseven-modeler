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

import CibsevenTable from '../../components/CibsevenTable.vue'

describe('CibsevenTable', () => {
  const defaultProps = {
    items: [
      { id: 1, name: 'Item 1', status: 'active' },
      { id: 2, name: 'Item 2', status: 'inactive' },
      { id: 3, name: 'Item 3', status: 'active' }
    ],
    fields: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'status', label: 'Status', sortable: false }
    ]
  }

  const mountTable = (props = {}) => {
    return mount(CibsevenTable, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $t: (k) => k }
      }
    })
  }

  describe('rendering', () => {
    it('renders table element', () => {
      const wrapper = mountTable()
      expect(wrapper.find('table').exists()).toBe(true)
    })

    it('renders thead with headers', () => {
      const wrapper = mountTable()
      expect(wrapper.find('thead').exists()).toBe(true)
      expect(wrapper.findAll('th').length).toBe(3)
    })

    it('renders tbody with rows', () => {
      const wrapper = mountTable()
      expect(wrapper.find('tbody').exists()).toBe(true)
      expect(wrapper.findAll('tbody tr').length).toBe(3)
    })

    it('renders correct column headers', () => {
      const wrapper = mountTable()
      const headers = wrapper.findAll('th')
      expect(headers[0].text()).toContain('ID')
      expect(headers[1].text()).toContain('Name')
      expect(headers[2].text()).toContain('Status')
    })

    it('renders correct cell data', () => {
      const wrapper = mountTable()
      const rows = wrapper.findAll('tbody tr')
      const firstRow = rows[0]
      expect(firstRow.text()).toContain('1')
      expect(firstRow.text()).toContain('Item 1')
    })

    it('hides headers when showHeaders is false', () => {
      const wrapper = mountTable({ showHeaders: false })
      expect(wrapper.find('thead').exists()).toBe(false)
    })

    it('displays empty state when provided', () => {
      const wrapper = mount(CibsevenTable, {
        props: {
          items: [],
          fields: defaultProps.fields,
          showHeaders: true
        },
        global: {
          mocks: { $t: (k) => k }
        },
        slots: {
          emptyState: '<div class="empty-state">No items</div>'
        }
      })
      expect(wrapper.find('.empty-state').text()).toBe('No items')
    })
  })

  describe('props', () => {
    it('accepts items prop', () => {
      const wrapper = mountTable()
      expect(wrapper.props('items')).toEqual(defaultProps.items)
    })

    it('accepts fields prop', () => {
      const wrapper = mountTable()
      expect(wrapper.props('fields')).toEqual(defaultProps.fields)
    })

    it('accepts tableClass prop', () => {
      const wrapper = mountTable({ tableClass: 'custom-class' })
      expect(wrapper.find('table').classes()).toContain('custom-class')
    })

    it('accepts theadClass prop', () => {
      const wrapper = mountTable({ theadClass: 'thead-custom' })
      expect(wrapper.find('thead').classes()).toContain('thead-custom')
    })

    it('accepts striped prop', () => {
      const wrapper = mountTable({ striped: true })
      expect(wrapper.find('table').classes()).toContain('table-striped')
    })

    it('does not apply striped when no items', () => {
      const wrapper = mountTable({ items: [], striped: true })
      expect(wrapper.find('table').classes().includes('table-striped')).toBe(false)
    })

    it('accepts sortBy prop', () => {
      const wrapper = mountTable({ sortBy: 'name' })
      expect(wrapper.vm.sortKey).toBe('name')
    })

    it('accepts sortDesc prop', () => {
      const wrapper = mountTable({ sortDesc: true })
      expect(wrapper.vm.sortOrder).toBe(-1)
    })

    it('accepts showHeaders prop', () => {
      const wrapper = mountTable({ showHeaders: false })
      expect(wrapper.props('showHeaders')).toBe(false)
    })

    it('accepts clickableRows prop', () => {
      const wrapper = mountTable({ clickableRows: false })
      expect(wrapper.props('clickableRows')).toBe(false)
    })
  })

  describe('sorting', () => {
    it('sorts items by column on header click', async () => {
      const wrapper = mountTable()
      const headers = wrapper.findAll('th')
      await headers[0].trigger('click')
      
      expect(wrapper.vm.sortKey).toBe('id')
    })

    it('reverses sort order on second click', async () => {
      const wrapper = mountTable()
      const headers = wrapper.findAll('th')
      
      await headers[0].trigger('click')
      expect(wrapper.vm.sortOrder).toBe(1)
      
      await headers[0].trigger('click')
      expect(wrapper.vm.sortOrder).toBe(-1)
    })

    it('does not sort non-sortable columns', async () => {
      const wrapper = mountTable()
      const headers = wrapper.findAll('th')
      const initialSortKey = wrapper.vm.sortKey
      
      await headers[2].trigger('click') // status column (sortable: false)
      expect(wrapper.vm.sortKey).toBe(initialSortKey)
    })

    it('displays sort indicator for sorted column', async () => {
      const wrapper = mountTable()
      const headers = wrapper.findAll('th')
      
      await headers[0].trigger('click')
      await wrapper.vm.$nextTick()
      
      const sortIcon = headers[0].find('i')
      expect(sortIcon.exists()).toBe(true)
    })

    it('sorts in ascending order initially', async () => {
      const wrapper = mountTable()
      const headers = wrapper.findAll('th')
      
      await headers[0].trigger('click')
      const sortedItems = wrapper.vm.sortedItems
      expect(sortedItems[0].id).toBe(1)
    })

    it('sorts in descending order on second click', async () => {
      const wrapper = mountTable()
      const headers = wrapper.findAll('th')
      
      await headers[0].trigger('click')
      await headers[0].trigger('click')
      const sortedItems = wrapper.vm.sortedItems
      expect(sortedItems[0].id).toBe(3)
    })
  })

  describe('row interaction', () => {
    it('emits rowSelected on row click', async () => {
      const wrapper = mountTable()
      const rows = wrapper.findAll('tbody tr')
      
      await rows[0].trigger('click')
      
      expect(wrapper.emitted('rowSelected')).toBeTruthy()
      expect(wrapper.emitted('rowSelected')[0][0]).toEqual(defaultProps.items[0])
    })

    it('emits mouseenter on row hover', async () => {
      const wrapper = mountTable()
      const rows = wrapper.findAll('tbody tr')
      
      await rows[0].trigger('mouseenter')
      
      expect(wrapper.emitted('mouseenter')).toBeTruthy()
      expect(wrapper.emitted('mouseenter')[0][0]).toEqual(defaultProps.items[0])
    })

    it('emits mouseleave on row leave', async () => {
      const wrapper = mountTable()
      const rows = wrapper.findAll('tbody tr')
      
      await rows[0].trigger('mouseleave')
      
      expect(wrapper.emitted('mouseleave')).toBeTruthy()
    })

    it('applies clickable rows styling when enabled', () => {
      const wrapper = mountTable({ clickableRows: true })
      const rows = wrapper.findAll('tbody tr')
      expect(rows[0].classes()).toContain('cursor-pointer')
    })

    it('does not apply clickable styling when disabled', () => {
      const wrapper = mountTable({ clickableRows: false })
      const rows = wrapper.findAll('tbody tr')
      expect(rows[0].classes().includes('cursor-pointer')).toBe(false)
    })
  })

  describe('table styling', () => {
    it('applies table class', () => {
      const wrapper = mountTable({ tableClass: 'my-table' })
      expect(wrapper.find('table').classes()).toContain('my-table')
    })

    it('applies fixed layout', () => {
      const wrapper = mountTable()
      const style = wrapper.find('table').attributes('style')
      expect(style).toContain('table-layout: fixed')
      expect(style).toContain('width: 100%')
    })

    it('applies d-flex to header rows', () => {
      const wrapper = mountTable()
      const headerRow = wrapper.find('thead tr')
      expect(headerRow.classes()).toContain('d-flex')
    })

    it('applies d-flex to body rows', () => {
      const wrapper = mountTable()
      const bodyRows = wrapper.findAll('tbody tr')
      expect(bodyRows[0].classes()).toContain('d-flex')
    })
  })

  describe('empty state', () => {
    it('shows empty state when no items', () => {
      const wrapper = mount(CibsevenTable, {
        props: {
          items: [],
          fields: defaultProps.fields
        },
        global: {
          mocks: { $t: (k) => k }
        },
        slots: {
          emptyState: '<div class="empty">No data</div>'
        }
      })
      expect(wrapper.find('.empty').exists()).toBe(true)
    })

    it('does not show empty state when items exist', () => {
      const wrapper = mount(CibsevenTable, {
        props: {
          items: defaultProps.items,
          fields: defaultProps.fields
        },
        global: {
          mocks: { $t: (k) => k }
        },
        slots: {
          emptyState: '<div class="empty">No data</div>'
        }
      })
      expect(wrapper.find('.empty').exists()).toBe(false)
    })
  })

  describe('slot rendering', () => {
    it('renders cell slot when provided', () => {
      const wrapper = mount(CibsevenTable, {
        props: defaultProps,
        global: {
          mocks: { $t: (k) => k }
        },
        slots: {
          'cell(name)': '<span class="custom-name">{{ value }}</span>'
        }
      })
      // Cell slots are rendered
      expect(wrapper.find('td').exists()).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles empty items array', () => {
      const wrapper = mountTable({ items: [] })
      expect(wrapper.find('tbody').exists()).toBe(true)
      expect(wrapper.findAll('tbody tr').length).toBeLessThanOrEqual(1)
    })

    it('handles empty fields array', () => {
      const wrapper = mountTable({ fields: [] })
      expect(wrapper.find('table').exists()).toBe(true)
    })

    it('handles items with missing properties', () => {
      const wrapper = mountTable({
        items: [{ id: 1 }, { id: 2, name: 'Item 2' }]
      })
      expect(wrapper.findAll('tbody tr').length).toBe(2)
    })

    it('handles very large items array', () => {
      const largeItems = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        status: 'active'
      }))
      const wrapper = mountTable({ items: largeItems })
      expect(wrapper.findAll('tbody tr').length).toBe(1000)
    })

    it('handles special characters in cell data', () => {
      const wrapper = mountTable({
        items: [{ id: 1, name: '<script>alert("xss")</script>', status: 'active' }]
      })
      expect(wrapper.text()).toContain('script')
    })
  })

  describe('integration', () => {
    it('renders without errors with default props', () => {
      const wrapper = mountTable()
      expect(wrapper.vm).toBeDefined()
      expect(wrapper.find('table').exists()).toBe(true)
    })

    it('mounts and unmounts without errors', () => {
      const wrapper = mountTable()
      expect(wrapper.find('table').exists()).toBe(true)
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('handles prop updates', async () => {
      const wrapper = mountTable()
      const newItems = [{ id: 99, name: 'New Item', status: 'active' }]
      
      await wrapper.setProps({ items: newItems })
      
      expect(wrapper.findAll('tbody tr').length).toBe(1)
      expect(wrapper.find('tbody').text()).toContain('New Item')
    })
  })
})
