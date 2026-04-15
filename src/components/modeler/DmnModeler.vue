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
			<div class="d-flex flex-grow-1 overflow-auto" style="min-height: 0;">
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
				<div v-show="isPropertyPanelVisible && !props.isModelerVisible">
					<PropertiesPanel ref="resDiv" :parentWidth="parentWidth" @changeWidth="changeWidth" minWidth="300">
						<div class="properties-panel-parent resizable-content h-100 border-start border-dark-subtle"
							ref="dmnProperties"></div>
					</PropertiesPanel>
				</div>
			</div>
			<div>
				<ConsolePanel ref="consolePanel" :isModelerVisible="props.isModelerVisible" :parentHeight="parentHeight"
					:rightPos="canvasWidth" :processID="props.tabElement.id" @changeHeight="changeHeight"
					@copy-line="copyLine" @clean-console="cleanConsole" @blur="focusLost"
					@show-console-notification="emit('show-console-notification', $event)">
					<MonacoThemeScope overrideTheme="consoleTheme" v-show="isConsoleOpen">
						<MonacoConsole ref="monacoEditorConsole" theme="vs" :width="canvasWidth" :height="canvasHeight"
							:consoleErrors="props.consoleErrors">
						</MonacoConsole>
					</MonacoThemeScope>
				</ConsolePanel>
				<MenuActionButtons :width="canvasWidth">
					<template #leftButtons>
						<slot name="menu" />
					</template>
					<template #rightButtons>
						<div class="d-flex">
							<component v-if="VersionButtonComponent && processHistoryListComp?.length > 0"
								:is="VersionButtonComponent" :history-list="processHistoryListComp" :active-version="activeVersion" />
							<component v-if="CompareButtonComponent && processHistoryListComp?.length > 1"
								:is="CompareButtonComponent" :history-list="processHistoryListComp" type="dmn" />
						</div>
					</template>
				</MenuActionButtons>
			</div>

		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, onUpdated, onBeforeUnmount, watch, nextTick, inject, provide } from 'vue'
import DmnJS from 'dmn-js/lib/Modeler'
import { debounce } from 'min-dash'
import { migrateDiagram } from '@bpmn-io/dmn-migrate'
import camundaModdleDescriptor from 'camunda-dmn-moddle/resources/camunda.json'
import { DmnPropertiesPanelModule, DmnPropertiesProviderModule, CamundaPropertiesProviderModule } from 'dmn-js-properties-panel'
import 'dmn-js/dist/assets/diagram-js.css'
import 'dmn-js/dist/assets/dmn-font/css/dmn.css'
import 'dmn-js/dist/assets/dmn-js-shared.css'
import 'dmn-js/dist/assets/dmn-js-drd.css'
import 'dmn-js/dist/assets/dmn-js-decision-table.css'
import 'dmn-js/dist/assets/dmn-js-literal-expression.css'
import 'dmn-js-decision-table/assets/css/dmn-js-decision-table-controls.css'
import 'dmn-js-decision-table/assets/css/dmn-js-decision-table.css'
import 'dmn-js-properties-panel/dist/assets/properties-panel.css'
import minimapModule from 'diagram-js-minimap'
import 'diagram-js-minimap/assets/diagram-js-minimap.css'

import MenuActionButtons from '../layout/MenuActionButtons.vue'
import PropertiesPanel from '../layout/PropertiesPanel.vue'
import ConsolePanel from '../layout/ConsolePanel.vue'
import MonacoConsole from '../monaco/MonacoConsole.vue'
import MonacoThemeScope from '../layout/MonacoThemeScoped.vue'
import useModeler from '../../composables/useModeler.js'
import usePropertiesPanel from '../../composables/usePropertiesPanel.js'
import { getTagValueFromXml } from '../../utils.js'

const containerModeler = ref(null)
const canvas = ref(null)
const monacoEditorConsole = ref(null)
const consolePanel = ref(null)
const canvasHeight = ref(44)
const dmnProperties = ref(null)
const resDiv = ref(null)
const isPropertyPanelVisible = ref(true)
const propertiesPanelComponent = ref(null)
const isDrdShowing = ref(true)
let observerDecisionTables = null
let dmnModeler = null
let canvasFocusHandler = null

const isMinimapOpen = ref(false)
const isFullscreen = ref(false)

const ZOOM_STEP = 0.2
const zoomIn = () => {
	const viewer = dmnModeler?.getActiveViewer()
	if (!viewer) return
	const c = viewer.get('canvas')
	c.zoom(c.zoom() + ZOOM_STEP)
}
const zoomOut = () => {
	const viewer = dmnModeler?.getActiveViewer()
	if (!viewer) return
	const c = viewer.get('canvas')
	c.zoom(c.zoom() - ZOOM_STEP)
}
const resetViewport = () => {
	const viewer = dmnModeler?.getActiveViewer()
	if (viewer) viewer.get('canvas').zoom('fit-viewport')
}
const toggleMinimap = () => {
	const viewer = dmnModeler?.getActiveViewer()
	if (!viewer) return
	viewer.get('minimap').toggle()
	isMinimapOpen.value = !isMinimapOpen.value
}
const toggleFullscreen = async () => {
	if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
	else await document.exitFullscreen()
}
const onFullscreenChange = () => { isFullscreen.value = !!document.fullscreenElement }

const props = defineProps({
	xml: String,
	tabElementIndex: { type: Number, required: true },
	tabElement: { type: Object, required: true },
	isModelerVisible: { type: Boolean, default: false },
	isActiveTab: Boolean,
	consoleErrors: { type: String, default: '' },
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
	'setTypeOfDiagramForModeler',
	'toggleConsole',
	'show-console-notification',
])

const {
	saveDecisionTable,
	validate,
	saveXmlAfterUpdate,
	toggleConsole,
	addLineWithErrorToConsole,
	copyLine,
	cleanConsole,
	isConsolePanelShowing,
	isConsoleOpen,
	processHistoryListComp,
	changeActiveVersion,
	activeVersion,
	toggleVersionNotSaved,
	toggleEnableSave,
} = useModeler(props, emit, monacoEditorConsole, consolePanel)

const VersionButtonComponent = inject('versionButtonComponent', null)
const CompareButtonComponent = inject('compareButtonComponent', null)

provide('loadVersionHook', async (xml, version) => {
	const migratedXml = await migrateDiagram(xml)
	await validate(dmnModeler, migratedXml)
	toggleVersionNotSaved(true, props.tabElementIndex)
	toggleEnableSave(false, props.tabElementIndex)
	changeActiveVersion(version)
})

const { updateParentHeight, updateParentWidth, parentWidth, parentHeight } = usePropertiesPanel(props, emit, containerModeler, resDiv, null, null)
const canvasWidth = ref(0)
const changeWidth = value => { canvasWidth.value = value }

onMounted(async () => {
	dmnModeler = new DmnJS({
		drd: {
			propertiesPanel: { parent: dmnProperties.value },
			additionalModules: [DmnPropertiesPanelModule, DmnPropertiesProviderModule, CamundaPropertiesProviderModule, minimapModule]
		},
		container: canvas.value,
		moddleExtensions: {
			camunda: camundaModdleDescriptor
		}
	})

	if (props.xml) {
		const migratedXml = await migrateDiagram(props.xml)
		await validate(dmnModeler, migratedXml)
		emit('updateIsButtonDisabled', false, props.tabElementIndex)
		_setupDiagramFunctions()
	}

	const activeEditor = dmnModeler.getActiveViewer()

	activeEditor.on('propertiesPanel.detach', async () => {
		isDrdShowing.value = false
		if (!props.isModelerVisible) togglePropertiesPanel(false)
		await nextTick()
		const decisionTableRef = containerModeler.value?.querySelector('.dmn-decision-table-container')
		if (decisionTableRef) observerDecisionTables = createObserver(decisionTableRef)
	})

	activeEditor.on('propertiesPanel.attach', () => {
		isDrdShowing.value = true
		if (!props.isModelerVisible) togglePropertiesPanel(true)
		observerDecisionTables?.disconnect()
	})

	activeEditor.on('element.changed', () => {
		_setupDiagramFunctions()
		updateParentWidth()
	})

	// Use commandStack.changed (not element.changed) to detect actual user edits.
	// element.changed and views.changed also fire during initial XML import,
	// causing false-positive dirty state and an unnecessary "unsaved changes" dialog on tab close.
	const subscribedViewers = new Set()
	const subscribeCommandStackToViewer = (viewer) => {
		if (viewer && !subscribedViewers.has(viewer)) {
			viewer.on('commandStack.changed', () => {
				emit('toggleEnableSave', true, props.tabElementIndex)
			})
			subscribedViewers.add(viewer)
		}
	}
	subscribeCommandStackToViewer(activeEditor)

	propertiesPanelComponent.value = dmnModeler.getActiveViewer().get('propertiesPanel')

	// Track view changes to update XML and download links
	dmnModeler.on('views.changed', async () => {
		// Subscribe commandStack.changed to each new active viewer (decision table, literal expression, etc.)
		// so edits in those views are also tracked without false positives on view-switch
		subscribeCommandStackToViewer(dmnModeler.getActiveViewer())
		try {
			const { xml } = await dmnModeler.saveXML({ format: true })
			emit('updateEditorXML', xml, props.tabElementIndex)
			saveXmlAfterUpdate(false, xml, props.tabElementIndex, dmnModeler)
		} catch (err) {
			console.error(err)
		}
	})

	window.addEventListener('resize', updateParentWidth, true)
	window.addEventListener('resize', updateParentHeight, true)
	document.addEventListener('fullscreenchange', onFullscreenChange)
	await nextTick()
	emit('resizeTabNav', canvasWidth.value)
	preventCanvasFocusWhenPopupOpen()
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', updateParentWidth, true)
	window.removeEventListener('resize', updateParentHeight, true)
	document.removeEventListener('fullscreenchange', onFullscreenChange)
	if (canvas.value && canvasFocusHandler) {
		canvas.value.removeEventListener('focus', canvasFocusHandler)
	}
	if (observerDecisionTables) observerDecisionTables.disconnect()
})

onUpdated(() => {
	updateParentWidth()
	updateParentHeight()
})

watch(() => props.xml, async newValue => {
	if (newValue && dmnModeler) {
		const migratedXml = await migrateDiagram(newValue)
		_validate(migratedXml)
	}
})

watch(() => props.isModelerVisible, async newValue => {
	if (!newValue && dmnModeler) {
		_setupDiagramFunctions()
		if (isDrdShowing.value && propertiesPanelComponent.value) {
			await nextTick()
			propertiesPanelComponent.value.attachTo(dmnProperties.value)
			togglePropertiesPanel(true)
		}
	}
	updateParentWidth()
})

watch(() => props.isActiveTab, async newValue => {
	if (newValue && propertiesPanelComponent.value) {
		propertiesPanelComponent.value.attachTo(dmnProperties.value)
		await nextTick()
		emit('resizeTabNav', resDiv.value?._changeWidth() ?? canvasWidth.value)
	} else if (propertiesPanelComponent.value) {
		propertiesPanelComponent.value.detach()
	}
})

const styleCanvas = computed(() => ({ width: `${canvasWidth.value}px !important` }))

const _setupDiagramFunctions = debounce(async () => {
	try {
		const { xml } = await dmnModeler.saveXML({ format: true })
		emit('updateEditorXML', xml, props.tabElementIndex)
		saveXmlAfterUpdate(false, xml, props.tabElementIndex, dmnModeler.getActiveViewer())
	} catch (err) {
		console.error('Error saving DMN XML:', err)
	}
}, 5)

const preventCanvasFocusWhenPopupOpen = () => {
	const canvasElement = canvas.value
	if (!canvasElement) return

	// Override the DOM element's focus method to prevent focus when DMN popups are open
	const originalFocus = canvasElement.focus
	canvasElement.focus = (...args) => {
		const hasOpenPopup = document.querySelector('.dms-select-options, .options, .type-ref-edit-select')
		if (!hasOpenPopup) {
			return originalFocus.apply(canvasElement, args)
		}
	}

	// Prevent canvas focus events when DMN popups are open
	canvasFocusHandler = (e) => {
		const hasOpenPopup = document.querySelector('.dms-select-options, .options, .type-ref-edit-select')
		if (hasOpenPopup) {
			e.preventDefault()
			e.stopPropagation()
			canvasElement.blur()
			return false
		}
	}
	canvasElement.addEventListener('focus', canvasFocusHandler)
}

const createObserver = divToObserve => {
	if (!divToObserve) return
	const config = { attributes: false, childList: true, subtree: true }
	const callback = mutationsList => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'childList' || mutation.type === 'attributes') {
				_setupDiagramFunctions()
				emit('toggleEnableSave', true, props.tabElementIndex)
			}
		}
	}
	const observer = new MutationObserver(callback)
	observer.observe(divToObserve, config)
	return observer
}


const _saveDiagram = () => saveDecisionTable(dmnModeler, props.tabElement.type)

const _saveXmlAfterUpdate = (isBpmn, updatedXml, tabElementIndex) => {
	saveXmlAfterUpdate(false, updatedXml, tabElementIndex, dmnModeler)
}

const _validate = (xml) => validate(dmnModeler, xml)

const _getTagValueFromXml = (tagName, attribute) => getTagValueFromXml(props.xml, tagName, attribute)

const togglePropertiesPanel = value => {
	isPropertyPanelVisible.value = value
	if (!value) {
		resDiv.value?._resetPropertiesPanelWidth()
		canvasWidth.value = containerModeler.value?.parentNode.clientWidth ?? parentWidth.value
		return
	}
	if (!props.isModelerVisible) {
		resDiv.value?._restorePropertiesPanelWidth()
		updateParentWidth()
	}
}

const changeHeight = value => { canvasHeight.value = value }

const focusLost = () => monacoEditorConsole.value?.focusLost()

defineExpose({
	_validate,
	_saveXmlAfterUpdate,
	_saveDiagram,
	_getTagValueFromXml,
	togglePropertiesPanel,
	toggleConsole,
	isConsolePanelShowing,
	addLineWithErrorToConsole,
})
</script>

<style scoped>
:deep(.djs-minimap .toggle) {
  display: none;
}
:deep(.dmn-definitions) {
  display: none !important;
}
:deep(.dmn-decision-table-container .allowed-values-edit .placeholder) {
  color: #b9bcc6;
  cursor: auto;
  opacity: 1;
  background: transparent;
}
:deep(.dmn-decision-table-container [contenteditable="true"]) {
  cursor: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
  opacity: 1;
  background: transparent;
}
:deep(.dmn-decision-table-container [contenteditable="true"]:focus) {
  outline: none !important;
  box-shadow: inset 0 -2px 0 0 rgba(0,0,0,0.06);
}
</style>
