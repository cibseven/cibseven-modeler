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
import EventBus from 'diagram-js/lib/core/EventBus'
import { withoutResult } from '../../utils/diagramEvents.js'

// The overlays follow a moved element from an element.changed listener of priority 500
const OVERLAYS_PRIORITY = 500

describe('withoutResult', () => {
	it('shows the problem: an async listener stops the event for the listeners after it', () => {
		const eventBus = new EventBus()
		const overlays = vi.fn()
		eventBus.on('element.changed', async () => {})
		eventBus.on('element.changed', OVERLAYS_PRIORITY, overlays)

		eventBus.fire('element.changed', { element: { id: 'Task_1' } })

		expect(overlays).not.toHaveBeenCalled()
	})

	it('lets the event reach the listeners after an async one', () => {
		const eventBus = new EventBus()
		const overlays = vi.fn()
		const listener = vi.fn(async () => {})
		eventBus.on('element.changed', withoutResult(listener))
		eventBus.on('element.changed', OVERLAYS_PRIORITY, overlays)

		const event = { element: { id: 'Task_1' } }
		eventBus.fire('element.changed', event)

		expect(listener.mock.calls[0][0].element).toBe(event.element)
		expect(overlays).toHaveBeenCalledOnce()
	})

	it('drops a plain return value too, so it cannot cancel the event either', () => {
		const eventBus = new EventBus()
		const later = vi.fn()
		eventBus.on('views.changed', withoutResult(() => false))
		eventBus.on('views.changed', OVERLAYS_PRIORITY, later)

		const result = eventBus.fire('views.changed', {})

		expect(later).toHaveBeenCalledOnce()
		expect(result).toBeUndefined()
	})
})
