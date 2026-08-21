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

/**
 * Wait for an element matching `selector` to appear inside `container`.
 *
 * The bpmn-js properties panel renders its DOM through Preact (outside Vue), so
 * after a selection/element change the target entry is not in the DOM yet and
 * Vue's nextTick cannot help. This observes DOM mutations and resolves the
 * instant the element appears — regardless of how fast or slow the panel renders
 * — replacing fragile fixed `setTimeout` delays.
 *
 * @param {Element|null} container - element to observe (and query within)
 * @param {string} selector - CSS selector to wait for
 * @param {object} [options]
 * @param {number} [options.timeout=2000] - safety net (ms): if the element never
 *   appears, resolves with the current match (or null) so callers never hang and
 *   the observer is always disconnected.
 * @returns {Promise<Element|null>}
 */
export function waitForElement(container, selector, { timeout = 2000 } = {}) {
	return new Promise(resolve => {
		if (!container) return resolve(null)

		const existing = container.querySelector(selector)
		if (existing) return resolve(existing)

		const observer = new MutationObserver(() => {
			const el = container.querySelector(selector)
			if (el) {
				observer.disconnect()
				clearTimeout(timer)
				resolve(el)
			}
		})
		observer.observe(container, { childList: true, subtree: true })

		// Safety net: never leave the observer/promise pending if the element
		// never shows up (e.g. a non-matching selection).
		const timer = setTimeout(() => {
			observer.disconnect()
			resolve(container.querySelector(selector))
		}, timeout)
	})
}
