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
 * Debounced autosave scheduler.
 *
 * The base modeler owns the autosave *mechanism* but stays inert unless an
 * `autosaveOptions` object is injected (only the EE edition provides one), so
 * the OSS edition behaves exactly as before.
 *
 * @param {Function} saveFn - invoked when the debounce elapses (typically the diagram's autosave save call)
 * @param {{ enabled: boolean, delayMs?: number } | null} options - reactive options; autosave runs only while `enabled`
 * @returns {{ schedule: () => void, cancel: () => void }}
 */
export default function useAutosave(saveFn, options) {
	const DEFAULT_DELAY_MS = 2000
	let timer = null

	const cancel = () => {
		if (timer) {
			clearTimeout(timer)
			timer = null
		}
	}

	const schedule = () => {
		if (!options?.enabled) return
		cancel()
		const delay = options.delayMs ?? DEFAULT_DELAY_MS
		timer = setTimeout(() => {
			timer = null
			saveFn()
		}, delay)
	}

	return { schedule, cancel }
}
