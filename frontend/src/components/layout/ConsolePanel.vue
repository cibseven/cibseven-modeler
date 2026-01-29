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
    <div :class="!props.isModelerVisible ? 'd-flex' : 'd-none'" class="flex-column border position-relative" style="z-index: 1;">
        <div ref="parent" :class="{ 'collapsible-content ': !isResizing }"
            class="d-flex flex-column resizable-component bg-light" :style="style">
            <div class="align-self-end">
                <button type="button" :title="$t('buttons.copy')" class="btn btn-link text-muted" @click="emit('copy-line')">
                    <span class="mdi mdi-24px mdi-content-copy"></span></button>
                <button type="button" :title="$t('buttons.delete')" class="btn btn-link text-muted" @click="emit('clean-console')">
                    <span class="mdi mdi-24px mdi-trash-can-outline"></span></button>
                <button type="button" :title="$t('buttons.close')" class="btn btn-link text-muted" @click="toggleConsole()">
                    <span class="mdi mdi-24px mdi-close"></span>
                </button>              
            </div>
            <div class="d-flex h-100 flex-grow" v-show="isVisible">
                <slot />
            </div>
            <div class="resizable-t" @mousedown="handleDown" />
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUpdated } from 'vue'

const parent = ref(null)
const props = defineProps({
    parentHeight: Number,
    minHeight: String,
    isPropertyPanelVisible: { type: Boolean, default: true },
    rightPos: Number,
    isModelerVisible: Boolean,
    processID: String
})

const emit = defineEmits([
    'changeHeight',
    'copy-line',
    'clean-console',
    'showConsoleNotification'
])

const MARGIN_TOP = 350
let height = ref(0)
let bottomPos = ref(0)

const style = computed(() => isVisible ? { height: `${height.value}px ` } : { height: 0 })

const styleNav = computed(() => {
    return { bottom: `${bottomPos.value}px`, left: 0 }
})

const isVisible = ref(false)

let isResizing = false // to check if the user is resizing 

onMounted(() => {
    if (isVisible.value) emit('changeHeight', props.parentHeight - parent.value.clientHeight)
    document.documentElement.addEventListener('mousemove', handleMove, true)
    document.documentElement.addEventListener('mouseup', handleUp, true)
})

onUpdated(() => props.isPropertyPanelVisible && emit('changeHeight', props.parentHeight - height.value))

watch(height, newW => {
    style.value.height = `${newW}px`
    styleNav.value.bottom = `${newW}px`
    if (props.isPropertyPanelVisible) emit('changeHeight', props.parentHeight - newW)
})

const toggleConsole = () => {
    isVisible.value = !isVisible.value
    if (isVisible.value) {
        height.value = 300
        emit('showConsoleNotification', props.processID)

    }
    else {
        height.value = 0
    }
    return isVisible.value
}

const isOpen = () => isVisible.value

const handleDown = () => isResizing = true

const handleUp = () => isResizing = false

const handleMove = e => {
    if (isResizing) resizeMovement(e)
}

const resizeMovement = e => {

    const newHeight = props.parentHeight - e.clientY
    //checks if its not less than the min height and the max size
    if (newHeight <= props.parentHeight - MARGIN_TOP) { // margin top
        height.value = newHeight
        if (!isVisible.value) isVisible.value = true
    }
    else if (newHeight <= 0) {
        height.value = 0
    }
}

const _changeHeight = () => { if (parent.value) props.parentHeight - parent.value.clientHeight }

const _resetPropertiesPanelHeight = () => height.value = 0

defineExpose({ isOpen, toggleConsole, _changeHeight, _resetPropertiesPanelHeight })
</script>

<style scoped>
.resizable-component {
    position: relative;
    max-width: none;
    width: 100%;
    height: 0;
}

.collapsible-content {
    transition: height 0.5s ease;
}

.collapsible-nav {
    transition: bottom 0.5s ease;
}

.resizable-component>.resizable-t {
    display: block;
    position: absolute;
    z-index: 90;
    touch-action: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    cursor: ns-resize;
    width: 100%;
    top: 10px;
    height: 10px;
    top: 0;

}
</style>
