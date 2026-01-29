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
    <div class="d-flex flex-row flex-wrap justify-content-between bg-secondary position-relative" style="z-index: 11; min-width: 200px; min-height: 44px;" :style="style">
        <div class="d-flex flex-row justify-content-start">   
            <slot name="leftButtons"></slot>
        </div>
            <slot name="rightButtons"></slot>            
    </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ width: Number })
const style = computed(() => {
    return { width: `${props.width}px !important` }
})
</script>
