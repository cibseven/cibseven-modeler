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
    <div ref="editor" class="editor overflow-hidden h-100 p-2 border rounded-1" :style="style"></div>
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue'
//composables
import useMonacoEditor from '../../composables/useMonacoEditor.js'

let monaco = inject('monaco')

const props = defineProps({
    height: Number,
    width: Number,
    consoleErrors: String,
    language: {
        type: String,
        default: 'javascript'
    }
})
const editor = ref(null)
let { createMonacoForConsole, addLineWithError, cleanConsole, copyLine, focusLost } = useMonacoEditor(monaco, props, null)

onMounted(() => {
    createMonacoForConsole(editor.value)
})

const style = computed(() => {
    return {
        width: `${props.width}px`,
        height: '100% !important'
    }
})

defineExpose({ 
    addLineWithError,
    copyLine,
    cleanConsole,
    focusLost
})
</script>
<style>
.custom-error {
    color: var(--bs-primary) !important;
    text-decoration: none !important;
}

</style>
