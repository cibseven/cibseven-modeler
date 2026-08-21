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
import { mount, flushPromises } from '@vue/test-utils'
import TabNavItem from '../../components/layout/TabNavItem.vue'

const mountItem = (overrides = {}) => mount(TabNavItem, {
    props: {
        isDashboard: false,
        isVisible: true,
        tabNavList: { type: 'bpmn-c7', canSave: false },
        name: 'proc',
        processkey: 'proc',
        keyOfTabNav: 'k1',
        index: 0,
        activeTab: 0,
        ...overrides,
    },
    global: { mocks: { $t: k => k } },
})

describe('TabNavItem accessibility', () => {
    it('the tab is keyboard-focusable and exposes role="tab"', () => {
        const tab = mountItem({ activeTab: 0, index: 0 }).find('[role="tab"]')
        expect(tab.attributes('tabindex')).toBe('0')
    })

    it('aria-selected reflects whether the tab is the active one', () => {
        expect(mountItem({ activeTab: 0, index: 0 }).find('[role="tab"]').attributes('aria-selected')).toBe('true')
        expect(mountItem({ activeTab: 1, index: 0 }).find('[role="tab"]').attributes('aria-selected')).toBe('false')
    })

    it('the close button is keyboard-focusable with an accessible label', () => {
        const close = mountItem().find('.mdi-close')
        expect(close.attributes('tabindex')).toBe('0')
        expect(close.attributes('aria-label')).toBe('buttons.close')
    })
})

describe('TabNavItem closeTab', () => {
    it('is exposed so the overflow dropdown can close a hidden tab', async () => {
        const w = mountItem()
        w.vm.closeTab()
        await flushPromises()
        expect(w.emitted('removeSelectedTab')).toEqual([[0]])
    })

    it('asks for confirmation instead of closing when there are unsaved changes', async () => {
        const w = mountItem({ tabNavList: { type: 'bpmn-c7', canSave: true } })
        w.vm.closeTab()
        await flushPromises()
        expect(w.emitted('showModalMessage')).toEqual([[0]])
        expect(w.emitted('removeSelectedTab')).toBeUndefined()
    })

    it('runs the session hook before closing a diagram tab', async () => {
        const closeSessionHook = vi.fn()
        const w = mount(TabNavItem, {
            props: { isDashboard: false, isVisible: true, name: 'proc', processkey: 'proc',
                keyOfTabNav: 'k1', index: 0, activeTab: 0,
                tabNavList: { type: 'bpmn-c7', canSave: false, sessionId: 's1' } },
            global: { mocks: { $t: k => k }, provide: { closeSessionHook } },
        })
        w.vm.closeTab()
        await flushPromises()
        expect(closeSessionHook).toHaveBeenCalledWith('s1', 'bpmn-c7')
        expect(w.emitted('removeSelectedTab')).toEqual([[0]])
    })

    it('runs the form session hook for form tabs', async () => {
        const closeFormSessionHook = vi.fn()
        const w = mount(TabNavItem, {
            props: { isDashboard: false, isVisible: true, name: 'form', processkey: 'form',
                keyOfTabNav: 'k1', index: 0, activeTab: 0,
                tabNavList: { type: 'form', canSave: false, sessionId: 's2' } },
            global: { mocks: { $t: k => k }, provide: { closeFormSessionHook } },
        })
        w.vm.closeTab()
        await flushPromises()
        expect(closeFormSessionHook).toHaveBeenCalledWith('s2', 'form')
        expect(w.emitted('removeSelectedTab')).toEqual([[0]])
    })
})
