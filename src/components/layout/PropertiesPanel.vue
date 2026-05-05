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
    <div ref="parent" class="resizable-component property-panel position-absolute border-bottom border-light" style="height: 100%; top: 0; right: 0;" :style="style">
        <div class="d-flex flex-column h-100">
            <component :is="PropertiesTabBar" v-if="PropertiesTabBar && isActiveTab" :tabElement="tabElement" />
            <div v-show="activePropertiesTab === 'properties'"
                class="properties-panel-parent resizable-content flex-grow-1 border-start border-dark-subtle"
                style="min-height: 0; overflow: auto;"
                ref="propertiesPanelEl">
            </div>
            <div v-show="activePropertiesTab !== 'properties'" class="flex-grow-1 border-start border-dark-subtle" style="min-height: 0; overflow: auto;">
                <component :is="PropertiesTabContent" v-if="PropertiesTabContent && isActiveTab" :tabElement="tabElement" :selectedElement="selectedElement" />
            </div>
        </div>
        <div class="resizable-l" role="presentation" @mousedown="handleDown" />
    </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUpdated, inject } from 'vue'

const notResizingMaxWidth = 200 // the rest of the width that the panel will not surpass
const parent = ref(null)
const propertiesPanelEl = ref(null)

const PropertiesTabBar = inject('propertiesTabBarComponent', null)
const PropertiesTabContent = inject('propertiesTabContentComponent', null)

const props = defineProps({
    parentWidth: Number,
    minWidth: String,
    isPropertyPanelVisible: { type: Boolean, default: true },
    tabElement: { type: Object, default: null },
    isActiveTab: { type: Boolean, default: false },
    activePropertiesTab: { type: String, default: 'properties' },
    selectedElement: { type: Object, default: null },
})
const emit = defineEmits([
    'changeWidth'
])
const width = ref(props.minWidth)
const style = computed(() => {
    return { width: `${width.value}px !important` }
})

let isResizing = false // to check if the user is resizing 

onMounted(() => {
    emit('changeWidth', props.parentWidth - parent.value.clientWidth)
    document.documentElement.addEventListener('mousemove', handleMove, true)
    document.documentElement.addEventListener('mouseup', handleUp, true)
})

onUpdated(() => props.isPropertyPanelVisible && emit('changeWidth', props.parentWidth - width.value))

watch(width, newW => {
    style.value.width = `${newW}px`
    if (props.isPropertyPanelVisible) emit('changeWidth', props.parentWidth - newW)
})

const handleDown = () => isResizing = true

const handleUp = () => isResizing = false

const handleMove = e => {
    if (isResizing) resizeMovement(e)
}

const resizeMovement = e => {
    const newWidth = props.parentWidth - e.clientX
    //checks if its not less than the min width and the max size
    if (newWidth >= props.minWidth && newWidth <= props.parentWidth - notResizingMaxWidth) {
        width.value = newWidth
    }
    else if (newWidth <= props.minWidth) {
        width.value = props.minWidth
    }
}

const _changeWidth = () => props.parentWidth - parent.value.clientWidth

const _restorePropertiesPanelWidth = () => width.value = props.minWidth

const _resetPropertiesPanelWidth = () => width.value = 0

defineExpose({ _changeWidth, _restorePropertiesPanelWidth, _resetPropertiesPanelWidth, propertiesPanelEl })
</script>

<style scoped>
.resizable-component {
    position: absolute;
    top: 0;
    right: 0;  
    max-width: none;
    background-color: white;
    width: 300px;
}

.resizable-component>.resizable-l {
    display: block;
    position: absolute;
    z-index: 90;
    touch-action: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    cursor: w-resize;
    width: 20px;
    left: -10px;
    height: 100%;
    top: 0;
}
</style>
