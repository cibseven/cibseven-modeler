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
                    <h5 class="modal-title fs-5" :id="titleId">
                        {{ mode === 'rename' ? $t('folders.renameTitle') : $t('folders.createTitle') }}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" :aria-label="$t('buttons.close')"></button>
                </div>
                <div class="modal-body">
                    <label class="form-label" :for="nameId">{{ $t('folders.name') }}</label>
                    <input :id="nameId" ref="nameInput" type="text" class="form-control form-control-sm"
                        v-model="name" @input="error = ''" @keyup.enter="handleAccept">
                    <div v-if="error" tabindex="-1" role="alert" aria-live="assertive" aria-atomic="true"
                        class="d-block invalid-feedback">{{ error }}</div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary" @click="handleAccept">{{ $t('buttons.accept') }}</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{ $t('buttons.cancel') }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import * as bootstrap from 'bootstrap'
import { onMounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const titleId = useId()
const nameId = useId()

const modalRoot = ref(null)
const nameInput = ref(null)
const name = ref('')
const error = ref('')
const mode = ref('create')
let modalBootstrap = null
let onAccept = null

onMounted(() => {
    if (!modalRoot.value) return
    modalBootstrap = new bootstrap.Modal(modalRoot.value)
    modalRoot.value.addEventListener('shown.bs.modal', () => nameInput.value?.focus())
})

const handleAccept = async () => {
    const trimmed = name.value.trim()
    if (!trimmed) {
        error.value = t('folders.nameRequired')
        return
    }
    // The backend owns the duplicate rule, so its message is what the user sees
    try {
        await onAccept?.(trimmed)
    } catch (e) {
        error.value = e?.response?.data?.message || t('folders.saveFailed')
        return
    }
    modalBootstrap?.hide()
}

/**
 * @param {'create'|'rename'} nextMode
 * @param {string} currentName filled in for a rename
 * @param {Function} accept receives the new name; throwing keeps the dialog open with the message
 */
const show = (nextMode, currentName, accept) => {
    mode.value = nextMode
    name.value = currentName ?? ''
    error.value = ''
    onAccept = accept
    modalBootstrap?.show()
}

defineExpose({ show })
</script>
