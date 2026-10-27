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

    <div class="d-flex flex-column h-100 bg-light">
        <div class="container d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4 mb-3">
            <h4 class="fw-normal mb-0">{{ $t('titles.searchIntro') }}</h4>
            <!-- Tools of the host lead elsewhere, so they stay out of the folder's actions -->
            <component v-if="startPageTool" :is="startPageTool"></component>
        </div>
        <!-- One block for search, folders and files, like the lists of the webclient -->
        <div class="d-flex flex-column container bg-white border rounded shadow-sm p-0 mb-3" style="min-height: 0">
            <div class="container pt-4">
                <div class="row align-items-center g-2 pb-2">
                    <div class="col-12 col-xl-5">
                        <div class="d-flex align-items-center border rounded start-page-search">
                            <button
                                @click.stop="handleSearch"
                                type="button"
                                class="btn btn-link btn-sm mdi mdi-magnify mdi-24px text-secondary"
                                :title="$t('titles.search')"
                                :aria-label="$t('buttons.search')">
                            </button>
                            <input
                                class="start-page-search-field form-control-plaintext flex-grow-1 w-100 border-0 px-2"
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
                                    class="btn dropdown-toggle border-0 border-start rounded-0 rounded-end text-secondary shadow-none start-page-search-segment d-flex align-items-center px-3"
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
                    </div>
                    <div class="col-12 col-xl-7 d-flex flex-wrap gap-2 justify-content-xl-end">
                        <!-- At the top level a folder is a project, and creating one is all there is to do -->
                        <button v-if="canEditHere" type="button" class="btn text-nowrap create-folder"
                            :class="currentFolderId ? 'btn-outline-secondary' : 'btn-secondary'"
                            :title="createFolderLabel" @click="handleCreateFolder">
                            <i class="mdi me-1" :class="currentFolderId ? 'mdi-folder-plus-outline' : 'mdi-briefcase-plus'" aria-hidden="true"></i>{{ createFolderLabel }}
                        </button>
                        <!-- Models are always stored in a folder -->
                        <template v-if="currentFolderId && canEditHere">
                            <button type="button" class="btn btn-outline-secondary text-nowrap" :title="$t('buttons.importFile')"
                                @click="handleOpenFileInput">
                                <i class="mdi mdi-upload me-1" aria-hidden="true"></i>{{ $t('buttons.import') }}
                            </button>
                            <button v-for="button in createButtons" :key="button.type" type="button"
                                class="btn btn-secondary text-nowrap" :title="$t(button.label)"
                                :disabled="creatingType !== null" :aria-busy="creatingType === button.type"
                                @click="button.handler">
                                <span v-if="creatingType === button.type" class="spinner-border spinner-border-sm me-1"
                                    aria-hidden="true"></span>
                                <i v-else class="mdi me-1" :class="DIAGRAM_ICON[button.type]" aria-hidden="true"></i>{{ $t(button.label) }}
                            </button>
                        </template>
                    </div>
                </div>
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
                    <nav style="min-width: 0" :aria-label="$t('folders.breadcrumb')">
                        <ol class="breadcrumb bg-transparent mb-0 p-0 flex-wrap align-items-center folder-breadcrumb">
                            <li class="breadcrumb-item" :class="{ active: !breadcrumb.length }">
                                <span v-if="!breadcrumb.length" class="fw-semibold" aria-current="page">{{ $t('folders.projects') }}</span>
                                <button v-else type="button" class="btn btn-link btn-sm p-0 border-0 align-baseline"
                                    @click="navigateTo(null)">{{ $t('folders.projects') }}</button>
                            </li>
                            <li v-for="(folder, level) in breadcrumb" :key="folder.id" class="breadcrumb-item"
                                :class="{ active: level === breadcrumb.length - 1 }"
                                :aria-current="level === breadcrumb.length - 1 ? 'page' : null">
                                <span v-if="level === breadcrumb.length - 1" class="fw-semibold">
                                    <span class="mdi me-1" :class="folderIcon(folder)" aria-hidden="true"></span>{{ folder.name }}
                                </span>
                                <button v-else type="button" class="btn btn-link btn-sm p-0 border-0 align-baseline"
                                    @click="navigateTo(folder.id)">
                                    <span class="mdi me-1" :class="folderIcon(folder)" aria-hidden="true"></span>{{ folder.name }}
                                </button>
                            </li>
                        </ol>
                    </nav>
                    <button v-if="canSetDefault" type="button" class="btn btn-light border-0 d-inline-flex align-items-center gap-2 default-folder"
                        :title="defaultLabel" :aria-disabled="isFallbackHere ? 'true' : null" @click="toggleDefault">
                        <i class="mdi mdi-18px" :class="isDefaultHere ? 'mdi-star' : 'mdi-star-outline'" aria-hidden="true"></i>{{ defaultText }}
                    </button>
                </div>
                <p v-if="isSearching && !isEmptyHere" class="mb-2 small text-muted">{{ $t('folders.searchAcrossFolders') }}</p>
            </div>
            <div v-if="filteredDashboardElements !== null" ref="listContainer" @scroll="handleListScroll"
                class="files-list overflow-auto mx-3 mb-3" style="min-height: 0">
                <div class="d-flex align-items-center justify-content-center">
                    <div class="spinner-border text-dark m-4 bg-light" v-if="isLoading" role="status">
                        <span class="visually-hidden">{{ $t("loading") }}...</span>
                    </div>
                </div>
                <div v-if="!isLoading">
                    <div v-if="isEmptyHere" class="files-empty text-center text-muted py-5">
                        <span class="mdi d-block mb-2 folder-empty-icon" :class="emptyState.icon"
                            aria-hidden="true"></span>
                        {{ emptyState.text }}
                    </div>
                    <!-- A search lists models from every folder, so it shows no folders of its own -->
                    <FilesTable v-else :folders="isSearching ? [] : currentChildren" :models="filteredDashboardElements"
                        :isDefault="folderState.isDefault" :isLocked="folderState.isLocked"
                        :canEdit="folderState.canEdit" :canChange="folderState.canChange" :rightsOf="folderState.rightsOf"
                        :extraActions="extraFolderActions"
                        :locationOf="isSearching ? folderPathFor : null" :deletingId="deletingId" v-model:sort="tableSort"
                        @openFolder="navigateTo" @renameFolder="handleRenameFolder"
                        @moveFolder="handleMoveFolder" @removeFolder="handleRemoveFolder"
                        @openModel="openModel" @downloadModel="handleDownloadDiagram" @moveModel="handleMoveModel"
                        @copyModel="handleCopyModel" @removeModel="confirmRemoveModel" @extraAction="runExtraAction">
                    </FilesTable>
                    <div v-if="isLoadingMore" class="d-flex align-items-center justify-content-center py-2">
                        <div class="spinner-border spinner-border-sm text-secondary" role="status">
                            <span class="visually-hidden">{{ $t("loading") }}...</span>
                        </div>
                    </div>
                </div>
            </div>
            <input ref="fileInput" type="file" accept=".bpmn,.dmn,.form" multiple :aria-label="$t('buttons.importFile')" style="display: none;"
                @change="handleFileChange" />
        </div>

      <ConfirmModal :showModal="showModalAcceptCancelMessage" :title="modalTitle.title"
          :body="modalTitle.body" @hideModal="hideModal" :id="processIdForDelete" type="closeTab"
          :functionAfterAccepting="functionAfterAccepting ? functionAfterAccepting : () => {}"
          :acceptLabel="$t('buttons.delDiagram')"
          @resetVariablesForModalAcceptCancelMessage="resetVariablesForModalAcceptCancelMessage">
      </ConfirmModal>
      <FolderNameModal ref="folderNameModal" />
      <FolderPickerModal ref="folderPickerModal" />
      <TaskPopper ref="downloadPopper" />
    </div>

</template>

<script setup>

import { computed, inject, onMounted, ref, watch } from 'vue'
import { debounce } from 'min-dash'
import { fetchProcessById, deleteProcessById } from '../../services/processService'
import { fetchFormById, deleteFormById } from '../../services/formService'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { TaskPopper } from '@cib/common-frontend'

//starting files for new diagrams
import diagramXMLC7 from '../../resources/camunda7.bpmn'
import dmnXML from '../../resources/dmn.dmn'
//components
import FilesTable from './FilesTable.vue'
import FolderNameModal from '../modals/FolderNameModal.vue'
import FolderPickerModal from '../modals/FolderPickerModal.vue'
import useFolders from '../../composables/useFolders.js'
import { copyFormToFolder, copyProcessToFolder, moveFormToFolder, moveProcessToFolder } from '../../services/folderService'
import ConfirmModal from '../modals/ConfirmModal.vue'
import formJson from '../../resources/formSchema.json'
import { DIAGRAM_ICON, DIAGRAM_TYPE } from '../../constants/diagramTypes.js'
import { getPlugin } from '../../plugins/pluginsConfig.js'
import { folderIcon, modelName } from '../../utils'

const startPageTool = getPlugin('start-page-tools')
// What an edition adds to a folder's menu: { id, icon, label, visible(folder, rights), run(folder, { reload }) }
const extraFolderActions = inject('extraFolderActions', [])
const functionAfterAccepting = ref(null)
const { t } = useI18n()
const store = useStore()
const props = defineProps({
    diagrams: Array,
    // The folder to come back to after a refresh, from the URL; an empty value is the top level
    initialFolderId: { type: String, default: null },
    hasMore: {
        type: Boolean,
        default: false
    }
 })
const emit = defineEmits([
    'closeRemovedProcessesOpenInTab',
    'getStoredDiagrams',
    // (content, type, done): the listener calls done() once the dialog or the new tab is open
    'createNewDmnDiagram',
    'createNewBpmnc7Diagram',
    'createNewFormDiagram',
    'openSelectedFile',
    'openDiagram',
    'showToastMessage',
    'loadMore',
    'search',
    'navigateFolder',
    'modelMoved'
])
const downloadPopper = ref(null)
const inputSearchValue = ref('')
const fileInput = ref(null)
const listContainer = ref(null)
const isLoadingMore = ref(false)
const showModalAcceptCancelMessage = ref(false)
const isLoading = ref(true)
const processIdForDelete = ref('') // saves the id to delete id from the modal
const processNameForDelete = ref('')
const deletingId = ref(null)
// Kept here, as the table is rebuilt while a folder loads or is empty
const tableSort = ref({ by: 'updated', desc: true })
const itemKey = ref('process')
const filterType = ref('all')
const dashboardElements = ref([])
const filteredDashboardElements = ref([])
const folderNameModal = ref(null)
const folderPickerModal = ref(null)
const folderDeleteBody = ref('')
const folderState = useFolders()
const { breadcrumb, currentChildren, currentFolderId, canSetDefault } = folderState

// A viewer of the project on screen gets nothing to create, import or rename here
const canEditHere = computed(() => folderState.canEdit(currentFolderId.value))

/** Where a folder or a model may go: anywhere the user may add, or only inside its own project. */
const moveScope = folderId => folderState.movesBetweenProjects.value
    ? { editableOnly: true }
    : { editableOnly: true, within: folderState.projectOf(folderId) }

/** The edition's entry decides what happens; what it changed may be who sees what, so the tree is read again. */
const runExtraAction = (entry, folder) => entry.run?.(folder, {
    rights: folderState.rightsOf(folder.id),
    reload: () => folderState.load()
})

// The place on screen, the top level included, is what the star sets as the start of a visit
const isDefaultHere = computed(() => folderState.isDefault(currentFolderId.value))
// The user folder is the default when nothing else is chosen, so there it cannot be unset
const isFallbackHere = computed(() => isDefaultHere.value && folderState.defaultFolderId.value === null)
const defaultLabel = computed(() => {
    if (isFallbackHere.value) return t('folders.defaultFolder')
    return isDefaultHere.value ? t('folders.unsetDefault') : t('folders.setDefault')
})
const defaultText = computed(() => isDefaultHere.value ? t('folders.defaultFolder') : t('folders.setDefault'))
const toggleDefault = () => {
    if (isFallbackHere.value) return
    if (isDefaultHere.value) folderState.clearDefault()
    else folderState.setDefault(currentFolderId.value)
}

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
        text: currentFolderId.value ? t('folders.empty') : t('folders.emptyProjects')
    }
})

const _exists = folderId => folderState.folders.value.some(folder => folder.id === folderId)

/**
 * A refresh comes back to the folder in the URL; a new visit starts in the default the user
 * chose, else in the user's own folder. Null is the top level.
 */
const startFolder = () => {
    const requested = props.initialFolderId
    if (requested === '') return null
    if (requested && _exists(requested)) return requested
    const preferred = folderState.defaultFolderId.value
    if (preferred === '') return null
    if (preferred && _exists(preferred)) return preferred
    // A default that is gone is forgotten, so the next visit does not look for it again
    if (preferred) folderState.clearDefault()
    return folderState.userFolderId.value
}

/** Where a file dropped on the top level goes; none when the default is the top level itself. */
const defaultDropFolderId = () => {
    const preferred = folderState.defaultFolderId.value
    return preferred && _exists(preferred) && folderState.canEdit(preferred) ? preferred : null
}

onMounted(async () => {
    try {
        await folderState.load()
        const folderId = startFolder()
        if (folderId && !currentFolderId.value) navigateTo(folderId)
    } catch (error) {
        // Without the tree there is still a list to show, so say so and carry on
        console.error(error)
        emit('showToastMessage', { isSuccess: false, toastText: 'toastFolderLoadFail' })
    }
    resetDashboardElements()
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

const confirmRemoveModel = item => {
    const isForm = item.type === DIAGRAM_TYPE.FORM
    functionAfterAccepting.value = isForm ? deleteFormWithId : deleteProcessWithId
    itemKey.value = isForm ? 'form' : 'process'
    processIdForDelete.value = item.id
    processNameForDelete.value = modelName(item)
    showModalAcceptCancelMessage.value = true
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

// The button that was clicked stays busy until the listener calls done(), i.e. until the
// dialog or the new tab is open; one creation at a time keeps a double click from making two
const creatingType = ref(null)
const createNew = (event, content, type) => {
    if (creatingType.value !== null) return
    creatingType.value = type
    emit(event, content, type, () => { creatingType.value = null })
}

const handleClickCreateDmnDiagram = () => createNew('createNewDmnDiagram', dmnXML, DIAGRAM_TYPE.DMN)
const handleClickCreateBpmnc7Diagram = () => createNew('createNewBpmnc7Diagram', diagramXMLC7, DIAGRAM_TYPE.BPMN_C7)
const handleClickCreateFormDiagram = () => createNew('createNewFormDiagram', formJson, DIAGRAM_TYPE.FORM)

const createButtons = [
    { type: DIAGRAM_TYPE.BPMN_C7, label: 'buttons.createBpmn', handler: handleClickCreateBpmnc7Diagram },
    { type: DIAGRAM_TYPE.DMN, label: 'buttons.createDmn', handler: handleClickCreateDmnDiagram },
    { type: DIAGRAM_TYPE.FORM, label: 'buttons.createForm', handler: handleClickCreateFormDiagram }
]

const handleSearch = debounce(() => {
    const len = inputSearchValue.value.length
    if (len >= 3 || len === 0) {
        _applySearch(inputSearchValue.value, filterType.value === 'all' ? '' : filterType.value)
    }
}, 300)

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
    deletingId.value = processId
    try {
        await deleteProcessById(processId)
        emit('getStoredDiagrams', () => { // to execute it after the function of the emit has finished
            emit('closeRemovedProcessesOpenInTab', processId)
            emit('showToastMessage', { isSuccess: true, toastText: 'toastDeleteProcessSucess' })
        })
    } catch (error) {
        console.error(error)
        emit('showToastMessage', { isSuccess: false, toastText: 'toastDeleteProcessFail' })
    } finally {
        deletingId.value = null
    }
}

//to pass it to the modal to execute when users accepts
const deleteFormWithId = async formId => {
    deletingId.value = formId
    try {
        await deleteFormById(formId)
        emit('getStoredDiagrams', () => { // to execute it after the function of the emit has finished
            emit('closeRemovedProcessesOpenInTab', formId)
            emit('showToastMessage', { isSuccess: true, toastText: 'toastDeleteFormSucess' })
        })
    } catch (error) {
        console.error(error)
        emit('showToastMessage', { isSuccess: false, toastText: 'toastDeleteFormFail' })
    } finally {
        deletingId.value = null
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
const openDiagramEmitFromChild = (valueFromChild, processId, processName, processKey, tabElementIndex, typeofDiagram, folderId = null) => {
    emit('openDiagram', valueFromChild, processId, processName, processKey, typeofDiagram, true, false, false, folderId)
}

/** Loads the model before the tab for it is opened. */
const openModel = async item => {
    const isForm = item.type === DIAGRAM_TYPE.FORM
    if (isForm) await store.dispatch('modeler/forms/fetchFormById', item.id)
    else await store.dispatch('modeler/processes/fetchProcessById', item.id)
    const selected = isForm ? store.state.modeler.forms.formSelected : store.state.modeler.processes.processSelected
    openDiagramEmitFromChild(selected, item.id, isForm ? item.formId : item.name,
        isForm ? item.formId : item.processkey, null, item.type, item.folderId)
}

const navigateTo = folderId => {
    folderState.open(folderId)
    emit('navigateFolder', folderId ?? null)
}

const createFolderLabel = computed(() => currentFolderId.value ? t('folders.create') : t('folders.createProject'))

const handleCreateFolder = () => {
    folderNameModal.value?.show('create', '', async name => {
        await folderState.create(name)
    }, currentFolderId.value ? 'folder' : 'project')
}

const handleRenameFolder = folder => {
    folderNameModal.value?.show('rename', folder.name, async name => {
        await folderState.rename(folder.id, name)
    }, folder.parentId ? 'folder' : 'project')
}

const handleMoveFolder = folder => {
    folderPickerModal.value?.show({
        // Leaving out the folder leaves out its subtree, which is where it may not go
        folders: folderState.flatten(folder.id, moveScope(folder.id)),
        title: t('folders.moveTitle', { name: folder.name }),
        allowTopLevel: true,
        current: folder.parentId ?? null,
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

const handleMoveModel = item => {
    folderPickerModal.value?.show({
        folders: folderState.flatten(null, moveScope(item.folderId)),
        title: t('folders.moveModelTitle', { name: modelName(item) }),
        current: item.folderId,
        accept: async folderId => {
            if (item.type === DIAGRAM_TYPE.FORM) await moveFormToFolder(item.id, folderId)
            else await moveProcessToFolder(item.id, folderId)
            emit('modelMoved', item.id, folderId)
            emit('getStoredDiagrams')
            emit('showToastMessage', { isSuccess: true, toastText: 'toastFolderMoveSuccess' })
        }
    })
}

const handleCopyModel = item => {
    // A copy is a new model and what identifies it has to be its own: the engine resolves a
    // process by key, and a form is referenced by its form id
    const isForm = item.type === DIAGRAM_TYPE.FORM
    // A copy may go into any project the user adds to: the source keeps its model
    folderPickerModal.value?.show({
        folders: folderState.flatten(null, { editableOnly: true }),
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

// The tree is loaded here, so this is where a folder id can be turned into a name or a path
const folderPathFor = folderId =>
    folderState.pathOf(folderId).map(folder => folder.name).join(' / ') || null

const folderNameFor = folderId => folderState.pathOf(folderId).at(-1)?.name ?? null

/** The folders a file may be imported into, for a dialog the modeler shows outside this page. */
const folderOptions = () => folderState.flatten(null, { editableOnly: true })

defineExpose({
    _toggleIsLoading,
    openDiagramEmitFromChild,
    folderNameFor,
    folderPathFor,
    folderOptions,
    defaultDropFolderId
})
</script>

<style scoped>
/* The breadcrumb sits on the page, not in a panel: whatever the theme gives it, it stays flat. */
.folder-breadcrumb {
    background-color: transparent;
    --bs-breadcrumb-divider: '/';
    --bs-breadcrumb-divider-color: var(--bs-secondary-color);
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
