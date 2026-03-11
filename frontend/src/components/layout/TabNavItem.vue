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
    <div class="m-0 p-0">
        <div v-if="props.isDashboard" class="nav-item bg-light dashboard" @keyup.enter.stop="selectTab" @click.stop="selectTab">
            <div ref="tabItem" id="dashboard-tab" data-bs-toggle="tab" data-bs-target="#dashboard-tab-pane"
                style="height: 41px;" :class="{ 'active': props.activeTab === props.index }" role="tab"
                class="nav-link dashboard nav-icon d-flex align-items-center" aria-labelledby="dashboard-tab" aria-controls="dashboard-tab-pane"
                tabindex="0" aria-selected="true">
                    <span :class="props.spanIconClass"></span>
            </div>

        </div>
        <div v-if="!props.isDashboard && props.isVisible" class="nav-item d-inline-flex align-items-center">
            <div class="nav-link nav-icon d-inline-flex p-0 calculated-tab"
                :class="{ 'active': props.activeTab === props.index }">
                <div ref="tabItem" :id="`process${props.keyOfTabNav}-tab`" data-bs-toggle="tab" @keyup.enter.stop="selectTab" @click.stop="selectTab" :title="tabTitle"
                    class="ps-4" :style="{ maxWidth: props.maxTabItemWidth + 'px' }" style="vertical-align: middle;line-height: 38px; height: 39px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
                    :data-bs-target="`#process${props.keyOfTabNav}-tab-pane`" role="tab"
                    :aria-labelledby="`process${props.keyOfTabNav}-tab`"
                    :aria-controls="`process${props.keyOfTabNav}-tab-pane`" tabindex="0"
                    :aria-selected="props.activeTab === props.index">
                    {{ tabTitle }}
                </div>
                <span v-if="props.tabNavList.canSave" class="mdi mdi-18px mdi-circle-medium text-warning align-self-center" :title="$t('tabs.unsavedChanges')" :aria-label="$t('tabs.unsavedChanges')"></span>
                <div class="d-flex align-items-center">
                    <span class="mdi mdi-close ms-2 float-end px-2" role="button" :aria-label="$t('buttons.close')" style="cursor: pointer;" tabindex="0"
                    @keyup.enter="checkIfProcessIsSaved"  @click.stop="checkIfProcessIsSaved"></span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { checkProcessSession, closeProcessSession } from '../../services/processService'
import { checkFormSession, closeFormSession } from'../../services/formService.js'

const tabItem = ref(null)
const props = defineProps({
    id: { type: String },
    tabNavList: Object,
    isVisible: { type: Boolean, default: true },
    isSaved: { type: Boolean, default: false },
    isDashboard: { type: Boolean, default: false },
    spanIconClass: String, processkey: String, name: String, activeTab: { type: Number }, navId: String, index: Number, active: Boolean,
    editorXML: String,
    keyOfTabNav: String,
    maxTabItemWidth: Number,
})

const emit = defineEmits(['showModalMessage',
    'showToastMessage',
    'removeSelectedTab',
    'openDiagram',
    'selectedTab',
    'switchTabFromTabNavItem',
])

const tabTitle = computed(() => {
    return props.name !== 'undefined' && props.name !== '' 
        ? `${props.name}.${props.tabNavList.type.startsWith('bpmn') ? 'bpmn' : props.tabNavList.type}` 
        : `${props.processkey}.${props.tabNavList.type.startsWith('bpmn') ? 'bpmn' : props.tabNavList.type}`
})

const checkIfProcessIsSaved = e => {
    e.stopPropagation()
    if (props.tabNavList.canSave && props.index > -1) // the process has unsaved changes
    {
        emit('showModalMessage', props.index)
        return
    }
    removeSelectedTab() // if the process has been saved it will close the tab without displaying the modal
}

const selectBySimulateClick = () => {
    tabItem.value.click()
}

const removeSelectedTab = async() => {
    try {
        if (props.tabNavList.type !== 'form') {
        const response = await checkProcessSession(props.tabNavList.id)
        await closeProcessSession(response.sessionId, props.tabNavList.type)
        }
        else{
            const response = await checkFormSession(props.tabNavList.id)
            await closeFormSession(response.sessionId, props.tabNavList.type)
        }
    } catch (error) {
        console.error(error)
    } finally {
        if (props.index >= 0) emit('removeSelectedTab', props.index)
    }
 
}

const selectTab = (e) => {
    e.preventDefault()
    emit('switchTabFromTabNavItem', props.index)
}

defineExpose({
    selectBySimulateClick
})
</script>

<style scoped>
.nav-link.active {
    border-left: 2px solid var(--bs-primary) !important;
    border-bottom: 2px solid #fff !important; /* O usa 'none' si quieres quitarlo */
    cursor: pointer;
}

.dashboard.active {
    border-left: 2px solid var(--bs-primary) !important;
    border-bottom: 2px solid var(--bs-light) !important;
    cursor: pointer;
}

.nav-link {
    border-color: #CCD7E4 #CCD7E4 #CCD7E4 #CCD7E4 !important;
    cursor: pointer !important;
}

.nav-icon.active {
    background-color: var(--bg-light) !important;  
}

.btn-close:hover {
    color: var(--bs-primary) !important;
}
</style>
