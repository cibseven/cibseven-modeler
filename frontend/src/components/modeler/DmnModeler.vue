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
	<div class="dmn-modeler-container" ref="container">
		<div class="canvas" ref="canvas"></div>
	</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineExpose } from 'vue'
import DmnModeler from 'dmn-js/lib/Modeler'
import 'dmn-js/dist/assets/diagram-js.css'
import 'dmn-js/dist/assets/dmn-font/css/dmn.css'
import 'dmn-js/dist/assets/dmn-js-shared.css'
import 'dmn-js/dist/assets/dmn-js-drd.css'
import 'dmn-js/dist/assets/dmn-js-decision-table.css'
import 'dmn-js/dist/assets/dmn-js-literal-expression.css'

const container = ref(null)
const canvas = ref(null)

let modeler = null

const defaultDiagram = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" 
	xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" 
	xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" 
	id="Definitions_1" 
	name="DRD" 
	namespace="http://camunda.org/schema/1.0/dmn">
	<decision id="Decision_1" name="Decision 1">
		<decisionTable id="DecisionTable_1">
			<input id="Input_1">
				<inputExpression id="InputExpression_1" typeRef="string">
					<text></text>
				</inputExpression>
			</input>
			<output id="Output_1" typeRef="string"/>
		</decisionTable>
	</decision>
	<dmndi:DMNDI>
		<dmndi:DMNDiagram>
			<dmndi:DMNShape dmnElementRef="Decision_1">
				<dc:Bounds height="80" width="180" x="160" y="100"/>
			</dmndi:DMNShape>
		</dmndi:DMNDiagram>
	</dmndi:DMNDI>
</definitions>`

onMounted(async () => {
	modeler = new DmnModeler({
		container: canvas.value
	})

	try {
		await modeler.importXML(defaultDiagram)
	} catch (err) {
		console.error('Error rendering DMN diagram', err)
	}
})

onUnmounted(() => {
	if (modeler) {
		modeler.destroy()
	}
})

const createNew = async () => {
	try {
		await modeler.importXML(defaultDiagram)
	} catch (err) {
		console.error('Error creating new DMN diagram', err)
	}
}

const openFile = () => {
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.dmn,.xml'
	input.onchange = async (e) => {
		const file = e.target.files[0]
		if (file) {
			const reader = new FileReader()
			reader.onload = async (event) => {
				try {
					await modeler.importXML(event.target.result)
				} catch (err) {
					console.error('Error loading DMN diagram', err)
				}
			}
			reader.readAsText(file)
		}
	}
	input.click()
}

const save = async () => {
	try {
		const { xml } = await modeler.saveXML({ format: true })
		const blob = new Blob([xml], { type: 'application/xml' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'diagram.dmn'
		a.click()
		URL.revokeObjectURL(url)
	} catch (err) {
		console.error('Error saving DMN diagram', err)
	}
}

const getXML = async () => {
	try {
		const { xml } = await modeler.saveXML({ format: true })
		return xml
	} catch (err) {
		console.error('Error getting XML', err)
		return null
	}
}

const importXML = async (xml) => {
	try {
		await modeler.importXML(xml)
	} catch (err) {
		console.error('Error importing XML', err)
	}
}

defineExpose({
	createNew,
	openFile,
	save,
	getXML,
	importXML
})
</script>

<style scoped>
.dmn-modeler-container {
	display: flex;
	height: 100%;
	width: 100%;
}

.canvas {
	flex: 1;
	height: 100%;
}
</style>
