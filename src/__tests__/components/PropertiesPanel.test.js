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
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PropertiesPanel from '../../components/layout/PropertiesPanel.vue'

const TOGGLE_STRIP_WIDTH = 24

function mountPanel(overrides = {}) {
    return mount(PropertiesPanel, {
        props: {
            parentWidth: 1000,
            minWidth: '300',
            isActiveTab: true,
            ...overrides,
        },
        global: {
            mocks: { $t: (k) => k },
        },
        attachTo: document.body,
    })
}

describe('PropertiesPanel collapse/expand toggle', () => {
    let wrapper

    beforeEach(() => {
        wrapper = mountPanel()
    })

    it('renders the toggle button', () => {
        const btn = wrapper.find('.panel-toggle-strip')
        expect(btn.exists()).toBe(true)
    })

    it('shows collapse icon when expanded', () => {
        const icon = wrapper.find('.panel-toggle-strip .mdi')
        expect(icon.classes()).toContain('mdi-chevron-right')
        expect(icon.classes()).not.toContain('mdi-chevron-left')
    })

    it('toggle button has aria-expanded="true" when expanded', () => {
        const btn = wrapper.find('.panel-toggle-strip')
        expect(btn.attributes('aria-expanded')).toBe('true')
    })

    it('panel content is visible when expanded', () => {
        const content = wrapper.find('.d-flex.flex-column.flex-grow-1')
        expect(content.isVisible()).toBe(true)
    })

    it('collapses panel when toggle button is clicked', async () => {
        const btn = wrapper.find('.panel-toggle-strip')
        await btn.trigger('click')

        // Content should now be hidden
        const content = wrapper.find('.d-flex.flex-column.flex-grow-1')
        expect(content.isVisible()).toBe(false)
    })

    it('shows expand icon after collapsing', async () => {
        const btn = wrapper.find('.panel-toggle-strip')
        await btn.trigger('click')

        const icon = wrapper.find('.panel-toggle-strip .mdi')
        expect(icon.classes()).toContain('mdi-chevron-left')
        expect(icon.classes()).not.toContain('mdi-chevron-right')
    })

    it('toggle button has aria-expanded="false" after collapsing', async () => {
        const btn = wrapper.find('.panel-toggle-strip')
        await btn.trigger('click')

        expect(btn.attributes('aria-expanded')).toBe('false')
    })

    it('emits changeWidth with slim width when collapsed', async () => {
        const btn = wrapper.find('.panel-toggle-strip')
        await btn.trigger('click')

        const emitted = wrapper.emitted('changeWidth') ?? []
        const lastEmit = emitted[emitted.length - 1]
        // Canvas width = parentWidth - TOGGLE_STRIP_WIDTH
        expect(lastEmit[0]).toBe(1000 - TOGGLE_STRIP_WIDTH)
    })

    it('expands panel again when toggle is clicked a second time', async () => {
        const btn = wrapper.find('.panel-toggle-strip')
        await btn.trigger('click') // collapse
        await btn.trigger('click') // expand

        const content = wrapper.find('.d-flex.flex-column.flex-grow-1')
        expect(content.isVisible()).toBe(true)
    })

    it('restores original width when expanded after collapse', async () => {
        const btn = wrapper.find('.panel-toggle-strip')
        await btn.trigger('click') // collapse
        await btn.trigger('click') // expand

        // The last changeWidth emit should be back to original (parentWidth - minWidth)
        const emitted = wrapper.emitted('changeWidth') ?? []
        const lastEmit = emitted[emitted.length - 1]
        expect(lastEmit[0]).toBe(1000 - 300)
    })

    it('resize handle is hidden when collapsed', async () => {
        const btn = wrapper.find('.panel-toggle-strip')
        await btn.trigger('click')

        const handle = wrapper.find('.resizable-l')
        expect(handle.isVisible()).toBe(false)
    })

    it('resize handle is visible when expanded', () => {
        const handle = wrapper.find('.resizable-l')
        expect(handle.isVisible()).toBe(true)
    })

    it('_restorePropertiesPanelWidth resets collapsed state and restores width', async () => {
        const btn = wrapper.find('.panel-toggle-strip')
        await btn.trigger('click') // collapse

        wrapper.vm._restorePropertiesPanelWidth()
        await wrapper.vm.$nextTick()

        const content = wrapper.find('.d-flex.flex-column.flex-grow-1')
        expect(content.isVisible()).toBe(true)
    })

    it('_resetPropertiesPanelWidth resets collapsed state', async () => {
        const btn = wrapper.find('.panel-toggle-strip')
        await btn.trigger('click') // collapse

        wrapper.vm._resetPropertiesPanelWidth()
        await wrapper.vm.$nextTick()

        // Content should be visible again (collapsed = false), width = 0
        const content = wrapper.find('.d-flex.flex-column.flex-grow-1')
        expect(content.isVisible()).toBe(true)
    })
})
