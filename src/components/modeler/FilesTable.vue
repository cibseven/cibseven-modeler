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
    <FlowTable class="files-table mb-0" striped thead-class="sticky-header" prefix="folders."
        :items="rows" :fields="fields" external-sort :sort-by="sort.by" :sort-desc="sort.desc"
        @external-sort="onSort" @click="open">
        <!-- Reachable by keyboard; the click bubbles to the header cell, which sorts -->
        <template v-for="field in sortableFields" :key="field.key" #[`header(${field.key})`]>
            <button type="button" class="btn btn-link p-0 border-0 fw-semibold text-reset text-decoration-none text-start">
                {{ $t(`folders.${field.label}`) }}
            </button>
        </template>
        <template #header(actions)>
            <span class="w-100 text-center">{{ $t('folders.columnActions') }}</span>
        </template>

        <template #cell(name)="{ item }">
            <div class="d-flex flex-column w-100" style="min-width: 0">
                <div class="d-flex align-items-center gap-2" style="min-width: 0">
                    <button type="button" class="btn btn-link p-0 border-0 text-start text-reset text-decoration-none d-inline-flex align-items-center gap-2"
                        style="min-width: 0" :title="item.label" @click.stop="open(item)">
                        <span class="mdi mdi-18px text-secondary" :class="item.icon" aria-hidden="true"></span>
                        <span class="text-truncate">{{ item.label }}</span>
                    </button>
                    <span v-if="item.isDefault" class="badge rounded-pill text-bg-light border" :title="$t('folders.defaultFolder')">
                        {{ $t('folders.defaultBadge') }}
                    </span>
                </div>
                <span v-if="item.details" class="small text-muted text-truncate" :title="item.details">{{ item.details }}</span>
            </div>
        </template>

        <template #cell(updated)="{ item }">
            <span class="text-truncate" :title="formatDate(item.updated)">{{ formatDate(item.updated) }}</span>
        </template>

        <template #cell(updatedBy)="{ item }">
            <span v-if="item.updatedBy" class="d-inline-flex align-items-center gap-1 text-truncate" :title="item.updatedBy">
                <span class="mdi mdi-account" aria-hidden="true"></span>{{ item.updatedBy }}
            </span>
        </template>

        <template #cell(actions)="{ item }">
            <div v-if="item.isDeleting" class="spinner-border spinner-border-sm text-secondary mx-auto" role="status">
                <span class="visually-hidden">{{ $t('loading') }}...</span>
            </div>
            <BDropdown v-else :ref="menu => menus[item.key] = menu" class="mx-auto" variant="link" no-caret right
                toggle-class="p-1 border-0 text-reset" :label="$t('folders.actionsFor', { name: item.label })"
                :title="$t('folders.actionsFor', { name: item.label })">
                <template #button-content>
                    <span class="mdi mdi-18px mdi-dots-vertical" aria-hidden="true"></span>
                </template>
                <BDropdownItemButton v-for="action in item.actions" :key="action.id" @click="run(item, action)">
                    <span :class="{ 'text-danger': action.danger }">
                        <span class="mdi me-2" :class="action.icon" aria-hidden="true"></span>{{ $t(action.label) }}
                    </span>
                </BDropdownItemButton>
            </BDropdown>
        </template>
    </FlowTable>
</template>

<script setup>
import { computed } from 'vue'
import { BDropdown, BDropdownItemButton, FlowTable } from '@cib/common-frontend'
import { folderIcon, formatDate, modelName, toMoment } from '../../utils'
import { DIAGRAM_FILE_EXT, DIAGRAM_ICON, DIAGRAM_TYPE } from '../../constants/diagramTypes.js'

const props = defineProps({
    folders: { type: Array, default: () => [] },
    models: { type: Array, default: () => [] },
    isDefault: { type: Function, default: () => false },
    isLocked: { type: Function, default: () => false },
    // Shown under a model's name, for search results from every folder
    locationOf: { type: Function, default: null },
    deletingId: { type: String, default: null },
    // Newest first by default, the order the backend pages models in
    sort: { type: Object, default: () => ({ by: 'updated', desc: true }) },
})

const emit = defineEmits([
    'openFolder',
    'renameFolder',
    'moveFolder',
    'removeFolder',
    'openModel',
    'downloadModel',
    'moveModel',
    'copyModel',
    'removeModel',
    'update:sort',
])

const fields = [
    { key: 'name', label: 'columnName', class: 'col-5' },
    { key: 'updated', label: 'columnModified', class: 'col-3' },
    { key: 'updatedBy', label: 'columnModifiedBy', class: 'col-3' },
    { key: 'actions', label: 'columnActions', class: 'col-1', thClass: 'justify-content-center', sortable: false },
]
const sortableFields = fields.filter(field => field.sortable !== false)

// A newly chosen column starts with names from A and dates from the newest
const onSort = ({ sortBy, sortDesc }) => emit('update:sort', {
    by: sortBy,
    desc: sortBy === props.sort.by ? sortDesc : sortBy === 'updated',
})

const menus = {}

const action = (id, icon, label, event) => ({ id, icon, label, event, danger: id === 'delete' })
const OPEN_FOLDER = action('open', 'mdi-folder-open-outline', 'folders.open', 'openFolder')
const RENAME_FOLDER = action('rename', 'mdi-pencil-outline', 'folders.rename', 'renameFolder')
const MOVE_FOLDER = action('move', 'mdi-folder-move-outline', 'folders.moveTo', 'moveFolder')
const REMOVE_FOLDER = action('delete', 'mdi-delete-outline', 'folders.delete', 'removeFolder')
const MODEL_ACTIONS = [
    action('open', 'mdi-open-in-new', 'folders.open', 'openModel'),
    action('download', 'mdi-download', 'buttons.download', 'downloadModel'),
    action('move', 'mdi-folder-move-outline', 'folders.moveTo', 'moveModel'),
    action('copy', 'mdi-content-copy', 'folders.copyTo', 'copyModel'),
    action('delete', 'mdi-delete-outline', 'folders.delete', 'removeModel'),
]

const folderActions = folder => {
    if (props.isLocked(folder)) return [OPEN_FOLDER]
    // Projects stay at the top level
    if (!folder.parentId) return [OPEN_FOLDER, RENAME_FOLDER, REMOVE_FOLDER]
    return [OPEN_FOLDER, RENAME_FOLDER, MOVE_FOLDER, REMOVE_FOLDER]
}

const folderRow = folder => ({
    key: `folder:${folder.id}`,
    isFolder: true,
    source: folder,
    label: folder.name,
    icon: folderIcon(folder),
    isDefault: props.isDefault(folder.id),
    // A folder only gets an update stamp once renamed or moved
    updated: folder.updated ?? folder.created,
    updatedBy: folder.updatedBy ?? folder.createdBy,
    actions: folderActions(folder),
})

const modelRow = model => {
    const key = model.type === DIAGRAM_TYPE.FORM ? null : model.processkey
    return {
        key: `model:${model.id}`,
        isFolder: false,
        source: model,
        label: `${modelName(model)}${DIAGRAM_FILE_EXT[model.type] ?? ''}`,
        icon: DIAGRAM_ICON[model.type] ?? 'mdi-file-outline',
        details: [key, props.locationOf?.(model.folderId)].filter(Boolean).join(' · '),
        isDeleting: model.id === props.deletingId,
        updated: model.updated,
        updatedBy: model.updatedBy,
        actions: MODEL_ACTIONS,
    }
}

const timeOf = value => toMoment(value)?.valueOf() || 0

const textOrder = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' })

const ORDERS = {
    name: (a, b) => textOrder(a.label, b.label),
    updated: (a, b) => timeOf(a.updated) - timeOf(b.updated),
    updatedBy: (a, b) => textOrder(a.updatedBy, b.updatedBy),
}

const compare = (a, b) => {
    const order = ORDERS[props.sort.by]?.(a, b) ?? 0
    return (props.sort.desc ? -order : order) || textOrder(a.label, b.label)
}

// Folders first, each group in the chosen order
const rows = computed(() => [
    ...props.folders.map(folderRow).sort(compare),
    ...props.models.map(modelRow).sort(compare),
])

const open = item => {
    if (item.isDeleting) return
    if (item.isFolder) emit('openFolder', item.source.id)
    else emit('openModel', item.source)
}

const run = (item, { id, event }) => {
    menus[item.key]?.hide()
    if (id === 'open') open(item)
    else emit(event, item.source)
}
</script>

<style scoped>
.files-table :deep(td) {
    min-width: 0;
}
</style>
