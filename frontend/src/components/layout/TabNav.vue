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
        <ul class="nav nav-tabs d-flex" role="tablist" style="flex-wrap: nowrap" ref="tabNav">
            <TabNavItem spanIconClass="mdi mdi-24px mdi-text-box-search-outline" :isDashboard="true"
                @switchTabFromTabNavItem="switchTabFromTabNavItem" navId="dashboard" :activeTab="props.activeTab"
                name="dashboard" :index="-1" @selectedTab="selectedTab">
            </TabNavItem>
            <TabNavItem @switchTabFromTabNavItem="switchTabFromTabNavItem"
                :isSaved="props.tabNavList[index].isSaved" :maxTabItemWidth="maxTabItemWidth"
                :tabNavList="props.tabNavList[index]" :editorXML="editorXML[index]"
                v-on:keydown.ctrl.s="(e) => saveWithKeyboard(e, navItem.name, index)" :activeTab="props.activeTab"
                @openDiagram="openDiagram" @selectedTab="selectedTab" v-for="(navItem, index) in props.tabNavList"
                :key="navItem.keyOfTabNav" :processkey="navItem.key" :id="navItem.name" :navId="navItem.id"
                :name="navItem.name" :index="index" @removeSelectedTab="removeSelectedTab" @showModalMessage="showModal"
                @showToastMessage="showToastMessageFromItem" :ref="(el) => (tabNavItem[index] = el)"
                :keyOfTabNav="navItem.keyOfTabNav" :isVisible="isVisibleTab[index]">
            </TabNavItem>

            <li class="nav-item dropdown tab-dropdown" v-if="isVisibleTabDropdown && tabNavList.length > 0">
                <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#" role="button"
                    style="height: 40px; border-color: #CCD7E4;" aria-expanded="false"></a>
                <ul class="dropdown-menu">
                    <li v-for="(navItem, index) in hiddenItems" :key="navItem.id">
                        <a class="dropdown-item" href="#" @click="selectHiddenTab(index)">
                            {{ navItem.name !== 'undefined' && navItem.name !== '' ? navItem.name : '(' + navItem.key + ')'
                            }}
                        </a>
                    </li>
                </ul>
            </li>
        </ul>
        <ConfirmModal :showModal="showModalAcceptCancelMessage" :title="modalCloseNotSavedText.title"
            type="closeTab" :body="modalCloseNotSavedText.body" @hideModal="hideModal"
            :functionAfterAccepting="removeSelectedTabFromModal">
        </ConfirmModal>
    </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { ref, watch, onMounted, nextTick, computed } from 'vue'
//components
import TabNavItem from '../layout/TabNavItem.vue'
import ConfirmModal from '../modals/ConfirmModal.vue'

const { t } = useI18n()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             

const tabNav = ref(null)
const props = defineProps({
    tabNavWidth: Number,
    tabNavList: Array,
    activeTab: Number,
    editorXML: Object
})
const emit = defineEmits([
    'orderTabNavListHiddenTab',
    'resizeTabNav',
    'showToastMessage',
    'removeSelectedTabFromModal',
    'removeSelectedTab',
    'saveWithKeyboardFromTab',
    'openDiagramFromNavTab',
    'selectedTab',
    'switchTabFromTabNav'
])
const showModalAcceptCancelMessage = ref(false)
const tabIndex = ref(null)
const tabNavItem = ref({})
const hiddenItems = ref([])
const isVisibleTab = ref([])
const isVisibleTabDropdown = ref(true) // to hide the dropdown button when tabs dont fit
const sizeOfTabItems = ref([])
const maxTabItemWidth = 150
onMounted(async () => {
    await nextTick()
    tabsVisibleAndCalculate()
})

const modalCloseNotSavedText = computed(() => {
     if (props.activeTab >-1) {
        return { title: t('modalCloseNotSaved.title', {
            item: t(`items.${props.tabNavList[props.activeTab].type}`)
        } ), body: t('modalCloseNotSaved.body', {
            item: t(`items.${props.tabNavList[props.activeTab].type}`)
        } ) }
    }
    return { title: '', body: ''}
})

watch(() => props.tabNavList.length,
    async () => {
        await nextTick()
        tabsVisibleAndCalculate()
    }
)

watch(() => props.tabNavWidth,() => {
        _calculateTabsVisible()
    }
)

const selectHiddenTab = index => emit('orderTabNavListHiddenTab', hiddenItems.value.length - index)

const tabsVisibleAndCalculate = () => {

    const dashboardTabWidth = document.querySelector('.dashboard').offsetWidth ?? 60
    const tabs = document.querySelectorAll('.calculated-tab')

    let visibleTabs = []
    let sumSizeTabs = dashboardTabWidth + 50  // size of dashboard tab
    let sumOfTabsSizaArr = []
    for (let i = 0; i < props.tabNavList.length; i++) {
        sumSizeTabs += tabs[i]?.offsetWidth ?? maxTabItemWidth + 20 // if the tab is hidden set space to maxwidth plus a margin
        if (sumSizeTabs >= props.tabNavWidth) {
            isVisibleTabDropdown.value = true
            visibleTabs.push(false)
            sumOfTabsSizaArr.push(sumSizeTabs)
        } else {

            sumOfTabsSizaArr.push(sumSizeTabs)
            isVisibleTabDropdown.value = false
            visibleTabs.push(true)
        }
    }
    sizeOfTabItems.value = sumOfTabsSizaArr
    isVisibleTab.value = visibleTabs
    _calculateTabsVisible()
}

const showModal = tabElementIndex => {
    showModalAcceptCancelMessage.value = true
    tabIndex.value = tabElementIndex
}
const hideModal = () => showModalAcceptCancelMessage.value = false

const removeSelectedTabFromModal = () => emit('removeSelectedTabFromModal', tabIndex.value)

const removeSelectedTab = tabElementIndex => emit('removeSelectedTab', tabElementIndex)

const selectedTab = index => {
    emit('selectedTab', index)
    emit('resizeTabNav', props.tabNavWidth)
}

const showToastMessageFromItem = toastInformation => emit('showToastMessage', toastInformation)

const saveWithKeyboard = (e, tabElementName, tabElementIndex) => emit('saveWithKeyboardFromTab', e, tabElementName, tabElementIndex)

const openDiagram = (selectedProcess, tabElementIndex) => emit('openDiagramFromNavTab', selectedProcess, tabElementIndex)

const switchTabFromTabNavItem = selectedTabIndex => emit('switchTabFromTabNav', selectedTabIndex)

const selectTab = index => {
    tabNavItem.value[index].selectBySimulateClick()
}

const _calculateTabsVisible = () => {
    let maxTabs = 0
    let visibleTabs = []
    for (let i = 0; i < sizeOfTabItems.value.length; i++) {
        if (sizeOfTabItems.value[i] >= props.tabNavWidth) {
            isVisibleTabDropdown.value = true
            visibleTabs.push(false)
        } else {
            isVisibleTabDropdown.value = false
            visibleTabs.push(true)
            maxTabs++
        }
    }
    hiddenItems.value = [...props.tabNavList].splice(maxTabs, props.tabNavList.length)
    isVisibleTab.value = visibleTabs
    
}

defineExpose({
    _calculateTabsVisible,
    selectTab
})
</script>
