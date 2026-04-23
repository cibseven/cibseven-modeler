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
	<div class="container modeler d-flex position-relative" ref="containerModeler">
		<div class="d-flex flex-column align-items-between h-100">
			<div class="d-flex flex-grow-1" style="min-height: 0;">
				<div v-show="!props.isModelerVisible" class="position-relative" :style="styleCanvas">
					<div class="canvas h-100 w-100" ref="canvas" tabindex="0"></div>
					<div class="position-absolute top-0 end-0 d-flex flex-column gap-1 m-2" style="z-index: 10;">
						<button @click="zoomIn" class="btn btn-sm btn-light border" :title="$t('buttons.zoomIn')">
							<span class="mdi mdi-18px mdi-magnify-plus-outline"></span>
						</button>
						<button @click="zoomOut" class="btn btn-sm btn-light border" :title="$t('buttons.zoomOut')">
							<span class="mdi mdi-18px mdi-magnify-minus-outline"></span>
						</button>
						<button @click="resetViewport" class="btn btn-sm btn-light border" :title="$t('buttons.resetViewport')">
							<span class="mdi mdi-18px mdi-fit-to-screen-outline"></span>
						</button>
						<button @click="toggleMinimap" :title="$t('buttons.minimap')"
							:class="['btn btn-sm border', isMinimapOpen ? 'btn-secondary' : 'btn-light']">
							<span class="mdi mdi-18px mdi-map-outline"></span>
						</button>
						<button @click="toggleFullscreen" class="btn btn-sm btn-light border" :title="$t('buttons.fullscreen')">
							<span :class="['mdi', 'mdi-18px', isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen']"></span>
						</button>
					</div>
				</div>
				<div v-show="props.isModelerVisible" class="flex-grow-1 h-100">
					<slot />
				</div>
			</div>
			<PropertiesPanel :parent="containerModeler" :parentWidth="parentWidth" v-show="isVisiblePropertyPanel"
				@changeWidth="changeWidth" minWidth="300" ref="resizableDiv">
				<div class="properties-panel-parent resizable-content h-100 border-start border-dark-subtle"
					ref="propertyPanel">
				</div>
			</PropertiesPanel>
			<div>
			<ConsolePanel ref="consolePanel" :isModelerVisible="props.isModelerVisible" :parentHeight="parentHeight"
				:rightPos="canvasWidth" :processID="props.tabElement.id" @changeHeight="changeHeight"
				@copy-line="copyLine" @clean-console="cleanConsole" @blur="focusLost"
				@show-console-notification="emit('showConsoleNotification', $event)">
				<MonacoThemeScope overrideTheme="consoleTheme" v-show="isConsoleOpen">
					<MonacoConsole ref="monacoEditorConsole" theme="vs" :width="canvasWidth" :height="canvasHeight"
						:consoleErrors="props.consoleErrors">
					</MonacoConsole>
				</MonacoThemeScope>
			</ConsolePanel>			
			<MenuActionButtons :key="`menu-action-buttons-${props.tabElement.key}`" :width="canvasWidth">
				<template #leftButtons>
					<slot name="menu" />					
					<component
						v-if="BpmnFilterButtonComponent"
						:is="BpmnFilterButtonComponent"
						ref="popover"
						position="top"
						:container="containerModeler"
						classesOn="mdi mdi-24px mdi-filter-outline"
						classesOff="mdi mdi-24px mdi-filter"
						:filter-bpmn="config.modeler?.filterBpmn"
						:tab-element-id="props.tabElement.id"
						:get-bpmn-modeler="() => bpmnModeler"
					/>
				</template>
				<template #rightButtons>
					<div class="d-flex">
						<component v-if="VersionButtonComponent && processHistoryListComp?.length > 0"
							:is="VersionButtonComponent" :history-list="processHistoryListComp" :active-version="activeVersion" />
						<component v-if="CompareButtonComponent && processHistoryListComp?.length > 1"
							:is="CompareButtonComponent" :history-list="processHistoryListComp" type="bpmn" />
					</div>
				</template>
			</MenuActionButtons>
		</div>
		</div>

		<ListSelector
			v-if="listDataForSelector"
			ref="listSelector"
			:showModal="isShowModalListSelector"
			:key="props.tabElement.key"
			:rowTemplate="listDataForSelector"
			:typeOfSelector="typeOfSelector"
			@toggle-modal-list-selector="toggleModalListSelector"
			:headers="getHeadersForSelector(typeOfSelector)"
			:show-headers="typeOfSelector === 'changeVersion'"
			:sort-by="typeOfSelector === 'changeVersion' ? 'updated' : undefined"
			:sort-desc="typeOfSelector === 'changeVersion' ? true : undefined"
			@item-selected="handleListSelection">

			<!-- Not found templates -->
			<template #cell(name)="{ item }" v-if="typeOfSelector === 'templates'">
			  <div class="border-0 d-flex align-items-center entry" style="cursor:pointer;"
				:data-id="item.id" :title="item.name" draggable="true">
				<span>
				  {{ `${item.name} - ${item.id}` }}
				</span>
			  </div>
			</template>

			<!-- Diagram version history -->
			<template #cell(version)="{ item }" v-if="typeOfSelector === 'changeVersion'">
				<div class="border-top-0 p-1">{{ $t('version') }} {{ item.version }}</div>
			</template>
			<template #cell(updated)="{ item }" v-if="typeOfSelector === 'changeVersion'">
				<div class="border-top-0 p-1">{{ new Date(item.updated).toLocaleString() }}</div>
			</template>
		</ListSelector>

		<ElementTemplatesModal ref="elementTemplatesModal" :tabElement="tabElement"
		@applyTemplateToTask="applyTemplateToTask"></ElementTemplatesModal>
		<ScriptEditorModal ref="scriptEditorModal" />
	</div>
</template>

<script setup>
//import styles
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'diagram-js-minimap/assets/diagram-js-minimap.css'
import '@bpmn-io/element-template-chooser/dist/element-template-chooser.css'
import 'bpmn-js-color-picker/colors/color-picker.css'
import '@bpmn-io/properties-panel/assets/properties-panel.css'
import 'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'

import { debounce } from 'min-dash'

//import bpmn modules
import BpmnModeler from 'bpmn-js/lib/Modeler'
import { BpmnPropertiesProviderModule, BpmnPropertiesPanelModule, CamundaPlatformPropertiesProviderModule } from 'bpmn-js-properties-panel'
import { ElementTemplatesPropertiesProviderModule } from 'bpmn-js-element-templates'
import ElementTemplateChooserModule from '@bpmn-io/element-template-chooser'
import CamundaModdleDescriptors from 'camunda-bpmn-moddle/resources/camunda.json'
import { customTranslate, translateValue } from "../../i18n.js"
import lintModule from 'bpmn-js-bpmnlint'
import linterConfig from '../../../linterConfig'

import camundaPlatformBehaviors from 'camunda-bpmn-js-behaviors/lib/camunda-platform'

//color picker
import BpmnColorPickerModule from 'bpmn-js-color-picker'

//with ctrl+f you can search components
import SearchModule from 'bpmn-js/lib/features/search'

// importing minimap module 
import minimapModule from 'diagram-js-minimap'

//components
import PropertiesPanel from '../layout/PropertiesPanel.vue'
import ListSelector from '../../components/modals/ListSelector.vue'
import MonacoConsole from '../monaco/MonacoConsole.vue'
import ConsolePanel from '../layout/ConsolePanel.vue'
import MonacoThemeScope from '../layout/MonacoThemeScoped.vue'
import MenuActionButtons from '../layout/MenuActionButtons.vue'
import ElementTemplatesModal from '../modals/ElementTemplatesModal.vue'
import ScriptEditorModal from '../modals/ScriptEditorModal.vue'

// Specific imports
import { getHeadersForSelector } from './SelectorHeaders'

import { onMounted, onBeforeUnmount, inject, provide, ref, onUpdated, watch, computed, nextTick, watchEffect } from 'vue'
//composables
import useModeler from '../../composables/useModeler.js'
import useCustomizedTemplateModal from '../../composables/customizedTemplateModal.js'
import usePropertiesPanel from '../../composables/usePropertiesPanel'
import useMonacoEditor from '../../composables/useMonacoEditor.js'

//utils
import { checkJSON } from '../../utils.js'

const monaco = inject('monaco')
const extraBpmnModules = inject('extraBpmnModules', [])
const bpmnModelerInitHook = inject('bpmnModelerInitHook', null)
const divScriptTaskID = 'bio-properties-panel-scriptValue'
const canvasWidth = ref(0)
const canvasHeight = ref(44)
const containerModeler = ref(null)
const canvas = ref(null)
const propertyPanel = ref(null)
const monacoEditorConsole = ref(null)
const consolePanel = ref(null)

//variables for the list selector component
const listSelector = ref(null)
const TYPEC7 = 'bpmn-c7'
const propertiesPanelComponent = ref(null)
const isVisiblePropertyPanel = ref(true)
const resizableDiv = ref(null)
//config.js
const config = inject('config', {})

//popover for task filters
const BpmnFilterButtonComponent = inject('bpmnFilterButtonComponent', null)
const CompareButtonComponent = inject('compareButtonComponent', null)
const VersionButtonComponent = inject('versionButtonComponent', null)
const popover = ref(null)
//element templates modal
const elementTemplatesModal = ref(null)
const scriptEditorModal = ref(null)

const emit = defineEmits([
	'toggleOutdatedTemplateBtn',
	'resizeTabNav',
	'toggleIsSaved',
	'setTypeOfDiagramForModeler',
	'isValidated',
	'showToastMessage',
	'updateStoredLocalStorageTabNavList',
	'toggleEnableSave',
	'updateIsButtonDisabled',
	'updateEditorXML',
	'showDiagram',
	'showPropertyPanel',
	'toggleVersionNotSaved',
	'updateDownloadLink',
	'showConsoleNotification',
])

const props = defineProps({
	diagramType: { type: String, default: null }, //'bpmn-c7','dmn'
	clipboard: { type: Object, required: true },
	xml: String,
	tabElementIndex: {
		type: Number, required: true
	},
	tabElement: {
		type: Object,
		required: true
	},
	isModelerVisible: {
		type: Boolean,
		default: false
	},
	isActiveTab: Boolean,
	versionSaved: {
		type: Boolean, default: false
	},
	elementTemplateJson: Array,
	consoleErrors: {
		type: String, default: ''
	}
})
//composables
const {
	saveProcess,
	validate,
	getElementRegistryFromModeler,
	getProcessInformation,
	toggleVersionNotSaved,
	toggleEnableSave,
	saveXmlAfterUpdate,
	changeActiveVersion,
	//refs for list selector slots
	activeVersion,
	processHistoryListComp,
	isShowModalListSelector, // for showing listselector modal
	listDataForSelector,
	templatesList,
	typeOfSelector, //to load the diferent selector components in slots	
	// for the console
	toggleConsole,
	addLineWithErrorToConsole,
	copyLine,
	cleanConsole,
	isConsolePanelShowing,
	isConsoleOpen,
} = useModeler(props, emit, monacoEditorConsole, consolePanel)

const { addCustomizeTemplateButton, customizedModalElementTemplatesData, applyTemplateToTask } = useCustomizedTemplateModal()
const { updateParentHeight, updateParentWidth,  parentWidth, parentHeight } = usePropertiesPanel(props, emit, containerModeler, resizableDiv)


let bpmnModeler = null
let isScriptTaskUpdate = false

const isMinimapOpen = ref(false)
const isFullscreen = ref(false)

const ZOOM_STEP = 0.2
const zoomIn = () => { const c = bpmnModeler.get('canvas'); c.zoom(c.zoom() + ZOOM_STEP) }
const zoomOut = () => { const c = bpmnModeler.get('canvas'); c.zoom(c.zoom() - ZOOM_STEP) }
const resetViewport = () => { bpmnModeler.get('canvas').zoom('fit-viewport') }
const toggleMinimap = () => { bpmnModeler.get('minimap').toggle(); isMinimapOpen.value = !isMinimapOpen.value }
const toggleFullscreen = async () => {
	if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
	else await document.exitFullscreen()
}
const onFullscreenChange = () => { isFullscreen.value = !!document.fullscreenElement }

provide('loadVersionHook', async (xml, version) => {
	await _openDiagram(xml)
	toggleVersionNotSaved(true, props.tabElementIndex)
	toggleEnableSave(false, props.tabElementIndex)
	changeActiveVersion(version)
})
let typeOfDiagram = null //'bpmn-c7','dmn'

onMounted(async () => {
	initializeModeler()
	window.addEventListener('resize', updateParentWidth, true)
	window.addEventListener('resize', updateParentHeight, true)
	document.addEventListener('fullscreenchange', onFullscreenChange)

	await _openDiagram(props.xml)
	templatesList.value = checkJSON(props.xml, props.elementTemplateJson) ?? []
	
	if (templatesList.value.length > 0 && props.isActiveTab && !props.isModelerVisible) {
		typeOfSelector.value = 'templates'
		isShowModalListSelector.value = true
		emit('toggleOutdatedTemplateBtn', templatesList.value.length > 0)
	}

	await nextTick()
	emit('resizeTabNav', canvasWidth.value)
})

onBeforeUnmount(() => {
	document.removeEventListener('fullscreenchange', onFullscreenChange)
})

onUpdated(() => {
	updateParentWidth()
	updateParentHeight()
})

const styleCanvas = computed(() => {
	return { width: `${canvasWidth.value}px !important` }
})


watch(() => props.xml, newValue => { // when the xml changes update the xml
	validate(bpmnModeler, newValue)
})

watch(() => props.isActiveTab, async newValue => { // when the xml changes to not have problems with same id in different properties panel
	if (newValue) {
		propertiesPanelComponent.value.attachTo(propertyPanel.value)
		await nextTick()
		emit('resizeTabNav', resizableDiv.value._changeWidth())		
	}
	else propertiesPanelComponent.value.detach()
})

watch(() => props.isModelerVisible, async newValue => { // when the editor gets hidden to update the xml
	if (!newValue && bpmnModeler) _setupDiagramFunctions()
})

watch(canvasWidth, async newW => {
	styleCanvas.value.width = `${newW}px`
	// Notify bpmn.io that the canvas container has been resized so it can
	// recompute its internal viewport state and refresh all dependent modules
	// (including the minimap). Without this, the minimap renders once with the
	// initial 0-width canvas and stays blank until a manual browser resize.
	if (newW > 0 && bpmnModeler) {
		await nextTick() // let the DOM update to the new width first
		bpmnModeler.get('canvas').resized()
	}
})

watchEffect(async () => {
	// When the tab changes, focus the canvas if the tab is active
	if (props.isActiveTab && canvas.value) {
		await nextTick() // wait for the component to be visible
		canvas.value.focus()
	}
})

// Watch for changes in element templates and update the modeler
watch(() => props.elementTemplateJson, (newTemplates) => {
	if (bpmnModeler && newTemplates) {
		console.log('Element templates changed, updating BpmnModeler...')
		try {
			// Get the element templates service from the modeler
			const elementTemplatesService = bpmnModeler.get('elementTemplates')
			
			// Update the element templates in the modeler
			if (elementTemplatesService && elementTemplatesService.set) {
				elementTemplatesService.set(newTemplates)
				console.log('Element templates updated in bpmn.io modeler')
			} else {
				console.warn('Element templates service not available or does not support dynamic updates')
			}
		} catch (error) {
			console.error('Error updating element templates in modeler:', error)
		}
	}
}, { deep: true })

const initializeModeler = async () => {
	//checks in xml for zeebe to see if the file is from camunda 8 and initializes bpmnModeler accordingly
	//if it is called from loading a file when we don't know the extension from the database it will be null
	switch (props.diagramType) {
		case TYPEC7: initializeCamunda7Modeler()
			break
		default: initializeCamunda7Modeler()
			break
	}
	emit('setTypeOfDiagramForModeler', typeOfDiagram, props.tabElementIndex)

	bpmnModeler.on('element.click', async e => {
		_setMonacoEditorToDiv(e, divScriptTaskID)
		_detectListenerFromUserTask(e, 'TaskListener')
		_detectListenerFromUserTask(e, 'ExecutionListener')
		if (e.element.id) {
			_addInstructionsToNotFoundTemplate(e.element.id)
			if (e.element.id) addCustomizeTemplateButton(e)
		}
		_openCalledElementWhenCalActivity(e)
	})

	bpmnModeler.on('commandStack.changed', e => {
		emit('toggleEnableSave', true, props.tabElementIndex) //enables save button		
		_setupDiagramFunctions()
		getProcessInformation(bpmnModeler)
		if (popover.value?.isFilterOn) popover.value.bpmnFilter(bpmnModeler)
		_openCalledElementWhenCalActivity(e)
	})

	bpmnModeler.on('element.changed', async e => {
		await nextTick()
		_setMonacoEditorToDiv(e, divScriptTaskID)
		_detectListenerFromUserTask(e, 'TaskListener')
		_detectListenerFromUserTask(e, 'ExecutionListener')
		_addingFormFieldToStartEvent(e.element)
		if (e.element?.id) {
			_addInstructionsToNotFoundTemplate(e.element.id)
			addCustomizeTemplateButton(e)
		}
		_openCalledElementWhenCalActivity(e)
		_setupDiagramFunctions()
	})

	bpmnModeler.on('commandStack.element.updateProperties.postExecute', e => {
		_detectListenerFromUserTask(e, 'TaskListener')
		_detectListenerFromUserTask(e, 'ExecutionListener')
		_addingFormFieldToStartEvent(e.context.element)
		_openCalledElementWhenCalActivity(e)
	})

	//if ctrl + z is pressed and the script task is open ,loads monaco editor
	bpmnModeler.on('commandStack.element.updateModdleProperties.reverted', e => {
		_setMonacoEditorToDiv(e, divScriptTaskID)
		_detectListenerFromUserTask(e, 'TaskListener')
		_detectListenerFromUserTask(e, 'ExecutionListener')

		if (e.element.id) {
			_addInstructionsToNotFoundTemplate(e.element.id)
			if (e.element.id) addCustomizeTemplateButton(e)
		}
		_openCalledElementWhenCalActivity(e)
	})

	if (bpmnModelerInitHook) bpmnModelerInitHook(bpmnModeler, { togglePropertiesPanel, containerModeler })

	propertiesPanelComponent.value = bpmnModeler.get('propertiesPanel')
	_setupDiagramFunctions()
	customizedModalElementTemplatesData(bpmnModeler, containerModeler, elementTemplatesModal)
	_setupTTLMonitoring()
}

const initializeCamunda7Modeler = () => {
	typeOfDiagram = TYPEC7
	const customTranslateModule = {
		translate: ['value', customTranslate]
	}
	bpmnModeler = new BpmnModeler({
		container: canvas.value,
		propertiesPanel: {
			parent: propertyPanel.value
		},
		linting: {
			bpmnlint: linterConfig
		},
		additionalModules: [
			BpmnPropertiesPanelModule,
			BpmnPropertiesProviderModule,
			CamundaPlatformPropertiesProviderModule,// for camunda 7		
			ElementTemplatesPropertiesProviderModule,
			ElementTemplateChooserModule,
			minimapModule,
			SearchModule,
			BpmnColorPickerModule,
			customTranslateModule,
			camundaPlatformBehaviors,
			{ clipboard: ['value', props.clipboard] },
			...extraBpmnModules,
			lintModule
		],
		elementTemplates: props.elementTemplateJson, //templates for camunda 7
		moddleExtensions: {
			camunda: CamundaModdleDescriptors// for camunda 7
		}
	}
	)
}

const _setupTTLMonitoring = () => {
	if (typeOfDiagram !== TYPEC7) return
	
	let currentInput = null
	const validateTTLInput = (input) => {
		if (!input) return
		
		const parent = input.closest('.bio-properties-panel-entry')
		if (!parent) return
		
		const feedback = parent.querySelector('.invalid-feedback')
		
		if (!input.value?.trim()) {
			input.classList.add('is-invalid')
			if (!feedback) {
				const div = document.createElement('div')
				div.className = 'invalid-feedback d-block'
				div.textContent = translateValue('ttlFieldRequired')
				parent.appendChild(div)
			}
		} else {
			input.classList.remove('is-invalid')
			if (feedback) {
				feedback.remove()
			}
		}
	}
	
	const checkTTL = () => {
		nextTick(() => {
			const input = containerModeler.value?.querySelector('input[name="historyTimeToLive"]')
			if (!input) {
				currentInput = null
				return
			}
			if (currentInput !== input) {
				currentInput = input
				input.oninput = null
				input.oninput = () => {
					setTimeout(() => {
						validateTTLInput(input)
					}, 10)
				}
			}
			validateTTLInput(input)
		})
	}
	bpmnModeler.get('eventBus').on(['selection.changed', 'propertiesPanel.updated'], checkTTL)
}

const _setupDiagramFunctions = debounce(async () => {
	try {
		// attempt to save the BPMN diagram XML, with formatting
		const { xml } = await bpmnModeler.saveXML({ format: true })
		emit('updateEditorXML', xml, props.tabElementIndex)
		// check if there is outdated templates
		_updatetemplatesListButton(xml)
		emit('updateIsButtonDisabled', false, props.tabElementIndex)
		saveXmlAfterUpdate(true, xml, props.tabElementIndex, bpmnModeler)

	} catch (err) {
		// if an error occurs during saving, log the error and set up the download link as null
		console.error('Error happened saving XML: ', err)
	}
}, 5)

const _validate = async xml => {
	validate(bpmnModeler, xml)
}

const _saveDiagram = async () => await saveProcess(bpmnModeler, typeOfDiagram, _setupDiagramFunctions, _updatetemplatesListButton)

const _mapScriptLanguage = scriptFormat => {
	// CIBseven script task languages: Groovy, JavaScript, JRuby (ruby), Jython (python).
	// Groovy has no Monaco highlighter → falls back to 'java' (close enough syntactically).
	const map = { javascript: 'javascript', python: 'python', ruby: 'ruby' }
	return map[scriptFormat?.toLowerCase()] ?? 'java'
}

const _createMonacoEditor = (scriptDivId, textArea, scriptFormat = null) => {
	const wrapperId = `${scriptDivId}-wrapper`
	const language = _mapScriptLanguage(scriptFormat)

	const wrapper = document.createElement('div')
	wrapper.id = wrapperId
	wrapper.dataset.scriptFormat = scriptFormat ?? ''
	wrapper.style.position = 'relative'
	wrapper.style.width = '100%'

	const divMonaco = document.createElement('div')
	divMonaco.id = `${scriptDivId}`
	divMonaco.style.width = '100%'
	divMonaco.style.minHeight = '200px'
	divMonaco.style.border = '1px solid var(--input-border-color)'
	//resize and overflow to make the div resizable
	divMonaco.style.resize = 'vertical'
	divMonaco.style.overflow = 'hidden'

	const expandBtn = document.createElement('button')
	expandBtn.className = 'btn btn-sm btn-light border position-absolute'
	expandBtn.style.bottom = '4px'
	expandBtn.style.right = '4px'
	expandBtn.style.zIndex = '10'
	expandBtn.title = translateValue('buttons.expandScript')
	expandBtn.innerHTML = '<span class="mdi mdi-18px mdi-arrow-expand-all"></span>'

	wrapper.appendChild(divMonaco)
	wrapper.appendChild(expandBtn)

	const existingWrapper = propertyPanel.value.querySelector(`#${wrapperId}`)
	if (!existingWrapper) { //it it doesnt exist it will create it
		textArea.insertAdjacentElement('afterend', wrapper)
	}
	else { // if already exists it will replace it
		existingWrapper.replaceWith(wrapper)
	}

	textArea.style.display = 'none'
	const { createMonacoEditorForScripts } = useMonacoEditor(monaco, props)
	const editor = createMonacoEditorForScripts(divMonaco, textArea.value, language)

	expandBtn.addEventListener('click', () => {
		scriptEditorModal.value.open(editor.getValue(), scriptFormat).then(newValue => {
			if (newValue !== null) editor.setValue(newValue)
		})
	})

	return editor
}

const hideModalListSelector = () => {
	listSelector.value._hideModal()
	isShowModalListSelector.value = false
}

const selectElementRegistryById = elementId => {
	const elementRegistry = bpmnModeler.get('elementRegistry')
	const foundElementRegistry = elementRegistry.get(elementId)
	const selection = bpmnModeler.get('selection')

	if (!foundElementRegistry || !selection) return

	selection.select(foundElementRegistry)
	_moveViewToElement(foundElementRegistry)
	_addInstructionsToNotFoundTemplate(elementId)
}

const changeWidth = value => {
	canvasWidth.value = value
}

const changeHeight = value => {
	canvasHeight.value = value
}

const toggleModalListSelector = comp => isShowModalListSelector.value = comp

const focusLost = () => monacoEditorConsole.value.focusLost()

const togglePropertiesPanel = value => {
	isVisiblePropertyPanel.value = value
	if (!value) {
		propertiesPanelComponent.value.detach()
		resizableDiv.value._resetPropertiesPanelWidth()
		return
	}
	propertiesPanelComponent.value.attachTo(propertyPanel.value)
	resizableDiv.value._restorePropertiesPanelWidth()
}

const handleListSelection = (item) => {
	if (item === null) return null
	if (typeOfSelector.value === 'templates') {
		selectElementRegistryById(item.id)
		hideModalListSelector()
	}
}

const _setMonacoEditorToDiv = (e, divId) => {
	getProcessInformation(bpmnModeler)

	setTimeout(() => { // needed to load the component in the propertypanel
		const element = e.context?.element ?? e.element // if it is called in different commandStacks it will take the right route
		// alternative with another events e.element.type

		if (element.type !== 'bpmn:ScriptTask') {// continues only if a script task has being loaded
			return
		}
		// to get the value of the selected script task

		const textAreaScriptTask = propertyPanel.value.querySelector(`#${divId}`)

		if (!textAreaScriptTask) { // if the textarea is not loaded or created it will not continue
			return
		}

		const monacoEditorId = element.di.bpmnElement.id ?? element.moddleElement.id
		const scriptFormat = element.moddleElement?.scriptFormat ?? element.di.bpmnElement?.scriptFormat
		// Skip rebuild only when the event was our own typing AND scriptFormat hasn't changed.
		// A scriptFormat change must always rebuild so Monaco picks up the new language.
		const existingWrapper = propertyPanel.value.querySelector(`#monaco-editor-${monacoEditorId}-wrapper`)
		const formatUnchanged = existingWrapper?.dataset.scriptFormat === (scriptFormat ?? '')
		if (isScriptTaskUpdate && formatUnchanged) {
			isScriptTaskUpdate = false
			return
		}
		isScriptTaskUpdate = false
		const monacoEditor = _createMonacoEditor(`monaco-editor-${monacoEditorId}`, textAreaScriptTask, scriptFormat)
		//captures changes in monaco editor
		monacoEditor.getModel().onDidChangeContent(() => {
			textAreaScriptTask.value = monacoEditor.getValue()
			isScriptTaskUpdate = true

			// to update the content of the script of the monaco editor in script task 	
			if (element.moddleElement && element.moddleElement.script !== undefined) {
				element.moddleElement.script = textAreaScriptTask.value
			}
			else {
				element.di.bpmnElement.script = textAreaScriptTask.value
			}

			// calling function of ModelerCanvas
			_setupDiagramFunctions()
			emit('toggleEnableSave', true, props.tabElementIndex) //enables save button		
		})

	}, 15)
}

const _openDiagram = async xml => {
	try {
		validate(bpmnModeler, xml)
		emit('updateEditorXML', xml, props.tabElementIndex)
		emit('showDiagram', true)
		_setupDiagramFunctions()
		emit('showPropertyPanel', true, props.tabElementIndex)
	}
	catch (err) {
		emit('showDiagram', false)
		emit('showToastMessage', { isSuccess: false, toastText: 'toastLoadErrorFile' })
		console.error(err)
	}
}

//centers the view in the element
const _moveViewToElement = element => {
	const canvas = bpmnModeler.get('canvas')
	const currentViewbox = canvas.viewbox()

	const elementMid = {
		x: element.x + element.width / 2,
		y: element.y + element.height / 2
	}

	canvas.viewbox({
		x: elementMid.x - currentViewbox.width / 2,
		y: elementMid.y - currentViewbox.height / 2,
		width: currentViewbox.width,
		height: currentViewbox.height
	})
}

const _updatetemplatesListButton = xml => {
	templatesList.value = checkJSON(xml, props.elementTemplateJson)
	emit('toggleOutdatedTemplateBtn', templatesList.value.length > 0)
}

const _addingFormFieldToStartEvent = (element) => {
	const bpmnElement = element.di.bpmnElement

	// to add form fields when the form type is embedded or external
	if (bpmnElement.$type === 'bpmn:StartEvent' && bpmnElement?.extensionElements?.$type === 'bpmn:ExtensionElements') {
		//search for fields
		const moddle = bpmnModeler.get('moddle')
		let form = bpmnElement.extensionElements.get('values').filter(elem => elem.$type == 'camunda:FormData')[0]

		if (form) return

		form = moddle.create('camunda:FormData')
		bpmnElement.extensionElements.get('values').push(form)
	}
}

//to open the call element options and gives one retry if it doesnt find the class
const _openCalledElementWhenCalActivity = async e => {
	await nextTick()
	if (e && e.element?.type === 'bpmn:CallActivity') {
		//finds the id with that id and adds the open class to its children to uncollapse it
		const targetDiv = _simulateClickOnDiv('div[data-group-id="group-CamundaPlatform__CallActivity"]', '.bio-properties-panel-group-header')	
		if (!targetDiv) {
			setTimeout(() => {
				_simulateClickOnDiv('div[data-group-id="group-CamundaPlatform__CallActivity', '.bio-properties-panel-group-header')
			}, 200)
		}
	}
}

//simulate a click on a div to uncollapse it
const _simulateClickOnDiv = async (parentDivId, divToClick) => {
	const targetDiv = containerModeler.value.querySelector(parentDivId)
	let foundDivToClick = null
	if (targetDiv) {
		foundDivToClick = targetDiv.querySelector(divToClick)
		if (foundDivToClick && !foundDivToClick.classList.contains('open')) {
			foundDivToClick.click()			
		}
	}
	return foundDivToClick
}

const _addInstructionsToNotFoundTemplate = id => {
	setTimeout(() => {
		
		if (!templatesList.value) return

		const found = templatesList.value.find(el => el.id === id)

		if (!found) return
		const divExists = containerModeler.value.querySelector(`#template-not-found-${id}`)
		if (divExists) return

		const divElementTemplateNotFound = containerModeler.value.querySelector(`[data-group-id="group-ElementTemplates__Template"]`)
		const templateInfo = document.createElement('h3')
		templateInfo.id = `template-not-found-${id}`
		templateInfo.classList.add('d-flex', 'fw-bold')
		templateInfo.style.paddingLeft = "12px" // same margin left as the Template's title
		const textOfInfoOutdatedTemplate = translateValue('notFound')
		templateInfo.textContent = `${textOfInfoOutdatedTemplate} : ${found.nameOfTemplate.value}`
		divElementTemplateNotFound.append(templateInfo)

	}, 50)
}

const _detectListenerFromUserTask = async (e, listenerName) => {
	await nextTick()
	const bpmnElement = e.context?.element.di.bpmnElement ?? e.element.di.bpmnElement

	// to add form fields when the form type is embedded or external
	if (bpmnElement?.extensionElements?.$type === 'bpmn:ExtensionElements') {

		const divElementToclick = containerModeler.value.querySelector(`[data-group-id="group-CamundaPlatform__${listenerName}"] .bio-properties-panel-group-header`)

		if (!divElementToclick) {
			return
		}

		divElementToclick.addEventListener('click', function () {
			_replaceTaskListenerScriptWithMonacoEditor(bpmnElement, listenerName)
		})

		_replaceTaskListenerScriptWithMonacoEditor(bpmnElement, listenerName)
	}
}

const _replaceTaskListenerScriptWithMonacoEditor = (bpmnElement, listenerName) => {
	const taskNameFirstLetterLowerCase = listenerName[0].toLowerCase() + listenerName.slice(1, listenerName.length)
	//search for fields and replace the script editor
	let cont = 0
	bpmnElement.extensionElements.get('values').map(elem => {

		if (elem.$type === `camunda:${listenerName}` && elem.script?.$type === 'camunda:Script') {
			const scriptDivId = `bio-properties-panel-${bpmnElement.id}-${taskNameFirstLetterLowerCase}-${cont}scriptValue`
			_replaceDivWithMonacoEditor(scriptDivId, elem)
			cont++
		}
	})
}

const _replaceDivWithMonacoEditor = async (scriptDivId, element) => {
	setTimeout(() => {
		// to get the value of the selected script task
		const textAreaScriptTask = propertyPanel.value.querySelector(`#${scriptDivId}`)

		if (!textAreaScriptTask) { // if the textarea is not loaded or created it will not continue
			return
		}

		const scriptFormat = element.script?.scriptFormat
		const monacoEditor = _createMonacoEditor(`monaco-editor-${scriptDivId}`, textAreaScriptTask, scriptFormat)
		//captures changes in monaco editor
		monacoEditor.getModel().onDidChangeContent(() => {
			textAreaScriptTask.value = monacoEditor.getValue()
			isScriptTaskUpdate = true
			element.script.value = textAreaScriptTask.value
			_setupDiagramFunctions()
			emit('toggleEnableSave', true, props.tabElementIndex)
		})
	}, 50)

}

const _toggleModalListSelectorFromActionButton = (comp, typeOfSelectorName) => {
	typeOfSelector.value = typeOfSelectorName
	isShowModalListSelector.value = comp
}
const _saveXmlAfterUpdate = (isBpmn, updateXml, tabElementIndex) => {
	saveXmlAfterUpdate(isBpmn, updateXml, tabElementIndex, bpmnModeler)
}

const _getElementRegistryFromModeler = type => getElementRegistryFromModeler(bpmnModeler, type)

defineExpose({
	toggleConsole,
	addLineWithErrorToConsole,
	togglePropertiesPanel,
	isConsolePanelShowing,
	_saveXmlAfterUpdate,
	_toggleModalListSelectorFromActionButton,
	_getElementRegistryFromModeler,
	_validate,
	_saveDiagram,
})
</script>

<style>
svg {
	outline: none;
}
.djs-minimap .toggle {
	display: none;
}
/*for the resize panel to work */
#js-properties-panel {
	min-width: 200px;
	height: 100%;
	width: 100%;
	max-width: none !important;
	z-index: 9999;
}

.bio-properties-panel-scroll-container {
	width: 100%;
}

input[name="historyTimeToLive"].is-invalid {
	border-color: #dc3545 !important;
	background-color: #fee !important;
}


.canvas {
	position: relative;
	width: 450px;
	outline: none;
}

.container.modeler {
	width: 100% !important;
	height: 100%;
	max-width: none !important;
	margin: 0;
	padding: 0;

}

.bts-notifications {
	/*leaves space for de action buttons*/
	margin-bottom: 50px;
}

.container.modeler .bts-toggle-mode:hover {
	background-color: var(--bs-primary);
}

.container.modeler .bjs-container.simulation .bts-toggle-mode {
	background-color: var(--bs-primary);
}

.container.modeler .bjs-container.simulation .djs-container {
	box-shadow: inset 0px 0px 0px 4px var(--bs-primary);
}

.container.modeler .bts-context-pad:not(.disabled):hover {
	background-color: var(--bs-primary);
}

.container.modeler .bts-set-animation-speed .bts-animation-speed-button.active,
.container.modeler .bts-set-animation-speed .bts-animation-speed-button:hover {
	background-color: var(--bs-primary);
}

.container.modeler .bts-palette .bts-entry.active,
.container.modeler .bts-palette .bts-entry:not(.disabled):hover {
	background-color: var(--bs-primary);
}

.container.modeler .bts-log .bts-header {
	background-color: var(--bs-primary);
}
</style>
