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
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// bootstrap is only used for the Modal/Tooltip side effects in onMounted — stub it out.
vi.mock('bootstrap', () => ({
  Modal: class { show() {} hide() {} },
  Tooltip: class {},
}))

// The picker reads its list from this getter (all active templates, category tree).
const categorized = {
  'bpmn:ServiceTask': {
    GroupA: [
      { id: 'tmpl-1', name: 'One', extern: false, metaKeys: [], templateVersion: '1.0', tooltip: '' },
      { id: 'tmpl-2', name: 'Two', extern: false, metaKeys: [], templateVersion: '1.0', tooltip: '' },
    ],
  },
}
vi.mock('vuex', () => ({
  useStore: () => ({ getters: { 'modeler/elementTemplates/categorizedTemplateData': categorized } }),
}))

import ElementTemplatesModal from '../../components/modals/ElementTemplatesModal.vue'

const serviceTaskEvent = { element: { id: 'el-1', type: 'bpmn:ServiceTask' } }

function mountModal() {
  return mount(ElementTemplatesModal, {
    props: { tabElement: { id: 'tab-1' } },
    global: { mocks: { $t: k => k } },
    attachTo: document.body,
  })
}

describe('ElementTemplatesModal — picker restricted to loaded templates', () => {
  let wrapper
  afterEach(() => wrapper?.unmount())

  it('lists all templates when no applicable set is given', async () => {
    wrapper = mountModal()
    wrapper.vm.show(serviceTaskEvent)
    await nextTick()
    expect(wrapper.text()).toContain('tmpl-1')
    expect(wrapper.text()).toContain('tmpl-2')
  })

  it('hides templates not loaded in the modeler (config-excluded)', async () => {
    wrapper = mountModal()
    wrapper.vm.show(serviceTaskEvent, ['tmpl-1']) // modeler only has tmpl-1
    await nextTick()
    expect(wrapper.text()).toContain('tmpl-1')
    expect(wrapper.text()).not.toContain('tmpl-2')
  })
})
