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
    <div class="modal fade" ref="modalNewDiagram" tabindex="-1" aria-hidden="true" :aria-labelledby="titleId">
        <div class="modal-dialog" id="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fs-5" :id="titleId">{{ modalNewDiagramText.title }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                    </button>
                </div>
                <div class="modal-body">
                    <div class="mb-3" v-if="type !=='form'">
                        <label class="form-label" for="processNameInput">{{ modalNewDiagramText.processName }}</label>
                        <input id="processNameInput" ref="processNameInputRef" type="text" class="form-control form-control-sm" v-model="nameOfProcess" @keyup.enter="handleClick">
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="processIdInput">{{ modalNewDiagramText.processId }}</label>
                        <input id="processIdInput" ref="processIdInputRef" type="text" class="form-control form-control-sm" v-model="idOfProcess" @input="isIdDuplicated = false" @keyup.enter="handleClick">
                        <div v-if="!isValidId && idOfProcess !== ''" tabindex="-1" role="alert" aria-live="assertive"
                            aria-atomic="true" class="d-block invalid-feedback">{{
                        $t("modalNewDiagram.qnameError") }}
                        </div>
                        <div v-if="!isIdFilled" tabindex="-1" role="alert" aria-live="assertive" aria-atomic="true"
                            class="d-block invalid-feedback">{{
                        $t("modalNewDiagram.fillId") }}
                        </div>
                        <div v-if="isIdDuplicated" tabindex="-1" role="alert" aria-live="assertive" aria-atomic="true"
                            class="d-block invalid-feedback">{{
                        $t("modalNewDiagram.duplicatedId") }}
                        </div>
                    </div>
                    <div class="form-check mt-3">
                        <input class="form-check-input" type="checkbox" id="dontShowAgainModalCheck"
                            v-model="dontShowAgain" @change="savePreference">
                        <label class="form-check-label small text-muted" for="dontShowAgainModalCheck">
                            {{ $t('modal.autoCreate') }}
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary" @click="handleClick">{{
                        $t('buttons.accept') }}</button>
                    <button type="button" class="btn btn-secondary" ref="closeButton" @click="handleCancel"
                        data-bs-dismiss="modal">{{
                        $t('modalNewDiagram.cancel') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import * as bootstrap from 'bootstrap'
import { onMounted, ref, computed, useId } from 'vue'

const titleId = useId()
import { useI18n } from 'vue-i18n'
import { SKIP_CREATION_MODAL_KEY } from '../../constants/diagramTypes.js'
const { t } = useI18n()

const props = defineProps({
    // (id, type) => boolean — true when a diagram/form with that id already exists
    checkDuplicateId: { type: Function, default: null },
})

const modalNewDiagram = ref(null)
const processNameInputRef = ref(null)
const processIdInputRef = ref(null)
let functionOnCallback = null
const nameOfProcess = ref('')
const idOfProcess = ref('')
const isIdFilled = ref(true)
const isValidId = computed(() => {
    // Check if the idOfProcess.value starts with a non-digit character and contains no spaces, asterisks, or punctuation except for period and hyphen
    return /^\D[^\s*?!@#$%^&()_+={}[\]|\\:;"'<>,/¿¡]*$/.test(idOfProcess.value)
})
// Set on Create-click by the parent-supplied check (loaded list + backend); cleared on input.
const isIdDuplicated = ref(false)

let modalBootstrap = null

const type = ref('bpmn-c7')
const dontShowAgain = ref(localStorage.getItem(SKIP_CREATION_MODAL_KEY) === 'true')

const savePreference = () => {
    localStorage.setItem(SKIP_CREATION_MODAL_KEY, String(dontShowAgain.value))
}

onMounted(() => {
    if (!modalNewDiagram.value) return
    modalBootstrap = new bootstrap.Modal(modalNewDiagram.value)
    modalNewDiagram.value.addEventListener('shown.bs.modal', () => {
        const target = type.value !== 'form' ? processNameInputRef.value : processIdInputRef.value
        target?.focus()
    })
})

const modalNewDiagramText = computed(() => {
      return { title: t('modalNewDiagram.title', {
        item: t(`items.${type.value}`)
      } ), processName: t('modalNewDiagram.processName', {
        item: t(`Items.${type.value}`)
      } ), processId: t('modalNewDiagram.processId', {
        item: t(`Items.${type.value}`)
      } )  }
})
const handleClick = async () => {
    isIdFilled.value = idOfProcess.value !== ''
    if (!isIdFilled.value || !isValidId.value) return

    isIdDuplicated.value = !!(await props.checkDuplicateId?.(idOfProcess.value.trim(), type.value))
    if (isIdDuplicated.value) return

    functionOnCallback(nameOfProcess.value, idOfProcess.value)
    _resetField()
    modalBootstrap.hide()
}

const handleCancel = () => {
    functionOnCallback(null, null)
    _resetField()
    modalBootstrap.hide()
}

const _toggleModalNewDiagram = async (comp, callback, elementType) => {
    type.value = elementType
    if (comp) {
        functionOnCallback = callback
        _resetField()
        modalBootstrap.show()
    }
    else {
        modalBootstrap.hide()
        _resetField()
    }
}

const _resetField = () => {
    nameOfProcess.value = ''
    idOfProcess.value = ''
    isIdFilled.value = true
    isIdDuplicated.value = false
}

defineExpose({ _toggleModalNewDiagram })

</script>
