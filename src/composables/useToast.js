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
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Toast helper for standalone components that are NOT descendants of
 * CibsevenModeler (e.g. TemplateManagement) and therefore can't emit
 * `showToastMessage` up to the shared toast. The component renders its own
 * ToastMessage and drives it through this composable:
 *
 *   const { toastRef, toastProps, showError } = useToast()
 *   <ToastMessage ref="toastRef" v-bind="toastProps" />
 *   ...
 *   catch (e) { showError('templatesManagement.exportError', e) }
 *
 * Use this only for CLIENT-SIDE failures — backend/axios errors are surfaced by
 * the host's global ErrorDialog (see utils/toast.js for the full convention).
 */
export default function useToast() {
	const { t } = useI18n()
	const toastRef = ref(null)
	const toastProps = reactive({
		success: false,
		bodyText: '',
		bodyTextAlt: '',
		actionTo: null,
		actionLabel: '',
	})

	/**
	 * Show a localized error toast and log the raw error for diagnostics.
	 * @param {string} key - i18n key (resolves to `<key>.body`).
	 * @param {unknown} [error] - the caught error, logged via console.error.
	 */
	const showError = (key, error) => {
		if (error !== undefined) console.error(error)
		toastProps.success = false
		toastProps.actionTo = null
		toastProps.bodyTextAlt = ''
		toastProps.bodyText = t(`${key}.body`)
		toastRef.value?._showToastTimeOut()
	}

	return { toastRef, toastProps, showError }
}
