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
	<div class="h-100">
		<DropZone @handleDropFile="handleFile">
			<div class="custom-content position-relative w-100 h-100 justify-content-center align-items-center"
				style="display: flex;  background-color: lightgray; font-size: 2em; opacity: 0.3; color: var(--bs-rimary);">
				{{ $t("dropFileToLoad") }}
				<div class="position-absolute"
					style="border: 5px dashed var(--bs-primary); content: ''; bottom: 30px; left: 30px; right: 30px; top: 30px;">
				</div>
			</div>
		</DropZone>
		<div class="d-flex flex-column h-100">
	<TabNav ref="modelerTabNav" :activeTab="activeTab" @switchTabFromTabNav="switchTabFromTabNav"
		:editorXML="editorXML" :tabNavWidth="tabNavWidth"
		@selectedTab="selectedTab" :tabNavList="tabNavList" @openDiagramFromNavTab="openDiagramFromNavTabFromChild"
		@saveWithKeyboardFromTab="saveWithKeyboardFromTab" @removeSelectedTab="removeSelectedTab"
		@removeSelectedTabFromModal="removeSelectedTab" @showToastMessage="showToastMessage"
		@resizeTabNav="resizeTabNav" @orderTabNavListHiddenTab="orderTabNavListHiddenTab">
	</TabNav>

	<div ref="modelerTabPanes" class="tab-content flex-grow-1" style="min-height: 0;" :key="`modelerid1-i`">
		<div class="tab-pane  bg-light fade" role="tabpanel" style="height: calc(100vh - 40px);"
			:class="{ 'active show': activeTab === -1 }" :aria-labelledby="`dashboard-tab`" tabindex="0">
			<StartPage ref="startPage" v-if="processes || forms " :processes="processes" :forms="forms"
				@openDiagram="openDiagramFromChild" @openSelectedFile="handleFile" @showToastMessage="showToastMessage"
				@createNewBpmnc7Diagram="createNewBpmnDiagram" @createNewBpmnc8Diagram="createNewBpmnDiagram"
				@createNewDmnDiagram="createNewDmnDiagram" @getStoredProcesses="getStoredProcesses" @getStoredForms="getStoredForms"
				@createNewFormDiagram="createNewFormDiagram"
				@closeRemovedProcessesOpenInTab="closeRemovedProcessesOpenInTab">
			</StartPage>
		</div>
		<div v-for="(tabElement, index) in tabNavList" :key="`process${tabElement.keyOfTabNav}-tp`"
			class="tab-pane fade h-100" :class="{ 'active show': activeTab === index }" :navId="tabElement.keyOfTabNav"
			role="tabpanel" :aria-labelledby="`process${tabElement.keyOfTabNav}-tab`" tabindex="0"
			v-on:keydown.ctrl.s="e => saveWithKeyboard(e, tabElement.name, index)">
			<BpmnModeler
				v-if="tabNavListXml[index] && waitToLoad && (tabNavList[index].type === 'bpmn-c7' || tabNavList[index].type === 'bpmn-c8')"
				:tabElementIndex="index" :ref="el => modeler[index] = el" :tabElement="tabElement"
				v-show="tabElement.isPropertyPanelVisible" :diagramType="tabNavList[index].type"
				:isActiveTab="index === activeTab" :clipboard="clipboard" :xml="tabNavListXml[index]"
				:isModelerVisible="tabNavList[index].isModelerVisible" :elementTemplateJson="elementTemplateJson"
				:consoleErrors="consoleErrorsList[index]" @showToastMessage="showToastMessage"
				@updateStoredProcesses="getStoredProcesses" @showPropertyPanel="showPropertyPanel"
				@toggleEnableSave="toggleEnableSave" @showDiagram="showDiagram" @updateEditorXML="updateEditorXML"
				@updateIsButtonDisabled="updateIsButtonDisabled" @updateDownloadLink="_updateDownloadLink"
				@resizeTabNav="resizeTabNav" @updateDownloadLinkSvg="_updateDownloadLinkSvg"
				@updateStoredLocalStorageTabNavList="updateStoredLocalStorageTabNavList" @isValidated="isValidated"
				@setTypeOfDiagramForModeler="setTypeOfDiagramForModeler" @toggleIsSaved="toggleIsSaved"
				@toggleVersionNotSaved="toggleVersionNotSaved" @toggleOutdatedTemplateBtn="toggleOutdatedTemplateBtn"
				@show-console-notification="showConsoleNotification" @assign-session-id-to-process="assignSessionIdToProcess">
				<div v-if="tabElement.isModelerVisible" class="h-100">
					<monaco-editor :isBpmn="tabNavList[index].isBpmn" :xml="editorXML[index]" v-if="editorXML[index]"
						@updateFromEditor="updateDiagramFromEditor" :tabElementIndex="index"></monaco-editor>
				</div>
				<template #menu>
					<ActionButtonsList :tabNavListXml="tabNavListXml[index]" :tabElementIndex="index"
						:tabElement="tabElement" :ref="el => actionButton[index] = el"
						:isButtonDisabled="isButtonDisabled[index]" :isEditorVisible="tabElement.isEditorVisible"
						:canSave="tabNavList[index].canSave" :modeler="modeler[index]"
						@showToastMessage="showToastMessage" :isXmlValidated="isXmlValidated[tabElement.key]"
						@toggleEnableSave="toggleEnableSave" :tabNavList="tabNavList[index]" @openDiagram="openDiagram"
						@toggleEditor="toggleEditor" @toggleModal="toggleModal"
						@show-console-notification="showConsoleNotification"
						@toggleOutdatedTemplateModal="toggleOutdatedTemplateModal" @toggleConsole="toggleConsole">
					</ActionButtonsList>
				</template>
			</BpmnModeler>
			<DmnModeler v-if="tabNavListXml[index] && waitToLoad && tabNavList[index].type === 'dmn'"
				:isActiveTab="index === activeTab" :tabElement="tabElement" :ref="el => modeler[index] = el"
				:tabElementIndex="index" @isValidated="isValidated" @updateEditorXML="updateEditorXML"
				:xml="tabNavListXml[index]" @updateIsButtonDisabled="updateIsButtonDisabled"
				@updateDownloadLink="_updateDownloadLink" @updateDownloadLinkSvg="_updateDownloadLinkSvg"
				@toggleEnableSave="toggleEnableSave" @toggleVersionNotSaved="toggleVersionNotSaved"
				@updateStoredLocalStorageTabNavList="updateStoredLocalStorageTabNavList"
				@showToastMessage="showToastMessage" @setTypeOfDiagramForModeler="setTypeOfDiagramForModeler"
				@toggleIsSaved="toggleIsSaved" @resizeTabNav="resizeTabNav" @toggleConsole="toggleConsole"
				@show-console-notification="showConsoleNotification" @assign-session-id-to-process="assignSessionIdToProcess"
				:isModelerVisible="tabNavList[index].isModelerVisible"
				:consoleErrors="consoleErrorsList[index]"
				>
				<div v-if="tabElement.isModelerVisible" class="h-100">
					<monaco-editor :isBpmn="tabNavList[index].isBpmn" :xml="editorXML[index]" v-if="editorXML[index]"
						@updateFromEditor="updateDiagramFromEditor" :tabElementIndex="index"></monaco-editor>
				</div>
				<template #menu>
					<ActionButtonsList :tabNavListXml="tabNavListXml[index]" :tabElementIndex="index"
						:tabElement="tabElement" :ref="el => actionButton[index] = el"
						:isButtonDisabled="isButtonDisabled[index]" :isEditorVisible="tabElement.isEditorVisible"
						:canSave="tabNavList[index].canSave" :modeler="modeler[index]"
						@showToastMessage="showToastMessage" :isXmlValidated="isXmlValidated[tabElement.key]"
						@toggleEnableSave="toggleEnableSave" :tabNavList="tabNavList[index]" @openDiagram="openDiagram"
						@toggleEditor="toggleEditor" @toggleModal="toggleModal"
						@show-console-notification="showConsoleNotification"
						@toggleOutdatedTemplateModal="toggleOutdatedTemplateModal" @toggleConsole="toggleConsole">
					</ActionButtonsList>
				</template>
			</DmnModeler>
			<FormModeler v-if="tabNavListXml[index] && tabNavList[index].type === 'form'" :json="tabNavListXml[index]" :isActiveTab="index === activeTab" :tabElement="tabElement" :ref="el => modeler[index] = el"
				:tabElementIndex="index" @isValidated="isValidated" @updateEditorXML="updateEditorXML"
				:xml="tabNavListXml[index]" @updateIsButtonDisabled="updateIsButtonDisabled"
				@updateDownloadLink="_updateDownloadLinkForm" @updateDownloadLinkSvg="_updateDownloadLinkSvg"
				@toggleEnableSave="toggleEnableSave" @toggleVersionNotSaved="toggleVersionNotSaved"
				@updateStoredLocalStorageTabNavList="updateStoredLocalStorageTabNavList"
				@showToastMessage="showToastMessage" @setTypeOfDiagramForModeler="setTypeOfDiagramForModeler"
				@toggleIsSaved="toggleIsSaved" @resizeTabNav="resizeTabNav" @toggleConsole="toggleConsole"
				@show-console-notification="showConsoleNotification" @assign-session-id-to-process="assignSessionIdToProcess"
				:isModelerVisible="tabNavList[index].isModelerVisible">
				<div v-if="tabElement.isModelerVisible" class="h-100">
					<monaco-editor :isBpmn="tabNavList[index].isBpmn" :xml="editorXML[index]" v-if="editorXML[index]"
						@updateFromEditor="updateDiagramFromEditor" :tabElementIndex="index" language='json'></monaco-editor>
				</div>
				<template #menu>
					<ActionButtonsList :tabNavListXml="tabNavListXml[index]" :tabElementIndex="index"
						:tabElement="tabElement" :ref="el => actionButton[index] = el"
						:isButtonDisabled="isButtonDisabled[index]" :isEditorVisible="tabElement.isEditorVisible"
						:canSave="tabNavList[index].canSave" :modeler="modeler[index]"
						@showToastMessage="showToastMessage" :isXmlValidated="isXmlValidated[tabElement.key]"
						@toggleEnableSave="toggleEnableSave" :tabNavList="tabNavList[index]" @openDiagram="openDiagram"
						@toggleEditor="toggleEditor" @toggleModal="toggleModal"
						@show-console-notification="showConsoleNotification" @toggleConsole="toggleConsole">
					</ActionButtonsList>
				</template>
			</FormModeler>
		</div>
	</div>
</div>

	<ModalNewDiagram ref="modalNewDiagram" :showModal="isShowModalNewDiagram">
	</ModalNewDiagram>
	<modal-deploy :diagram="editorXML[activeTab]" v-if="activeTab > -1 && tabNavList[activeTab].type !== 'form'" :showModal="isShowModal"
		:tabNavList="tabNavList[activeTab]" @toggleModal="toggleModal" @showToastMessage="showToastMessage"
		@add-error-message-to-console="addErrorMessageToConsole" @show-console-notification="showConsoleNotification">
	</modal-deploy>
	<toast-message ref="toastComponent" :timestamp="getTimeStamp()" :success="isSuccess" :bodyTextAlt="toastBodyTextAlt"
		:headerText="$t(toastText + '.title')" :bodyText="$t(toastText + '.body')">
	</toast-message>
	<ConfirmModal :showModal="showModalAcceptCancelMessage.show" :title="modalConfirm.title"
		type="replaceXml" :body="modalConfirm.body" @hideModal="hideModalAcceptCancelMessage"
		:modalData="modalData" :functionAfterAccepting="openDiagramFromModal"
		:functionAfterCanceling="openDiagramFromChild">
	</ConfirmModal>
	</div>
</template>

<script setup>
// Material Design Icons are provided by the host application (@mdi/font)

import * as monaco from 'monaco-editor'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'
import { compareXML, getTimeStamp, getTagValueFromXml, checkCamundaVersion, generateUniqueId, setTagValueOfXml, getProcessKeyFromBpmn, getBearerToken, filterTemplates, addHtmlErrorsToConsole } from '../../utils.js'
import Clipboard from 'diagram-js/lib/features/clipboard/Clipboard'
import { ref, onMounted, nextTick, watch, computed, inject, provide } from 'vue'
import { useI18n } from 'vue-i18n'
//import components
import ModalDeploy from '../modals/ModalDeploy.vue'
import MonacoEditor from '../monaco/MonacoEditor.vue'
import BpmnModeler from './BpmnModeler.vue'
import DmnModeler from './DmnModeler.vue'
import FormModeler from './FormModeler.vue'
import StartPage from './StartPage.vue'
import ToastMessage from '../messages/ToastMessage.vue'
import TabNav from '../layout/TabNav.vue'
import ModalNewDiagram from '../modals/ModalNewDiagram.vue'
import ActionButtonsList from '../ActionButtonsList.vue'
import ConfirmModal from '../modals/ConfirmModal.vue'
//for full screen drop files
import DropZone from '../DropZone.vue'

// Provide monaco for child components (MonacoEditor, MonacoConsole)
// This is necessary when used as a library since the host app doesn't provide monaco
monaco.editor.setTheme('vs')
provide('monaco', monaco)

const store = useStore()
const route = useRoute()
const { t } = useI18n()
const modeler = ref({}) // to get the diferent modelers  and call functions inside components
const processes = ref(store.state.modeler?.processes?.processes)
const forms = ref(store.state.modeler?.forms?.forms)
const tabNavList = ref([])
const tabNavListXml = ref([])
const consoleErrorsList = ref([])
const modelerTabPanes = ref(null) // gets the reference of the navigation tab
const modelerTabNav = ref(null) //to call the switch tab method
const actionButton = ref({})
const TYPEDMN = 'dmn'
const waitToLoad = ref(false)
const showModalAcceptCancelMessage = ref({ show: false, type: 'bpmn'})
//variable for the modal for importing and external return
const modalData = ref({})
const tabNavWidth = ref(0)
const startPage = ref(null)
const modalNewDiagram = ref(null)
const elementTemplateJson = ref(null)
//one clipboard instance that we can pass around to every bpmn-js instance that we create.
let clipboard = new Clipboard()
let withDiagram = ref(false)
let isButtonDisabled = ref({})
let editorXML = ref([])
//for the toast messages
let isSuccess = ref(false)
let toastText = ref('toastLoadErrorFile')
let toastBodyTextAlt = ref(null)
//check if xml from modeler is validates
let isXmlValidated = ref({ validation: false, text: '' })
let isShowModal = ref(false)
let isShowModalNewDiagram = ref(false)
let toastComponent = ref(null)
let activeTab = ref(-1) // to switch active tab pane
let sessionIds = ref([])
const config = inject('config', {})

onMounted(async () => {
	// Templates are now loaded by the parent AppContainer component
	await _loadElementTemplatesByConfig()
	_initializeTabSize()
	const storedProcessesPromise = getStoredProcesses()
	const storedFormsPromise = getStoredForms()
	// Wait for both promises to resolve
	await Promise.all([storedFormsPromise, storedProcessesPromise])
	_loadTabNavList()
	_checkExternalReturn()
	window.addEventListener('resize', resizeTabWindow)
	waitToLoad.value = true
})

watch(tabNavList, newVal => {
    sessionIds.value = newVal
    .filter(el => el?.sessionId)
    .map(el => el.sessionId)
})

watch(() => activeTab.value, async newValue => { // when the tab is selected it will resize the tabnav
	if (newValue) {
		await nextTick()
		resizeTabNav(modelerTabNav.value.clientWidth)
	}
})

const modalConfirm = computed(() => {
      return { title: t('modalImportedFile.title', {
        item: t(`items.${showModalAcceptCancelMessage.value.type}`)
      } ), body: t('modalImportedFile.body', {
        item: t(`items.${showModalAcceptCancelMessage.value.type}`)
      } )  }
})

const _loadElementTemplatesByConfig = async () => {
	// Get only template contents from store (optimized for bpmn.js)
	const templateContents = store.getters['modeler/elementTemplates/allElementTemplateContents'] || []
	
	elementTemplateJson.value = filterTemplates(templateContents, config)

	// Only show error when there was an actual fetch failure, not when templates are just empty
	const storeError = store.state.modeler?.elementTemplates?.error
	if (storeError) {
		showToastMessage({ isSuccess: false, toastText: 'toastLoadTemplateJson' })
	}
}

// Watch for changes in element templates store and update immediately
watch(() => store.getters['modeler/elementTemplates/allElementTemplateContents'], (newTemplates) => {
	console.log('Element templates changed in store, updating FlowModeler...')
	const templateContents = newTemplates || []
	elementTemplateJson.value = filterTemplates(templateContents, config)
}, { deep: true })

//emit calls an exposed function from StartPage
const createNewBpmnDiagram = async (diagramXML, type) => {
	await modalNewDiagram.value._toggleModalNewDiagram(true, async (nameUpdated, idUpdated) => {
		const uniqueId = idUpdated ? idUpdated.trim() : _assignUniqueId('Process', generateUniqueId())
		const name = nameUpdated ? nameUpdated.trim() : uniqueId
		let finalXml = setTagValueOfXml(await _fetchDefaultDiagramXML(diagramXML), 'bpmn:process', 'id', uniqueId)

		if (nameUpdated) finalXml = setTagValueOfXml(finalXml, 'bpmn:process', 'name', name)

		tabNavList.value.push({ version: 0, type: type, name: name, navId: uniqueId, id: uniqueId, key: name, keyOfTabNav: name, canSave: true, isSaved: false, isModelerVisible: false, isPropertyPanelVisible: false, isEditorVisible: false })
		tabNavListXml.value[tabNavList.value.length - 1] = finalXml
		editorXML.value[tabNavList.value.length - 1] = finalXml
		switchTabFromTabNav(tabNavList.value.length - 1)
	}, type)
}

const createNewDmnDiagram = async (dmnXML, type) => {
	await modalNewDiagram.value._toggleModalNewDiagram(true, async (nameUpdated, idUpdated) => {
		const uniqueId = idUpdated ? idUpdated.trim() : _assignUniqueId('Dmn', generateUniqueId())
		let name = nameUpdated ? nameUpdated.trim() : uniqueId
		let finalXml = setTagValueOfXml(await _fetchDefaultDiagramXML(dmnXML), 'definitions', 'id', uniqueId)

		if (nameUpdated) finalXml = setTagValueOfXml(finalXml, 'definitions', 'name', name)

		tabNavList.value.push({ version: 0, type: type, name: name, navId: uniqueId, id: uniqueId, key: name, keyOfTabNav: name, canSave: true, isSaved: false, isModelerVisible: false, isPropertyPanelVisible: false, isEditorVisible: false })
		tabNavListXml.value[tabNavList.value.length - 1] = finalXml
		editorXML.value[tabNavList.value.length - 1] = finalXml
		switchTabFromTabNav(tabNavList.value.length - 1)
	}, type)
}

const createNewFormDiagram = async(formJson, type) => {
	await modalNewDiagram.value._toggleModalNewDiagram(true, async (nameUpdated, idUpdated) => {
		const uniqueId = idUpdated ? idUpdated.trim() : _assignUniqueId('Form', generateUniqueId())
		formJson.id = uniqueId
		tabNavList.value.push({ version: 0, type: type, name: uniqueId, navId: uniqueId, id: uniqueId, key: uniqueId, keyOfTabNav: uniqueId, canSave: true, isSaved: false, isModelerVisible: false, isPropertyPanelVisible: false, isEditorVisible: false, isBpmn: false })
		tabNavListXml.value[tabNavList.value.length - 1] = JSON.stringify(formJson, null, 2)
		editorXML.value[tabNavList.value.length - 1] = JSON.stringify(formJson, null, 2)
		switchTabFromTabNav(tabNavList.value.length - 1)
	}, type)
}

const handleFile = e => {
	// retrieve the files from the data transfer object
	const files = e.dataTransfer?.files || e.target.files
	const file = files[0]
	if (!file || (!file.name.endsWith('.bpmn') && !file.name.endsWith('.dmn') && !file.name.endsWith('.form'))) { // shows toast error message if the file is not a .bpmn
		showToastMessage({ isSuccess: false, toastText: 'toastLoadErrorFileExtension' })
		return
	}

	const reader = new FileReader()
	reader.onload = e => {
		const fileContent = e.target.result
		if (file.name.endsWith('.form')) {
			_openFormFromImportedFile(fileContent)
		}
		else {
			const fileNameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.'))
			_openProcessFromImportedFile(fileContent, fileNameWithoutExtension, file.name)
		}
	}
	// Read the contents of the file as text
	reader.readAsText(file)
}

const saveWithKeyboardFromTab = (e, tabElementName, tabElementIndex) => {
	e.preventDefault()
	saveWithKeyboard(e, tabElementName, tabElementIndex)
}

const saveWithKeyboard = (e, tabElementName, tabElementIndex) => {
	e.preventDefault()
	actionButton.value[tabElementIndex]._saveDiagram() // calls savediagram from component ActionButtonsList
}

const closeRemovedProcessesOpenInTab = deletedId => {
	const deletedTabElement = tabNavList.value.findIndex(tabElement => tabElement.id === deletedId)
	if (deletedTabElement === -1) return
	_closeSelectedTab(deletedTabElement)
}

//its called when a process is saved to update the store
const updateStoredLocalStorageTabNavList = async ({ processId, processName, processKey, type }, tabElementIndex, xml) => {
	await getStoredProcesses() // reloads list of process from database		
	await getStoredForms()
	tabNavList.value[tabElementIndex].id = processId
	tabNavList.value[tabElementIndex].name = processName
	tabNavList.value[tabElementIndex].key = processKey
	tabNavList.value[tabElementIndex].type = type
	tabNavList.value[tabElementIndex].navId = processName
	tabNavList.value[tabElementIndex].canSave = false
	editorXML.value[tabElementIndex] = xml
	_saveTabNavSavedLocalStorage() //saves only the diagrams saved
	isValidated({ validation: true, text: '' }, tabElementIndex)
	switchTabFromTabNav(tabElementIndex)
}

//called when a process is updated
const getStoredProcesses = async functionAfterExecution => {
	if (startPage.value) startPage.value._toggleIsLoading(true)
	await store.dispatch('modeler/processes/fetchProcesses')
	processes.value = store.state.modeler.processes.processes
	//use it if you want to execute a function after an emit
	functionAfterExecution && functionAfterExecution()
	if (startPage.value) startPage.value._toggleIsLoading(false)
}

//called when a form is updated
const getStoredForms = async functionAfterExecution => {
	if (startPage.value) startPage.value._toggleIsLoading(true)
	await store.dispatch('modeler/forms/fetchForms')
	forms.value = store.state.modeler.forms.forms
	//use it if you want to execute a function after an emit
	functionAfterExecution && functionAfterExecution()
	if (startPage.value) startPage.value._toggleIsLoading(false)
}

//checks type of diagram to then save it or load if from the database 
const setTypeOfDiagramForModeler = (type, tabElementIndex) => {
	tabNavList.value[tabElementIndex].type = type
}

const showDiagram = isShowing => {
	withDiagram.value = isShowing
}

const showPropertyPanel = (isShowing, tabElementIndex) => {
	tabNavList.value[tabElementIndex].isPropertyPanelVisible = isShowing
}

const updateEditorXML = (xmlContent, tabElementIndex) => {
	editorXML.value[tabElementIndex] = xmlContent
}

// shows or hide warning button of outdated templates
const toggleOutdatedTemplateBtn = comp => actionButton.value[activeTab.value]._toggleOutDatedTemplateBtn(comp)

// shows or hide warning button of outdated templates
const toggleOutdatedTemplateModal = comp => modeler.value[activeTab.value]._toggleModalListSelectorFromActionButton(comp, 'templates')

const toggleConsole = (tabElementIndex, isVisible) => modeler.value[tabElementIndex].toggleConsole(isVisible)

const toggleModal = isShowing => isShowModal.value = isShowing

const toggleIsSaved = (isSaved, tabElementIndex) => tabNavList.value[tabElementIndex].isSaved = isSaved

const toggleEditor = tabElementIndex => {
	tabNavList.value[tabElementIndex].isModelerVisible = !tabNavList.value[tabElementIndex].isModelerVisible
	tabNavList.value[tabElementIndex].isEditorVisible = !tabNavList.value[tabElementIndex].isEditorVisible
	modeler.value[tabElementIndex].togglePropertiesPanel(!tabNavList.value[tabElementIndex].isEditorVisible)
}

//enables or disables the save button
const toggleEnableSave = (isEnable, tabElementIndex) => tabNavList.value[tabElementIndex].canSave = isEnable

const toggleVersionNotSaved = (isEnable, tabElementIndex) => tabNavList.value[tabElementIndex].changedVersion = isEnable

const showToastMessage = toastInformation => {
	isSuccess.value = toastInformation.isSuccess
	toastText.value = toastInformation.toastText
	toastBodyTextAlt.value = toastInformation.bodyTextAlt
	toastComponent.value._showToastTimeOut()
}

//called from ModelerCanvas
const updateIsButtonDisabled = (isDisabled, tabElementIndex) => {
	isButtonDisabled.value[tabElementIndex] = isDisabled
}

const switchTabFromTabNav = selectedTabIndex => {
	activeTab.value = selectedTabIndex
}

// nav tab behaviour when closing tab
const switchTabFromTabNavWhenClosing = selectedTabIndex => {
	if (selectedTabIndex > -1) {
		if (activeTab.value === selectedTabIndex && tabNavList.value.length === 0) {
			selectedTab(-1) //calling selecttab in case the xml has not being loaded yet
		} else if (activeTab.value === selectedTabIndex && tabNavList.value.length > 0) {
			selectedTab(activeTab.value - 1)
		} else if (selectedTabIndex < activeTab.value && tabNavList.value.length > 0) {
			selectedTab(activeTab.value - 1)
		}
	}
}

//emitted from bpmnmodeler to validate xml
const isValidated = (validated, tabElementIndex) => {
	isXmlValidated.value[tabNavList.value[tabElementIndex].key] = validated
}

//called from monaco editor
const updateDiagramFromEditor = (xmlContent, tabElementIndex) => {
	//updates xml content
	if (!modeler.value[tabElementIndex]) return
	modeler.value[tabElementIndex]._validate(xmlContent)
	const typeOfDiagram = checkCamundaVersion(xmlContent) ?? TYPEDMN

	if (isXmlValidated.value[tabNavList.value[tabElementIndex].key].validation) {
		editorXML.value[tabElementIndex] = xmlContent // update xml from modeler
		tabNavList.value[tabElementIndex].canSave = true //enables save button
		modeler.value[tabElementIndex]._saveXmlAfterUpdate(typeOfDiagram.startsWith('bpmn'), xmlContent, tabElementIndex)
	}
}

const openDiagramFromNavTabFromChild = (valueFromChild, tabElementIndex) => {
	tabNavListXml.value[tabElementIndex] = valueFromChild
}

const assignSessionIdToProcess = (tabElementIndex, processSessionId) => {
	tabNavList.value[tabElementIndex].sessionId = processSessionId
}

const updateDiagramXml = async (valueFromChild, tabElementIndex, cansave, typeDiagram) => {
	tabNavListXml.value[tabElementIndex] = valueFromChild
	modeler.value[tabElementIndex] && modeler.value[tabElementIndex]._validate(valueFromChild)
	if (cansave !== null) {
		tabNavList.value[tabElementIndex].canSave = cansave
	}
}

//open from imported files
const openDiagramFromModal = (valueFromChild, processId, processName, processKey, typeOfDiagram, isSaved, canSave, canReplaceXml) => {
	const foundElIndex = openDiagram(valueFromChild, processId, processName, processKey, typeOfDiagram, isSaved, canSave, canReplaceXml)
	if (foundElIndex >= 0) {
		updateDiagramXml(valueFromChild, foundElIndex, canSave, typeOfDiagram)
		switchTabFromTabNav(foundElIndex)
	}
}


//emit passed from ProcessDiagramElement to FlowModeler
const openDiagramFromChild = async (valueFromChild, processId, processName, processKey, typeOfDiagram, isSaved, canSave, canReplaceXml) => {

	const foundElIndex = openDiagram(valueFromChild, processId, processName, processKey, typeOfDiagram, isSaved, canSave, canReplaceXml)
	if (foundElIndex >= 0) {
		const xmlToLoad = editorXML.value[foundElIndex] ?? valueFromChild
		openDiagramFromNavTabFromChild(xmlToLoad, foundElIndex, canSave)
		await nextTick()
		switchTabFromTabNav(foundElIndex)
	}
}

const openDiagram = (valueFromChild, processId, processName, processKey, typeOfDiagram, isSaved, canSave, canReplaceXml) => {
	const foundElIndex = tabNavList.value.findIndex((element) => {
		return element.id === processId
	})
	//if the tab is not already opened
	if (foundElIndex < 0) {
		const keyOfTabNav = generateUniqueId()
		tabNavList.value.push({ type: typeOfDiagram, name: processName, navId: processName, id: processId, key: processKey, keyOfTabNav: keyOfTabNav, isSaved: isSaved, canSave: canSave, isModelerVisible: false, isPropertyPanelVisible: false, isEditorVisible: false, replaceXml: canReplaceXml })
		tabNavListXml.value.push(valueFromChild) //adds xml		
		_saveTabNavSavedLocalStorage()
		switchTabFromTabNav(tabNavListXml.value.length - 1)
	}
	return foundElIndex
}

const selectedTab = async tabElementIndex => {
	switchTabFromTabNav(tabElementIndex)
	if (!editorXML.value[tabElementIndex] && tabElementIndex > -1) { // if the xml has not being loaded yet by clicking the tab
		let selectedProcess = null
		if (tabNavList.value[tabElementIndex].type !== 'form') {
			await store.dispatch('modeler/processes/fetchProcessById', tabNavList.value[tabElementIndex].id) // search xml by id selected
		 	selectedProcess = store.state.modeler.processes.processSelected
		}else {
			await store.dispatch('modeler/forms/fetchFormById', tabNavList.value[tabElementIndex].id) // search xml by id selected
			selectedProcess = store.state.modeler.forms.formSelected
		}
		
		openDiagramFromNavTabFromChild(selectedProcess, tabElementIndex, null)
	}
	await nextTick()
	resizeTabNav(modelerTabNav.value.clientWidth)
}

const removeSelectedTab = tabElementIndex => {
	_closeSelectedTab(tabElementIndex)
	switchTabFromTabNavWhenClosing(tabElementIndex)
}

//hides modal from AcceptCancelMessage
const hideModalAcceptCancelMessage = () => {
	showModalAcceptCancelMessage.value.show = false
}

const orderTabNavListHiddenTab = async index => {
	const position = tabNavList.value.length - (index)
	const copyTabNavList = _copyArray(tabNavList)
	const copyEditorXml = _copyArray(editorXML)
	const moveToFirstElement = copyTabNavList.splice(position, 1)
	const moveToFirstEditorXml = copyEditorXml.splice(position, 1)
	copyTabNavList.unshift(moveToFirstElement[0])
	// use editor xml to get unsaved changes
	copyEditorXml.unshift(moveToFirstEditorXml[0])
	const copyForTabNavListXml = copyEditorXml.map(element => element)
	editorXML.value = copyEditorXml
	tabNavListXml.value = copyForTabNavListXml // to save the unsaved changes in the xml tabs
	tabNavList.value = copyTabNavList
	selectedTab(0)
}

const resizeTabNav = width => {
	tabNavWidth.value = width
	if (modelerTabNav.value) {
		modelerTabNav.value._calculateTabsVisible()
	}
}

const resizeTabWindow = () => { //to be called from the listener and not be passed an event by default
	tabNavWidth.value = window.innerWidth
	if (modelerTabNav.value) {
		modelerTabNav.value._calculateTabsVisible()
	}
}

const addErrorMessageToConsole = (id, error) => {
	let correctTabIndex = checkCorrectTab(id)
	modeler.value[correctTabIndex].addLineWithErrorToConsole(error)
	showConsoleNotification(id)
}

const _updateDownloadLink = ({ href, download, tabElementIndex }) => {
	actionButton?.value[tabElementIndex]._updateDownloadFile(href, download)
}
const _updateDownloadLinkForm = ({ href, download, tabElementIndex }) => {
	actionButton?.value[tabElementIndex]._updateDownloadFile(href, download)
}

const _updateDownloadLinkSvg = ({ href, download, tabElementIndex }) => {
	actionButton?.value[tabElementIndex]._updateDownloadFileSvg(href, download)
}

//when removing a process if it is opened in a tab it will close
const _closeSelectedTab = tabElementIndex => {
	
		if (tabNavList.value[tabElementIndex].type === 'form') {
			if (modeler.value[tabElementIndex]) modeler.value[tabElementIndex].destroyFormJs()
		}
		const copyEditorXml = _copyArray(editorXML)
		const copyTabNavListXml = _copyArray(tabNavListXml)
		const copyTabNavList = _copyArray(tabNavList)
		copyEditorXml.splice(tabElementIndex, 1)
		copyTabNavListXml.splice(tabElementIndex, 1)
		copyTabNavList.splice(tabElementIndex, 1)

		tabNavListXml.value = copyTabNavListXml
		editorXML.value = copyEditorXml
		tabNavList.value = copyTabNavList
		_saveTabNavSavedLocalStorage()
}

const _initializeTabSize = () => {
	tabNavWidth.value = modelerTabPanes.value.clientWidth
}

const _copyArray = arrayRef => {
	return arrayRef.value.map(element => element)
}

const compareJSON = (json1, json2) => {
  // Check if both values are the same reference or primitives
  if (json1 === json2) return true;

  // Check if both are objects and not null
  if (
    typeof json1 !== "object" ||
    typeof json2 !== "object" ||
    json1 === null ||
    json2 === null
  ) {
    return false;
  }

  // Get keys of both objects
  const keys1 = Object.keys(json1);
  const keys2 = Object.keys(json2);

  // Check if the number of keys is different
  if (keys1.length !== keys2.length) return false;

  // Check if all keys and their values are equal recursively
  for (const key of keys1) {
    if (!keys2.includes(key) || !compareJSON(json1[key], json2[key])) {
      return false;
    }
  }

  return true;
}

const _openFormFromImportedFile = async jsonExternal => {
	let jsonId = JSON.parse(jsonExternal)?.id
	const foundForm = forms.value.find(form => form.formId === jsonId)	
	
	if (foundForm) {		

		let jsonFromEditor = _checkIfFormOpenInTab(jsonId)
		if (!jsonFromEditor) {
			await store.dispatch('modeler/forms/fetchFormById', foundForm.id) // search xml by id selected
			jsonFromEditor = store.state.modeler.forms.formSelected//JSON.stringify(
		}
		let foundTabIndex = tabNavList.value.findIndex( el => el.key === jsonId)

		modalData.value = { id: foundForm.id, name: jsonId, processkey: foundForm.formId, xmlFromModeler : jsonFromEditor, xmlExternalUrl: jsonExternal, diagramType: 'form' }
		let jsonFromEditorStringify = JSON.stringify(JSON.parse(jsonFromEditor)).replace(/\\/g, '')
		let jsonExternalStringify = JSON.stringify(JSON.parse(jsonExternal))
		if ( jsonFromEditorStringify.startsWith('"') && jsonFromEditorStringify.endsWith('"') ) jsonFromEditorStringify = jsonFromEditorStringify.slice(1, -1)
		const isEqual = jsonFromEditorStringify === jsonExternalStringify	
	
		if (!isEqual) { // if the json are not equal, ask the user
			showModalAcceptCancelMessage.value.show = true
			showModalAcceptCancelMessage.value.type = 'form'
		} else {
			if (foundTabIndex >-1) {
				modelerTabNav.value.selectTab(foundTabIndex)
			} else {
				openDiagramFromChild(jsonExternal, foundForm.id, jsonId, jsonId, 'form', true, false, false)
			}
		}
		
	}
	else {
		_addNewBpmnFromLoadedXml('form', jsonExternal, jsonId, true)
	}
}

const _openProcessFromImportedFile = async (resXmlExternalUrl, fileName, fileNameWithExtension) => {
	let foundExternalProcessKey = getProcessKeyFromBpmn(resXmlExternalUrl) ?? fileName
	let diagramType = null

	if (fileNameWithExtension.endsWith('.dmn')) {
		foundExternalProcessKey = getTagValueFromXml(resXmlExternalUrl, 'definitions', 'id')
		diagramType = TYPEDMN
	} else if (foundExternalProcessKey) {
		diagramType = checkCamundaVersion(resXmlExternalUrl)
	}
	
	const foundModelerProcess = processes.value.find(process => process.processkey === foundExternalProcessKey)
	/*if (foundForm) {
		const foundTabIndex = tabNavList.value.findIndex(tab => {
			return tab.key === foundForm.formId
		})
		if (foundTabIndex >-1) {
			modelerTabNav.value.selectTab(foundTabIndex)
		} else {
			openDiagramFromChild(jsonExternal, jsonId, jsonId, jsonId, 'form', true, false, false)
		}
*/
	if (foundModelerProcess) {
		let xmlFromModeler = _checkIfProcessOpenInTab(foundExternalProcessKey)
		if (!xmlFromModeler) {
			await store.dispatch('modeler/processes/fetchProcessById', foundModelerProcess.id) // gets the xml from the database with the id
			xmlFromModeler = store.state.modeler.processes.processSelected
		}
		modalData.value = { id: foundModelerProcess.id, name: foundModelerProcess.name, processkey: foundExternalProcessKey, xmlFromModeler, xmlExternalUrl: resXmlExternalUrl, diagramType }

		const isEqual = compareXML(xmlFromModeler, resXmlExternalUrl)
		//open existing process form modeler
		isEqual && openDiagramFromChild(resXmlExternalUrl, foundModelerProcess.id, foundModelerProcess.name, foundExternalProcessKey, diagramType, true, false, false)

		if (!isEqual) { // if the xmls are not equal, ask the user
			showModalAcceptCancelMessage.value.show = true
			showModalAcceptCancelMessage.value.type = diagramType
		}
	}
	else {
		_addNewBpmnFromLoadedXml(diagramType, resXmlExternalUrl, foundExternalProcessKey, true) // if the process doesnt exist in the modeler it opens a new one
		return
	}
}

const _checkIfProcessOpenInTab = processKey => {
	const foundTabIndex = tabNavList.value.findIndex(tab => {
		return tab.key === processKey && tab.type !== 'form'
	})

	if (foundTabIndex > -1) {
		return editorXML.value[foundTabIndex] ?? tabNavListXml[foundTabIndex]
	}
	return null
}

const _checkIfFormOpenInTab = formId => {
	const foundTabIndex = tabNavList.value.findIndex(tab => {
		return tab.key === formId && tab.type === 'form'
	})

	if (foundTabIndex > -1) {
		return tabNavListXml.value[foundTabIndex]
	}
	return null
}

const _assignUniqueId = (name, id) => {
	if (!processes.value) return
	const foundProcess = processes.value.find(el => el.id === id)

	if (!foundProcess) { // check until process not found
		return `${name}_${generateUniqueId()}`
	}
	else {
		_assignUniqueId(`${name}_${generateUniqueId()}`)
	}
}

const _addNewBpmnFromLoadedXml = (diagramType, xmlToLoad, foundExternalProcessKey) => {
	const keyOfTabNav = generateUniqueId()
	tabNavList.value.push({ type: diagramType, name: foundExternalProcessKey, navId: foundExternalProcessKey, id: foundExternalProcessKey, key: foundExternalProcessKey, keyOfTabNav: keyOfTabNav, canSave: true, isSaved: false, isModelerVisible: false, isPropertyPanelVisible: false, isEditorVisible: false })
	switchTabFromTabNav(tabNavList.value.length - 1)
	tabNavListXml.value.push(xmlToLoad)
}

const _openProcessFromExternalXml = async (xml, resExistingProcess, externalProcessKey, decodedProcessId) => {
	const resXmlExternalUrl = xml
	let diagramType = null
	let foundExternalProcessKey = getTagValueFromXml(resXmlExternalUrl, 'process', 'id')

	if (foundExternalProcessKey) {
		diagramType = checkCamundaVersion(resXmlExternalUrl)
	}
	else { // if it is not a bpmn process
		foundExternalProcessKey = getTagValueFromXml(resXmlExternalUrl, 'definitions', 'id')
		diagramType = 'dmn'
	}

	if (resExistingProcess) { // if the process exists in the modelers database
		if (resExistingProcess.id) await store.dispatch('modeler/processes/fetchProcessById', resExistingProcess.id) // gets the xml from the database with the id
		else {
			await store.dispatch('modeler/processes/fetchProcessByName', resExistingProcess) // gets the xml for the collaboration process by its name
			let foundProcess = processes.value.find(process => resExistingProcess === process.processkey)
			resExistingProcess = foundProcess.id

		}

		const xmlFromModeler = store.state.modeler.processes.processSelected
		const isEqual = compareXML(xmlFromModeler, resXmlExternalUrl)
		//open existing process form modeler
		isEqual && openDiagramFromModal(xmlFromModeler, resExistingProcess.id ?? resExistingProcess, resExistingProcess.name ?? resExistingProcess, foundExternalProcessKey, diagramType, true, false, false)
		if (!isEqual) // if the xmls are not equal, ask the user
		{
			modalData.value = { id: resExistingProcess.id ?? resExistingProcess, name: resExistingProcess.name ?? resExistingProcess, processkey: foundExternalProcessKey, xmlFromModeler, xmlExternalUrl: resXmlExternalUrl, diagramType }
			showModalAcceptCancelMessage.value.type = diagramType
			showModalAcceptCancelMessage.value.show = true
		}
	}
	else {
		_addNewBpmnFromLoadedXml(diagramType, resXmlExternalUrl, externalProcessKey, true) // if the process doesnt exist in the modeler it opens a new one
		return
	}
}

const _checkExistingProcessFromExternalReturn = async (decodedProcessId, externalProcessKey, type) => {
	try {
		let resExistingProcess = processes.value.find(process => externalProcessKey === process.processkey)

		// Check if type parameter is 'dmn' to fetch decision diagram, otherwise fetch process diagram
		if (type === 'dmn') {
			await store.dispatch('modeler/xml/fetchDecisionDiagram', decodedProcessId) // gets the decision xml from the database with the id
		} else {
			await store.dispatch('modeler/xml/fetchDiagram', decodedProcessId) // gets the process xml from the database with the id
		}
		
		const xmlFromExternalReturn = store.state.modeler.xml.xmlFromExternalReturn
		const resXmlExternalUrl = xmlFromExternalReturn.bpmn20Xml || xmlFromExternalReturn.dmnXml || xmlFromExternalReturn
		if (!resExistingProcess) resExistingProcess = getTagValueFromXml(resXmlExternalUrl, 'collaboration', 'id')
		//if (!resExistingProcess) resExistingProcess = getTagValueFromXml(resXmlExternalUrl, 'bpmn2:collaboration', 'id')
		_openProcessFromExternalXml(resXmlExternalUrl, resExistingProcess, externalProcessKey)

	} catch (error) {
		console.log(error)
	}
}

const checkCorrectTab = id => {
	let foundIndex = activeTab.value
	// in case the tabs has been closed or the order of tabs changed
	if (tabNavList.value[foundIndex].id !== id) foundIndex = tabNavList.value.findIndex(el => el.id === id)
	return foundIndex
}

//checks if the console is closed to show the notification
const showConsoleNotification = id => {
	let correctTabIndex = checkCorrectTab(id)
	//check that the panel is not open to show the notification

	if (!modeler.value[correctTabIndex].isConsolePanelShowing()) actionButton.value[correctTabIndex].showConsoleNotification(true)
}

// method to handle file selection when a file is dropped onto the component
const _checkExternalReturn = () => {
	const url = new URL(window.location.href)
	if (url.href.includes('processId=')) {
		// Parse query parameters from hash fragment
		const hashParams = new URLSearchParams(window.location.hash.split('?')[1])
		const processId = hashParams.get('processId')
		const type = hashParams.get('type')
				
		if (processId) {
			let decodedProcessId = decodeURIComponent(decodeURIComponent(processId))
			let checkLength = decodedProcessId.split(':')
			let processName = checkLength[0] ?? 'process'
			_checkExistingProcessFromExternalReturn(decodedProcessId, processName, type)
		}
	} else if (url.href.includes('diagramId=')) {
		let diagramId = route.query.diagramId
		let diagram = processes.value.find(process => process.id === diagramId)
		store.dispatch('modeler/processes/fetchProcessById', diagramId).then(() => {
			const selectedDiagram = store.state.modeler.processes.processSelected
			openDiagramFromChild(selectedDiagram, diagram.id, diagram.name, diagram.processkey, diagram.type, true, false, false)
		})		
	}
}

//only stores the tabs of the modeler that were saved
const _saveTabNavSavedLocalStorage = () => {
	const copyTabNavList = tabNavList.value.map(element => ({ ...element })) // to not copy the references use map
	const filteredTabNavList = copyTabNavList.filter(element => {
		element.canSave = false
		element.isModelerVisible = false
		element.isEditorVisible = false
		element.sessionId = null
		return element.isSaved === true
	})

	localStorage.setItem('flow.modeler.navList', JSON.stringify(filteredTabNavList)) //saves only the diagrams saved
}

const _loadTabNavList = () => {
	try {
		const parseNavListTest = JSON.parse(localStorage.getItem('flow.modeler.navList')) ?? tabNavList.value

		if (parseNavListTest.length > 0) {
			tabNavList.value = parseNavListTest
			tabNavListXml.value = Array(tabNavList.value?.length)
			tabNavList.value.map(element => {

				if (!element.keyOfTabNav)
					element.keyOfTabNav = generateUniqueId()
				return element.keyOfTabNav
			})
		}
	}
	catch (error) {
		console.error(error)
	}
}

const _fetchDefaultDiagramXML = async xmlPath => {
	try {
		const response = await fetch(xmlPath)

		if (!response.ok) {
			throw new Error(`Failed to fetch diagram XML. Status: ${response.status}`)
		}

		const xmlContent = await response.text()
		return xmlContent
	} catch (error) {
		console.error('Error fetching diagram XML:', error)
		throw error // Re-throw the error for the calling code to handle
	}
}

// Resources and EasyForms features removed for cibseven-modeler
</script>

<style scoped>
#js-drop-zone {
	width: 100%;
	height: 100%;
}

.btn-menu {
	z-index: var(--btn-menu-zindex);
}

.tab-pane:focus {
	outline: none;
}
</style>