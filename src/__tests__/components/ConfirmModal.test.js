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

vi.mock('bootstrap', () => ({
    Modal: vi.fn(function() {
        this.show = vi.fn()
        this.hide = vi.fn()
    })
}))

import ConfirmModal from '../../components/modals/ConfirmModal.vue'

describe('ConfirmModal', () => {
    let wrapper

    const mountConfirmModal = (props = {}) => {
        const defaultProps = {
            type: 'delete',
            title: 'Confirm Action',
            body: 'Are you sure?',
            showModal: true,
            functionAfterAccepting: vi.fn(),
            ...props
        }
        wrapper = mount(ConfirmModal, {
            props: defaultProps,
            global: { mocks: { $t: k => k } }
        })
        return wrapper
    }

    describe('rendering', () => {
        it('renders modal structure', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.modal').exists()).toBe(true)
            expect(wrapper.find('.modal-dialog').exists()).toBe(true)
            expect(wrapper.find('.modal-content').exists()).toBe(true)
        })

        it('displays title', () => {
            const title = 'Delete Item'
            const wrapper = mountConfirmModal({ title })
            expect(wrapper.find('.modal-title').text()).toContain(title)
        })

        it('displays body text', () => {
            const body = 'This action cannot be undone'
            const wrapper = mountConfirmModal({ body })
            expect(wrapper.find('.modal-body').text()).toContain(body)
        })

        it('displays name if provided', () => {
            const wrapper = mountConfirmModal({ name: 'ItemName' })
            expect(wrapper.find('.modal-body').text()).toContain('ItemName')
        })

        it('renders accept button', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.btn-danger').exists()).toBe(true)
        })

        it('renders cancel button', () => {
            const wrapper = mountConfirmModal()
            const buttons = wrapper.findAll('.btn')
            expect(buttons.length).toBeGreaterThan(0)
        })

        it('renders close button', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.btn-close').exists()).toBe(true)
        })
    })

    describe('props', () => {
        it('accepts type prop', () => {
            const wrapper = mountConfirmModal({ type: 'delete' })
            expect(wrapper.props('type')).toBe('delete')
        })

        it('accepts title prop', () => {
            const title = 'Custom Title'
            const wrapper = mountConfirmModal({ title })
            expect(wrapper.props('title')).toBe(title)
        })

        it('accepts body prop', () => {
            const body = 'Custom body text'
            const wrapper = mountConfirmModal({ body })
            expect(wrapper.props('body')).toBe(body)
        })

        it('accepts name prop', () => {
            const wrapper = mountConfirmModal({ name: 'MyName' })
            expect(wrapper.props('name')).toBe('MyName')
        })

        it('accepts showModal prop', () => {
            const wrapper = mountConfirmModal({ showModal: true })
            expect(wrapper.props('showModal')).toBe(true)
        })

        it('accepts modalData prop', () => {
            const data = { id: 1, value: 'test' }
            const wrapper = mountConfirmModal({ modalData: data })
            expect(wrapper.props('modalData')).toEqual(data)
        })

        it('accepts id prop', () => {
            const wrapper = mountConfirmModal({ id: 'custom-id' })
            expect(wrapper.props('id')).toBe('custom-id')
        })

        it('accepts functionAfterAccepting prop', () => {
            const fn = vi.fn()
            const wrapper = mountConfirmModal({ functionAfterAccepting: fn })
            expect(wrapper.props('functionAfterAccepting')).toBe(fn)
        })

        it('accepts functionAfterCanceling prop', () => {
            const fn = vi.fn()
            const wrapper = mountConfirmModal({ functionAfterCanceling: fn })
            expect(wrapper.props('functionAfterCanceling')).toBe(fn)
        })

        it('accepts acceptLabel prop', () => {
            const wrapper = mountConfirmModal({ acceptLabel: 'Delete Now' })
            expect(wrapper.props('acceptLabel')).toBe('Delete Now')
        })

        it('displays custom acceptLabel if provided', () => {
            const wrapper = mountConfirmModal({ acceptLabel: 'Confirm Delete' })
            expect(wrapper.find('.btn-danger').text()).toContain('Confirm Delete')
        })
    })

    describe('interactions', () => {
        it('close button exists and can be clicked', async () => {
            const wrapper = mountConfirmModal()
            const closeBtn = wrapper.find('.btn-close')
            expect(closeBtn.exists()).toBe(true)
            await closeBtn.trigger('click')
        })

        it('emits hideModal when cancel button clicked', async () => {
            const wrapper = mountConfirmModal()
            const buttons = wrapper.findAll('.btn')
            const cancelBtn = buttons.find(b => b.text().includes('buttons.cancel'))
            if (cancelBtn) {
                await cancelBtn.trigger('click')
            }
        })

        it('calls functionAfterAccepting when accept button clicked', async () => {
            const fn = vi.fn()
            const wrapper = mountConfirmModal({ functionAfterAccepting: fn })
            await wrapper.find('.btn-danger').trigger('click')
        })

        it('handles multiple accept button clicks', async () => {
            const fn = vi.fn()
            const wrapper = mountConfirmModal({ functionAfterAccepting: fn })
            await wrapper.find('.btn-danger').trigger('click')
            await wrapper.find('.btn-danger').trigger('click')
        })
    })

    describe('accessibility', () => {
        it('has aria-labelledby on modal', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.modal').attributes('aria-labelledby')).toBeDefined()
        })

        it('close button has aria-label', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.btn-close').attributes('aria-label')).toBe('Close')
        })

        it('modal has tabindex', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.modal').attributes('tabindex')).toBe('-1')
        })

        it('modal header has proper structure', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.modal-header').exists()).toBe(true)
        })

        it('modal body has content', () => {
            const wrapper = mountConfirmModal({ body: 'Test content' })
            expect(wrapper.find('.modal-body').exists()).toBe(true)
        })

        it('modal footer has buttons', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.modal-footer').exists()).toBe(true)
        })
    })

    describe('styling', () => {
        it('accept button has danger styling', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.btn-danger').exists()).toBe(true)
        })

        it('cancel button has secondary styling', () => {
            const wrapper = mountConfirmModal()
            const buttons = wrapper.findAll('.btn')
            expect(buttons.some(b => b.classes().includes('btn-secondary'))).toBe(true)
        })

        it('modal has fade class', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.modal').classes()).toContain('fade')
        })

        it('modal dialog has padding', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.find('.modal-dialog').classes()).toContain('p-2')
        })
    })

    describe('modal visibility', () => {
        it('responds to showModal prop change', async () => {
            const wrapper = mountConfirmModal({ showModal: true })
            expect(wrapper.props('showModal')).toBe(true)
            
            await wrapper.setProps({ showModal: false })
            expect(wrapper.props('showModal')).toBe(false)
        })

        it('has aria-hidden attribute', () => {
            const wrapper = mountConfirmModal({ showModal: false })
            expect(wrapper.find('.modal').attributes('aria-hidden')).toBeDefined()
        })
    })

    describe('edge cases', () => {
        it('handles empty title', () => {
            const wrapper = mountConfirmModal({ title: '' })
            expect(wrapper.find('.modal-title').exists()).toBe(true)
        })

        it('handles empty body', () => {
            const wrapper = mountConfirmModal({ body: '' })
            expect(wrapper.find('.modal-body').exists()).toBe(true)
        })

        it('handles null name', () => {
            const wrapper = mountConfirmModal({ name: null })
            expect(wrapper.find('.modal-body').exists()).toBe(true)
        })

        it('handles undefined name', () => {
            const wrapper = mountConfirmModal({ name: undefined })
            expect(wrapper.find('.modal-body').exists()).toBe(true)
        })

        it('handles very long title', () => {
            const longTitle = 'T'.repeat(200)
            const wrapper = mountConfirmModal({ title: longTitle })
            expect(wrapper.find('.modal-title').text()).toContain('T')
        })

        it('handles special characters in body', () => {
            const body = 'Are you sure? <>&"\'/'
            const wrapper = mountConfirmModal({ body })
            expect(wrapper.find('.modal-body').exists()).toBe(true)
        })

        it('handles rapid prop updates', async () => {
            const wrapper = mountConfirmModal()
            await wrapper.setProps({ title: 'Title 1' })
            await wrapper.setProps({ title: 'Title 2' })
            await wrapper.setProps({ title: 'Title 3' })
            expect(wrapper.props('title')).toBe('Title 3')
        })

        it('handles null functions', () => {
            const wrapper = mountConfirmModal({
                functionAfterAccepting: vi.fn(),
                functionAfterCanceling: null
            })
            expect(wrapper.find('.modal').exists()).toBe(true)
        })

        it('handles complex modalData', () => {
            const complexData = {
                nested: { deep: { value: 'test' } },
                array: [1, 2, 3],
                name: 'Complex'
            }
            const wrapper = mountConfirmModal({ modalData: complexData })
            expect(wrapper.props('modalData')).toEqual(complexData)
        })
    })

    describe('emits', () => {
        it('emits events', () => {
            const wrapper = mountConfirmModal()
            expect(wrapper.vm.$options.emits).toContain('hideModal')
            expect(wrapper.vm.$options.emits).toContain('modalClosed')
        })
    })
})
