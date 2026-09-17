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
                            :aria-label="$t('buttons.search')"
                        >
                            <span class="mdi mdi-magnify mdi-18px"></span>
                        </button>
                        <input
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
                    <nav class="mt-4 mb-3 d-flex align-items-center justify-content-between gap-2"
                        :aria-label="$t('folders.breadcrumb')">
                        <ol class="breadcrumb bg-transparent mb-0 p-0 flex-wrap folder-breadcrumb">
                            <li class="breadcrumb-item" :class="{ active: !breadcrumb.length }">
                                <span v-if="!breadcrumb.length" aria-current="page">{{ $t('folders.home') }}</span>
                                <button v-else type="button" class="btn btn-link btn-sm p-0 border-0 align-baseline"
                                    @click="navigateTo(null)">{{ $t('folders.home') }}</button>
                            </li>
                            <li v-for="(folder, level) in breadcrumb" :key="folder.id" class="breadcrumb-item"
                                :class="{ active: level === breadcrumb.length - 1 }"
                                :aria-current="level === breadcrumb.length - 1 ? 'page' : null">
                                <span v-if="level === breadcrumb.length - 1">{{ folder.name }}</span>
                                <button v-else type="button" class="btn btn-link btn-sm p-0 border-0 align-baseline"
                                    @click="navigateTo(folder.id)">{{ folder.name }}</button>
                            </li>
                        </ol>
                        <button type="button" class="btn btn-sm btn-outline-secondary text-nowrap"
                            :title="$t('folders.create')" @click="handleCreateFolder">
                            <i class="mdi mdi-folder-plus-outline me-1" aria-hidden="true"></i>{{ $t('folders.create') }}
                        </button>
                    </nav>
                    <p v-if="isSearching && !isEmptyHere" class="mt-2 mb-2 small text-muted">{{ $t('folders.searchAcrossFolders') }}</p>
                    <div v-if="filteredDashboardElements !== null">
                        <div ref="listContainer" @scroll="handleListScroll" class="list-group shadow-sm overflow-auto" style="max-height: 50vh">
                            <div class="d-flex align-items-center justify-content-center">
                                <div class="spinner-border text-dark m-4 bg-light" v-if="isLoading" role="status">
                                    <span class="visually-hidden">{{ $t("loading") }}...</span>
                                </div>
                            </div>
                            <div v-if="!isLoading">
                                <template v-if="!isSearching">
                                    <div v-for="folder in currentChildren" :key="folder.id">
                                        <FolderListItem :folder="folder" :isHovered="hoveredFolderId === folder.id"
                                            @mouseover="hoveredFolderId = folder.id" @mouseleave="hoveredFolderId = null"
                                            @focusin="hoveredFolderId = folder.id" @focusout="hoveredFolderId = null"
                                            @open="navigateTo" @rename="handleRenameFolder"
                                            @move="handleMoveFolder" @remove="handleRemoveFolder">
                                        </FolderListItem>
                                    </div>
                                </template>
                                <div v-if="isEmptyHere" class="list-group-item border-0 text-center text-muted py-5">
                                    <span class="mdi d-block mb-2 folder-empty-icon" :class="emptyState.icon"
                                        aria-hidden="true"></span>
                                    {{ emptyState.text }}
                                </div>
                                <div v-for="(element, index) in filteredDashboardElements" :key="element.id">
                                    <DiagramListItem
                                        @mouseleave="setHoverElement(index, false)" :index="index"
                                        :ref="el => searchElementsList[index] = el" @mouseover="setHoverElement(index, true)"
                                        @focusin="setHoverElement(index, true)" @focusout="setHoverElement(index, false)"
                                        @openDiagram="openDiagramEmitFromChild" :item="element" @toggleModal="toggleModal"
                                        @downloadDiagram="handleDownloadDiagram" @moveModel="handleMoveModel" @copyModel="handleCopyModel"
                                        :isHovered="element.isHovered">
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
                        <div v-if="currentFolderId || startPageTool" class="mt-4 d-flex justify-content-between">    
                            <div class="d-flex justify-content-start gap-2">
                                <button v-if="currentFolderId" @click="handleOpenFileInput" :title="$t('buttons.importFile')" type="button"
                                class="btn border border-dark btn-light"><i class="mdi mdi-import me-1"></i>{{ $t('buttons.importFile') }}</button>
                                <component v-if="startPageTool" :is="startPageTool"></component>
                            </div>
                            <div v-if="currentFolderId" class="d-flex gap-2">
                                <button :title="$t('buttons.createBpmn')" type="button" class="btn btn-secondary" @click="handleClickCreateBpmnc7Diagram">
                                    {{ $t('buttons.createBpmn') }}
                                </button>
                                <button :title="$t('buttons.createDmn')" type="button" class="btn btn-secondary" @click="handleClickCreateDmnDiagram">
                                    {{ $t('buttons.createDmn') }}
                                </button>
                                <button :title="$t('buttons.createForm')" type="button" class="btn btn-secondary" @click="handleClickCreateFormDiagram">
                                    {{ $t('buttons.createForm') }}
                                </button>
                            </div>
                        </div>
                        <input ref="fileInput" type="file" accept=".bpmn,.dmn,.form" multiple :aria-label="$t('buttons.importFile')" style="display: none;"
                            @change="handleFileChange" />

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
      <FolderNameModal ref="folderNameModal" />
      <FolderPickerModal ref="folderPickerModal" />
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
import FolderListItem from './FolderListItem.vue'
import FolderNameModal from '../modals/FolderNameModal.vue'
import FolderPickerModal from '../modals/FolderPickerModal.vue'
import useFolders from '../../composables/useFolders.js'
import { copyFormToFolder, copyProcessToFolder, moveFormToFolder, moveProcessToFolder } from '../../services/folderService'
import ConfirmModal from '../modals/ConfirmModal.vue'
import formJson from '../../resources/formSchema.json'
import { DIAGRAM_TYPE } from '../../constants/diagramTypes.js'
import { getPlugin } from '../../plugins/pluginsConfig.js'

const startPageTool = getPlugin('start-page-tools')
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
    'search',
    'navigateFolder'
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
const folderNameModal = ref(null)
const folderPickerModal = ref(null)
const hoveredFolderId = ref(null)
const folderDeleteBody = ref('')
const folderState = useFolders()
const { breadcrumb, currentChildren, currentFolderId } = folderState

// The keyword the list actually reflects, set when the search is sent rather than typed:
// while typing, what is on screen is still the folder, and it is described as the folder
const appliedKeyword = ref('')
const isSearching = computed(() => appliedKeyword.value.trim().length >= 3)
const isEmptyHere = computed(() => {
    const noModels = !(filteredDashboardElements.value?.length)
    // A search hides this level's folders, so they are not what there is nothing of
    return isSearching.value ? noModels : noModels && !currentChildren.value.length
})

// Three ways to be empty, and they call for three different things to do next
const emptyState = computed(() => {
    if (isSearching.value) {
        return {
            icon: 'mdi-file-search-outline',
            text: t('folders.noMatches', { keyword: appliedKeyword.value.trim() })
        }
    }
    return {
        icon: 'mdi-folder-open-outline',
        text: currentFolderId.value ? t('folders.empty') : t('folders.emptyHome')
    }
})

onMounted(async () => {
    try {
        await folderState.load()
    } catch (error) {
        // Without the tree there is still a list to show, so say so and carry on
        console.error(error)
        emit('showToastMessage', { isSuccess: false, toastText: 'toastFolderLoadFail' })
    }
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
      // A folder warns about what goes with it, not about the name of a single model
      if (itemKey.value === 'folder') {
        return { title: t('folders.deleteTitle'), body: folderDeleteBody.value }
      }
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
    _applySearch(keyword, type === 'all' ? '' : type)
}

/** The one place a search leaves for the host, so the applied keyword cannot drift from it. */
const _applySearch = (keyword, diagramType) => {
    appliedKeyword.value = keyword
    emit('search', { keyword, diagramType })
}

const handleOpenFileInput = () => {
    // trigger the click event on the hidden file input
    fileInput.value.click()
}

const handleFileChange = event => {
    const fileInput = event.target
    if (!fileInput.files.length) return
    emit('openSelectedFile', event)
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
        _applySearch(inputSearchValue.value, filterType.value === 'all' ? '' : filterType.value)
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

const navigateTo = folderId => {
    folderState.open(folderId)
    hoveredFolderId.value = null
    emit('navigateFolder', folderId ?? null)
}

const handleCreateFolder = () => {
    folderNameModal.value?.show('create', '', async name => {
        await folderState.create(name)
    })
}

const handleRenameFolder = folder => {
    folderNameModal.value?.show('rename', folder.name, async name => {
        await folderState.rename(folder.id, name)
    })
}

const handleMoveFolder = folder => {
    folderPickerModal.value?.show({
        // Leaving out the folder leaves out its subtree, which is where it may not go
        folders: folderState.flatten(folder.id),
        title: t('folders.moveTitle', { name: folder.name }),
        allowTopLevel: true,
        accept: async parentId => {
            await folderState.move(folder.id, parentId)
        }
    })
}

const handleRemoveFolder = async folder => {
    let held = { folders: 0, diagrams: 0, forms: 0 }
    try {
        held = await folderState.contents(folder.id)
    } catch (error) {
        // The count only informs the warning; losing it must not block the deletion
        console.error(error)
    }
    itemKey.value = 'folder'
    folderDeleteBody.value = t('folders.deleteBody', {
        name: folder.name,
        folders: held.folders ?? 0,
        models: (held.diagrams ?? 0) + (held.forms ?? 0)
    })
    functionAfterAccepting.value = deleteFolderWithId
    processIdForDelete.value = folder.id
    searchListIndex.value = null
    showModalAcceptCancelMessage.value = true
}

const deleteFolderWithId = async folderId => {
    try {
        await folderState.remove(folderId)
        // Removing the folder underfoot leaves the parent open, so the list has to follow
        emit('navigateFolder', folderState.currentFolderId.value)
        emit('showToastMessage', { isSuccess: true, toastText: 'toastFolderDeleteSuccess' })
    } catch (error) {
        console.error(error)
        emit('showToastMessage', { isSuccess: false, toastText: 'toastFolderDeleteFail' })
    }
}

const modelName = item => item.type === DIAGRAM_TYPE.FORM ? item.formId : item.name

const handleMoveModel = item => {
    folderPickerModal.value?.show({
        folders: folderState.flatten(),
        title: t('folders.moveModelTitle', { name: modelName(item) }),
        accept: async folderId => {
            if (item.type === DIAGRAM_TYPE.FORM) await moveFormToFolder(item.id, folderId)
            else await moveProcessToFolder(item.id, folderId)
            emit('getStoredDiagrams')
            emit('showToastMessage', { isSuccess: true, toastText: 'toastFolderMoveSuccess' })
        }
    })
}

const handleCopyModel = item => {
    // A copy is a new model and what identifies it has to be its own: the engine resolves a
    // process by key, and a form is referenced by its form id
    const isForm = item.type === DIAGRAM_TYPE.FORM
    folderPickerModal.value?.show({
        folders: folderState.flatten(),
        title: t('folders.copyModelTitle', { name: modelName(item) }),
        requireKey: true,
        keyLabel: isForm ? 'folders.copyFormId' : 'folders.copyKey',
        keyRequired: isForm ? 'folders.copyFormIdRequired' : 'folders.copyKeyRequired',
        defaultKey: `${isForm ? item.formId : item.processkey}-copy`,
        accept: async (folderId, key) => {
            if (isForm) await copyFormToFolder(item.id, folderId, key)
            else await copyProcessToFolder(item.id, folderId, key, item.name)
            emit('getStoredDiagrams')
            emit('showToastMessage', { isSuccess: true, toastText: 'toastFolderCopySuccess' })
        }
    })
}

const _toggleIsLoading = comp => isLoading.value = comp

const _addIsHoveredElement = () => {
    dashboardElements.value?.map((element) => element.isHovered = false)
}

// The tree is loaded here, so this is where a folder id can be turned into a name
const folderNameFor = folderId =>
    folderState.folders.value.find(folder => folder.id === folderId)?.name ?? null

defineExpose({
    _toggleIsLoading,
    openDiagramEmitFromChild,
    folderNameFor
})
</script>

<style scoped>
/* The breadcrumb sits on the page, not in a panel: whatever the theme gives it, it stays flat. */
.folder-breadcrumb {
    background-color: transparent;
}

.folder-breadcrumb .btn-link {
    text-decoration: none;
}

.folder-breadcrumb .btn-link:hover,
.folder-breadcrumb .btn-link:focus-visible {
    text-decoration: underline;
}

.folder-empty-icon {
    font-size: 2rem;
    opacity: 0.5;
}

/* TODO: Unify search box styles across the project (shared component or global styles). */
.start-page-search .start-page-search-segment:hover,
.start-page-search .start-page-search-segment:focus-visible {
    background-color: var(--bs-gray-200) !important;
}

.start-page-search .dropdown-toggle.show {
    background-color: var(--bs-gray-200) !important;
}
</style>
