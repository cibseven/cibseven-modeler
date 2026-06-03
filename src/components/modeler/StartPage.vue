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
            <div class="container position-relative h-100 overflow-x-hidden overflow-y-auto" style="z-index: 9;">
                <h4 class="fw-normal text-center mt-5 mb-3">
                    {{ $t('titles.searchIntro') }}
                </h4>
                <div class="position-relative mx-auto w-75">
                    <div class="d-flex align-items-stretch overflow-visible border rounded bg-body start-page-search">
                        <button
                            @click.stop="handleSearch"
                            type="button"
                            class="btn border-0 rounded-start bg-body text-secondary shadow-none start-page-search-segment d-flex align-items-center"
                            :title="$t('titles.search')"
                            aria-hidden="true">
                            <span class="mdi mdi-magnify mdi-18px"></span>
                        </button>
                        <input
                            id="start-page-search"
                            class="start-page-search-field flex-grow-1 min-w-0 w-100 border-0 shadow-none bg-body rounded-0 py-2"
                            type="text"
                            :title="$t('titles.search')"
                            :placeholder="$t('titles.search')"
                            :aria-label="$t('titles.search')"
                            autocomplete="off"
                            v-model="inputSearchValue"
                            @input="handleSearch">
                        <div class="dropdown align-self-stretch d-flex">
                            <button
                                type="button"
                                class="btn dropdown-toggle border-0 border-start rounded-start-0 rounded-end bg-body text-secondary shadow-none start-page-search-segment h-100 d-flex align-items-center px-3 py-2"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                :title="$t(`filterElements.${filterType}`)">
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
                    </div>
                <div>
                    <h6 class="mt-4">{{ $t("titles.recent") }}</h6>
                    <div v-if="filteredDashboardElements !== null">
                        <div ref="listContainer" @scroll="handleListScroll" class="list-group shadow-sm overflow-auto" style="max-height: 50vh">
                            <div class="d-flex align-items-center justify-content-center">
                                <div class="spinner-border text-dark m-4 bg-light" v-if="isLoading" role="status">
                                    <span class="visually-hidden">{{ $t("loading") }}...</span>
                                </div>
                            </div>
                            <div v-if="!isLoading">
                                <div v-for="(element, index) in filteredDashboardElements" :key="element.id">
                                    <DiagramListItem
                                        @mouseleave="setHoverElement(index, false)" :index="index"
                                        :ref="el => searchElementsList[index] = el" @mouseover="setHoverElement(index, true)"
                                        @focusin="setHoverElement(index, true)" @focusout="setHoverElement(index, false)"
                                        @openDiagram="openDiagramEmitFromChild" :item="element" @toggleModal="toggleModal"
                                        @downloadDiagram="handleDownloadDiagram" :isHovered="element.isHovered">
                                    </DiagramListItem>
                                </div>
                                <div v-if="isLoadingMore" class="d-flex align-items-center justify-content-center py-2">
                                    <div class="spinner-border spinner-border-sm text-secondary" role="status">
                                        <span class="visually-hidden">{{ $t("loading") }}...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                        <div class="mt-4 d-flex justify-content-between">    
                            <div class="d-flex justify-content-start gap-2">
                                <button @click="handleOpenFileInput" :title="$t('buttons.importFile')" type="button"
                                class="btn border border-dark btn-light"><i class="mdi mdi-import me-1"></i>{{ $t('buttons.importFile') }}</button>
                            </div>
                            <input ref="fileInput" type="file" accept=".bpmn,.dmn,.form" :aria-label="$t('buttons.importFile')" style="display: none;"
                                @change="handleFileChange" />                            
                            <div class="dropdown">
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
            <img :alt="$t('cib-header.productName')" :src="modelerSvg"
                class="d-none d-sm-inline position-fixed w-25"
                style="bottom: 0; left: 30px; mix-blend-mode: multiply; opacity: 0.7;">

      <ConfirmModal :showModal="showModalAcceptCancelMessage" :title="modalTitle.title"
          :body="modalTitle.body" @hideModal="hideModal" :id="processIdForDelete" type="closeTab"
          :searchListIndex="searchListIndex" :functionAfterAccepting="functionAfterAccepting ? functionAfterAccepting : () => {}"
          :acceptLabel="$t('buttons.delDiagram')"
          @resetVariablesForModalAcceptCancelMessage="resetVariablesForModalAcceptCancelMessage">
      </ConfirmModal>
      <TaskPopper ref="downloadPopper" />
    </div>

</template>

<script setup>

import { computed, onMounted, ref, watch } from 'vue'
import { debounce } from 'min-dash'
import { fetchProcessById, deleteProcessById } from '../../services/processService'
import { fetchFormById, deleteFormById } from '../../services/formService'
import { useI18n } from 'vue-i18n'
import { TaskPopper } from '@cib/common-frontend'

//starting files for new diagrams
import diagramXMLC7 from '../../resources/camunda7.bpmn'
import dmnXML from '../../resources/dmn.dmn'
//components
import DiagramListItem from './DiagramListItem.vue'
import ConfirmModal from '../modals/ConfirmModal.vue'
import formJson from '../../resources/formSchema.json'
import { DIAGRAM_TYPE } from '../../constants/diagramTypes.js'
import modelerSvg from '../../assets/images/start/modeler.svg'
const functionAfterAccepting = ref(null)
const { t } = useI18n()
const props = defineProps({
    diagrams: Array,
    hasMore: {
        type: Boolean,
        default: false
    }
 })
const emit = defineEmits([
    'closeRemovedProcessesOpenInTab',
    'getStoredDiagrams',
    'createNewDmnDiagram',
    'createNewBpmnc7Diagram',
    'createNewFormDiagram',
    'openSelectedFile',
    'openDiagram',
    'showToastMessage',
    'loadMore',
    'search'
])
const downloadPopper = ref(null)
const inputSearchValue = ref('')
const fileInput = ref(null)
const listContainer = ref(null)
const isLoadingMore = ref(false)
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
    resetDashboardElements()
    _addIsHoveredElement()
    if (props.diagrams != null) {
        isLoading.value = false
    }
})

const handleListScroll = () => {
    if (!listContainer.value || isLoadingMore.value || !props.hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = listContainer.value
    if (scrollTop + clientHeight >= scrollHeight - 50) {
        isLoadingMore.value = true
        emit('loadMore')
    }
}

const modalTitle = computed(() => {
      return { title: t('modalDelete.title', {
        item: t(`items.${itemKey.value}`)
      } ), body: t('modalDelete.body', {
        item: t(`items.${itemKey.value}`),
        name: processNameForDelete.value
      } )  }
})

const resetDashboardElements = () => {
    dashboardElements.value = props.diagrams ? JSON.parse(JSON.stringify(props.diagrams)) : []
    filteredDashboardElements.value = dashboardElements.value
}

watch(() => props.diagrams, () => {
    isLoadingMore.value = false
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
    if (filterType.value === type) return
    filterType.value = type
    const keyword = inputSearchValue.value.length >= 3 ? inputSearchValue.value : ''
    emit('search', { keyword, diagramType: type === 'all' ? '' : type })
}

const handleOpenFileInput = () => {
    // trigger the click event on the hidden file input
    fileInput.value.click()
}

const handleFileChange = event => {
    const fileInput = event.target
    const selectedFile = fileInput.files[0]
    if (!selectedFile || (!selectedFile.name.endsWith('.bpmn') && !selectedFile.name.endsWith('.dmn') && !selectedFile.name.endsWith('.form'))) { // shows toast error message if the file is not a .bpmn, .dmn, or .form
        emit('showToastMessage', { isSuccess: false, toastText: 'toastLoadErrorFileExtension' })
        return
    }
    emit('openSelectedFile', event) //fires event that opens a file in the modeler
    // reset the file input to allow selecting the same file again
    fileInput.value = null
}

//calls the function that initializes the diagram
const handleClickCreateDmnDiagram = debounce(async () => {
    emit('createNewDmnDiagram', dmnXML, DIAGRAM_TYPE.DMN)
}, 500)

const handleClickCreateBpmnc7Diagram = debounce(async () => {
    emit('createNewBpmnc7Diagram', diagramXMLC7, DIAGRAM_TYPE.BPMN_C7)
}, 500)

const handleSearch = debounce(() => {
    const len = inputSearchValue.value.length
    if (len >= 3 || len === 0) {
        emit('search', { keyword: inputSearchValue.value, diagramType: filterType.value === 'all' ? '' : filterType.value })
    }
}, 300)

const handleClickCreateFormDiagram = debounce(async () => {
    emit('createNewFormDiagram', formJson, DIAGRAM_TYPE.FORM)
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
        emit('getStoredDiagrams', () => { // to execute it after the function of the emit has finished
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
        emit('getStoredDiagrams', () => { // to execute it after the function of the emit has finished
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

const handleDownloadDiagram = async (item) => {
    const isForm = item.type === DIAGRAM_TYPE.FORM
    try {
        let content, filename, mimeType
        if (isForm) {
            const data = await fetchFormById(item.id)
            content = JSON.stringify(data, null, 2)
            filename = `${item.formId}.form`
            mimeType = 'application/json'
        } else {
            content = await fetchProcessById(item.id)
            const ext = item.type.startsWith('bpmn') ? 'bpmn' : item.type
            filename = `${item.name}.${ext}`
            mimeType = 'application/xml'
        }
        downloadPopper.value.triggerDownload(new Blob([content], { type: mimeType }), filename)
        emit('showToastMessage', { isSuccess: true, toastText: 'toastDownloadDiagramSuccess' })
    } catch (error) {
        console.error(error)
        emit('showToastMessage', { isSuccess: false, toastText: 'toastDownloadDiagramFail' })
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

<style scoped>
.start-page-search .start-page-search-segment:hover,
.start-page-search .start-page-search-segment:focus-visible {
    background-color: var(--bs-gray-200) !important;
}

.start-page-search .dropdown-toggle.show {
    background-color: var(--bs-gray-200) !important;
}
</style>
