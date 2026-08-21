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

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: k => k }) }))
const showToastTimeOut = vi.hoisted(() => vi.fn())

import useToast from '../../composables/useToast.js'

// Minimal host that wires the composable the documented way.
const Harness = {
    components: { ToastStub: { expose: ['_showToastTimeOut'], methods: { _showToastTimeOut: showToastTimeOut }, template: '<div />' } },
    setup: () => useToast(),
    template: '<ToastStub ref="toastRef" />',
}

describe('useToast', () => {
    afterEach(() => vi.restoreAllMocks())

    it('showError sets a localized error body, logs the error, and shows the toast', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const wrapper = mount(Harness)
        const err = new Error('boom')

        wrapper.vm.showError('templatesManagement.exportError', err)

        expect(wrapper.vm.toastProps.success).toBe(false)
        expect(wrapper.vm.toastProps.bodyText).toBe('templatesManagement.exportError.body')
        expect(spy).toHaveBeenCalledWith(err)
        expect(showToastTimeOut).toHaveBeenCalled()
    })

    it('showError works without an error argument (no logging)', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const wrapper = mount(Harness)

        wrapper.vm.showError('someKey')

        expect(wrapper.vm.toastProps.bodyText).toBe('someKey.body')
        expect(spy).not.toHaveBeenCalled()
    })
})
