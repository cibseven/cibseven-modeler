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
	<div class="modal fade" ref="modalDeploy" tabindex="-1" aria-hidden="true">
		<div class="modal-dialog" id="modal">
			<div class="modal-content">
				<div class="modal-header align-items-center">
					<h5 class="modal-title fs-5" id="deployModalLabel">{{ $t('deployForm.title') }}</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
					</button>
				</div>
				<div class="modal-body">

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
							<!-- eslint-disable-next-line vuejs-accessibility/label-has-for -->
							<label class="form-label">
									{{ $t('deployForm.authentication') }}
								</label>
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
							<!--
							<div class="mb-3 form-check form-switch">
								<input type="checkbox" class="form-check-input" id="rememberMe" v-model="rememberMe">
								<label class="form-check-label" for="rememberMe">{{ $t('deployForm.rememberMe') }}</label>
							</div>
							-->
						</div>

						<!-- Actions -->
						<div class="d-flex justify-content-between align-items-end mx-1">
							<button href="#" class="btn btn-link" ref="closeButton" data-bs-dismiss="modal">
								{{ $t('buttons.cancel') }}
							</button>
							<div>
								<button @click="deploy" class="btn btn-primary" :disabled="!canDeploy">
									{{ $t('buttons.deploy') }}
								</button>
								<button @click="deployAndStart" type="button" class="btn btn-secondary mx-2" v-if="props.tabNavList.type !== 'dmn' && props.tabNavList.type !== 'form'" :disabled="!canStart">
									{{ $t('buttons.startProcess') }}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

	</div>
</template>

<script setup>

import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.js'

import { deployProcess, startProcess } from '../../services/deployService'
import { ref, computed, onMounted, watch } from 'vue'
import { getProcessKeyFromBpmn, getTagValueFromXml } from '../../utils.js'
import { isHttpOrHttpsUrl } from '../../utils/regexUtils'

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

// Deployment info
const deploymentName = ref('')
const tenantID = ref('')

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
const rememberMe = ref(false)

// Other
let modalBootstrap = null
const modalDeploy = ref(null)
const disableDeployButton = ref(false)
const isExecutable = ref(false)

const canStart = computed(() => { // its only startable if the checkbox executable of the process is true
	if (!isExecutable.value) {
		return true 
	}
	return canDeploy.value
})

const canDeploy = computed(() => {
	if (disableDeployButton.value) return true // to not send the deploy twice	

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
	/*
	const localStorageToken = getBearerToken()

	if (localStorageToken) return rememberMe.value = true
	
	const localStorageHTTPBasic = localStorage.getItem('cibseven.modeler.basicauth')

	if (localStorageHTTPBasic) {
		const userEncodedBasicToken = localStorageHTTPBasic.trim().split(' ')
		const decodedUsernameAndPassword = atob(userEncodedBasicToken[1]).trim().split(':')
		username.value = decodedUsernameAndPassword[0]
		password.value = decodedUsernameAndPassword[1]
		return rememberMe.value = true
	}
	return rememberMe.value = false
	*/
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

const deploy = async () => {
	disableDeployButton.value = true

	let type = 'dmn'
	if (props.tabNavList.type.startsWith('bpmn')) {
		type = 'bpmn'
	} else if (props.tabNavList.type === 'form') {
		type = 'form'
	}

	let hasErrors = false

	const errors = await deployProcess(
		_getAuthType(),
		_getToken(),
		_getUsername(),
		_getPassword(),
		deploymentName.value,
		customEndpoint.value,
		tenantID.value, rememberMe.value, props.diagram, useCustomEndpoint.value, type
	).then(res => {
		_saveDeployValuesLocalStorage(selected.value, customEndpoint.value, useCustomEndpoint.value)
		if (res?.id) {
			disableDeployButton.value = false
			closeButton.value.click() // simulates on button close clicked to avoid bug that backdrops stays visible				
			emit('showToastMessage', { isSuccess: true, toastText: 'toastDeploySucessDeploy', bodyTextAlt: '' })
		} else {
			hasErrors = true
			disableDeployButton.value = false				
		}
		return res
	}).catch((error) => {
		console.warn('Error deploying process:', error)
		emit('showToastMessage', { isSuccess: false, toastText: 'toastDeployErrorDeploy', bodyTextAlt: '' })
		hasErrors = true
		return error
	})
	if (errors && hasErrors) {
		let errorMessage = String(errors.response?.data?.params?.[0] || errors)
		
		// Parse nested JSON error if present
		if (errorMessage.includes('{"type":')) {
			try {
				const jsonMatch = errorMessage.match(/\{.*\}$/s)
				const parsedError = jsonMatch && JSON.parse(jsonMatch[0])
				if (parsedError?.message) errorMessage = parsedError.message
			} catch { /* ignore JSON parse error, keep original message */ }
		}
		emit('addErrorMessageToConsole', props.tabNavList.id, `${errorMessage}\n`)
		return errorMessage
	}
	return errors
}

const _getAuthType = () => asAnotherUser.value ? selected.value : 'token'// 'token' for the current user
const _getToken = () => asAnotherUser.value ? token.value : localStorage.getItem('token') // current user -> token from localStorage
const _getUsername = () => asAnotherUser.value ? username.value : null // current user -> no form data passed
const _getPassword = () => asAnotherUser.value ? password.value : null // current user -> no form data passed

const deployAndStart = async() => {
	disableDeployButton.value = true
	const result = await deploy()
	
	if (result?.id) {
		await startProcess(
			_getAuthType(),
			_getToken(),
			_getUsername(),
			_getPassword(),
			deploymentName.value,
			customEndpoint.value, useCustomEndpoint.value
		).then(res => {
			disableDeployButton.value = false
			
			if (res?.id) {
				closeButton.value.click() // simulates on button close clicked to avoid bug that backdrops stays visible				
				emit('showToastMessage', { isSuccess: true, toastText: 'toastStartProcessSucess', bodyTextAlt: '' })
			} else {
				emit('showToastMessage', { isSuccess: false, toastText: 'toastStartProcessError', bodyTextAlt: '' })
			}
		})
	}
}

const checkIfProcessStartable = () => {
    isExecutable.value = getTagValueFromXml(props.diagram, 'process', 'isExecutable')
}

const _loadDeployValuesFromLocalStorage = () => {
	selected.value = localStorage.getItem('cibseven.modeler.deploy.auth') ?? 'basicauth'
	customEndpoint.value = localStorage.getItem('cibseven.modeler.deploy.cibsevenInstanceUrl')
	useCustomEndpoint.value = localStorage.getItem('cibseven.modeler.deploy.ownEndPoint') === 'true' ? true : false
}

const _saveDeployValuesLocalStorage = (auth, cibsevenInstanceUrl, ownEndPoint) => {
	localStorage.setItem('cibseven.modeler.deploy.auth', auth)
	localStorage.setItem('cibseven.modeler.deploy.ownEndPoint', ownEndPoint)
	if (cibsevenInstanceUrl) localStorage.setItem('cibseven.modeler.deploy.cibsevenInstanceUrl', cibsevenInstanceUrl)
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

const _showModalComp = () => {
	deploymentName.value = _getProcessKeyForDeployName() // set the name of the deploy
	checkIfProcessStartable()
	disableDeployButton.value = false
	modalBootstrap.show()
}

</script>
<style>
.deployment-modal-tooltip > .tooltip-inner {
	font-size: .8rem;
	max-width: 300px;
	text-align: left;
}
</style>
