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
    <div class="modal fade" ref="modalRoot" tabindex="-1" aria-hidden="true" :aria-labelledby="titleId">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fs-5" :id="titleId">{{ title }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" :aria-label="$t('buttons.close')"></button>
                </div>
                <div class="modal-body">
                    <fieldset>
                        <legend class="form-label fs-6">{{ $t('folders.destination') }}</legend>
                        <div v-if="filterable" class="mb-2">
                            <label class="visually-hidden" :for="filterId">{{ $t('folders.filterFolders') }}</label>
                            <div class="input-group input-group-sm">
                                <span class="input-group-text"><span class="mdi mdi-magnify" aria-hidden="true"></span></span>
                                <input :id="filterId" type="search" class="form-control" v-model="filter"
                                    :placeholder="$t('folders.filterFolders')" autocomplete="off">
                            </div>
                        </div>
                        <div ref="listRoot" class="folder-picker border rounded overflow-auto">
                            <label v-if="allowTopLevel" :for="`${optionId}-top-level`" class="folder-picker-row"
                                :class="rowClass('')" :style="{ paddingLeft: indent(0) }">
                                <input :id="`${optionId}-top-level`" type="radio" class="form-check-input m-0 flex-shrink-0"
                                    value="" v-model="selected" :disabled="isCurrent('')">
                                <span class="mdi mdi-folder-multiple-outline" aria-hidden="true"></span>
                                <span class="text-truncate">{{ $t('folders.projects') }}</span>
                                <span v-if="isCurrent('')" class="small flex-shrink-0">({{ $t('folders.currentLocation') }})</span>
                            </label>
                            <label v-for="folder in visibleOptions" :key="folder.id" :for="`${optionId}-${folder.id}`"
                                class="folder-picker-row" :class="rowClass(folder.id)"
                                :style="{ paddingLeft: indent(folder.depth + (allowTopLevel ? 1 : 0)) }">
                                <input :id="`${optionId}-${folder.id}`" type="radio" class="form-check-input m-0 flex-shrink-0"
                                    :value="folder.id" v-model="selected" :disabled="isCurrent(folder.id)">
                                <span class="mdi" :class="iconOf(folder)" aria-hidden="true"></span>
                                <span class="text-truncate">{{ folder.name }}</span>
                                <span v-if="isCurrent(folder.id)" class="small flex-shrink-0">({{ $t('folders.currentLocation') }})</span>
                            </label>
                            <p v-if="filtering && visibleOptions.length === 0" class="text-body-secondary small m-0 px-3 py-2">
                                {{ $t('folders.filterNoMatch', { keyword: filter.trim() }) }}
                            </p>
                        </div>
                        <p class="folder-picker-choice small mt-2 mb-0 text-truncate" aria-live="polite">
                            <template v-if="selectedPath">
                                <span class="text-body-secondary">{{ $t('folders.selectedDestination') }}:</span>
                                <span class="fw-semibold ms-1" :title="selectedPath">{{ selectedPath }}</span>
                            </template>
                        </p>
                    </fieldset>
                    <div v-if="requireKey" class="mt-3">
                        <label class="form-label" :for="keyId">{{ $t(keyLabel) }}</label>
                        <input :id="keyId" type="text" maxlength="100" class="form-control form-control-sm" v-model="key"
                            @input="error = ''; keyEdited = true" @keyup.enter="handleAccept">
                    </div>
                    <div v-if="error" tabindex="-1" role="alert" aria-live="assertive" aria-atomic="true"
                        class="d-block invalid-feedback">{{ error }}</div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{ $t('buttons.cancel') }}</button>
                    <button type="submit" class="btn btn-primary" :disabled="!isChosen" @click="handleAccept">
                        {{ $t('buttons.accept') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import * as bootstrap from 'bootstrap'
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { folderErrorMessage } from '../../utils/folderErrors.js'
import { folderIcon } from '../../utils.js'

// A short list is read at a glance; from this many folders on, the dialog offers a filter
const FILTER_FROM = 8

const { t } = useI18n()
const titleId = useId()
const keyId = useId()
const optionId = useId()
const filterId = useId()

const modalRoot = ref(null)
const listRoot = ref(null)
const options = ref([])
const selected = ref(null)
const key = ref('')
const error = ref('')
const title = ref('')
const filter = ref('')
const allowTopLevel = ref(false)
const requireKey = ref(false)
const keyLabel = ref('folders.copyKey')
const keyRequired = ref('folders.copyKeyRequired')
const runAfterClose = ref(false)
// Where the item already is: listed, but not a choice. null is the top level, undefined is none
const current = ref(undefined)
const shown = ref(false)
// The key to suggest for a folder, when it depends on the one chosen
let keyFor = null
// Once the user typed a key, choosing another folder leaves it alone
const keyEdited = ref(false)
let modalBootstrap = null
let onAccept = null
// One click is one answer: the button stays clickable while the dialog fades out
let accepting = false

// An empty string is the top level, which is a valid choice; null is nothing chosen yet
const isChosen = computed(() => selected.value !== null)

const isCurrent = id => current.value !== undefined && id === (current.value ?? '')

const filterable = computed(() => options.value.length >= FILTER_FROM)
const filtering = computed(() => filterable.value && filter.value.trim() !== '')

/**
 * The rows come in tree order with their depth, so the parent of a row is the closest row above
 * it one level up. Each row gets the indexes of its parents, top first.
 */
const parentsOf = computed(() => {
    const stack = []
    return options.value.map((folder, index) => {
        stack.length = folder.depth
        const parents = stack.slice()
        stack[folder.depth] = index
        return parents
    })
})

// A matching folder keeps its parents, so the match is shown where it lies
const visibleOptions = computed(() => {
    if (!filtering.value) return options.value
    const keyword = filter.value.trim().toLowerCase()
    const shownRows = new Set()
    options.value.forEach((folder, index) => {
        if (!folder.name.toLowerCase().includes(keyword)) return
        shownRows.add(index)
        parentsOf.value[index].forEach(parent => shownRows.add(parent))
    })
    return options.value.filter((folder, index) => shownRows.has(index))
})

const pathOf = folderId => {
    const index = options.value.findIndex(folder => folder.id === folderId)
    if (index < 0) return ''
    return [...parentsOf.value[index], index].map(row => options.value[row].name).join(' / ')
}

// The choice stays in sight below the list, and tells apart folders that share a name
const selectedPath = computed(() => {
    if (selected.value === null) return ''
    if (selected.value === '') return t('folders.projects')
    return pathOf(selected.value)
})

// The rows carry no parent, but a row at the top level is a project
const iconOf = folder => folderIcon({ userFolder: folder.userFolder, parentId: folder.depth > 0 ? true : null })

const indent = depth => `calc(0.75rem + ${depth * 1.5}rem)`

const rowClass = id => ({
    'is-selected': selected.value === id,
    'is-current text-body-secondary': isCurrent(id)
})

watch(selected, folderId => {
    if (keyFor && !keyEdited.value && folderId !== null) key.value = keyFor(folderId === '' ? null : folderId)
})

onMounted(() => {
    if (!modalRoot.value) return
    modalBootstrap = new bootstrap.Modal(modalRoot.value)
    modalRoot.value.addEventListener('hidden.bs.modal', () => { shown.value = false })
    // A hidden list cannot scroll, so the choice is brought into view once the dialog is shown
    modalRoot.value.addEventListener('shown.bs.modal', revealSelected)
})

const handleAccept = async () => {
    if (!isChosen.value || accepting) return
    if (requireKey.value && !key.value.trim()) {
        error.value = t(keyRequired.value)
        return
    }
    accepting = true
    if (runAfterClose.value) {
        // The work says elsewhere how it went, so the dialog leaves first rather than sitting
        // over it — and a dialog of its own can only open once this one is gone
        const chosen = selected.value === '' ? null : selected.value
        modalRoot.value?.addEventListener('hidden.bs.modal',
            () => Promise.resolve(onAccept?.(chosen, key.value.trim())).catch(e => console.error(e)),
            { once: true })
        modalBootstrap?.hide()
        return
    }
    try {
        await onAccept?.(selected.value === '' ? null : selected.value, key.value.trim())
    } catch (e) {
        const refusal = folderErrorMessage(e)
        error.value = refusal ? t(refusal.key, refusal.params) : t('folders.saveFailed')
        accepting = false
        return
    }
    modalBootstrap?.hide()
}

// A choice made before, as on a repeated import, may sit far down the list
function revealSelected() {
    listRoot.value?.querySelector('.is-selected')?.scrollIntoView?.({ block: 'nearest' })
}

/**
 * @param {object} options where the folders come from and what the dialog asks for
 * @param {Array} options.folders rows of { id, name, depth, userFolder } in tree order
 * @param {Function} options.accept receives (folderId, key); throwing keeps the dialog open,
 *   except under runAfterClose, where the dialog is already gone and reporting is the caller's
 * @param {boolean} [options.runAfterClose] close first and accept afterwards, for work that
 *   reports itself elsewhere
 * @param {string|null} [options.current] the item's current location, shown but disabled;
 *   null is the top level
 * @param {Function} [options.keyFor] (folderId) => the key to suggest once that folder is chosen,
 *   until the user types one
 */
const show = ({ folders, title: dialogTitle, allowTopLevel: topLevel = false,
        requireKey: needsKey = false, defaultKey = '', accept, selected: preselected = null,
        runAfterClose: afterClose = false, current: currentLocation = undefined,
        keyLabel: label = 'folders.copyKey',
        keyRequired: required = 'folders.copyKeyRequired', keyFor: suggestKey = null }) => {
    options.value = folders ?? []
    title.value = dialogTitle
    filter.value = ''
    allowTopLevel.value = topLevel
    requireKey.value = needsKey
    runAfterClose.value = afterClose
    keyLabel.value = label
    keyRequired.value = required
    keyFor = suggestKey
    keyEdited.value = false
    key.value = defaultKey
    current.value = currentLocation
    // Only a folder still in the tree can be offered as the choice already made
    selected.value = options.value.some(folder => folder.id === preselected) && !isCurrent(preselected)
        ? preselected : null
    error.value = ''
    accepting = false
    onAccept = accept
    shown.value = true
    modalBootstrap?.show()
}

defineExpose({ show, isShown: () => shown.value })
</script>

<style scoped>
.folder-picker {
    max-height: 40vh;
}

.folder-picker-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.4rem 0.75rem;
    cursor: pointer;
}

.folder-picker-row:hover {
    background-color: var(--bs-tertiary-bg);
}

.folder-picker-row.is-selected {
    background-color: var(--bs-primary-bg-subtle);
}

.folder-picker-row.is-current {
    cursor: default;
    background-color: transparent;
}

/* Keeps the line under the list from jumping when the first folder is chosen */
.folder-picker-choice {
    min-height: 1.5em;
}
</style>
