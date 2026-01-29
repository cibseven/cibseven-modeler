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
  <div class="p-4">
    <div v-for="(taskTypeGroups, taskType) in categorizedTemplates" :key="taskType" class="mb-4">
      <div v-for="(templates, groupName) in taskTypeGroups" :key="`${taskType}-${groupName}`" class="mb-3">
        <div class="d-flex align-items-center justify-content-between p-2 rounded">
          <div class="d-flex align-items-center">
            <h6 class="m-0 me-3">{{ groupName === 'undefined' ? $t('templatesManagement.others') : groupName }}</h6>
            <span class="badge bg-secondary">{{ templates.length }} {{ $t('templatesManagement.templatesCount') }}</span>
          </div>
          <div class="d-flex align-items-center">
            <button 
              class="btn btn-sm btn-outline-secondary me-2"
              @click="$emit('setGroupVisibility', taskType, groupName, false)"
              :title="$t('templatesManagement.hideGroup')">
              <span class="mdi mdi-eye-off"></span>
            </button>
            <button 
              class="btn btn-sm btn-outline-secondary"
              @click="$emit('setGroupVisibility', taskType, groupName, true)"
              :title="$t('templatesManagement.showGroup')">
              <span class="mdi mdi-eye"></span>
            </button>
          </div>
        </div>
        <div class="row mt-2">
          <div v-for="template in templates" :key="template.id" class="col-md-6 col-lg-4 mb-2">
            <div class="card h-100 template-card" :class="{ 'border-primary': focused === template }">
              <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h6 class="card-title m-0">{{ template.name }}</h6>
                </div>
                <p class="card-text small text-muted mb-2">{{ template.tooltip }}</p>
                <div class="d-flex justify-content-between align-items-center">
                  <div class="d-flex flex-column">
                    <small>{{ $t('version') }} {{ template.version }}</small>
                    <small class="text-muted">{{ taskType }}</small>
                  </div>
                  <div>
                    <button 
                      class="template-buttons btn btn-sm btn-outline-secondary me-1"
                      @click="$emit('editTemplate', template.template)"
                      :title="$t('templatesManagement.edit')">
                      <span class="mdi mdi-pencil-outline"></span>
                    </button>
                    <button 
                      class="template-buttons btn btn-sm btn-outline-secondary me-1"
                      @click="$emit('exportSingleTemplate', template.template)"
                      :title="$t('templatesManagement.export')">
                      <span class="mdi mdi-download"></span>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary me-1 mdi"
                      :class="[
                        template.template.active ? 'mdi-eye' : 'mdi-eye-off'
                      ]"
                      @click="$emit('toggleTemplateVisibility', template.template)"
                      :title="template.template.active ? $t('templatesManagement.visible') : $t('templatesManagement.hidden')">
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="Object.keys(categorizedTemplates).length === 0" class="text-center text-muted py-5">
      <h5>{{ $t('noTemplates') }}</h5>
    </div>
  </div>
</template>

<script setup>
defineProps({
  categorizedTemplates: {
    type: Object,
    required: true,
    default: () => ({})
  },
  focused: {
    type: Object,
    default: null
  }
})

defineEmits([
  'setGroupVisibility',
  'toggleTemplateVisibility', 
  'editTemplate',
  'exportSingleTemplate'
])
</script>

<style scoped>
/* Hide buttons by default */
.template-buttons {
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

/* Show buttons on hover or focus of parent containers */
.template-group-header:hover .template-buttons,
.template-group-header:focus-within .template-buttons,
.template-card:hover .template-buttons,
.template-card:focus-within .template-buttons {
  opacity: 1;
}

/* Ensure buttons are visible when focused directly */
.template-buttons:focus-within {
  opacity: 1;
}

/* Ensure buttons inside focused elements are accessible */
.template-buttons button:focus {
  opacity: 1;
}
</style>
