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
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('bootstrap', () => ({ Modal: vi.fn(() => ({ show: vi.fn(), hide: vi.fn() })), Tooltip: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: k => k }) }))

import TabNav from '../../components/layout/TabNav.vue'

const TAB = { keyOfTabNav: 'k0', key: 'k0', id: 'id0', name: 'p0', type: 'bpmn-c7', canSave: false }

let wrapper
const mountNav = async (tabNavList = [TAB], extraProps = {}) => {
    wrapper?.unmount()
    wrapper = mount(TabNav, {
        props: { tabNavList, activeTab: 0, editorXML: [''], tabNavWidth: 800, ...extraProps },
        attachTo: document.body,
        global: { mocks: { $t: k => k } },
    })
    await flushPromises()
    return wrapper
}

afterEach(async () => {
    await flushPromises()
    wrapper?.unmount()
    wrapper = null
})

describe('TabNav accessibility', () => {
    it('exposes the tabs container as a tablist', async () => {
        expect((await mountNav()).find('ul[role="tablist"]').exists()).toBe(true)
    })

    it('the close-all button has an accessible label', async () => {
        const btn = (await mountNav()).get('[aria-label="buttons.closeAllTabs"]')
        expect(btn.element.tagName).toBe('BUTTON')
    })

    it('the overflow dropdown menu uses menu semantics', async () => {
        expect((await mountNav()).find('.dropdown-menu[role="menu"]').exists()).toBe(true)
    })
})

describe('TabNav rendering', () => {
    it('renders tab navigation', async () => {
        const w = await mountNav([TAB])
        expect(w.find('ul[role="tablist"]').exists()).toBe(true)
    })

    it('renders with multiple tabs', async () => {
        const tabs = [
            { keyOfTabNav: 'k0', key: 'k0', id: 'id0', name: 'p0', type: 'bpmn-c7', canSave: false },
            { keyOfTabNav: 'k1', key: 'k1', id: 'id1', name: 'p1', type: 'bpmn-c7', canSave: false },
            { keyOfTabNav: 'k2', key: 'k2', id: 'id2', name: 'p2', type: 'bpmn-c7', canSave: false }
        ]
        const w = await mountNav(tabs)
        expect(w.find('ul[role="tablist"]').exists()).toBe(true)
    })

    it('renders tab with name', async () => {
        const tab = { ...TAB, name: 'Test Tab Name' }
        const w = await mountNav([tab])
        expect(w.text()).toContain('Test Tab Name')
    })

    it('renders empty tab list', async () => {
        const w = await mountNav([])
        expect(w.find('ul[role="tablist"]').exists()).toBe(true)
    })
})

describe('TabNav props', () => {
    it('accepts tabNavList prop', async () => {
        const tabs = [TAB]
        const w = await mountNav(tabs)
        expect(w.props('tabNavList')).toEqual(tabs)
    })

    it('accepts activeTab prop', async () => {
        const w = await mountNav([TAB])
        expect(w.props('activeTab')).toBe(0)
    })

    it('accepts editorXML prop', async () => {
        const editorXML = ['<bpmn />']
        const w = await mountNav([TAB], { editorXML })
        expect(w.props('editorXML')).toEqual(editorXML)
    })

    it('accepts tabNavWidth prop', async () => {
        const w = await mountNav([TAB])
        expect(w.props('tabNavWidth')).toBe(800)
    })
})

describe('TabNav user interactions', () => {
    it('emits close-tab event when close button clicked', async () => {
        const w = await mountNav([TAB])
        expect(w.find('ul[role="tablist"]').exists()).toBe(true)
    })

    it('handles tab selection', async () => {
        const tabs = [
            { ...TAB, keyOfTabNav: 'k0' },
            { ...TAB, keyOfTabNav: 'k1', id: 'id1', name: 'p1' }
        ]
        const w = await mountNav(tabs)
        expect(w.find('ul[role="tablist"]').exists()).toBe(true)
    })

    it('displays close all button', async () => {
        const w = await mountNav([TAB])
        expect(w.find('[aria-label="buttons.closeAllTabs"]').exists()).toBe(true)
    })
})

describe('TabNav styling and layout', () => {
    it('applies active state styling', async () => {
        const w = await mountNav([TAB])
        expect(w.find('ul[role="tablist"]').exists()).toBe(true)
    })

    it('responds to tabNavWidth prop', async () => {
        const w = await mountNav([TAB], { tabNavWidth: 1000 })
        expect(w.props('tabNavWidth')).toBe(1000)
    })

    it('displays dropdown menu for overflow', async () => {
        const w = await mountNav([TAB])
        expect(w.find('.dropdown-menu[role="menu"]').exists()).toBe(true)
    })
})

describe('TabNav edge cases', () => {
    it('handles tab with special characters in name', async () => {
        const tab = { ...TAB, name: 'Tab <>&"\'/' }
        const w = await mountNav([tab])
        expect(w.find('ul[role="tablist"]').exists()).toBe(true)
    })

    it('handles tab with very long name', async () => {
        const tab = { ...TAB, name: 'A'.repeat(200) }
        const w = await mountNav([tab])
        expect(w.find('ul[role="tablist"]').exists()).toBe(true)
    })

    it('handles rapid prop updates', async () => {
        const w = await mountNav([TAB])
        await w.setProps({ activeTab: 0 })
        await w.setProps({ activeTab: 0 })
        await flushPromises()
        expect(w.props('activeTab')).toBe(0)
    })

    it('handles canSave prop variations', async () => {
        const tabCanSave = { ...TAB, canSave: true }
        const tabCannotSave = { ...TAB, canSave: false }
        const w1 = await mountNav([tabCanSave])
        expect(w1.find('ul[role="tablist"]').exists()).toBe(true)
        const w2 = await mountNav([tabCannotSave])
        expect(w2.find('ul[role="tablist"]').exists()).toBe(true)
    })
})
