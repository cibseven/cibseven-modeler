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
    <div class="modal fade" ref="modalListTemplate" tabindex="-1" aria-hidden="true" >
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header align-items-center">
                    <h5 class="modal-title fs-6" v-if="props.typeOfSelector">
                        {{ $t(`modalListSelector${props.typeOfSelector}.title`) }}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                    </button>
                </div>
                <div class="modal-body">
                    <div>
                        <div class="input-group mb-3" role="group">
                            <span class="input-group-text rounded-start-1 py-0 px-2 border-end-0" :title="$t('buttons.searchTemplates')">
                            <i class="mdi mdi-magnify mdi-18px text-muted"></i>
                            </span>

                            <input v-if="props.typeOfSelector" class="form-control" type="text" autofocus="autofocus" autocomplete="off" :placeholder=" $t(`modalListSelector${props.typeOfSelector}.search`)"
                                v-model="inputValue" @input="handleSearchInFormList">
                        </div>
                        <div class="mb-3">
                            <div class="mb-1 overflow-auto" style="max-height: calc(100vh - 400px);">
                                <CibsevenTable
                                    striped thead-class="sticky-header"
                                    :items="filteredData"
                                    :fields="props.headers"
                                    :show-headers="props.showHeaders"
                                    :prefix="`modalListSelector${props.typeOfSelector}.`"
                                    :sort-by="props.sortBy"
                                    :sort-desc="props.sortDesc"
                                    @row-selected="emit('itemSelected', $event)">
                                    <template v-for="field in props.headers"
                                        :key="field.key"
                                        #[`cell(${field.key})`]="slotProps">
                                        <slot :name="`cell(${field.key})`" v-bind="slotProps" />
                                    </template>
                                    <template #emptyState>
                                        <div class="text-center text-muted pt-3">
                                            {{ $t(emptyStateText) }}
                                        </div>
                                    </template>
                                </CibsevenTable>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.js'
import { debounce } from 'min-dash'
import CibsevenTable from '../CibsevenTable.vue'

const modalListTemplate = ref(null)
const emit = defineEmits([
    'toggleModalListSelector',
    'itemSelected',
])

const props = defineProps({
    showModal: Boolean,
    rowTemplate: Array,
    typeOfSelector: String,
    /**
     * Represents a list of objects, displayed as column headers in the modal.
     * 
     * Can be empty.
     * 
     * 
     * If more than one header shares the same sortKey (which must be one of the keys), the sorting will update the icons on those coinciding headers.
     * @type {Array}
     * 
     * @example
     * [
     *   { key: 'name', sortKey: 'version', label: 'Name', class: 'col' },
     *   { key: 'version', sortKey: 'version', label: 'Version', class: 'col' }
     * ]
     */
    headers: {
        type: Array,
        default: () => []
    },
    showHeaders: {
        type: Boolean,
        default: true
    },
    sortBy: {
        type: String
    },
    sortDesc: {
        type: Boolean,
        default: false
    }
})
const filteredData = ref([])
const inputValue = ref('')

let modalBootstrap = ref(null)

onMounted(() => {
    if (!modalListTemplate.value) {
        return
    }
    modalBootstrap.value = new bootstrap.Modal(modalListTemplate.value)

    // Clear inputValue when the modal is hidden
    modalListTemplate.value.addEventListener('hidden.bs.modal', _onModalHidden)
})

onUnmounted(() => {
    if (modalListTemplate.value) {
        modalListTemplate.value.removeEventListener('hidden.bs.modal', _onModalHidden)
    }
})

watch(() => props.rowTemplate,
    newValue => {
        filteredData.value = newValue
    }
)

watch(() => props.showModal, newValue => {
    if (newValue) {
        _showModalComp()
        emit('toggleModalListSelector', false)        
    }
})

const _onModalHidden = () => {
    inputValue.value = ''
    handleSearchInFormList() // Updates the list of items
}

const handleSearchInFormList = debounce(async () => {
    if (props.typeOfSelector === 'templates') {
        filteredData.value = props.rowTemplate.filter(form => form.name.toLowerCase().includes(inputValue.value.toLowerCase()) || form.id.toLowerCase().includes(inputValue.value.toLowerCase()))
        return
    }
    else if (props.typeOfSelector === 'changeVersion') { // searching by version number
        filteredData.value = props.rowTemplate.filter(form => form.name.toLowerCase().includes(inputValue.value.toLowerCase()) || form.version.toString().toLowerCase().includes(inputValue.value.toString().toLowerCase()))
        return
    }
    filteredData.value = props.rowTemplate.filter(form => form.name.toLowerCase().includes(inputValue.value.toLowerCase()))
}, 100)

const _hideModal = () => modalBootstrap.value.hide()

const _showModalComp = () => modalBootstrap.value.show()

defineExpose({ _hideModal })

const emptyStateText = computed(() => {
    switch (props.typeOfSelector) {
        case 'templates':
            return 'noTemplates'
        case 'changeVersion':
            return 'noVersions'
        default:
            return 'noItems'
    }
})
</script>
