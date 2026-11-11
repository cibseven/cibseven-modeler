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
import { ref } from 'vue'

const routerMocks = vi.hoisted(() => ({ leaveGuard: null }))

vi.mock('vue-router', () => ({
    onBeforeRouteLeave: vi.fn(guard => { routerMocks.leaveGuard = guard }),
}))

import { useUnsavedChangesGuard } from '../../composables/useUnsavedChangesGuard.js'

const wrappers = []

function mountGuard(initiallyUnsaved = true) {
    const unsaved = ref(initiallyUnsaved)
    const Harness = {
        setup() {
            return { ...useUnsavedChangesGuard(() => unsaved.value), unsaved }
        },
        template: '<div />',
    }
    const wrapper = mount(Harness)
    wrappers.push(wrapper)
    return wrapper
}

const fireBeforeUnload = () => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    return event
}

describe('useUnsavedChangesGuard', () => {
    afterEach(() => {
        wrappers.splice(0).forEach(w => w.unmount())
        routerMocks.leaveGuard = null
    })

    describe('leaving the page', () => {
        it('asks the browser to confirm while there are unsaved changes', () => {
            mountGuard(true)
            expect(fireBeforeUnload().defaultPrevented).toBe(true)
        })

        it('lets the page go when everything is saved', () => {
            mountGuard(false)
            expect(fireBeforeUnload().defaultPrevented).toBe(false)
        })

        it('stops listening once unmounted', () => {
            mountGuard(true).unmount()
            wrappers.length = 0
            expect(fireBeforeUnload().defaultPrevented).toBe(false)
        })
    })

    describe('leaving the route', () => {
        it('lets the route go when everything is saved', () => {
            const wrapper = mountGuard(false)
            expect(routerMocks.leaveGuard()).toBe(true)
            expect(wrapper.vm.showLeaveModal).toBe(false)
        })

        it('shows the dialog and leaves once the user confirms', async () => {
            const wrapper = mountGuard(true)
            const leaving = routerMocks.leaveGuard()
            expect(wrapper.vm.showLeaveModal).toBe(true)
            wrapper.vm.confirmLeave()
            await expect(leaving).resolves.toBe(true)
        })

        it('stays when the user cancels', async () => {
            const wrapper = mountGuard(true)
            const leaving = routerMocks.leaveGuard()
            wrapper.vm.cancelLeave()
            await expect(leaving).resolves.toBe(false)
        })

        it('cancels a pending navigation when another one starts', async () => {
            const wrapper = mountGuard(true)
            const first = routerMocks.leaveGuard()
            const second = routerMocks.leaveGuard()
            await expect(first).resolves.toBe(false)
            wrapper.vm.confirmLeave()
            await expect(second).resolves.toBe(true)
        })

        it('cancels a pending navigation on unmount', async () => {
            const wrapper = mountGuard(true)
            const leaving = routerMocks.leaveGuard()
            wrapper.unmount()
            wrappers.length = 0
            await expect(leaving).resolves.toBe(false)
        })
    })
})
