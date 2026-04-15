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
    <div class="modal fade" ref="modalNewDiagram" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog" id="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fs-5">{{ modalNewDiagramText.title }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                    </button>
                </div>
                <div class="modal-body">
                    <div class="mb-3" v-if="type !=='form'">
                        <label class="form-label" for="processNameInput">{{ modalNewDiagramText.processName }}</label>
                        <input id="processNameInput" type="text" class="form-control form-control-sm" v-model="nameOfProcess">
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="processIdInput">{{ modalNewDiagramText.processId }}</label>
                        <input id="processIdInput" type="text" class="form-control form-control-sm" v-model="idOfProcess">
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
import { onMounted, ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const modalNewDiagram = ref(null)
let functionOnCallback = null
const nameOfProcess = ref('')
const idOfProcess = ref('')
const isIdFilled = ref(true)
const isIdDuplicated = ref(false)
const store = useStore()
const processes = ref(store.state.processes?.data)
const isValidId = computed(() => {
    // Check if the idOfProcess.value starts with a non-digit character and contains no spaces, asterisks, or punctuation except for period and hyphen
    return /^\D[^\s*?!@#$%^&()_+={}[\]|\\:;"'<>,/¿¡]*$/.test(idOfProcess.value)
})

let modalBootstrap = null

const type = ref('bpmn-c7')

onMounted(() => {
    if (!modalNewDiagram.value) return
    modalBootstrap = new bootstrap.Modal(modalNewDiagram.value)
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
const handleClick = () => {

    if (idOfProcess.value === '') isIdFilled.value = false
    else isIdFilled.value = true

    isIdDuplicated.value = _checkIfProcessExists(idOfProcess.value)
    if (!isIdFilled.value || !isValidId.value || isIdDuplicated.value) return

    isIdFilled.value = true
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

const _checkIfProcessExists = id => {
    if (!processes.value) return false
    const foundProcess = processes.value.find(el => el.processkey === id)
    if (foundProcess) return true
    return false
}

const _resetField = () => {
    processes.value = store.state.processes?.data
    nameOfProcess.value = ''
    idOfProcess.value = ''
    isIdFilled.value = true
}

defineExpose({ _toggleModalNewDiagram })

</script>
