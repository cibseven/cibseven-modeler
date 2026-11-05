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
 * Wrap a diagram event listener so it hands nothing back to the event bus.
 *
 * The diagram-js event bus (bpmn-js, dmn-js) takes any value a listener returns, other than
 * undefined, as the event's result and stops the event there. An async listener returns a
 * promise, so the listeners after it never ran: on element.changed among them the overlays',
 * which left the lint markers behind where an element had been moved from.
 *
 * @param {(...args: any[]) => any} listener - may be async; its result is dropped
 * @returns {(...args: any[]) => void}
 */
export function withoutResult(listener) {
	return (...args) => {
		listener(...args)
	}
}
