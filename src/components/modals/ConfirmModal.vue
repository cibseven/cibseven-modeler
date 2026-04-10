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
    <div class="modal fade" ref="modalAcceptCancelMessage" tabindex="-1" :aria-hidden="!showModal">
        <div class="modal-dialog p-2 bg-transparent">
            <div class="modal-content">
                <div class="modal-header">
                    <h1 class="modal-title fs-5">{{ props.title }}</h1>
                    <button type="button" class="btn-close" @click.prevent="handleCloseMessage" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    {{ props.body }} {{ props.name }}
                </div>
                <div class="modal-footer">
                    <button type="button" @click.prevent="handleAcceptMessage" class="btn btn-primary">{{
                        $t("buttons.accept") }}</button>
                    <button type="button" ref="closeButton" class="btn btn-secondary" data-bs-dismiss="modal"
                        @click="handleCloseMessage">{{ $t("buttons.cancel")
                        }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.js'
import { ref, watch, onMounted } from 'vue'

const modalAcceptCancelMessage = ref(null)
const emit = defineEmits([
    'hideModal',
    'resetVariablesForModalAcceptCancelMessage'
])
const props = defineProps({
    type: {
        type: String,
        required: true
    },
    modalData: {
        type: Object,
        default: null
    },
    id: {
        type: String,
        default: null
    },
    name: { type: String, default: null },
    functionAfterCanceling: { type: Function, default: null },
    functionAfterAccepting: { type: Function, required: true },
    showModal: { type: Boolean, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true }
})

const idSaved = ref(null)
const closeButton = ref(null)

let modalBootstrap = null

onMounted(() => {
    modalBootstrap = new bootstrap.Modal(modalAcceptCancelMessage.value)
})

watch(() => props.showModal, newValue => {
    if (newValue) {
        _showModalComp()
        emit('hideModal')
    }
})

const handleCloseMessage = () => {
    if (props.functionAfterCanceling && props.type === 'replaceXml') {
        const { id, name, processkey, xmlFromModeler, diagramType } = props.modalData
        props.functionAfterCanceling(xmlFromModeler, id, name, processkey, diagramType, true, false, false) // open xml from  modeler
    }else
    if (props.functionAfterCanceling && props.type === 'changeVersion') {
        props.functionAfterCanceling() // returns to the previous selected index
    }

    idSaved.value = ''
    emit('resetVariablesForModalAcceptCancelMessage')
    modalBootstrap.hide()
}

const handleAcceptMessage = () => {
    if (props.type === 'replaceXml') {
        const { id, name, processkey, xmlExternalUrl, diagramType } = props.modalData
        props.functionAfterAccepting(xmlExternalUrl, id, name, processkey, diagramType, true, true, true)// open xml from outside of modeler, the tab wont be saved until the user saves the process in the modeler
    } else if (props.type === 'closeTab') {
        props.functionAfterAccepting(idSaved.value)
        idSaved.value = ''
    } else if (props.type === 'changeVersion') {
        const { encodedXml, version } = props.modalData
        props.functionAfterAccepting(encodedXml, version) //changes the xml to the version selected

    }

    modalBootstrap.hide()
    emit('resetVariablesForModalAcceptCancelMessage')
}

const _showModalComp = () => {
    idSaved.value = props.id
    modalBootstrap.show()
}

</script>
