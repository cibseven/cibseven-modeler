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
	<div ref="editor" class="editor" style="width: 100vw; height: calc(100vh - 84px)"></div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import useMonacoEditor from '../../composables/useMonacoEditor.js'

const monaco = inject('monaco')
const editor = ref(null)

const props = defineProps({
	xml: {
		type: String,
		required: true,
	},
	tabElementIndex: {
		type: Number,
		required: true,
	},
	isBpmn: { type: Boolean, default: true },
	language: {
		type: String,
		default: 'xml'
	}

})

const emit = defineEmits([
	'updateFromEditor'
])

let { createMonacoEditorEditable } = useMonacoEditor(monaco, props, emit)

onMounted(() => {
	// create the editor
	createMonacoEditorEditable(editor.value)
})

</script>

<style scoped>
.monaco-editor {
	width: 100%;
}
</style>
