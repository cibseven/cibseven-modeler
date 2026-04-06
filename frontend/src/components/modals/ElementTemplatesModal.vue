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
  <div class="modal fade" ref="notificationModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-body">
          <!-- Search input field -->
          <div class="input-group py-2">
                        <span class="input-group-text rounded-start-1 py-0 px-2 border-end-0">
                            <i class="mdi mdi-magnify mdi-18px text-muted"></i>
                        </span>
            <input
              type="text"
              ref="searchTemplate"
              class="form-control"
              id="basic-url"
              :placeholder="$t('searchElementTemplates.searchInput')"
              @input="handleSearch"
              v-model="inputSearchValue" />
          </div>

          <!-- Internal/External switches for filtering -->
          <div class="form-check form-switch py-2" v-if="!isUserTask">
            <input class="form-check-input" v-model="internSwitchValue"
                   :placeholder="$t('searchElementTemplates.searchInput')" type="checkbox" role="switch"
                   :id="`externSwitch${props.tabElement.id}`" @change="handleSearch">
            <label class="form-check-label" :for="`externSwitch${props.tabElement.id}`">{{
                $t('searchElementTemplates.showInternal') }}</label>
            <span
              style="cursor: pointer"
              class="mdi mdi-help-circle-outline ms-1"
              data-bs-custom-class="deployment-modal-tooltip"
              data-bs-toggle="tooltip" data-bs-placement="right" :data-bs-title="$t('searchElementTemplates.internalTemplatesTip')"></span>
          </div>
          <div class="form-check form-switch my-1" v-if="!isUserTask">
            <input class="form-check-input" v-model="externSwitchValue"
                   :placeholder="$t('searchElementTemplates.searchInput')" type="checkbox" role="switch"
                   :id="`externSwitch${props.tabElement.id}`" @change="handleSearch">
            <label class="form-check-label" :for="`externSwitch${props.tabElement.id}`">{{
                $t('searchElementTemplates.showExternal') }}</label>
            <span
              style="cursor: pointer"
              class="mdi mdi-help-circle-outline ms-1"
              data-bs-custom-class="deployment-modal-tooltip"
              data-bs-toggle="tooltip" data-bs-placement="right" :data-bs-title="$t('searchElementTemplates.externalTemplatesTip')"></span>
          </div>

          <hr>
          <div class="d-flex flex-column h-100 overflow-auto" style="max-height: calc(100vh - 300px);">
            <div v-for="(parentElement, elementName) in filteredElementTemplates" :key="elementName">
              <div v-if="parentElement.length > 0">
                <div class="d-flex align-items-center pb-2">
                  <div class="flex-grow-1 border-top border-secondary"></div>
                  <span class="mx-3 text-secondary">{{ elementName === 'undefined' ? $t('searchElementTemplates.others') : elementName }}</span>
                  <div class="flex-grow-1 border-top border-secondary"></div>
                </div>
                <div class="d-flex flex-column py-1" style="cursor: pointer;"
                     role="button" tabindex="0"
                     v-for="childElement in parentElement" :key="childElement.id" @click.stop="selectTemplate(childElement.id)"
                     @keyup.enter.stop="selectTemplate(childElement.id)"
                     :title="childElement.tooltip">
                  <h5 class="m-0">{{ childElement.name }}</h5>
                  <div class="text-muted"><span v-if="!isUserTask">{{ childElement.extern ? 'Extern' : 'Intern' }} •︎</span> {{ $t('version') }} {{
                      childElement.version }}</div>
                </div>
              </div>
            </div>
            <!-- Empty state -->
            <div v-if="Object.keys(filteredElementTemplates ?? []).length === 0" class="text-center text-muted py-1">
              {{ $t('noTemplates') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup>
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.js'
import { debounce } from 'min-dash'
import { onMounted, ref, watch, computed } from 'vue'
import { useStore } from 'vuex'

let modalBootstrap = null
const filteredElementTemplates = ref()
const modelerEvent = ref(null)
const searchTemplate = ref('')
const inputSearchValue = ref('')
const externSwitchValue = ref(true)
const internSwitchValue = ref(true)
const notificationModal = ref(null)

const store = useStore()

const props = defineProps({
  tabElement: Object
})

// Get categorized template data from store
const elementTemplates = computed(() => store.getters['elementTemplates/categorizedTemplateData'])

const isUserTask = computed(()=>{
  return modelerEvent.value?.element?.type ==='bpmn:UserTask'
})

watch(modelerEvent, newValue => {
  if (!newValue) return
  filteredElementTemplates.value = elementTemplates.value[modelerEvent.value?.element?.type] ?? elementTemplates.value

  handleSearch()
})

const handleSearch = debounce(async () => {
  const taskElementTemplates = elementTemplates.value[modelerEvent.value?.element?.type] ?? elementTemplates.value
  filteredElementTemplates.value = JSON.parse(JSON.stringify(taskElementTemplates))
  const taskElementTemplatesArray = Object.entries(taskElementTemplates)

  for (const [parentKey, childArray] of taskElementTemplatesArray) {
    const groupMatches = inputSearchValue.value.trim() !== '' && parentKey.trim().toLowerCase().includes(inputSearchValue.value.trim().toLowerCase())

    filteredElementTemplates.value[parentKey] = childArray.length > 0 && childArray?.filter(childEl =>
      (childEl.name.trim().toLowerCase().includes(inputSearchValue.value.trim().toLowerCase()) || childEl?.metaKeys?.some(item => item.toLowerCase().includes(inputSearchValue.value.trim().toLowerCase())))
      && ((childEl.extern ? externSwitchValue.value : internSwitchValue.value) || modelerEvent.value?.element?.type === 'bpmn:UserTask') || (groupMatches && (childEl.extern ? externSwitchValue.value : internSwitchValue.value)))

    if (filteredElementTemplates.value[parentKey].length === 0) {
      delete filteredElementTemplates.value[parentKey]
    }
  }
}, 100)

const emit = defineEmits([
  'applyTemplateToTask'
])

onMounted(() => {
  modalBootstrap = new bootstrap.Modal(notificationModal.value)
  notificationModal.value.addEventListener('shown.bs.modal', () => {
    searchTemplate.value.focus()
  })

  notificationModal.value.addEventListener('hidden.bs.modal', () => {
    inputSearchValue.value = ''
    externSwitchValue.value = true
    internSwitchValue.value = true
    handleSearch()
  })

  // Initialize all tooltips inside the modal
  const tooltipTriggerList = [].slice.call(
    notificationModal.value.querySelectorAll('[data-bs-toggle="tooltip"]')
  )
  tooltipTriggerList.forEach(el => {
    new bootstrap.Tooltip(el)
  })
})

const selectTemplate = id => {
  emit('applyTemplateToTask', id, modelerEvent.value)
  modalBootstrap.hide()
}

const show = e => {
  modelerEvent.value = e
  modalBootstrap.show()
}

defineExpose({
  show
})
</script>
<style>
.deployment-modal-tooltip > .tooltip-inner {
  font-size: .8rem;
  max-width: 350px;
  text-align: left;
}
</style>
