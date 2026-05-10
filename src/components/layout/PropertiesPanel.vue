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
        <div class="d-flex h-100">
            <!-- Toggle strip: always visible, collapses/expands the panel -->
            <button
                class="panel-toggle-strip"
                @click="toggleCollapsed"
                :title="collapsed ? $t('buttons.expandPanel') : $t('buttons.collapsePanel')"
                :aria-label="collapsed ? $t('buttons.expandPanel') : $t('buttons.collapsePanel')"
                :aria-expanded="String(!collapsed)">
                <span :class="['mdi', 'mdi-18px', collapsed ? 'mdi-chevron-left' : 'mdi-chevron-right']" aria-hidden="true"></span>
            </button>
            <!-- Panel content: hidden when collapsed -->
            <div v-show="!collapsed" class="d-flex flex-column flex-grow-1" style="min-width: 0; overflow: hidden;">
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
        </div>
        <!-- Resize handle: only available when panel is expanded -->
        <div v-show="!collapsed" class="resizable-l" role="presentation" @mousedown="handleDown" />
    </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUpdated, inject } from 'vue'

const TOGGLE_STRIP_WIDTH = 24
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
const collapsed = ref(false)
let storedWidth = null

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
    if (isResizing && !collapsed.value) resizeMovement(e)
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

const toggleCollapsed = () => {
    if (!collapsed.value) {
        storedWidth = width.value
        width.value = TOGGLE_STRIP_WIDTH
        collapsed.value = true
    } else {
        width.value = storedWidth ?? props.minWidth
        collapsed.value = false
        storedWidth = null
    }
}

const _changeWidth = () => props.parentWidth - parent.value.clientWidth

const _restorePropertiesPanelWidth = () => {
    collapsed.value = false
    storedWidth = null
    width.value = props.minWidth
}

const _resetPropertiesPanelWidth = () => {
    collapsed.value = false
    storedWidth = null
    width.value = 0
}

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

.panel-toggle-strip {
    width: 24px;
    min-width: 24px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bs-light, #f8f9fa);
    border: none;
    border-right: 1px solid var(--bs-border-color-translucent, rgba(0, 0, 0, 0.175));
    cursor: pointer;
    color: inherit;
    padding: 0;
}

.panel-toggle-strip:hover {
    background-color: white;
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
