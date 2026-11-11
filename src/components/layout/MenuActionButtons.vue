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
    <div class="menu-action-bar d-flex flex-row flex-wrap justify-content-between align-items-center bg-secondary position-relative" style="z-index: 11; min-width: 200px; min-height: 44px;" :style="style">
        <div class="d-flex flex-row justify-content-start align-items-center">
            <slot name="leftButtons"></slot>
        </div>
        <div class="d-flex align-items-center px-2 text-truncate">
            <slot name="centerContent"></slot>
        </div>
        <div class="d-flex align-items-center px-2">
            <slot name="rightButtons"></slot>
        </div>
    </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ width: Number })
const style = computed(() => {
    return { width: `${props.width}px !important` }
})
</script>

<style>
/* Unscoped on purpose: the buttons come from ActionButtonsList and from the host (filter, snapshots),
   none of them from this template. */
.menu-action-bar .btn-outline-light {
    --bs-btn-color: var(--bs-gray-200);
    --bs-btn-hover-color: var(--bs-white);
    --bs-btn-hover-bg: var(--bs-gray-700);
    --bs-btn-hover-border-color: transparent;
    /* Dark: white on gray-600 cannot be read */
    --bs-btn-active-color: var(--bs-dark);
    --bs-btn-active-bg: var(--bs-gray-600);
    --bs-btn-active-border-color: transparent;
    --bs-btn-disabled-color: var(--bs-gray-200);
    --bs-btn-disabled-opacity: 0.3;
    --bs-btn-focus-box-shadow: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 2.125rem;
}

/* The menu toggle next to save stays narrow */
.menu-action-bar .btn-outline-light:not([data-bs-toggle]) {
    min-width: 2.125rem;
    padding: 0;
}

.menu-action-bar .btn-outline-light:focus-visible {
    background-color: var(--bs-gray-700);
    color: var(--bs-white);
    outline: 2px solid var(--bs-dark);
    outline-offset: 0;
}

/* Selected (console, code view, filter), yet it still darkens while pressed */
.menu-action-bar .btn-outline-light.active:not(:active) {
    background-color: var(--bs-gray-200);
    color: var(--bs-dark);
}

/* The .vr helper draws it; only its height and its colour differ */
.menu-action-bar .menu-divider {
    height: 1.5rem;
    background-color: var(--bs-gray-600);
}
</style>
