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
import { mount } from '@vue/test-utils'

vi.mock('bootstrap', () => ({ Modal: vi.fn(() => ({ show: vi.fn(), hide: vi.fn() })), Tooltip: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: k => k }) }))

import TabNav from '../../components/layout/TabNav.vue'

const TAB = { keyOfTabNav: 'k0', key: 'k0', id: 'id0', name: 'p0', type: 'bpmn-c7', canSave: false }

let wrapper
const mountNav = (tabNavList = [TAB]) => {
    wrapper = mount(TabNav, {
        props: { tabNavList, activeTab: 0, editorXML: [''], tabNavWidth: 800 },
        attachTo: document.body,
        global: { mocks: { $t: k => k } },
    })
    return wrapper
}

afterEach(() => wrapper?.unmount())

describe('TabNav accessibility', () => {
    it('exposes the tabs container as a tablist', () => {
        expect(mountNav().find('ul[role="tablist"]').exists()).toBe(true)
    })

    it('the close-all button has an accessible label', () => {
        const btn = mountNav().get('[aria-label="buttons.closeAllTabs"]')
        expect(btn.element.tagName).toBe('BUTTON')
    })

    it('the overflow dropdown menu uses menu semantics', () => {
        expect(mountNav().find('.dropdown-menu[role="menu"]').exists()).toBe(true)
    })
})
