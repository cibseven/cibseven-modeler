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
	<div class="container modeler d-flex position-relative" ref="formContainer">
		<div class="d-flex flex-column align-items-between h-100">
			<div class="d-flex flex-grow-1 overflow-hidden" style="min-height: 0;">
				<div v-show="!props.isModelerVisible" class="canvas" ref="canvas" :style="styleCanvas" tabindex="0">
				</div>
				<div v-show="props.isModelerVisible" class="flex-grow-1 h-100">
					<slot />
				</div>
			</div>
			<PropertiesPanel :parent="formContainer" :parentWidth="parentWidth" v-show="isVisiblePropertyPanel"
				@changeWidth="changeWidth" minWidth="300" ref="resizableDiv">
				<div class="properties-panel-parent resizable-content h-100 border-start border-dark-subtle"
					ref="propertyPanel">
				</div>
			</PropertiesPanel>
			<MenuActionButtons :width="canvasWidth">
				<template #leftButtons>
					<slot name="menu" />
				</template>
			</MenuActionButtons>
		</div>
		<NotificationMessage ref="notificationModal">

			<template #title>
				<h5 class="modal-title fs-5" id="deployModalLabel">{{ $t('modalNotificacionMessageBlockedForm.title')
					}}
				</h5>
			</template>
			<template #body>
				<div class="border-1">
					<h6>{{ $t('blockedSession.form') }} : {{ notificationMessageData?.processName }}</h6>
					<h5>{{ $t('modalNotificacionMessageBlockedForm.body') }}</h5>
				</div>
				<table class="table">
					<thead>
						<tr>
							<th v-for="(column, idx) in notificationMessageData?.header" :key="idx">{{ $t(column) }}</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td v-for="(column, idx) in notificationMessageData?.body" :key="idx">{{ column }}</td>
						</tr>

					</tbody>
				</table>
			</template>
			
			<template #optionalButton>
				<button type="button" @click.prevent="() => notificationModal.closeModal(true)"
					class="btn btn-secondary">{{
						$t("buttons.forceSave") }}</button>
			</template>
			
		</NotificationMessage>
	</div>
</template>
<script setup>
import '@bpmn-io/form-js/dist/assets/form-js-base.css'
import '@bpmn-io/form-js/dist/assets/form-js-editor-base.css'
import '@bpmn-io/form-js/dist/assets/form-js-editor.css'
import '@bpmn-io/form-js/dist/assets/properties-panel.css'
import '@bpmn-io/form-js/dist/assets/form-js.css'

import MenuActionButtons from '../layout/MenuActionButtons.vue'
import PropertiesPanel from '../layout/PropertiesPanel.vue'
import usePropertiesPanel from '../../composables/usePropertiesPanel'
import useForm from '../../composables/useForm'

import { ref, onMounted, computed, onUpdated, watch, nextTick } from 'vue'
import NotificationMessage from '../modals/NotificationMessage.vue'

const resizableDiv = ref(null)
const formContainer = ref(null)
const canvas = ref(null)
const propertyPanel = ref(null)
//for session blocked modal
const notificationModal = ref(null)

const props = defineProps({
    json: String,
    isModelerVisible: {
        type: Boolean,
        default: false
    },  
    isActiveTab: Boolean,
    tabElementIndex : Number,
	tabElement: {
		type: Object,
		required: true
	}
})


const emit = defineEmits([
	'resizeTabNav',
    'updateEditorXML',
	'updateDownloadLink',
	'updateDownloadLinkSvg',
    'isValidated',
	'showToastMessage',
	'toggleEnableSave',
	'toggleIsSaved',
	'toggleVersionNotSaved',
	'updateIsButtonDisabled',
	'updateStoredLocalStorageTabNavList',
	'assignSessionIdToProcess',
])
const { initializeFormEditor, save, importJson, propertiesPanelComponent, saveXmlAfterUpdate, restartFormJs, destroyFormJs, getFormId, notificationMessageData } = useForm(props, emit, canvas, propertyPanel, notificationModal)
const { updateParentHeight, updateParentWidth,  parentWidth, changeWidth, canvasWidth, isVisiblePropertyPanel, togglePropertiesPanel } = usePropertiesPanel(props, emit, formContainer, resizableDiv, propertiesPanelComponent, propertyPanel)

onMounted(async() => {
    initializeFormEditor(props.tabElement.id)
	window.addEventListener('resize', updateParentWidth, true)
	window.addEventListener('resize', updateParentHeight, true)
	await nextTick()
	emit('resizeTabNav', canvasWidth.value)
})

onUpdated(() => {
	updateParentWidth()
	updateParentHeight()
})

watch(() => props.isActiveTab, async newValue => { // when the editor gets hidden to update the xml
	await restartFormJs(newValue)
})

const styleCanvas = computed(() => {
	return { width: `${canvasWidth.value}px !important` }
})

const _saveDiagram = async () => {
    save(notificationModal)
}

const _saveXmlAfterUpdate = (isBpmn, updatedJson, _tabElementIndex) => {
	saveXmlAfterUpdate(updatedJson)
}

const _validate = async json => {
	importJson(json)
}

defineExpose({
    _validate,
	_saveXmlAfterUpdate,
	_saveDiagram,
    togglePropertiesPanel,
	destroyFormJs,
	getFormId,
	importJson
})

</script>