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
  <div>
    <!-- button that activates the popover -->
    <button 
      ref="popoverButton" 
      type="button" 
      class="btn btn-outline-light border-0 btn-sm position-relative" 
      @click="togglePopover(container, position, popoverButton)"
    >
      <div v-if="classesOn">
        <span :class="isVisible ? classesOn : classesOff"></span>
        <span v-if="isFilterOn" class="bg-danger position-absolute rounded" style="bottom: 5px; width: 7px; height: 7px; right: 5px;"></span>
      </div>
    </button>
  
    <div hidden>
      <!-- popover content -->
      <div data-name="popover-content">
        <slot name="title"></slot>
        <slot name="body"></slot>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, inject } from 'vue'
import { useBpmnFilterPopover } from '../composables/useBpmnFilterPopover.js'

export default {
  name: 'BpmnFilterPopover',
  props: {
    container : Object,
    classesOn: {
      type: String,
      default: '',
    },
    classesOff: {
      type: String,
      default: '',
    },
    position: {
      type: String,
      default: 'right',
    },
  },
  setup(props, { expose }) {
    //config.js - provide default to avoid injection warning
    const config = inject('config', {})
    const popoverButton = ref(null)
    const { isFilterOn, togglePopover, handleBpmnFilter, bpmnFilter, isVisible } = useBpmnFilterPopover(config)

    expose({
      handleBpmnFilter,
      bpmnFilter,
      isFilterOn
    })

    return {
      popoverButton,      
      togglePopover,
      isVisible,
      isFilterOn
    }
  }
}
</script>
