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
  <div class='drop-zone h-100 w-100 position-fixed top-0 start-0' :class='classes'>
    <slot>
      <div class='drop-zone__content w-100 h-100 align-content-center justify-content-center text-center'>
        <div class="position-absolute top-60 start-60 end-60 bottom-60">
          {{ text }}
        </div>
      </div>
    </slot>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, computed, ref } from 'vue'

const emit = defineEmits([
  'drop',
  'handleDropFile'
])

const visible = ref(false)
const lastTarget = ref(null)

const classes = computed(() => {
  return {
    'drop-zone--visible': visible.value
  }
})

onMounted(() => {
  window.addEventListener('dragenter', _onDragEnter)
  window.addEventListener('dragleave', _onDragLeave)
  window.addEventListener('dragover', _onDragOver)
  window.addEventListener('drop', _onDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', _onDragEnter)
  window.removeEventListener('dragleave', _onDragLeave)
  window.removeEventListener('dragover', _onDragOver)
  window.removeEventListener('drop', _onDrop)
})

const _onDragEnter = e => {
  const isExternal = e.dataTransfer.types.includes('Files')// detects if they are external files
  if (isExternal) {
    lastTarget.value = e.target
    visible.value = true   
  }
}

const _onDragLeave = e => {
  if (e.target === lastTarget.value) {
    visible.value = false
  }
}

const _onDragOver = e => {
  e.preventDefault()
}

const _onDrop = e => {
  e.preventDefault()
  if (visible.value) {
    visible.value = false
    emit('handleDropFile', e)
  }
}
</script>

<style lang='css'>
.drop-zone {
  z-index: 10000;
  background-color: rgba(var(--gray-dark), 0.9);
  visibility: hidden;
  opacity: 0;
}

.drop-zone--visible {
  opacity: 1;
  visibility: visible;
}

.drop-zone__content {
  display: flex;
  color: var(--white);
}
</style>
