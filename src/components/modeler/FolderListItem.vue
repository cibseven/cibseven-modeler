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
    <div role="button" tabindex="0"
        @click="emit('open', folder.id)" @keyup.enter="emit('open', folder.id)"
        class="list-group-item border-0 d-flex align-items-center justify-content-between"
        :class="{ 'bg-light': isHovered }">
        <span class="w-10 justify-content-center mr-2 mdi mdi-18px mdi-folder-outline" aria-hidden="true"></span>
        <div class="w-80 flex-grow-1 mx-2 min-w-0 d-flex flex-column">
            <span class="text-truncate">{{ folder.name }}</span>
        </div>
        <span class="w-10 ml-2 d-flex justify-content-end">
            <button :title="$t('folders.rename')" :aria-label="`${$t('folders.rename')}: ${folder.name}`" type="button"
                class="btn mdi mdi-18px mdi-rename-outline border-0 btn-outline-secondary btn-sm"
                :class="{ 'invisible': !isHovered }"
                @click.stop="emit('rename', folder)">
            </button>
            <button :title="$t('folders.move')" :aria-label="`${$t('folders.move')}: ${folder.name}`" type="button"
                class="btn mdi mdi-18px mdi-folder-move-outline border-0 btn-outline-secondary btn-sm"
                :class="{ 'invisible': !isHovered }"
                @click.stop="emit('move', folder)">
            </button>
            <button :title="$t('folders.delete')" :aria-label="`${$t('folders.delete')}: ${folder.name}`" type="button"
                class="btn mdi mdi-18px mdi-delete-outline border-0 btn-outline-secondary btn-sm"
                :class="{ 'invisible': !isHovered }"
                @click.stop="emit('remove', folder)">
            </button>
        </span>
    </div>
</template>

<script setup>
defineProps({
    folder: { type: Object, required: true },
    isHovered: Boolean,
})

const emit = defineEmits(['open', 'rename', 'move', 'remove'])
</script>
