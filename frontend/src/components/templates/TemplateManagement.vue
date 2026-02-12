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
  <div class="h-100 d-flex flex-column">
    <!-- Header -->
    <div class="row mx-0 align-items-center text-center border-bottom px-3 bg-white" style="min-height: 55px">
      <div class="col-6 px-0 text-start">
        <button type="button"
                class="btn btn-outline-secondary mdi mdi-18px mdi-arrow-left border-0"
                :title="$t('templatesManagement.back')"
          @click="$router.back()">
        </button>
        <span>
          <h5 :title="$t('templatesManagement.title')"
            class="m-0 ms-1 py-1 ps-3 text-truncate d-inline-block fw-normal"
            style="vertical-align: middle">
              {{ $t('templatesManagement.title') }}
          </h5>
        </span>
      </div>
    </div>

    <!-- Main content styling matching StorageView -->
    <div class="bg-light pt-3 px-3 flex-grow-1 d-flex flex-column h-100">
      <div class="h-100 d-flex flex-column bg-white border rounded shadow-sm mb-3">

        <!-- Search and Filter Bar -->
        <div class="border-bottom border-light">
          <div class="row align-items-end p-4">

            <!-- Search Bar with Statistics -->
            <div class="col-6">
              <div class="border rounded d-flex align-items-center" style="height: 38px;">
                <button
                  @click.stop="refreshSearch"
                  class="btn btn-link btn-sm mdi mdi-magnify mdi-18px text-secondary py-0 px-2 flex-shrink-0"
                  :title="$t('buttons.search')">
                </button>
                <div class="flex-grow-1">
                  <input
                    type="text"
                    v-model.trim="searchInput"
                    :placeholder="$t('buttons.searchTemplates')"
                    class="form-control-plaintext form-control-sm w-100 py-0 border-0"
                    style="height: 32px; line-height: 32px;"
                    @input="handleSearch"
                  />
                </div>
                <div class="text-secondary ms-2 me-2 text-nowrap small flex-shrink-0"
                  :title="'Templates: ' + getStatistics()"
                >{{ getStatistics() }}</div>
              </div>
            </div>

            <!-- Actions and View Toggle -->
            <div class="col-5 d-flex justify-content-end align-items-end">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary me-2"
                style="height: 32px;"
                @click="openTemplateCreationDialog">
                <span class="mdi mdi-plus me-1"></span>{{ $t('templatesManagement.addTemplate') }}
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary me-2"
                style="height: 32px;"
                @click="exportAllTemplates">
                <span class="mdi mdi-download me-1"></span>{{ $t('templatesManagement.exportAll')}}
              </button>
            </div>

            <!-- View Toggle Dropdown -->
            <div class="col-1 d-flex justify-content-end align-items-end">
              <div class="dropdown">
                <button 
                  class="btn btn-sm btn-outline-secondary dropdown-toggle d-flex align-items-center justify-content-center" 
                  type="button" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                  style="height: 32px; width: 40px;"
                  :title="getCurrentViewTitle()">
                  <span :class="getCurrentViewIcon()"></span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" style="z-index:1021">
                  <li>
                    <a 
                      class="dropdown-item d-flex align-items-center" 
                      href="#" 
                      @click.prevent="viewMode = 'table'"
                      :class="{ 'active': viewMode === 'table' }">
                      <span class="mdi mdi-16px mdi-table me-2"></span>
                      {{ $t('templatesManagement.tableView') }}
                    </a>
                  </li>
                  <li>
                    <a 
                      class="dropdown-item d-flex align-items-center" 
                      href="#" 
                      @click.prevent="viewMode = 'categorized'"
                      :class="{ 'active': viewMode === 'categorized' }">
                      <span class="mdi mdi-16px mdi-view-list me-2"></span>
                      {{ $t('templatesManagement.categorizedView') }}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Templates Display Container -->
        <div class="flex-grow-1 rounded g-0 overflow-auto" @scroll="handleScroll">

            <!-- Table View -->
            <CibsevenTable
              class="h-100"
              v-if="viewMode === 'table'"
              striped
              table-class="table-responsive text-break"
              thead-class="sticky-top"
              :items="visibleTemplates"
              :fields="tableHeaders"
              :clickable-rows="false"
              @click="focused = $event" 
              @mouseenter="focused = $event" 
              @mouseleave="focused = null"
              style="min-height: 55px;">
              <template #cell(active)="{ item }">
                <span
                  :title="isTemplatedExcludedInConfig(item)? $t('templatesManagement.disabledInConfig') : item.active? $t('templatesManagement.available') : $t('templatesManagement.hidden')">
                  <button
                    type="button"
                    class="btn btn-link p-0 mdi"
                    :disabled="isTemplatedExcludedInConfig(item)"
                    :class="[
                      item.active ? 'mdi-eye' : 'mdi-eye-off',
                      'text-secondary',
                      isTemplatedExcludedInConfig(item) ? 'disabled-icon': 'clickable-icon cursor-pointer',
                    ]"
                    @click="toggleTemplateVisibility(item)">
                  </button>
                </span>
              </template>
              <template #cell(createdBy)="{ item }">
                <span v-if="item.createdBy" class="mdi mdi-account">
                  {{item.createdBy}}
                </span>
                <span v-else class="text-muted fst-italic">
                  {{ $t('templatesManagement.system') }}
                </span>
              </template>
              <template #cell(updatedBy)="{ item }">
                <span v-if="item.updatedBy" class="mdi mdi-account">
                  {{item.updatedBy}}
                </span>
                <span v-else class="text-muted fst-italic">
                  {{ $t('templatesManagement.system') }}
                </span>
              </template>
              <template #cell(actions)="{ item }">
                <button 
                  :disabled="focused !== item" 
                  style="opacity: 1"
                  class="btn btn-link px-2 border-0 shadow-none"
                  @click.stop="editTemplate(item)"
                  :title="$t('templatesManagement.edit')">
                  <span class="mdi mdi-18px mdi-pencil-outline"></span>
                </button>
                <span class="border-start h-50" :class="focused === item ? 'border-secondary' : ''"></span>
                <button 
                  :disabled="focused !== item" 
                  style="opacity: 1"
                  class="btn btn-link px-2 border-0 shadow-none"
                  @click.stop="exportSingleTemplate(item)"
                  :title="$t('templatesManagement.export')">
                  <span class="mdi mdi-18px mdi-download"></span>
                </button>
              </template>
              <template #emptyState>
                <!-- No templates text -->
                <div v-if="!errorFetchingTemplates" class="text-center text-muted pt-3">
                  {{ $t('noTemplates') }}
                </div>
                <!-- Error text -->
                <div v-else class="text-center text-danger pt-3 d-inline-flex align-items-center gap-1">
                  <span class="mdi mdi-alert-circle-outline mdi-24px"></span>
                  <span>{{ $t('toastLoadTemplateJson.body') }}</span>
                </div>
              </template>
            </CibsevenTable>

            <!-- Categorized View -->
            <CategorizedTemplateView
              v-if="viewMode === 'categorized'"
              :categorizedTemplates="categorizedTemplates"
              :focused="focused"
              @setGroupVisibility="setGroupVisibility"
              @toggleTemplateVisibility="toggleTemplateVisibility"
              @editTemplate="editTemplate"
              @exportSingleTemplate="exportSingleTemplate"
            />

            <!-- Empty State -->
            <div v-if="!visibleTemplates.length && !errorFetchingTemplates" class="text-center py-5">
              <div class="h5 text-secondary">{{ $t('noTemplates') }}</div>
            </div>

            <!-- Loading indicator for lazy loading -->
            <div v-if="isLoading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm d-inline me-2" role="status" style="width: 35px; height: 35px;">
                <span class="visually-hidden">{{ $t('templatesManagement.loadingMoreTemplates') }}</span>
              </div>
              {{ $t('templatesManagement.loadingMoreTemplates') }}
            </div>

            <!-- End of results indicator -->
            <div v-if="visibleTemplates.length > 0 && !hasMoreTemplates && !isLoading" class="text-center py-3">
              <small class="text-muted">{{ $t('templatesManagement.allTemplatesLoaded') }}</small>
            </div>

        </div>
      </div>
    </div>
    
    <!-- Add Element Template Modal -->
    <AddElementTemplateModal
      ref="addElementTemplateModal"
      @templateCreated="handleTemplateCreated" />
  </div>
</template>

<script setup>

import { ref, inject, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import CibsevenTable from '../CibsevenTable.vue'
import { applicableTaskTypes, categorizeTemplates } from './elementTemplateUtils';
import AddElementTemplateModal from './AddElementTemplateModal.vue';
import CategorizedTemplateView from './CategorizedTemplateView.vue';

let config = inject('config')
const store = useStore()

const searchInput = ref('')
const viewMode = ref('table')
const focused = ref(null)

// Use store state instead of local refs
const templates = computed(() => store.getters['elementTemplates/allElementTemplates'])
const filteredTemplates = ref([])

// Lazy loading state
const pageSize = ref(20) // Number of templates to show per "page"
const currentPage = ref(1)
const isLoading = ref(false)
const hasMoreTemplates = ref(true)

const errorFetchingTemplates = ref(false)

const addElementTemplateModal = ref(null);

const tableHeaders = ref([
    { key: 'active', label: '', class: 'text-center' },
    { key: 'name', label: 'Name', class: 'col' },
    { key: 'templateId', label: 'Template ID', class: 'col' },
    { key: 'createdBy', label: 'Created by', class: 'col' },
    { key: 'updatedBy', label: 'Updated by', class: 'col' },
    { key: 'actions', label: 'Actions', class: 'col text-center'}
])

// Computed property for visible templates with lazy loading
const visibleTemplates = computed(() => {
    const totalVisible = currentPage.value * pageSize.value
    return filteredTemplates.value.slice(0, totalVisible)
})

// Update hasMoreTemplates based on visible vs total
const updateHasMore = () => {
    hasMoreTemplates.value = visibleTemplates.value.length < filteredTemplates.value.length
}

// Computed property for categorized templates that respects search filtering
const categorizedTemplates = computed(() => {
  return categorizeTemplates(filteredTemplates.value, { preserveOriginalTemplate: true })
})

onMounted(async () => {
    try {
        // Initialize excludeTemplates in store from config
        if (config && config.modeler?.excludeTemplates) {
            await store.dispatch('elementTemplates/setExcludeTemplates', config.modeler.excludeTemplates)
        }
        
        // Templates are now fetched globally at application startup in CibsevenModeler.vue
        // No need to fetch them again here - just use what's already in the store
        
        // Process templates for config exclusions
        const processedTemplates = templates.value.map(template => {
            if (template.active) {
                // Check if template should be disabled based on config
                const excludedInConfig = store.getters['elementTemplates/isTemplateExcluded'](template)
                if (excludedInConfig) {
                    template.active = false // Disable template if it's excluded in config
                }
            }
            return template
        })
        
        errorFetchingTemplates.value = false
        filteredTemplates.value = processedTemplates
    } catch (error) {
        console.error('Error processing templates:', error)
        errorFetchingTemplates.value = true
        filteredTemplates.value = []
    } finally {
        updateHasMore() // Initialize hasMoreTemplates state
    }
})

/**
 * Tries to get a proper/pretty name for the template type from the `config.json` itself.
 * @param appliesTo {List} The "type" or "appliesTo" property of the template.
 */
const parseToTemplateTypes = (appliesTo) => {
    if (!Array.isArray(appliesTo)) {
        return '-' // Cannot parse
    }

    return appliesTo.map(type => applicableTaskTypes[type] ?? type).join(', ')
}


const isTemplatedExcludedInConfig = (template) => store.getters['elementTemplates/isTemplateExcluded'](template)

/**
 * Toggles template visibility using the new switchTemplateActiveState action
 * This method automatically switches the template from active to inactive and vice versa
 * without needing to specify the target state
 */
const toggleTemplateVisibility = async (template) => {
    try {
        await store.dispatch('elementTemplates/switchTemplateActiveState', template.id)
        
        // Reapply search filter after updating visibility
        handleSearch()
    } catch (error) {
        console.error('Error switching template active state:', error)
        // The store already handles removing templates that no longer exist (404 errors)
        // Just need to refresh the filtered list
        handleSearch()
    }
}

/**
 * Sets visibility for an entire group of templates
 */
const setGroupVisibility = async (taskType, groupName, isVisible) => {
    try {
        const result = await store.dispatch('elementTemplates/setGroupVisibility', {
            taskType,
            groupName,
            isVisible
        })
        
        // Refresh the filtered list to reflect changes
        handleSearch()
    } catch (error) {
        console.error('Error setting group visibility:', error)
    }
}

const handleSearch = () => {
    // Reset pagination when searching
    currentPage.value = 1
    
    if (!searchInput.value.trim()) {
        filteredTemplates.value = templates.value
        updateHasMore()
        return
    }

    const searchTerm = searchInput.value.trim().toLowerCase()

    // Search for match through each property
    filteredTemplates.value = templates.value.filter(template => {
        const hasMatchForTemplate =  Object.values(template).flatMap(
            property => (property ?? "").toString().toLowerCase() // To lowercase for case-insensitive search
        ).some(property => property.includes(searchTerm))

        return hasMatchForTemplate
    })
    
    updateHasMore()
}

// Load more templates when scrolling
const loadMoreTemplates = () => {
    if (!isLoading.value && hasMoreTemplates.value) {
        isLoading.value = true
        
        // Simulate async operation (since we're doing client-side pagination)
        setTimeout(() => {
            currentPage.value++
            updateHasMore()
            isLoading.value = false
        }, 100)
    }
}

// Handle scroll events for lazy loading
const handleScroll = (event) => {
    const { target } = event
    const threshold = 100 // Load more when within 100px of bottom
    
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
        loadMoreTemplates()
    }
}

const openTemplateCreationDialog = () => {
    addElementTemplateModal.value.show()
}

const editTemplate = (template) => {
    // Set the template to be edited in the modal
    if (addElementTemplateModal.value && addElementTemplateModal.value.setEditTemplate) {
        addElementTemplateModal.value.setEditTemplate(template)
        addElementTemplateModal.value.show()
    }
}

const handleTemplateCreated = (template) => {
    // Refresh the templates list to show the changes
    handleSearch()
    
    // Optional: Show success feedback (could be implemented with a toast notification)
    // For now, the modal itself shows the success message
}

const getStatistics = () => {
    if (searchInput.value.trim()) {
        return `${filteredTemplates.value.length} / ${templates.value.length}`
    }
    return `${templates.value.length}`
}

const exportAllTemplates = async () => {
    try {
        // Get only the content fields from all active templates
        const templateContents = store.getters['elementTemplates/allElementTemplateContents'] || []
        
        // Create and download JSON file with array of content objects
        const dataStr = JSON.stringify(templateContents, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
        
        const exportFileDefaultName = `element-templates-${new Date().toISOString().split('T')[0]}.json`
        
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
    } catch (error) {
        console.error('Error exporting templates:', error)
    }
}

const refreshSearch = () => {
    handleSearch()
}

const getCurrentViewTitle = () => {
    switch (viewMode.value) {
        case 'table': return 'Table View'
        case 'cards': return 'Card View'
        case 'categorized': return 'Categorized View'
        case 'list': return 'List View'
        case 'compactlist': return 'Compact List View'
        default: return 'Table View'
    }
}

const getCurrentViewIcon = () => {
    switch (viewMode.value) {
        case 'table': return 'mdi mdi-table'
        case 'cards': return 'mdi mdi-view-grid'
        case 'categorized': return 'mdi mdi-view-list'
        case 'list': return 'mdi mdi-view-list'
        case 'compactlist': return 'mdi mdi-view-agenda'
        default: return 'mdi mdi-table'
    }
}

const exportSingleTemplate = async (template) => {
    try {
        // Get the template content by parsing the content field
        let templateContent = null
        if (template.content && template.content.trim() !== '') {
            templateContent = JSON.parse(template.content)
        } else {
            console.error('Template has empty or null content:', template.templateId)
            alert('Cannot export template: content is empty or invalid.')
            return
        }
        
        // Create and download JSON file with just the content object
        const dataStr = JSON.stringify(templateContent, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
        
        const exportFileDefaultName = `${template.templateId || template.name}-${new Date().toISOString().split('T')[0]}.json`
        
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
    } catch (error) {
        console.error('Error exporting template:', error)
        alert('Failed to export template. Please try again.')
    }
}

</script>
