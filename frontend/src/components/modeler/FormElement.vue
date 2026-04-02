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
    <div role="button" tabindex="0" @click="handleClickLoadSelectedFromList" @keyup.enter="handleClickLoadSelectedFromList"
    class="list-group-item border-0 d-flex align-items-center justify-content-between" :class="{ 'bg-light': form.isHovered }">
    <span class="w-10 mdi mdi-18px mdi-form-select justify-content-center mr-2"> </span>
        <div class="w-80 flex-grow-1 mx-2 min-w-0 d-flex flex-column">
            <span>{{props.form.formId }}.{{ props.form.type.startsWith('bpmn') ? 'bpmn' : props.form.type }}
            </span>
            <span
                v-if="formatUnifiedListLastSaved(props.form.updated, props.form.updatedBy)"
                class="small text-muted text-truncate"
                :title="formatUnifiedListLastSaved(props.form.updated, props.form.updatedBy)"
                :aria-label="`${$t('titles.lastSaved')}: ${formatUnifiedListLastSaved(props.form.updated, props.form.updatedBy)}`"
            >{{ formatUnifiedListLastSaved(props.form.updated, props.form.updatedBy) }}</span>
        </div>
        <span v-if="!isDeleting" class="w-10 ml-2 d-flex justify-content-end">
            <!-- change invisible class to show -->
            <button :title="$t('buttons.edit')" type="button"
                class="btn mdi mdi-18px mdi-pencil-outline border-0 btn-outline-secondary btn-sm"
                :class="{ 'invisible': !props.isHovered }" @click.stop="handleClickLoadSelectedFromList">
            </button>
            <!-- click.stop to stop propagation from onclick in parent -->
            <button :title="$t('buttons.delete')" type="button"
                class="btn mdi mdi-18px mdi-delete-outline border-0 btn-outline-secondary btn-sm"
                :class="{ 'invisible': !props.isHovered }" @click.stop="handleDeleteForm">
            </button>
        </span>
        <div v-if="isDeleting" class="w-10 spinner-border text-dark flex align-items-center" role="status">
            <span class="visually-hidden">{{ $t("loading") }}...</span>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStore } from 'vuex'
import { formatUnifiedListLastSaved } from '../../utils'

const props = defineProps({
    form: Object,
    isHovered: Boolean,
    index: Number
})
const emit = defineEmits([
    'openDiagram',
    'toggleModal'
])
const store = useStore()
const isDeleting = ref(false)

const handleClickLoadSelectedFromList = async () => {
    if (!isDeleting.value) { // on click only when is not deleting the form
        await store.dispatch('modeler/forms/fetchFormById', props.form.id) // search xml by id selected

        const selectedForm = store.state.modeler.forms.formSelected
        emit('openDiagram', selectedForm, props.form.id, props.form.formId, props.form.formId, props.index, 'form')
    }
}

const handleDeleteForm = async () => emit('toggleModal', true, props.form.id, props.form.formId, props.index, 'form')

const _processingDeletingItem = value => isDeleting.value = value

defineExpose({ _processingDeletingItem })
</script>
