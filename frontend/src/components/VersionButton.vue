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
        <div class="act-btns d-flex flex-wrap flex-row-reverse">
            <button v-if="props.processHistoryListComp?.length > 0"
                class="btn btn-outline-light border-0 mx-2 border px-2 py-1 d-flex justify-content-center align-items-center"
                @click="() => emit('selectDiagramVersion')" :disabled="props.processHistoryListComp?.length === 0">
                <span class="mdi mdi-24px mdi-history"></span>
                <span class="mx-2" style="min-width: 60px;"> {{ $t('history') }} - {{ props.activeVersion }}</span>
            </button>           
        </div>
</template>

<script setup>
const emit = defineEmits(['selectDiagramVersion'])
const props = defineProps({ activeVersion: Number, processHistoryListComp: Array })

</script>
