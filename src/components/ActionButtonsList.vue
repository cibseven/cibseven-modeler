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
    <div class="act-btns d-flex flex-wrap flex-row-reverse m-0 px-1 justify-content-end align-items-center"
        style="z-index: 11;" >
        <!-- Right section: save, deploy, download as svg, normal download -->
        <div v-show="!props.isButtonDisabled" class="btn-menu d-flex align-items-center mx-1">
            <a @click="canBeDownloaded" :href="downloadLink" :download="downloadName" :name="downloadName"
                :title="$t('buttons.downloadDiagram')" :aria-label="$t('buttons.downloadDiagram')"
                :class="[actBtnClass(false), { disabled: props.isButtonDisabled }]">
                <span class="mdi mdi-24px mdi-download"></span>
            </a>
        </div>
        <template v-if="extraDownloadLinks?.[props.tabElementIndex]">
            <div v-for="(link, i) in extraDownloadLinks[props.tabElementIndex]" :key="i"
                v-show="!props.isButtonDisabled" class="btn-menu d-flex align-items-center mx-1">
                <a @click="canBeDownloaded"
                    :href="link.href"
                    :download="link.download"
                    :title="$t(link.titleKey)"
                    :aria-label="$t(link.titleKey)"
                    :class="[actBtnClass(false), { disabled: props.isButtonDisabled || link.disabled }]">
                    <span :class="`mdi mdi-24px ${link.icon}`"></span>
                </a>
            </div>
        </template>
        <div v-show="!props.isButtonDisabled &&  modelProperties[props.tabElement.type].canDeploy" class="btn-menu d-flex align-items-center mx-1">
            <button type="button" :class="actBtnClass(false)" @click="canDeploy" aria-haspopup="true"
                aria-expanded="false" :title="$t('buttons.deploy')">
                <span class="mdi mdi-24px mdi-rocket"></span>
            </button>
        </div>
        <div class="btn-menu d-flex align-items-center mx-1" v-show="!isButtonDisabled">
            <button type="button" :class="actBtnClass(false)" :title="$t('buttons.saveDiagram')"
                :disabled="(!props.canSave && !props.tabElement.changedVersion) || isSaving" @click="_saveDiagram">
                <span class="mdi mdi-24px" :class="isSaving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></span>
            </button>
        </div>

        <!-- Separator -->
        <div class="btn-menu d-flex align-items-center mx-1" style="height: 2rem; opacity: 0.3;">
            <span>|</span>
        </div>

        <!-- Undo/Redo buttons -->
        <div class="btn-menu d-flex align-items-center mx-1" v-show="!props.isButtonDisabled">
            <button type="button" :class="actBtnClass(false)" :title="`${$t('buttons.redo')} (Ctrl+Y)`"
                @click="performRedo">
                <span class="mdi mdi-24px mdi-redo-variant"></span>
            </button>
        </div>
        <div class="btn-menu d-flex align-items-center mx-1" v-show="!props.isButtonDisabled">
            <button type="button" :class="actBtnClass(false)" :title="`${$t('buttons.undo')} (Ctrl+Z)`"
                @click="performUndo">
                <span class="mdi mdi-24px mdi-undo-variant"></span>
            </button>
        </div>

        <!-- Separator -->
        <div class="btn-menu d-flex align-items-center mx-1" style="height: 2rem; opacity: 0.3;">
            <span>|</span>
        </div>

        <!-- Left section: filters, xml, console -->
        <div v-show="!props.isButtonDisabled" class="btn-menu d-flex align-items-center mx-1">
            <button type="button" :class="actBtnClass(props.tabElement.isEditorVisible)" :disabled="props.isButtonDisabled"
                @click="toggleVisibilityEditor">
                <span class="mdi mdi-24px"
                    :class="{ 'mdi-xml': !tabElement.isEditorVisible, 'mdi-map': props.tabElement.isEditorVisible }"></span>
            </button>
        </div>
        <div class="btn-menu d-flex align-items-center mx-1" v-show="modelProperties[props.tabElement.type].canOpenConsole">
            <button type="button" :class="consoleBtnClasses" :title="$t('buttons.console')"
                :disabled="props.tabElement.isEditorVisible" :aria-expanded="consoleOpen" @click="openConsole">
                <span class="mdi mdi-24px mdi-console"></span>
                <span v-if="hasConsoleNotification" class="bg-danger position-absolute rounded" style="bottom: 5px; width: 7px; height: 7px; right: 5px;"></span>
            </button>
        </div>
        <div class="btn-menu d-flex align-items-center mx-1" v-if="props.tabElement.id && haslinkToProject">
            <button type="button" :class="[actBtnClass(false), 'position-relative']" :title="$t('buttons.linkToProject')" @click="linkToProject">
                <span class="mdi mdi-24px mdi-vector-link"></span>
            </button>
        </div>
        <div v-if="isOutdatedTemplateWarning" class="btn-menu d-flex align-items-center mx-1">
            <button type="button" :class="actBtnClass(false)" @click="toggleVisibilityOutdatedTemplates"
                :disabled="props.tabElement.isEditorVisible">
                <span class="mdi mdi-24px mdi-exclamation"></span>
            </button>
        </div>
    </div>
</template>

<script setup>

import { ref, inject, onMounted, computed } from 'vue'
import { DIAGRAM_TYPE, DIAGRAM_FILE_EXT } from '../constants/diagramTypes.js'

function actBtnClass(selected, ...extra) {
    return [
        'act-btn',
        'btn',
        'd-inline-flex align-items-center justify-content-center flex-shrink-0',
        'p-0 m-0 border-0 rounded-2 lh-1 text-decoration-none shadow-none',
        selected ? 'act-btn--selected' : 'text-white bg-transparent',
        ...extra,
    ]
}

const props = defineProps({ 
    tabElementIndex: Number, 
    tabNavList: Object, 
    canSave: { type: Boolean, default: false }, 
    tabNavListXml: String, 
    isXmlValidated: { type: Object, default: () => ({ validation: false, text: '' }) }, 
    modeler: { type: Object, default: null }, 
    tabElement: { type: Object, required: true }, 
    isButtonDisabled: { type: Boolean, required: true, default: false },
    consoleOpen: { type: Boolean, default: false },
    width: Number
    }   
)
const extraDownloadLinks = inject('extraDownloadLinks', null)
const emit = defineEmits([
    'toggleOutdatedTemplateModal', 
    'openDiagram', 
    'toggleEditor', 
    'showToastMessage', 
    'toggleEnableSave', 
    'toggleModal',
    'toggleConsole',
    'linkDiagram'
])
const isOutdatedTemplateWarning = ref(false)

const isSaving = ref(false)

const downloadName = ref()
const downloadLink = ref('#')
const containerWidth = ref(0)
const hasConsoleNotification = ref(false)
const haslinkToProject = ref(false)

const consoleBtnClasses = computed(() => [
    ...actBtnClass(props.consoleOpen),
    'position-relative',
])

const modelProperties = {
    [DIAGRAM_TYPE.DMN]: {
        fileExtension: DIAGRAM_FILE_EXT[DIAGRAM_TYPE.DMN],
        canDeploy: true,
        canOpenConsole: true,
    },
    [DIAGRAM_TYPE.BPMN_C7]: {
        fileExtension: DIAGRAM_FILE_EXT[DIAGRAM_TYPE.BPMN_C7],
        canDeploy: true,
        canOpenConsole: true,
    },
    [DIAGRAM_TYPE.FORM]: {
        fileExtension: DIAGRAM_FILE_EXT[DIAGRAM_TYPE.FORM],
        canDeploy: true,
        canOpenConsole: false,
    },
}

onMounted(() => {
    const hash = globalThis.location.hash
    const queryString = hash.includes('?') ? hash.split('?')[1] : ''

    const params = Object.fromEntries(new URLSearchParams(queryString))
    if (params.linkToProject === 'true') {
        haslinkToProject.value = true
    }
})

//prevents or allows the download of the bpmn file
const canBeDownloaded = async e => {
    let fileNameFromProcessId = null
    if (props.tabElement.type === DIAGRAM_TYPE.DMN) {
        fileNameFromProcessId = await _getTagValueFromXml('definitions', 'id')
    }
    else if (props.tabElement.type.startsWith('bpmn')) {
         fileNameFromProcessId = _downloadFileWithProcessId('bpmn:collaboration')
         if (!fileNameFromProcessId) fileNameFromProcessId = _downloadFileWithProcessId('bpmn2:collaboration')
         if (!fileNameFromProcessId) fileNameFromProcessId = _downloadFileWithProcessId('bpmn:process')
    }
    else if (props.tabElement.type === DIAGRAM_TYPE.FORM) { 
        fileNameFromProcessId = await props.modeler.getFormId()
    }
    else {
        fileNameFromProcessId = props.tabElement.key    }

    if (!fileNameFromProcessId || !props.isXmlValidated.validation) {
        e.preventDefault()
        emit('showToastMessage', { isSuccess: false, toastText: 'toastCantDownloadFailValidationXml', bodyTextAlt: props.isXmlValidated.text }) // to pass the text of the error to the toast
        return
    }
    downloadName.value = fileNameFromProcessId + modelProperties[props.tabElement.type].fileExtension
}

const toggleVisibilityEditor = () => {
    if (!props.isXmlValidated.validation) {
        emit('showToastMessage', { isSuccess: false, toastText: 'toastCantViewModelerFailValidationXml', bodyTextAlt: props.isXmlValidated.text })
        return
    }
    emit('toggleEditor', props.tabElementIndex)
}

// toggles the visibility of the property in argument
const toggleVisibilityOutdatedTemplates = () => emit('toggleOutdatedTemplateModal', true)

const canDeploy = e => {
    if (!props.isXmlValidated.validation) {
        e.preventDefault()
        emit('showToastMessage', { isSuccess: false, toastText: 'toastCantDeployFailValidationXml', bodyTextAlt: props.isXmlValidated.text }) // to pass the text of the error to the toast
        return
    }
    emit('toggleModal', true)
}

const linkToProject = () => {
    // Emit event to parent component (cibseven-webclient handles this as library)
    emit('linkDiagram', { key: props.tabElement.key, id: props.tabElement.id })
}

const openConsole = () => {
    const next = !props.consoleOpen
    emit('toggleConsole', props.tabElementIndex, next)
    showConsoleNotification(false)
}

const changeWidth = value => {
    containerWidth.value = value
}

const _saveDiagram = async () => {
    if (isSaving.value) return // prevent re-entry (e.g. rapid Ctrl+S)
    if (!props.canSave && !props.tabElement.changedVersion) return // only saves if button is enabled
    if (!props.isXmlValidated.validation) {
        emit('showToastMessage', { isSuccess: false, toastText: 'toastCantSaveFailValidationXml', bodyTextAlt: props.isXmlValidated.text }) // to pass the text of the error to the toast
        return
    }
    //only is the xml is validated
    isSaving.value = true
    try {
        await props.modeler._saveDiagram()
    } finally {
        // Keep the saving state briefly after completion to block rapid re-triggering
        // (e.g. two quick Ctrl+S presses where the first save finishes before the second fires)
        setTimeout(() => { isSaving.value = false }, 1000)
    }
}

const _toggleOutDatedTemplateBtn = comp => {
    isOutdatedTemplateWarning.value = Boolean(comp)
}


const _getTagValueFromXml = (mainTag, valueTag) => props.modeler._getTagValueFromXml(mainTag, valueTag)

const _downloadFileWithProcessId = type => {
    let foundProcessId = null
    try {
        foundProcessId = props.modeler._getElementRegistryFromModeler(type) // same method name in bpmnmodeler and dmnmodeler
        return foundProcessId
    } catch (error) {

        emit('showToastMessage', { isSuccess: false, toastText: 'toastLoadErrorFile' })
        console.error(error)
        return null
    }
}

const _updateDownloadFile = (downloadLinkValue, downloadNameValue) => {
    downloadLink.value = downloadLinkValue
    downloadName.value = downloadNameValue
}

const showConsoleNotification = value => hasConsoleNotification.value = value

const performUndo = () => props.modeler?._undo?.()

const performRedo = () => props.modeler?._redo?.()

defineExpose({ _toggleOutDatedTemplateBtn, _saveDiagram, _updateDownloadFile, changeWidth, showConsoleNotification })
</script>

<style scoped>
.act-btn {
    width: 2rem;
    height: 2rem;
    min-width: 2rem;
    min-height: 2rem;
    color: inherit;
}

.act-btn:hover:not(:disabled):not(.disabled) {
    background-color: var(--bs-gray-500) !important;
    color: var(--bs-dark) !important;
}

.act-btn:focus-visible {
    box-shadow: none !important;
    outline: 2px solid var(--bs-dark);
    outline-offset: 0;
}

.act-btn.act-btn--selected {
    background-color: var(--bs-gray-200) !important;
    color: var(--bs-dark) !important;
}

.act-btn.act-btn--selected:hover:not(:disabled):not(.disabled) {
    background-color: var(--bs-gray-200) !important;
    color: var(--bs-dark) !important;
}

.act-btn:disabled,
.act-btn.disabled {
    opacity: 0.45;
    pointer-events: none;
}

.act-btn .mdi {
    color: currentColor;
}
</style>
