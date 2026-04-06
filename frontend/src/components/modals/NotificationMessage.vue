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
    <teleport to="body">
        <div class="modal fade" ref="notificationModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <slot name="title" />
                        <button type="button" class="btn-close" @click.prevent="() => closeModal(false)"
                            aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <slot name="body" />
                    </div>
                    <div class="modal-footer" :class="showForceSaveButton ? 'justify-content-between' : 'justify-content-end'">
                        <div v-show="showForceSaveButton">
                            <slot name="optionalButton"/>
                        </div>
                        <button type="button" @click.prevent="() => closeModal(false)" class="btn btn-primary">{{
                            $t("buttons.accept") }}</button>                            
                    </div>                    
                </div>
            </div>
        </div>
    </teleport>
</template>

<script setup>
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.js'
import { onMounted, ref } from 'vue'

let modalBootstrap = null
let resolvePromise = null
const notificationModal = ref(null)
const showForceSaveButton = ref(false)

onMounted(()=>{    
    modalBootstrap = new bootstrap.Modal(notificationModal.value)
})

const show = ( showButton) =>{
    showForceSaveButton.value = showButton //to enable/disable force save button
    modalBootstrap.show()
    return new Promise((resolve) => {
        resolvePromise = resolve
    })
}

const closeModal = value => {
    modalBootstrap.hide()
    if (resolvePromise) {
        resolvePromise(value)
        resolvePromise = null
    }
}

defineExpose({
    show,
    closeModal
})

</script>
