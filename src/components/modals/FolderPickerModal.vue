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
                        <div class="list-group overflow-auto" style="max-height: 40vh">
                            <div v-if="allowTopLevel" class="list-group-item d-flex align-items-center gap-2">
                                <input :id="`${optionId}-home`" type="radio" class="form-check-input m-0"
                                    value="" v-model="selected">
                                <label :for="`${optionId}-home`" class="d-flex align-items-center gap-2 mb-0">
                                    <span class="mdi mdi-home-outline" aria-hidden="true"></span>
                                    <span>{{ $t('folders.home') }}</span>
                                </label>
                            </div>
                            <div v-for="folder in options" :key="folder.id"
                                class="list-group-item d-flex align-items-center gap-2">
                                <input :id="`${optionId}-${folder.id}`" type="radio" class="form-check-input m-0"
                                    :value="folder.id" v-model="selected">
                                <label :for="`${optionId}-${folder.id}`" class="d-flex align-items-center gap-2 mb-0">
                                    <span class="mdi mdi-folder-outline" aria-hidden="true"
                                        :style="{ marginLeft: `${folder.depth}rem` }"></span>
                                    <span>{{ folder.name }}</span>
                                </label>
                            </div>
                        </div>
                    </fieldset>
                    <div v-if="requireKey" class="mt-3">
                        <label class="form-label" :for="keyId">{{ $t(keyLabel) }}</label>
                        <input :id="keyId" type="text" class="form-control form-control-sm" v-model="key"
                            @input="error = ''" @keyup.enter="handleAccept">
                    </div>
                    <div v-if="error" tabindex="-1" role="alert" aria-live="assertive" aria-atomic="true"
                        class="d-block invalid-feedback">{{ error }}</div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary" :disabled="!isChosen" @click="handleAccept">
                        {{ $t('buttons.accept') }}
                    </button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{ $t('buttons.cancel') }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import * as bootstrap from 'bootstrap'
import { computed, onMounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const titleId = useId()
const keyId = useId()
const optionId = useId()

const modalRoot = ref(null)
const options = ref([])
const selected = ref(null)
const key = ref('')
const error = ref('')
const title = ref('')
const allowTopLevel = ref(false)
const requireKey = ref(false)
const keyLabel = ref('folders.copyKey')
const keyRequired = ref('folders.copyKeyRequired')
let modalBootstrap = null
let onAccept = null

// An empty string is the top level, which is a valid choice; null is nothing chosen yet
const isChosen = computed(() => selected.value !== null)

onMounted(() => {
    if (!modalRoot.value) return
    modalBootstrap = new bootstrap.Modal(modalRoot.value)
})

const handleAccept = async () => {
    if (!isChosen.value) return
    if (requireKey.value && !key.value.trim()) {
        error.value = t(keyRequired.value)
        return
    }
    try {
        await onAccept?.(selected.value === '' ? null : selected.value, key.value.trim())
    } catch (e) {
        error.value = e?.response?.data?.message || t('folders.saveFailed')
        return
    }
    modalBootstrap?.hide()
}

/**
 * @param {object} options where the folders come from and what the dialog asks for
 * @param {Array} options.folders rows of { id, name, depth }
 * @param {Function} options.accept receives (folderId, key); throwing keeps the dialog open
 */
const show = ({ folders, title: dialogTitle, allowTopLevel: topLevel = false,
        requireKey: needsKey = false, defaultKey = '', accept,
        keyLabel: label = 'folders.copyKey',
        keyRequired: required = 'folders.copyKeyRequired' }) => {
    options.value = folders ?? []
    title.value = dialogTitle
    allowTopLevel.value = topLevel
    requireKey.value = needsKey
    keyLabel.value = label
    keyRequired.value = required
    key.value = defaultKey
    selected.value = null
    error.value = ''
    onAccept = accept
    modalBootstrap?.show()
}

defineExpose({ show })
</script>
