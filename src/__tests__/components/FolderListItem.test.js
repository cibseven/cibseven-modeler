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
import { createI18n } from 'vue-i18n'

import FolderListItem from '../../components/modeler/FolderListItem.vue'

const FOLDER = { id: 'folder-1', parentId: null, name: 'Invoicing' }

function mountItem(props = {}) {
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} } })
    return mount(FolderListItem, {
        props: { folder: FOLDER, isHovered: true, ...props },
        global: { plugins: [i18n] },
    })
}

describe('FolderListItem', () => {
    it('shows the folder name', () => {
        expect(mountItem().text()).toContain('Invoicing')
    })

    it('opens the folder when the row is clicked', async () => {
        const wrapper = mountItem()

        await wrapper.trigger('click')

        expect(wrapper.emitted('open')).toEqual([['folder-1']])
    })

    /** The row is reachable without a mouse, so it has to open from the keyboard too. */
    it('opens the folder on enter', async () => {
        const wrapper = mountItem()

        await wrapper.trigger('keyup.enter')

        expect(wrapper.emitted('open')).toEqual([['folder-1']])
    })

    it.each([
        ['mdi-rename-outline', 'rename'],
        ['mdi-folder-move-outline', 'move'],
        ['mdi-delete-outline', 'remove'],
    ])('emits %s as %s without opening the folder', async (icon, event) => {
        const wrapper = mountItem()

        await wrapper.find(`button.${icon}`).trigger('click')

        expect(wrapper.emitted(event)).toEqual([[FOLDER]])
        expect(wrapper.emitted('open')).toBeUndefined()
    })

    it('hides the actions until the row is hovered or focused', () => {
        const wrapper = mountItem({ isHovered: false })

        expect(wrapper.findAll('button.invisible')).toHaveLength(3)
    })

    it('shows them once it is', () => {
        expect(mountItem({ isHovered: true }).findAll('button.invisible')).toHaveLength(0)
    })
})
