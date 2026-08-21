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
 * Error-handling convention for the modeler.
 *
 * 1. BACKEND / axios errors: do NOT catch-and-toast them. Let them reject so the
 *    host's global axios interceptor surfaces them in the shared ErrorDialog.
 *    Use `console.error` only for diagnostics. Catching and showing your own toast
 *    would double-surface the same failure.
 * 2. CLIENT-SIDE errors (JSON parse, blob/download, file read, DOM): surface them
 *    with a localized toast. In components inside the CibsevenModeler tree, emit
 *    `showToastMessage` with `errorToast(key, error)`. In standalone components
 *    (e.g. TemplateManagement, which is not a descendant of CibsevenModeler), use
 *    the `useToast` composable.
 *
 * Toast i18n keys resolve to `<key>.title` / `<key>.body`.
 */

/**
 * Build a standardized error-toast payload and log the raw error for diagnostics.
 *
 * @param {string} toastText - i18n key (resolves to `<toastText>.body`).
 * @param {unknown} [error] - the caught error; logged via console.error when provided.
 * @param {object} [opts]
 * @param {string} [opts.bodyTextAlt=''] - optional detail shown instead of the body.
 * @returns {{ isSuccess: false, toastText: string, bodyTextAlt: string }}
 */
export function errorToast(toastText, error, { bodyTextAlt = '' } = {}) {
	if (error !== undefined) console.error(error)
	return { isSuccess: false, toastText, bodyTextAlt }
}
