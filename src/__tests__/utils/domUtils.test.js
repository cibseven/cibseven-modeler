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
import { waitForElement } from '../../utils/domUtils.js'

describe('waitForElement', () => {

    afterEach(() => {
        vi.useRealTimers()
        document.body.innerHTML = ''
    })

    it('resolves null when container is null', async () => {
        expect(await waitForElement(null, '.anything')).toBe(null)
    })

    it('resolves immediately when the element is already present', async () => {
        const container = document.createElement('div')
        const child = document.createElement('span')
        child.className = 'target'
        container.appendChild(child)

        expect(await waitForElement(container, '.target')).toBe(child)
    })

    it('resolves once the element appears later (observed mutation)', async () => {
        const container = document.createElement('div')
        document.body.appendChild(container)

        const promise = waitForElement(container, '.target')

        // Element is not there yet; add it after starting the wait.
        const child = document.createElement('span')
        child.className = 'target'
        container.appendChild(child)

        expect(await promise).toBe(child)
    })

    it('resolves with a nested element appearing deep in the subtree', async () => {
        const container = document.createElement('div')
        document.body.appendChild(container)

        const promise = waitForElement(container, '#deep')

        const wrapper = document.createElement('div')
        const inner = document.createElement('div')
        inner.id = 'deep'
        wrapper.appendChild(inner)
        container.appendChild(wrapper)

        expect(await promise).toBe(inner)
    })

    it('resolves null on timeout when the element never appears', async () => {
        vi.useFakeTimers()
        const container = document.createElement('div')

        const promise = waitForElement(container, '.missing', { timeout: 1000 })
        vi.advanceTimersByTime(1000)

        expect(await promise).toBe(null)
    })

    it('uses the default 2000ms timeout when none is provided', async () => {
        vi.useFakeTimers()
        const container = document.createElement('div')

        const promise = waitForElement(container, '.missing')

        // Not yet elapsed at 1999ms — advance the rest and it resolves.
        vi.advanceTimersByTime(2000)
        expect(await promise).toBe(null)
    })
})
