<!--
  Copyright CIB software GmbH and/or licensed to CIB software GmbH
  under one or more contributor license agreements. See the NOTICE file
  distributed with this work for additional information regarding copyright
  ownership. CIB software licenses this file to you under the Apache License,
  Version 2.0; you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
-->
<template>
	<div class="modal fade" ref="modalDeploy" tabindex="-1" aria-hidden="true" aria-labelledby="deployModalLabel">
		<div class="modal-dialog" id="modal">
			<div class="modal-content">
				<div class="modal-header align-items-center">
					<h5 class="modal-title fs-5" id="deployModalLabel">{{ $t('deployForm.title') }}</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
					</button>
				</div>
				<div class="modal-body">

					<div v-if="keyUsedElsewhere" class="alert alert-warning py-2 small" role="status">
						<span class="mdi mdi-alert-outline me-1" aria-hidden="true"></span>
						{{ $t(keyInUseText) }}
					</div>
					<div v-if="ambiguousFormRefs.length" class="alert alert-warning py-2 small" role="status">
						<span class="mdi mdi-alert-outline me-1" aria-hidden="true"></span>
						{{ $t('deployForm.forms.ambiguous', { formIds: ambiguousFormRefs.join(', ') }) }}
					</div>

					<!-- Diagram deployment details -->
					<div>
						<div class="mb-3">
							<label class="form-check-label" for="deployment-name">
								{{ $t('deployForm.deploymentName.label') }}
							</label>
							<span
								style="cursor: pointer"
								class="mdi mdi-help-circle-outline ms-1"
								data-bs-custom-class="deployment-modal-tooltip"
								data-bs-toggle="tooltip" data-bs-placement="right" :data-bs-title="$t('deployForm.deploymentName.tooltip')"></span>
							<input
								type="text"
								class="form-control form-control-sm"
								id="deployment-name"
								v-model="deploymentName" />
						</div>
						<div v-if="startableProcesses.length > 1" class="mb-3">
							<label class="form-check-label" for="start-process-id">
								{{ $t('deployForm.startProcess.label') }}
							</label>
							<select id="start-process-id" class="form-select form-select-sm" v-model="startProcessId">
								<option v-for="process in startableProcesses" :key="process.id" :value="process.id">
									{{ process.name ? `${process.name} (${process.id})` : process.id }}
								</option>
							</select>
						</div>
						<div class="mb-3">
							<label class="form-check-label" for="tenant-id">
								{{ $t('deployForm.tenantID.label') }}
							</label>
							<span
								style="cursor: pointer"
								class="mdi mdi-help-circle-outline ms-1"
								data-bs-custom-class="deployment-modal-tooltip"
								data-bs-toggle="tooltip" data-bs-placement="right" :data-bs-title="$t('deployForm.tenantID.tooltip')"></span>
							<input type="text" class="form-control form-control-sm" id="tenant-id"
								v-model="tenantID" />
						</div>

						<div class="mb-3">
							<label class="form-check-label" for="additional-files-input">
								{{ $t('deployForm.additionalFiles.label') }}
							</label>
							<span
								style="cursor: pointer"
								class="mdi mdi-help-circle-outline ms-1"
								data-bs-custom-class="deployment-modal-tooltip"
								data-bs-toggle="tooltip" data-bs-placement="right" :data-bs-title="$t('deployForm.additionalFiles.tooltip')"></span>
							<div class="d-flex flex-wrap gap-2 align-items-center mb-2">
								<button type="button" class="btn btn-sm btn-outline-secondary" @click="triggerAdditionalFilesPick">
									{{ $t('deployForm.additionalFiles.addButton') }}
								</button>
								<input
									ref="additionalFilesButton"
									id="additional-files-input"
									type="file"
									multiple
									class="d-none"
									@change="onAdditionalFilesSelected"
								/>
							</div>

							<!-- Form picker panel (BPMN only) -->
							<div v-if="isBpmn" class="border rounded p-2 mb-2">
								<input
									type="text"
									class="form-control form-control-sm mb-2"
									:placeholder="$t('deployForm.forms.search')"
									:aria-label="$t('deployForm.forms.search')"
									v-model="formPickerSearch"
								/>
								<div v-if="formPickerLoading" class="text-center py-2">
									<span class="spinner-border spinner-border-sm" role="status">
										<span class="visually-hidden">{{ $t('loading') }}</span>
									</span>
								</div>
								<div v-else style="max-height: 200px; overflow-y: auto;">
									<div
										v-if="formPickerSearch.trim().length < 3"
										class="text-muted small text-center py-2">
										{{ $t('deployForm.forms.typeToSearch') }}
									</div>
									<div
										v-else-if="formPickerList.length === 0"
										class="text-muted small text-center py-2">
										{{ $t('deployForm.forms.empty') }}
									</div>
									<div
										v-for="form in formPickerList"
										:key="form.id"
										role="button"
										tabindex="0"
										class="d-flex align-items-center gap-2 px-1 py-1 rounded"
										:style="{ opacity: addedFormIds.has(form.formId) ? 0.5 : 1, cursor: addedFormIds.has(form.formId) ? 'default' : 'pointer' }"
										@click="addFormResource(form)"
										@keyup.enter="addFormResource(form)">
										<span class="flex-grow-1 text-truncate small">{{ form.name || form.formId }}</span>
										<span class="text-muted small text-nowrap flex-shrink-0">{{ form.formId }}</span>
										<span
											v-if="detectedFormRefs.includes(form.formId)"
											class="badge text-bg-info small flex-shrink-0">
											{{ $t('deployForm.forms.referenced') }}
										</span>
										<span
											v-if="formPickerAddingId === form.id"
											class="spinner-border spinner-border-sm flex-shrink-0"
											role="status">
											<span class="visually-hidden">{{ $t('loading') }}</span>
										</span>
										<span v-else-if="addedFormIds.has(form.formId)" class="mdi mdi-check text-success flex-shrink-0"></span>
									</div>
								</div>
							</div>

							<div
								v-for="(entry, index) in additionalDeploymentResources"
								:key="index"
								class="d-flex align-items-center gap-2 mb-2 ps-1">
								<span class="text-truncate flex-grow-1 min-w-0" :title="entry.resourceName">{{ entry.resourceName }}</span>
								<span class="text-muted small text-nowrap flex-shrink-0">{{ formatFileSize(entry.blob.size) }}</span>
								<button
									type="button"
									class="btn-close btn-close-sm flex-shrink-0"
									@click="removeAdditionalResource(index)"
									:aria-label="$t('deployForm.additionalFiles.remove')">
								</button>
							</div>
						</div>

						<!-- Deploying on another endpoint -->
						<div class="mb-2 form-check form-switch">
							<input type="checkbox" class="form-check-input" id="anotherEndpoint" v-model="useCustomEndpoint">
							<label class="form-check-label" for="anotherEndpoint">{{ $t('deployForm.anotherEndpoint.label') }}</label>
						</div>

						<div v-if="useCustomEndpoint" class="mb-3">
						<label for="customEndpoint">{{ $t('deployForm.anotherEndpoint.inputTitle') }}</label>
						<input
							id="customEndpoint"
								type="text"
								class="form-control form-control-sm"
								v-model="customEndpoint"
								placeholder="https://example.com/cibseven-instance"
								:class="{
									'is-invalid': !isCustomEndpointValid
								}"
								@input="_validateCustomEndpoint" />
								<template v-if="!isCustomEndpointValid">
									<div class="invalid-feedback">
										{{ !customEndpoint || customEndpoint.trim() === ''? $t('deployForm.anotherEndpoint.errors.required') : $t('deployForm.anotherEndpoint.errors.invalid') }}
									</div>
								</template>
						</div>

						<!-- Toggle: asAnotherUser -->
						 <div class="mb-3 form-check form-switch">
							<input type="checkbox" class="form-check-input" id="asAnotherUser" v-model="asAnotherUser">
							<label class="form-check-label" for="asAnotherUser">{{ $t('deployForm.asAnotherUser') }}</label>
						</div>

						<!-- Authentication -->
						<div v-if="asAnotherUser" class="mb-5">
							<hr />
							<div class="mb-3">
							<p class="form-label">
									{{ $t('deployForm.authentication') }}
								</p>
								<div>
									<div class="form-check form-check-inline">
										<input class="form-check-input" type="radio" :options="alternateAuthOptions" id="http-auth"
											value="basicauth" v-model="selected">
										<label class="form-check-label" for="http-auth">
											{{ $t('authenticationOptions.basicauth') }}
										</label>
									</div>
									<div class="form-check form-check-inline">
										<input class="form-check-input" type="radio" id="token-auth" value="token"
											v-model="selected">
										<label class="form-check-label" for="token-auth">
											{{ $t('deployForm.token') }}
										</label>
									</div>
								</div>
							</div>

							<div v-show="selected === 'basicauth'">
								<div class="mb-3">
									<label for="username" class="form-label">
										{{ $t('deployForm.username') }}
									</label>
									<input type="text" class="form-control form-control-sm" id="username" v-model="username">
								</div>
								<div class="mb-3">
									<label for="password" class="form-label">
										{{ $t('deployForm.password') }}
									</label>
									<input type="password" class="form-control form-control-sm" id="password" v-model="password">
								</div>
							</div>

							<div v-show="selected === 'token'">
								<div class="mb-3">
									<label for="token" class="form-label">
										{{ $t('deployForm.token') }}
									</label>
									<input type="text" class="form-control form-control-sm" id="token" v-model="token">
								</div>
							</div>
						</div>

					</div>
				</div>
				<div class="modal-footer justify-content-between">
					<button href="#" class="btn btn-link" ref="closeButton" data-bs-dismiss="modal">
						{{ $t('buttons.cancel') }}
					</button>
					<div>
						<button @click="deploy()" class="btn btn-primary" :disabled="!canDeploy">
							{{ $t('buttons.deploy') }}
						</button>
						<template v-if="props.tabNavList.type !== 'dmn' && props.tabNavList.type !== 'form'">
							<span v-if="!startableProcesses.length"
								v-b-popover.hover.top="$t('modalDeploy.notExecutable')"
								tabindex="0">
								<button type="button" class="btn btn-secondary mx-2" disabled style="pointer-events: none">
									{{ $t('buttons.startProcess') }}
								</button>
							</span>
							<button v-else @click="deployAndStart" type="button" class="btn btn-secondary mx-2" :disabled="!canStart">
								{{ $t('buttons.startProcess') }}
							</button>
						</template>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>

import * as bootstrap from 'bootstrap'

import { deployProcess, startProcess } from '../../services/deployService'
import { fetchForms, fetchFormById, fetchFormsByFormId } from '../../services/formService'
import { keyInUseElsewhere } from '../../services/processService'
import { projectOfFolder } from '../../utils/projectRights.js'
import { debounce } from 'min-dash'
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProcessKeyFromBpmn, getTagValueFromXml, formatFileSize, getFormRefsFromBpmn, getStartableProcesses } from '../../utils.js'
import { isHttpOrHttpsUrl } from '../../utils/regexUtils'
import { errorReason } from '../../utils/toast.js'
import { DEPLOY_STORAGE_KEYS } from '../../constants/diagramTypes'

const closeButton = ref(null)
const props = defineProps({
	diagram: String,
	showModal: Boolean,
	tabNavList: Object
})
const emit = defineEmits([
	'toggleModal',
	'showToastMessage',
	'addErrorMessageToConsole',
	'showConsoleNotification'
])

const { t } = useI18n()
const announce = inject('announce', () => {})

// Deployment info
const deploymentName = ref('')
const tenantID = ref('')

const additionalDeploymentResources = ref([])
const additionalFilesButton = ref(null)

// Form picker
const formPickerList = ref([])
const formPickerLoading = ref(false)
const formPickerAddingId = ref(null)
const formPickerSearch = ref('')
const detectedFormRefs = ref([])
// Form ids the BPMN references that several visible forms have; the closest one was added
const ambiguousFormRefs = ref([])
// Another model has this key, maybe in a project hidden from the user, so nothing names it
const keyUsedElsewhere = ref(false)
// A DMN model has no process key: the warning names what the engine deploys from it
const keyInUseText = computed(() => {
	if (props.tabNavList?.type === 'form') return 'deployForm.keyInUse.form'
	return props.tabNavList?.type === 'dmn' ? 'deployForm.keyInUse.decision' : 'deployForm.keyInUse.process'
})

// Auth info
const useCustomEndpoint = ref(false)
const customEndpoint = ref(null)
const isCustomEndpointValid = ref(false)

const asAnotherUser = ref(false)

const alternateAuthOptions = [
	{ text: 'HTTP Basic', value: 'http', id: 'http' },
	{ text: 'Bearer token', value: 'token', id: 'token' },
]
const selected = ref('http')

const username = ref('')
const password = ref('')
const token = ref('')

// Other
let modalBootstrap = null
const modalDeploy = ref(null)
const deploying = ref(false)
// The deployment name is free text and a collaboration id is no process key: start by a process id
const startableProcesses = ref([])
const startProcessId = ref(null)
const deployingTabId = ref(null) // snapshotted at open time; prevents wrong-tab attribution on tab-switch

const isBpmn = computed(() => props.tabNavList?.type?.startsWith('bpmn'))

const addedFormIds = computed(() =>
	new Set(additionalDeploymentResources.value
		.filter(r => r.resourceName.endsWith('.form'))
		.map(r => r.resourceName.slice(0, -5)))
)

const canStart = computed(() => !!startProcessId.value && canDeploy.value)

const canDeploy = computed(() => {
	if (deploying.value) return false

	if (useCustomEndpoint.value) {
		_validateCustomEndpoint()

		return isCustomEndpointValid.value
	}

	if (!asAnotherUser.value && localStorage.getItem('token')) { // Current user and is logged in
		return true
	}

	if (asAnotherUser.value && selected.value === 'basicauth') { // As a different user
		return username.value && password.value
	}

	return token.value

})

onMounted(() => {
	if (!modalDeploy.value) return

	modalBootstrap = new bootstrap.Modal(modalDeploy.value)

	// Initialize all tooltips inside the modal
	const tooltipTriggerList = [].slice.call(
		modalDeploy.value.querySelectorAll('[data-bs-toggle="tooltip"]')
	)
	tooltipTriggerList.forEach(el => {
		new bootstrap.Tooltip(el)
	})

	_loadDeployValuesFromLocalStorage()
})

watch(() => props.showModal, (newValue) => {
	if (newValue) {
		_showModalComp()
		emit('toggleModal', false)
	}
})

function _validateCustomEndpoint() {
	isCustomEndpointValid.value = (customEndpoint?.value && isHttpOrHttpsUrl(customEndpoint.value.trim())) === true
	customEndpoint.value = customEndpoint.value?.trim() || '' // Remove leading/trailing whitespace
}

const triggerAdditionalFilesPick = () => {
	additionalFilesButton.value?.click()
}

const onAdditionalFilesSelected = event => {
	const files = event.target.files
	if (!files?.length) return
	Array.from(files).forEach(file => {
		additionalDeploymentResources.value.push({
			resourceName: file.name.trim(),
			blob: file
		})
	})
	event.target.value = ''
}

const removeAdditionalResource = index => {
	additionalDeploymentResources.value.splice(index, 1)
}

/** Validates additional file resource names: non-empty, unique, and distinct from the main diagram resource name. */
const _validateAdditionalDeploymentResources = mainResourceName => {
	const used = new Set([mainResourceName])
	let valid = true
	additionalDeploymentResources.value.forEach(file => {
		if (!valid) return
		const name = (file?.resourceName  || '').trim()
		if (!name) {
			emit('showToastMessage', { isSuccess: false, toastText: 'deployForm.additionalFiles.emptyResourceNameError', bodyTextAlt: '' })
			valid = false
			return
		}
		if (used.has(name)) {
			emit('showToastMessage', { isSuccess: false, toastText: 'deployForm.additionalFiles.duplicateNameError', bodyTextAlt: '' })
			valid = false
			return
		}
		used.add(name)
	})
	return valid
}

/**
 * Unlike the rule in utils/toast.js, deploy and start report their backend errors themselves: the
 * toast carries the engine's reason and whether the deployment went through. Their requests carry
 * REPORTS_OWN_ERRORS, so the webclient adds no generic error dialog, which would name neither.
 * The reason replaces the toast body, so a body that must stay readable goes first.
 */
const _reportError = (tabId, toastText, error, { keepBody = false } = {}) => {
	// A refused login names only the user: what failed is the login entered here, not the session
	const errorMessage = error?.response?.status === 401 ? t('deployForm.loginRefused') : errorReason(error)
	const bodyTextAlt = keepBody && errorMessage ? `${t(`${toastText}.body`)}: ${errorMessage}` : errorMessage
	emit('showToastMessage', { isSuccess: false, toastText, bodyTextAlt })
	if (errorMessage) emit('addErrorMessageToConsole', tabId, `${errorMessage}\n`)
}

const _closeModal = () => closeButton.value.click() // simulates on button close clicked to avoid bug that backdrops stays visible

/** What the dialog says at the click: the dialog stays editable while the requests run. */
const _settingsAtClick = () => ({
	tabId: deployingTabId.value ?? props.tabNavList.id,
	selectedAuth: selected.value,
	auth: [_getAuthType(), _getToken(), _getUsername(), _getPassword()],
	deploymentName: deploymentName.value,
	tenantID: tenantID.value,
	customEndpoint: customEndpoint.value,
	useCustomEndpoint: useCustomEndpoint.value,
	startProcessId: startProcessId.value,
})

/** Deploys the diagram; the deployment when it worked, else null with the reason reported. */
const _deploy = async settings => {
	announce(t('a11y.deploying'))

	let type = 'dmn'
	if (props.tabNavList.type.startsWith('bpmn')) {
		type = 'bpmn'
	} else if (props.tabNavList.type === 'form') {
		type = 'form'
	}

	const mainResourceName = `${settings.deploymentName}.${type}`
	if (!_validateAdditionalDeploymentResources(mainResourceName)) return null

	let res
	try {
		res = await deployProcess(
			...settings.auth,
			settings.deploymentName,
			settings.customEndpoint,
			settings.tenantID, props.diagram, settings.useCustomEndpoint, type,
			additionalDeploymentResources.value
		)
	} catch (error) {
		console.warn('Error deploying process:', error)
		_reportError(settings.tabId, 'toastDeployErrorDeploy', error)
		return null
	}
	_saveDeployValuesLocalStorage(settings.selectedAuth, settings.customEndpoint, settings.useCustomEndpoint)
	if (!res?.id) {
		_reportError(settings.tabId, 'toastDeployErrorDeploy', res)
		return null
	}
	return res
}

const _getAuthType = () => asAnotherUser.value ? selected.value : 'token'// 'token' for the current user
const _getToken = () => asAnotherUser.value ? token.value : localStorage.getItem('token') // current user -> token from localStorage
const _getUsername = () => asAnotherUser.value ? username.value : null // current user -> no form data passed
const _getPassword = () => asAnotherUser.value ? password.value : null // current user -> no form data passed

// Both buttons run one at a time: a second click while one runs would deploy, or start, twice
const _once = action => async () => {
	if (deploying.value) return
	deploying.value = true
	try {
		await action()
	} finally {
		deploying.value = false
	}
}

const deploy = _once(async () => {
	if (!await _deploy(_settingsAtClick())) return
	_closeModal()
	emit('showToastMessage', { isSuccess: true, toastText: 'toastDeploySucessDeploy', bodyTextAlt: '', actionTo: { name: 'start-process' }, actionLabel: t('buttons.startProcess') })
})

const deployAndStart = _once(async () => {
	const settings = _settingsAtClick()
	if (!await _deploy(settings)) return
	// Deployed by now: the dialog closes whatever the start does, a second try would deploy again
	_closeModal()
	try {
		const res = await startProcess(
			...settings.auth,
			settings.startProcessId,
			settings.customEndpoint, settings.useCustomEndpoint
		)
		if (!res?.id) {
			_reportError(settings.tabId, 'toastStartProcessError', res, { keepBody: true })
			return
		}
		emit('showToastMessage', { isSuccess: true, toastText: 'toastStartProcessSucess', bodyTextAlt: '' })
	} catch (error) {
		console.warn('Error starting process:', error)
		_reportError(settings.tabId, 'toastStartProcessError', error, { keepBody: true })
	}
})

const _readStartableProcesses = () => {
	startableProcesses.value = isBpmn.value ? getStartableProcesses(props.diagram) : []
	startProcessId.value = startableProcesses.value[0]?.id ?? null
}

const _loadDeployValuesFromLocalStorage = () => {
	selected.value = localStorage.getItem(DEPLOY_STORAGE_KEYS.AUTH) ?? 'basicauth'
	customEndpoint.value = localStorage.getItem(DEPLOY_STORAGE_KEYS.CIBSEVEN_INSTANCE)
	useCustomEndpoint.value = localStorage.getItem(DEPLOY_STORAGE_KEYS.OWN_ENDPOINT) === 'true'
}

const _saveDeployValuesLocalStorage = (auth, cibsevenInstanceUrl, ownEndPoint) => {
	localStorage.setItem(DEPLOY_STORAGE_KEYS.AUTH, auth)
	localStorage.setItem(DEPLOY_STORAGE_KEYS.OWN_ENDPOINT, ownEndPoint)
	if (cibsevenInstanceUrl) localStorage.setItem(DEPLOY_STORAGE_KEYS.CIBSEVEN_INSTANCE, cibsevenInstanceUrl)
}

const _getProcessKeyForDeployName = () => {
	if (props.tabNavList.type === 'form') {
		try {
			const formJson = JSON.parse(props.diagram)
			return formJson.id || null
		} catch {
			return null
		}
	}
	const foundExternalProcessKey = getProcessKeyFromBpmn(props.diagram) ?? getTagValueFromXml(props.diagram, 'definitions', 'id')
	return foundExternalProcessKey
}

const _fetchFormPickerResults = debounce(async () => {
	try {
		formPickerList.value = await fetchForms(0, 10, formPickerSearch.value.trim()) ?? []
	} catch {
		emit('showToastMessage', { isSuccess: false, toastText: 'deployForm.forms.loadError', bodyTextAlt: '' })
	} finally {
		formPickerLoading.value = false
	}
}, 500)

watch(formPickerSearch, (val) => {
	formPickerList.value = []
	if ((val?.trim().length ?? 0) < 3) {
		formPickerLoading.value = false
		return
	}
	formPickerLoading.value = true
	_fetchFormPickerResults()
})

const addFormResource = async (form) => {
	if (addedFormIds.value.has(form.formId)) return
	formPickerAddingId.value = form.id
	try {
		const content = await fetchFormById(form.id)
		const blob = new Blob([JSON.stringify(content)], { type: 'application/json' })
		additionalDeploymentResources.value.push({ resourceName: `${form.formId}.form`, blob })
	} catch {
		emit('showToastMessage', { isSuccess: false, toastText: 'deployForm.forms.addError', bodyTextAlt: '' })
	} finally {
		formPickerAddingId.value = null
	}
}

/**
 * The form a reference means when several have its form id: the one beside the diagram, then
 * one in its project, then the latest change. Only forms the user may see are offered.
 */
const _formForReference = (candidates, folderId) => {
	if (!folderId) return candidates[0]
	return candidates.find(form => form.folderId === folderId)
		?? candidates.find(form => projectOfFolder(form.folderId) === projectOfFolder(folderId))
		?? candidates[0]
}

// Counts the openings, so an answer that comes after the dialog was opened again is dropped
let opening = 0

const _autoAddReferencedForms = async current => {
	if (!isBpmn.value) return
	// Read before the first answer: the tab on screen may have changed by then
	const folderId = props.tabNavList.folderId
	detectedFormRefs.value = getFormRefsFromBpmn(props.diagram)
	if (!detectedFormRefs.value.length) return
	for (const ref of detectedFormRefs.value) {
		try {
			const candidates = await fetchFormsByFormId(ref)
			if (current !== opening) return
			if (candidates.length > 1) ambiguousFormRefs.value.push(ref)
			const match = _formForReference(candidates, folderId)
			if (!match || addedFormIds.value.has(match.formId)) continue
			const content = await fetchFormById(match.id)
			if (current !== opening) return
			const blob = new Blob([JSON.stringify(content)], { type: 'application/json' })
			additionalDeploymentResources.value.push({ resourceName: `${match.formId}.form`, blob })
		} catch { /* silently skip — form may not exist in the modeler */ }
	}
}

/**
 * A key may repeat across folders, but the engine keeps one definition per key: deploying adds a
 * version to what another model deployed. Said, not refused; without an answer nothing is said.
 */
const _checkKeyInUse = async current => {
	const type = props.tabNavList.type === 'form' ? 'form' : 'process'
	const ownId = props.tabNavList.isSaved ? props.tabNavList.id : null
	let used = false
	try {
		used = await keyInUseElsewhere(_getProcessKeyForDeployName(), type, ownId)
	} catch { /* a warning only: without an answer there is none */ }
	if (current === opening) keyUsedElsewhere.value = used
}

const _showModalComp = () => {
	deployingTabId.value = props.tabNavList.id // capture before the user can switch tabs
	deploymentName.value = _getProcessKeyForDeployName() // set the name of the deploy
	additionalDeploymentResources.value = []
	formPickerList.value = []
	formPickerSearch.value = ''
	detectedFormRefs.value = []
	ambiguousFormRefs.value = []
	keyUsedElsewhere.value = false
	_readStartableProcesses()
	modalBootstrap.show()
	const current = ++opening
	_autoAddReferencedForms(current)
	_checkKeyInUse(current)
}

</script>
<style>
.deployment-modal-tooltip > .tooltip-inner {
	font-size: .8rem;
	max-width: 300px;
	text-align: left;
}
</style>
