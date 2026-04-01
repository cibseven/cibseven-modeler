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
		<!-- Extension point for plugins -->
		<component
			v-if="formTool"
			:is="formTool"
			:apply-schema="applySchema"
			:get-current-schema="getCurrentSchemaJson"
		/>
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
import { getPlugin } from '../../plugins/pluginsConfig'

const formTool = getPlugin('form-tools')

const resizableDiv = ref(null)
const formContainer = ref(null)
const canvas = ref(null)
const propertyPanel = ref(null)

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
    'isValidated',
	'showToastMessage',
	'toggleEnableSave',
	'toggleIsSaved',
	'toggleVersionNotSaved',
	'updateIsButtonDisabled',
	'updateStoredLocalStorageTabNavList',
])
const { initializeFormEditor, save, importJson, propertiesPanelComponent, saveXmlAfterUpdate, restartFormJs, destroyFormJs, getFormId, formEditor } = useForm(props, emit, canvas, propertyPanel)
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
    save()
}

const _saveXmlAfterUpdate = (isBpmn, updatedJson, _tabElementIndex) => {
	saveXmlAfterUpdate(updatedJson)
}

const _validate = async json => {
	importJson(json)
}

/**
 * Applies a schema object to the form editor.
 * Can be used by plugins via the tools slot.
 */
const applySchema = (schema) => {
	importJson(JSON.stringify(schema, null, 2))
	emit('toggleEnableSave', true, props.tabElementIndex)
}

/**
 * Returns the current form schema as a JSON string.
 */
const getCurrentSchemaJson = () => {
	try {
		if (!formEditor.value) return null
		const schema = formEditor.value.getSchema()
		return schema ? JSON.stringify(schema, null, 2) : null
	} catch {
		return null
	}
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