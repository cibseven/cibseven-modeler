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
	<div class="form-modeler-container">
		<div class="form-editor" ref="editor"></div>
	</div>
</template>

<script setup>
import { ref, onMounted, defineExpose } from 'vue'

const editor = ref(null)

let formData = ref({
	type: 'default',
	components: []
})

const defaultForm = {
	type: 'default',
	components: [
		{
			key: 'textfield1',
			type: 'textfield',
			label: 'Text Field'
		}
	]
}

onMounted(() => {
	formData.value = { ...defaultForm }
})

const createNew = () => {
	formData.value = { ...defaultForm }
}

const openFile = () => {
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.json'
	input.onchange = (e) => {
		const file = e.target.files[0]
		if (file) {
			const reader = new FileReader()
			reader.onload = (event) => {
				try {
					formData.value = JSON.parse(event.target.result)
				} catch (err) {
					console.error('Error loading form', err)
				}
			}
			reader.readAsText(file)
		}
	}
	input.click()
}

const save = () => {
	try {
		const json = JSON.stringify(formData.value, null, 2)
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'form.json'
		a.click()
		URL.revokeObjectURL(url)
	} catch (err) {
		console.error('Error saving form', err)
	}
}

const getJSON = () => {
	return JSON.stringify(formData.value, null, 2)
}

const importJSON = (json) => {
	try {
		formData.value = typeof json === 'string' ? JSON.parse(json) : json
	} catch (err) {
		console.error('Error importing JSON', err)
	}
}

defineExpose({
	createNew,
	openFile,
	save,
	getJSON,
	importJSON
})
</script>

<style scoped>
.form-modeler-container {
	display: flex;
	height: 100%;
	width: 100%;
}

.form-editor {
	flex: 1;
	height: 100%;
	padding: 1rem;
	overflow-y: auto;
}
</style>
