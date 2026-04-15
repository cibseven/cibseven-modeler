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
	<div ref="liveToast" class="fade hide" role="alert" aria-live="polite" aria-atomic="true" :style="style"
		data-bs-autohide="false">
		<div class="alert d-flex alert-dismissible bg-white"
			:class="{ 'alert-success': props.success, 'alert-danger': !props.success }">
			<button type="button" class="btn-close" @click="hideToast" aria-label="Close"></button>
			<div class="container-fluid">
				<div class="d-flex align-items-center">
					<div class="mr-4">
						<span class="mdi-36px mdi mr-4"
							:class="{ 'mdi-check-circle-outline': props.success, 'mdi-alert-circle-outline': !props.success, 'text-success': props.success, 'text-danger': !props.success }">
						</span>
					</div>
					<div>
						<span class="align-items-center">
							{{ props.bodyText }}
							{{ props.bodyTextAlt }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as bootstrap from 'bootstrap'

const TOAST_TIME = 5000
const liveToast = ref(null)
const props = defineProps({
	showToast: Boolean,
	timestamp: String,
	headerText: String,
	bodyText: String,
	success: Boolean,
	bodyTextAlt: String
})
const isDisplayed = ref(false)
const style = computed(() => {
	return { 
		position: 'fixed', 
		zIndex: '2031', 
		left: '50%', 
		transform: 'translate(-50%, 0px)', 
		top: '0px', 
		display: isDisplayed.value ? 
		'block' : "none" }
})

let toastBootstrap = null
let timeout = null

const _showToastTimeOut = () => {
	_resetTimeout()
	isDisplayed.value = true
	toastBootstrap = new bootstrap.Toast(liveToast.value)
	toastBootstrap.show()
	timeout = setTimeout(() => {
		hideToast()
	}, TOAST_TIME)
}

const _resetTimeout = () => {
	if (timeout) { // if the toast is still showing
		clearTimeout(timeout)
		return true
	}
	return false
}

const hideToast = () => {
	isDisplayed.value = false
	clearTimeout(timeout)
}

defineExpose({ _showToastTimeOut })
</script>
