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
    <div :class="shouldRenderConsoleClass" class="flex-column position-relative" style="z-index: 1;">
        <div ref="parent" :class="{ 'collapsible-content ': !isResizing }"
            class="d-flex flex-column resizable-component bg-light" :style="style">
            <div class="align-self-end d-flex align-items-center flex-shrink-0 pe-2 pt-3 gap-3">
                <button type="button" :title="$t('buttons.copy')" class="btn btn-link btn-sm text-secondary text-decoration-none border-0 p-0 lh-1" @click="emit('copy-line')">
                    <span class="mdi mdi-18px mdi-content-copy" aria-hidden="true"></span>
                </button>
                <button type="button" :title="$t('buttons.delete')" class="btn btn-link btn-sm text-secondary text-decoration-none border-0 p-0 lh-1" @click="emit('clean-console')">
                    <span class="mdi mdi-18px mdi-trash-can-outline" aria-hidden="true"></span>
                </button>
                <button type="button" :title="$t('buttons.close')" class="btn btn-link btn-sm text-secondary text-decoration-none border-0 p-0 lh-1" @click="toggleConsole(false)">
                    <span class="mdi mdi-18px mdi-close" aria-hidden="true"></span>
                </button>
            </div>
            <div class="d-flex h-100 flex-grow" v-show="isVisible">
                <slot />
            </div>
            <!-- Focusable resize separator (WAI-ARIA window-splitter pattern) -->
            <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
            <div class="resizable-t" role="separator" aria-orientation="horizontal"
                tabindex="0" @mousedown="onHandleMouseDown" @keydown="onHandleKeydown" />
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUpdated } from 'vue'
import { useResizable } from '../../composables/useResizable.js'

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
    'showConsoleNotification',
    'visibility-changed',
])

const MARGIN_TOP = 350
const height = ref(0)
const bottomPos = ref(0)

const shouldRenderConsoleClass = computed(() => {
    if (!isVisible.value) return 'd-none'
    return props.isModelerVisible ? 'd-none' : 'd-flex'
})

const style = computed(() => isVisible.value ? { height: `${height.value}px ` } : { height: 0 })

const styleNav = computed(() => {
    return { bottom: `${bottomPos.value}px`, left: 0 }
})

const isVisible = ref(false)

const { isResizing, onMouseDown: onHandleMouseDown, onKeydown: onHandleKeydown } = useResizable({
    axis: 'y',
    getSize: () => height.value,
    setSize: n => {
        height.value = n
        if (n > 0 && !isVisible.value) isVisible.value = true
    },
    min: () => 0,
    max: () => props.parentHeight - MARGIN_TOP,
})

watch(isVisible, visible => {
    emit('visibility-changed', visible)
})

onMounted(() => {
    if (isVisible.value) emit('changeHeight', props.parentHeight - parent.value.clientHeight)
})

onUpdated(() => props.isPropertyPanelVisible && emit('changeHeight', props.parentHeight - height.value))

watch(height, newW => {
    style.value.height = `${newW}px`
    styleNav.value.bottom = `${newW}px`
    if (props.isPropertyPanelVisible) emit('changeHeight', props.parentHeight - newW)
})

const toggleConsole = next => {
    isVisible.value = next ?? !isVisible.value
    height.value = isVisible.value ? 300 : 0
    if (isVisible.value) emit('showConsoleNotification', props.processID)
    return isVisible.value
}

const isOpen = () => isVisible.value

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
    box-shadow: 0 -0.125rem 0.25rem rgba(0, 0, 0, 0.075);
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
