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
                        <input id="processNameInput" ref="processNameInputRef" type="text" maxlength="255" class="form-control form-control-sm" v-model="nameOfProcess" :readonly="answering" @keyup.enter="handleClick">
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="processIdInput">{{ modalNewDiagramText.processId }}</label>
                        <input id="processIdInput" ref="processIdInputRef" type="text" maxlength="100" class="form-control form-control-sm" v-model="idOfProcess" :readonly="answering" @input="isIdDuplicated = false" @keyup.enter="handleClick">
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
                    <button type="button" class="btn btn-secondary" ref="closeButton" :disabled="answering"
                        @click="handleCancel" data-bs-dismiss="modal">{{
                        $t('modalNewDiagram.cancel') }}
                    </button>
                    <button type="submit" class="btn btn-primary" :disabled="answering" @click="handleClick">{{
                        $t('buttons.accept') }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, useId } from 'vue'

const titleId = useId()
import { useI18n } from 'vue-i18n'
import { SKIP_CREATION_MODAL_KEY } from '../../constants/diagramTypes.js'
import { isValidXmlId } from '../../utils.js'
import { useModal } from '../../composables/useModal.js'
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
const isValidId = computed(() => isValidXmlId(idOfProcess.value))
// Set on Create-click by the parent-supplied check (loaded list + backend); cleared on input.
const isIdDuplicated = ref(false)
// One answer per opening: every answer opens a diagram tab, so a double click, a second Enter or
// Accept followed by "Do it later" would open two (CIB7-2827)
const answering = ref(false)
// Counts the openings; an answer still being checked when the dialog closes or opens anew is dropped
let opening = 0

const type = ref('bpmn-c7')
const dontShowAgain = ref(localStorage.getItem(SKIP_CREATION_MODAL_KEY) === 'true')

const savePreference = () => {
    localStorage.setItem(SKIP_CREATION_MODAL_KEY, String(dontShowAgain.value))
}

const modal = useModal(modalNewDiagram, {
    onShown: () => {
        const target = type.value !== 'form' ? processNameInputRef.value : processIdInputRef.value
        target?.focus()
    },
    // Closed by the X or Esc while an Accept is being checked: the user no longer asks for the diagram
    onHide: () => { opening++ },
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
    if (answering.value) return
    isIdFilled.value = idOfProcess.value !== ''
    if (!isIdFilled.value || !isValidId.value) return

    // What is checked is what is created: the fields are read once, and stay read-only meanwhile
    const name = nameOfProcess.value
    const id = idOfProcess.value
    const callback = functionOnCallback
    const asked = opening
    answering.value = true
    let duplicated
    try {
        duplicated = !!(await props.checkDuplicateId?.(id.trim(), type.value))
    } catch (e) {
        // A check that failed leaves the answer open, not the buttons dead
        if (asked === opening) answering.value = false
        throw e
    }
    if (asked !== opening) return

    isIdDuplicated.value = duplicated
    if (duplicated) {
        // Another id may still be tried, so the keyboard goes back to it
        answering.value = false
        processIdInputRef.value?.focus()
        return
    }

    callback(name, id)
    _resetField()
    modal.hide()
}

const handleCancel = () => {
    if (answering.value) return
    answering.value = true
    functionOnCallback(null, null)
    _resetField()
    modal.hide()
}

const _toggleModalNewDiagram = async (comp, callback, elementType) => {
    type.value = elementType
    if (comp) {
        functionOnCallback = callback
        _resetField()
        opening++
        answering.value = false
        // Another tab may have changed the preference since this one loaded
        dontShowAgain.value = localStorage.getItem(SKIP_CREATION_MODAL_KEY) === 'true'
        modal.show()
    }
    else {
        modal.hide()
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
