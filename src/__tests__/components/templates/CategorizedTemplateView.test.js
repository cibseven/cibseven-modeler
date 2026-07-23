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
import { mountWithI18n } from '../../helpers/modelerTestUtils.js'
import CategorizedTemplateView from '../../../components/templates/CategorizedTemplateView.vue'

const mockData = {
    'bpmn:ServiceTask': {
        undefined: [{
            name: 'Alpha',
            version: '1',
            templateVersion: 1,
            template: { id: 'tmpl-1', active: true },
            tooltip: 'Tooltip text',
        }],
        MyGroup: [{
            name: 'Beta',
            version: '2',
            templateVersion: 2,
            template: { id: 'tmpl-2', active: false },
            tooltip: '',
        }],
    },
}

describe('CategorizedTemplateView', () => {
    it('renders template groups and cards', () => {
        const wrapper = mountWithI18n(CategorizedTemplateView, {
            props: { categorizedTemplates: mockData },
        })

        expect(wrapper.text()).toContain('Alpha')
        expect(wrapper.text()).toContain('Beta')
        expect(wrapper.text()).toContain('templatesManagement.templatesCount')
    })

    it('shows others label for undefined group name', () => {
        const wrapper = mountWithI18n(CategorizedTemplateView, {
            props: { categorizedTemplates: mockData },
        })

        expect(wrapper.text()).toContain('templatesManagement.others')
    })

    it('shows empty state when no templates are provided', () => {
        const wrapper = mountWithI18n(CategorizedTemplateView, {
            props: { categorizedTemplates: {} },
        })

        expect(wrapper.text()).toContain('noTemplates')
    })

    it('emits visibility and action events from buttons', async () => {
        const wrapper = mountWithI18n(CategorizedTemplateView, {
            props: { categorizedTemplates: mockData },
        })

        const hideButtons = wrapper.findAll('button[title="templatesManagement.hideGroup"]')
        await hideButtons[0].trigger('click')
        expect(wrapper.emitted('setGroupVisibility')?.[0]).toEqual(['bpmn:ServiceTask', 'undefined', false])

        const editButtons = wrapper.findAll('button[title="templatesManagement.edit"]')
        await editButtons[0].trigger('click')
        expect(wrapper.emitted('editTemplate')?.[0]).toEqual([mockData['bpmn:ServiceTask'].undefined[0].template])

        const exportButtons = wrapper.findAll('button[title="templatesManagement.export"]')
        await exportButtons[0].trigger('click')
        expect(wrapper.emitted('exportSingleTemplate')?.[0]).toEqual([mockData['bpmn:ServiceTask'].undefined[0].template])

        const visibilityButtons = wrapper.findAll('button[title="templatesManagement.visible"], button[title="templatesManagement.hidden"]')
        await visibilityButtons[0].trigger('click')
        expect(wrapper.emitted('toggleTemplateVisibility')?.[0]).toEqual([mockData['bpmn:ServiceTask'].undefined[0].template])
    })
})
