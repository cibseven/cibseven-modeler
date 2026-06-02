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
    <div class="modal fade" ref="modalEl" tabindex="-1" :aria-hidden="!showModal">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h1 class="modal-title fs-5">{{ $t('modalImportedFile.title', { item: itemLabel, name: modalData?.name ?? '' }) }}</h1>
                    <button type="button" class="btn-close" @click.prevent="dismiss" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-3">{{ $t('modalImportedFile.body', { item: itemLabel }) }}</p>

                    <div class="form-check mb-2">
                        <input class="form-check-input" type="radio" id="ic-replace" value="replace" v-model="action">
                        <label class="form-check-label" for="ic-replace">
                            <span class="fw-semibold">{{ $t('buttons.replace') }}</span>
                            <span class="d-block small text-muted">{{ $t('modalImportedFile.replaceHint', { item: itemLabel }) }}</span>
                        </label>
                    </div>

                    <div class="form-check mb-1">
                        <input class="form-check-input" type="radio" id="ic-rename" value="rename" v-model="action">
                        <label class="form-check-label" for="ic-rename">
                            <span class="fw-semibold">{{ $t('buttons.rename') }}</span>
                            <span class="d-block small text-muted">{{ $t('modalImportedFile.renameHint', { item: itemLabel }) }}</span>
                        </label>
                    </div>
                    <div v-if="action === 'rename'" class="mb-2 ms-4">
                        <label class="form-label small fw-semibold mb-1">{{ newKeyLabel }}</label>
                        <input type="text" class="form-control form-control-sm" v-model="renameKey"
                            @keyup.enter="confirm" @input="renameError = ''" />
                        <div v-if="renameError" class="text-danger small mt-1">{{ renameError }}</div>
                    </div>

                    <div class="form-check mb-2">
                        <input class="form-check-input" type="radio" id="ic-skip" value="skip" v-model="action">
                        <label class="form-check-label" for="ic-skip">
                            <span class="fw-semibold">{{ $t('buttons.skip') }}</span>
                            <span class="d-block small text-muted">{{ $t('modalImportedFile.skipHint', { item: itemLabel }) }}</span>
                        </label>
                    </div>

                    <div v-if="isBatch && action !== 'rename'" class="form-check border-top pt-3 mt-3">
                        <input class="form-check-input" type="checkbox" id="ic-all" v-model="applyAll">
                        <label class="form-check-label" for="ic-all">{{ $t('modalImportedFile.applyToAll') }}</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button v-if="isBatch" type="button" class="btn btn-secondary me-auto" @click.prevent="cancelRemaining">
                        {{ $t('buttons.cancelRemaining') }}
                    </button>
                    <button type="button" class="btn btn-primary"
                        :disabled="action === 'rename' && !renameKey.trim()" @click.prevent="confirm">
                        {{ $t('buttons.continue') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import * as bootstrap from 'bootstrap'
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const modalEl = ref(null)
const emit = defineEmits(['hideModal', 'resetVariables', 'modalClosed', 'modalHidden'])
const props = defineProps({
    showModal: { type: Boolean, required: true },
    modalData: { type: Object, default: null },
    isBatch: { type: Boolean, default: false },
    // (xmlExternalUrl, id, name, processkey, diagramType, isSaved, canSave, canReplaceXml) => void
    functionAfterAccepting: { type: Function, required: true },
    functionAfterCanceling: { type: Function, default: null },
    functionApplyAll: { type: Function, default: () => {} },
    functionAfterRenaming: { type: Function, default: null },
    validateRenameKey: { type: Function, default: null },
})

const action = ref('replace')
const applyAll = ref(false)
const renameKey = ref('')
const renameError = ref('')

let modalBootstrap = null
let _closedByButton = false

const itemLabel = computed(() => t(`items.${props.modalData?.diagramType ?? 'process'}`))
const newKeyLabel = computed(() =>
    props.modalData?.diagramType === 'form'
        ? t('modalImportedFile.newKeyLabelForm')
        : t('modalImportedFile.newKeyLabel'))

onMounted(() => {
    modalBootstrap = new bootstrap.Modal(modalEl.value)
    modalEl.value.addEventListener('hidden.bs.modal', () => {
        if (!_closedByButton) emit('modalClosed')
        _closedByButton = false
        emit('modalHidden')
    })
})

watch(() => props.showModal, shown => {
    if (shown) {
        action.value = 'replace'
        applyAll.value = false
        renameKey.value = props.modalData?.processkey ?? ''
        renameError.value = ''
        modalBootstrap.show()
        emit('hideModal')
    }
})

const _hide = () => {
    emit('resetVariables')
    modalBootstrap.hide()
}

const confirm = () => {
    if (action.value === 'rename') {
        const err = props.validateRenameKey?.(renameKey.value.trim())
        if (err) { renameError.value = err; return }
        _closedByButton = true
        props.functionAfterRenaming?.(renameKey.value.trim())
        _hide()
        return
    }
    _closedByButton = true
    if (props.isBatch && applyAll.value) {
        props.functionApplyAll(action.value)
    } else if (action.value === 'replace') {
        const { id, name, processkey, xmlExternalUrl, diagramType } = props.modalData
        props.functionAfterAccepting(xmlExternalUrl, id, name, processkey, diagramType, true, true, true)
    } else {
        // skip (single): keep the existing one
        props.functionAfterCanceling?.()
    }
    _hide()
}

const cancelRemaining = () => {
    _closedByButton = true
    props.functionApplyAll('stop')
    _hide()
}

const dismiss = () => {
    _closedByButton = true
    props.functionAfterCanceling?.()
    _hide()
}
</script>
