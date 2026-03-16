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

    <div class="flex-column h-100">
            <div class="container position-relative h-100" style="z-index: 9; overflow: hidden;">
                <h4 class="fw-normal text-center mt-5 mb-3">
                    {{ $t('titles.search') }}
                </h4>
                <div class="position-relative mx-auto w-75">
                    <div class="input-group" role="group">
                            <button @click.stop="handleSearch" class="btn btn-secondary" :title="$t('buttons.search')" aria-hidden="true" type="button">                               <span class="mdi mdi-magnify" style="line-height: initial;"></span>
                            </button> 
                        <input class="form-control" type="text" :title="$t('titles.search')" :placeholder="$t('titles.search')" :aria-label="$t('titles.search')" autofocus="autofocus" autocomplete="off" v-model="inputSearchValue" @input="handleSearch">                            
                                <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" :title="$t(`filterElements.${filterType}`)">
                                    {{ $t(`filterElements.${filterType}`) }}
                                </button>
                                <div class="dropdown-menu dropdown-menu-end">
                                    <button type="button" class="dropdown-item" @click="filterElements('bpmn')">{{ $t('filterElements.bpmn') }}</button>
                                    <button type="button" class="dropdown-item" @click="filterElements('dmn')">{{ $t('filterElements.dmn') }}</button>
                                    <button type="button" class="dropdown-item" @click="filterElements('form')">{{ $t('filterElements.form') }}</button>
                                    <div role="separator" class="dropdown-divider"></div>
                                    <button type="button" class="dropdown-item" @click="filterElements('all')">{{ $t('filterElements.all') }}</button>
                                </div>
                    </div>
                <div>
                    <h6 class="mt-4">{{ $t("titles.recent") }}</h6>
                    <div v-if="filteredDashboardElements !== null">
                        <div class="list-group shadow-sm overflow-auto " style="max-height: calc(100vh - 400px)">
                            <div class="d-flex align-items-center justify-content-center">
                                <div class="spinner-border text-dark m-4 bg-light" v-if="isLoading" role="status">
                                    <span class="visually-hidden">{{ $t("loading") }}...</span>
                                </div>
                            </div>
                            <div v-if="!isLoading">
                                <div v-for="(element, index) in filteredDashboardElements" :key="element.id">
                                   <ProcessDiagramElement v-if="element.type !== 'form'"
                                        @mouseleave="setHoverElement(index, false)" :index="index"
                                        :ref="el => searchElementsList[index] = el" @mouseover="setHoverElement(index, true)"
                                        @focusin="setHoverElement(index, true)" @focusout="setHoverElement(index, false)"
                                        @openDiagram="openDiagramEmitFromChild" :process="element" @toggleModal="toggleModal"
                                        :isHovered="element.isHovered">
                                    </ProcessDiagramElement>
                                    <FormElement v-else
                                        @mouseleave="setHoverElement(index, false)" :index="index"
                                        :ref="el => searchElementsList[index] = el" @mouseover="setHoverElement(index, true)"
                                        @focusin="setHoverElement(index, true)" @focusout="setHoverElement(index, false)"
                                        @openDiagram="openDiagramEmitFromChild" :form="element" @toggleModal="toggleModal"
                                        :isHovered="element.isHovered">
                                    </FormElement>
                                </div>                              
                            </div>
                        </div>
                    </div>
                        <div class="mt-4 d-flex justify-content-between">    
                            <div class="d-flex justify-content-start gap-2">
                                <button @click="handleOpenFileInput" :title="$t('buttons.importFile')" type="button"
                                class="btn border border-dark mdi mdi-import btn-light">{{ $t('buttons.importFile') }}</button>
                            </div>
                            <input ref="fileInput" type="file" accept=".bpmn,.dmn,.form" :aria-label="$t('buttons.importFile')" style="display: none;"
                                @change="handleFileChange" />                            
                            <div class="dropup float-right">
                                <button class="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown"
                                    aria-expanded="false">
                                    {{ $t('buttons.createDiagram') }}
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li> <button :title="$t('buttons.newBpmnc7')" type="button" class="dropdown-item" @click="handleClickCreateBpmnc7Diagram">
                                            {{ $t('buttons.newBpmnc7') }}
                                        </button>
                                    </li>
                                    <li> <button :title="$t('buttons.newDmn')" type="button" class="dropdown-item" @click="handleClickCreateDmnDiagram">
                                            {{ $t('buttons.newDmn') }}
                                        </button>
                                    </li>
                                    <li> <button :title="$t('buttons.newForm')" type="button" class="dropdown-item" @click="handleClickCreateFormDiagram">
                                            {{ $t('buttons.newForm') }}
                                        </button>
                                    </li>

                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <img :alt="$t('cib-header.productName')" src="../../webmodeler.svg"
                class="d-none d-sm-inline position-fixed w-25"
                style="bottom: 0; left: 30px; mix-blend-mode: multiply; opacity: 0.7;">

      <ConfirmModal :showModal="showModalAcceptCancelMessage" :title="modalTitle.title"
          :body="modalTitle.body" @hideModal="hideModal" :id="processIdForDelete" type="closeTab"
          :searchListIndex="searchListIndex" :name="processNameForDelete"  :functionAfterAccepting="functionAfterAccepting ? functionAfterAccepting : () => {}"
          @resetVariablesForModalAcceptCancelMessage="resetVariablesForModalAcceptCancelMessage">
      </ConfirmModal>
    </div>

</template>

<script setup>

import { computed, onMounted, ref, watch } from 'vue'
import { debounce } from 'min-dash'
import { deleteProcessById } from '../../services/processService'
import { deleteFormById } from '../../services/formService'
import { useI18n } from 'vue-i18n'

//starting files for new diagrams
import diagramXMLC7 from '../../resources/camunda7.bpmn'
import dmnXML from '../../resources/dmn.dmn'
//components
import ProcessDiagramElement from './ProcessDiagramElement.vue'
import ConfirmModal from '../modals/ConfirmModal.vue'
import formJson from '../../resources/formSchema.json'
import FormElement from './FormElement.vue'

//types of diagram
const TYPEC7 = 'bpmn-c7'
const TYPEDMN = 'dmn'
const TYPEFORM = 'form'
const functionAfterAccepting = ref(null)
const { t } = useI18n()
const props = defineProps({
    processes: Array,
    forms: Array
 })
const emit = defineEmits([
    'closeRemovedProcessesOpenInTab',
    'getStoredProcesses',
    'getStoredForms',
    'createNewDmnDiagram',
    'createNewBpmnc7Diagram',
    'createNewFormDiagram',
    'openSelectedFile',
    'openDiagram',
    'showToastMessage'
])
const inputSearchValue = ref('')
const fileInput = ref(null)
const showModalAcceptCancelMessage = ref(false)
const searchElementsList = ref({})
const isLoading = ref(true)

const processIdForDelete = ref('') // saves the id to delete id from the modal
const processNameForDelete = ref('')
const searchListIndex = ref(null)
const itemKey = ref('process')
const filterType = ref('all')
const dashboardElements = ref([])
const filteredDashboardElements = ref([])
onMounted(async () => {
    _addIsHoveredElement()
    if (props.processes || props.forms) {
        isLoading.value = false
    }
})

const modalTitle = computed(() => {
      return { title: t('modalDelete.title', {
        item: t(`items.${itemKey.value}`)
      } ), body: t('modalDelete.body', {
        item: t(`items.${itemKey.value}`)
      } )  }
})

const resetDashboardElements = () => {
    dashboardElements.value = props.processes ?? []
    let copiedForms = []
    if (props.forms && props.forms.length >0) {
        copiedForms = JSON.parse(JSON.stringify(props.forms))
        if (Array.isArray(copiedForms)) {
            copiedForms.forEach( el => el.type = 'form')
        }
    }

    dashboardElements.value = dashboardElements.value.concat(copiedForms)

    if (dashboardElements.value.length >0 && Array.isArray(dashboardElements.value)) dashboardElements.value = dashboardElements.value.sort((a,b) => {
        const dateA = new Date(a.updated)
        const dateB = new Date(b.updated)
        return dateB - dateA
    })
    filteredDashboardElements.value = JSON.parse(JSON.stringify(dashboardElements.value))
    if (filterType.value !== 'all') filterElements(filterType.value) // so it will refresh and show only the option in the filter
}

watch(() => props.processes, () => {
    resetDashboardElements()
}, { immediate: true })

watch(() => props.forms, () => {
    resetDashboardElements()
}, { immediate: true })

//changes state of hover to show actions
const setHoverElement = (index, value) => {
    filteredDashboardElements.value[index].isHovered = value
}

const toggleModal = (isShowing, processId, processName, indexList, type) => {
    if ( type === 'form' ) {
        functionAfterAccepting.value = deleteFormWithId
        itemKey.value = 'form'
    } else {
        functionAfterAccepting.value = deleteProcessWithId
        itemKey.value = 'process'
    }
    processIdForDelete.value = processId // gets the id to delete from modal 
    processNameForDelete.value = processName
    showModalAcceptCancelMessage.value = isShowing
    searchListIndex.value = indexList
}

const filterElements = type => {
    filterType.value = type
    filteredDashboardElements.value = dashboardElements.value.filter( el => (el.type.includes(type) || type === 'all') && searchDashBoardElement(el))
}

const handleOpenFileInput = () => {
    // trigger the click event on the hidden file input
    fileInput.value.click()
}

const handleFileChange = event => {
    const fileInput = event.target
    const selectedFile = fileInput.files[0]
    if (!selectedFile && (!selectedFile.name.endsWith('.bpmn') || !selectedFile.name.endsWith('.dmn'))) { // shows toast error message if the file is not a .bpmn
        emit('showToastMessage', { isSuccess: false, toastText: 'toastLoadErrorFileExtension' })
        return
    }
    emit('openSelectedFile', event) //fires event that opens a file in the modeler
    // reset the file input to allow selecting the same file again
    fileInput.value = null
}

//calls the function that initializes the diagram
const handleClickCreateDmnDiagram = debounce(async () => {
    emit('createNewDmnDiagram', dmnXML, TYPEDMN)
}, 500)

const handleClickCreateBpmnc7Diagram = debounce(async () => {
    emit('createNewBpmnc7Diagram', diagramXMLC7, TYPEC7)
}, 500)

const handleSearch = debounce(async () => {
    filteredDashboardElements.value = dashboardElements.value.filter(element => searchDashBoardElement(element))
}, 100)

const searchDashBoardElement = element => {
   if (!element.type.includes(filterType.value) && filterType.value !== 'all' ) return false
    if (element.type !== 'form') return element.name.toLowerCase().includes(inputSearchValue.value.toLowerCase()) || element.processkey.toLowerCase().includes(inputSearchValue.value.toLowerCase())
    else return element.formId.toLowerCase().includes(inputSearchValue.value.toLowerCase())    
}

const handleClickCreateFormDiagram = debounce(async () => {
    emit('createNewFormDiagram', formJson, TYPEFORM)
}, 500)

//emits
const resetVariablesForModalAcceptCancelMessage = () => {
    processIdForDelete.value = ''
    processNameForDelete.value = ''
}

const hideModal = () => {
    showModalAcceptCancelMessage.value = false
}

//to pass it to the modal to execute when users accepts
const deleteProcessWithId = async processId => {
    try {
        searchElementsList.value[searchListIndex.value]._processingDeletingItem(true)
        await deleteProcessById(processId)
        emit('getStoredProcesses', () => { // to execute it after the function of the emit has finished
            emit('closeRemovedProcessesOpenInTab', processId)
            emit('showToastMessage', { isSuccess: true, toastText: 'toastDeleteProcessSucess' })
        })
        searchElementsList.value[searchListIndex.value]._processingDeletingItem(false)
        searchListIndex.value = null
    } catch (error) {
        console.error(error)
        emit('showToastMessage', { isSuccess: false, toastText: 'toastDeleteProcessFail' })
    }
}

//to pass it to the modal to execute when users accepts
const deleteFormWithId = async formId => {
    try {
        searchElementsList.value[searchListIndex.value]._processingDeletingItem(true)
        await deleteFormById(formId)
        emit('getStoredForms', () => { // to execute it after the function of the emit has finished
            emit('closeRemovedProcessesOpenInTab', formId)
            emit('showToastMessage', { isSuccess: true, toastText: 'toastDeleteFormSucess' })
        })
        searchElementsList.value[searchListIndex.value]._processingDeletingItem(false)
        searchListIndex.value = null
    } catch (error) {
        console.error(error)
        emit('showToastMessage', { isSuccess: false, toastText: 'toastDeleteFormFail' })
    }
}
//passed from child ProcessDiagramElement to CibsevenModeler
const openDiagramEmitFromChild = (valueFromChild, processId, processName, processKey, tabElementIndex, typeofDiagram) => {
    emit('openDiagram', valueFromChild, processId, processName, processKey, typeofDiagram, true, false, false)
}

const _toggleIsLoading = comp => isLoading.value = comp

const _addIsHoveredElement = () => {
    dashboardElements.value?.map((element) => element.isHovered = false)
}

defineExpose({
    _toggleIsLoading,
    openDiagramEmitFromChild
})
</script>
