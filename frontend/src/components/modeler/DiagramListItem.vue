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
    <div role="button" tabindex="0"
        @click="handleClickLoadSelectedFromList" @keyup.enter="handleClickLoadSelectedFromList"
        class="list-group-item border-0 d-flex align-items-center justify-content-between"
        :class="{ 'bg-light': item.isHovered }">
        <span class="w-10 justify-content-center mr-2 mdi mdi-18px" :class="itemIcon"></span>
        <div class="w-80 flex-grow-1 mx-2 min-w-0 d-flex flex-column">
            <span>
                {{ displayName }}.{{ fileExtension }}<template v-if="displayKey"> ( {{ displayKey }} )</template>
            </span>
            <span
                v-if="formatUnifiedListLastSaved(props.item.updated, props.item.updatedBy)"
                class="small text-muted text-truncate"
                :title="formatUnifiedListLastSaved(props.item.updated, props.item.updatedBy)"
                :aria-label="`${$t('titles.lastSaved')}: ${formatUnifiedListLastSaved(props.item.updated, props.item.updatedBy)}`"
            >{{ formatUnifiedListLastSaved(props.item.updated, props.item.updatedBy) }}</span>
        </div>
        <span v-if="!isDeleting" class="w-10 ml-2 d-flex justify-content-end">
            <button :title="$t('buttons.edit')" type="button"
                class="btn mdi mdi-18px mdi-pencil-outline border-0 btn-outline-secondary btn-sm"
                :class="{ 'invisible': !props.isHovered }"
                @click.stop="handleClickLoadSelectedFromList">
            </button>
            <button :title="$t('buttons.delete')" type="button"
                class="btn mdi mdi-18px mdi-delete-outline border-0 btn-outline-secondary btn-sm"
                :class="{ 'invisible': !props.isHovered }"
                @click.stop="handleDeleteItem">
            </button>
        </span>
        <div v-if="isDeleting" class="w-10 spinner-border text-dark flex align-items-center" role="status">
            <span class="visually-hidden">{{ $t("loading") }}...</span>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { formatUnifiedListLastSaved } from '../../utils'
import { DIAGRAM_ICON, DIAGRAM_TYPE } from '../../constants/diagramTypes.js'

const props = defineProps({
    item: { type: Object, required: true },
    isHovered: Boolean,
    index: Number,
})
const emit = defineEmits([
    'openDiagram',
    'toggleModal',
])

const store = useStore()
const isDeleting = ref(false)

const isForm = computed(() => props.item.type === DIAGRAM_TYPE.FORM)

const itemIcon = computed(() => DIAGRAM_ICON[props.item.type] ?? 'mdi-file-outline')

const displayName = computed(() =>
    isForm.value ? props.item.formId : (props.item.name !== 'undefined' ? props.item.name : '')
)

const displayKey = computed(() =>
    isForm.value ? null : props.item.processkey
)

const fileExtension = computed(() =>
    props.item.type.startsWith('bpmn') ? 'bpmn' : props.item.type
)

const handleClickLoadSelectedFromList = async () => {
    if (isDeleting.value) return
    if (isForm.value) {
        await store.dispatch('modeler/forms/fetchFormById', props.item.id)
        const selectedForm = store.state.modeler.forms.formSelected
        emit('openDiagram', selectedForm, props.item.id, props.item.formId, props.item.formId, props.index, props.item.type)
    } else {
        await store.dispatch('modeler/processes/fetchProcessById', props.item.id)
        const selectedProcess = store.state.modeler.processes.processSelected
        emit('openDiagram', selectedProcess, props.item.id, props.item.name, props.item.processkey, props.index, props.item.type)
    }
}

const handleDeleteItem = () =>
    emit('toggleModal', true, props.item.id, displayName.value, props.index, props.item.type)

const _processingDeletingItem = value => { isDeleting.value = value }

defineExpose({ _processingDeletingItem })
</script>
