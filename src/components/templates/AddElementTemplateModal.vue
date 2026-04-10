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
  <div class="modal fade" ref="modalElement" tabindex="-1" aria-labelledby="addTemplateModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <!-- Modal Header -->
        <div class="modal-header">
          <h5 class="modal-title d-flex align-items-center" id="addTemplateModalLabel">
            <i :class="isEditMode ? 'mdi mdi-pencil-outline me-2' : 'mdi mdi-plus-circle-outline me-2'"></i>
            {{ isEditMode ? $t('templatesManagement.editTemplateDialog.title') : $t('templatesManagement.addTemplateDialog.title') }}
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="closeModal" aria-label="Close"></button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body p-0">
          <!-- Progress Steps Indicator -->
          <div class="bg-light border-bottom px-4 py-2">
            <div class="d-flex align-items-center text-muted small">
              <span v-if="currentStep === 'upload'" class="d-flex align-items-center me-3 fw-bold text-secondary">
                <i class="mdi mdi-file-upload-outline me-1"></i>
                {{ $t('templatesManagement.addTemplateDialog.fileImport') }}
              </span>
              <span v-if="currentStep === 'form'" class="d-flex align-items-center fw-bold text-secondary">
                <i class="mdi mdi-form-select me-1"></i>
                {{ $t('templatesManagement.addTemplateDialog.manualEntry') }}
              </span>
            </div>
          </div>

          <!-- Content Area -->
          <div class="p-3">
            <!-- Error Alert -->
            <div v-if="errorMessage" class="alert alert-danger d-flex align-items-center mb-4" role="alert">
              <i class="mdi mdi-alert-circle-outline me-2"></i>
              <div>{{ errorMessage }}</div>
            </div>

            <!-- Success Alert -->
            <div v-if="successMessage" class="alert alert-success d-flex align-items-center mb-4" role="alert">
              <i class="mdi mdi-check-circle-outline me-2"></i>
              <div>{{ successMessage }}</div>
            </div>

            <!-- Manual Form Entry -->
            <div v-show="currentStep === 'form'" class="form-section">
              <div class="row g-4">
                <!-- Template ID -->
                <div class="col-md-6">
                  <label for="templateId" class="form-label required">
                    {{ $t('templatesManagement.addTemplateDialog.templateId') }}
                  </label>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="templateId" 
                    v-model="form.templateId"
                    :class="{ 'is-invalid': errors.templateId, 'is-valid': form.templateId && !errors.templateId }"
                    @blur="validateField('templateId')"
                    @input="clearFieldError('templateId')"
                    :placeholder="$t('templatesManagement.addTemplateDialog.templateIdPlaceholder')"
                  />
                  <div v-if="errors.templateId" class="invalid-feedback">
                    {{ errors.templateId }}
                  </div>
                </div>

                <!-- Template Name -->
                <div class="col-md-6">
                  <label for="templateName" class="form-label required">
                    {{ $t('templatesManagement.addTemplateDialog.name') }}
                  </label>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="templateName" 
                    v-model="form.name"
                    :class="{ 'is-invalid': errors.name, 'is-valid': form.name && !errors.name }"
                    @blur="validateField('name')"
                    @input="clearFieldError('name')"
                    :placeholder="$t('templatesManagement.addTemplateDialog.namePlaceholder')"
                  />
                  <div v-if="errors.name" class="invalid-feedback">
                    {{ errors.name }}
                  </div>
                </div>

                <!-- Description -->
                <div class="col-12">
                  <label for="description" class="form-label">
                    {{ $t('templatesManagement.addTemplateDialog.description') }}
                  </label>
                  <textarea 
                    class="form-control" 
                    id="description" 
                    v-model="form.description"
                    rows="3"
                    :placeholder="$t('templatesManagement.addTemplateDialog.descriptionPlaceholder')"
                  ></textarea>
                  <div class="form-text">
                    {{ $t('templatesManagement.addTemplateDialog.descriptionHelp') }}
                  </div>
                </div>

                <!-- Content JSON -->
                <div class="col-12">
                  <label for="content" class="form-label required">
                    {{ $t('templatesManagement.addTemplateDialog.content') }}
                  </label>
                  <div class="position-relative">
                    <textarea 
                      class="form-control font-monospace" 
                      id="content" 
                      v-model="form.content" 
                      rows="8"
                      :class="{ 'is-invalid': errors.content, 'is-valid': form.content && !errors.content && isValidJson }"
                      @blur="validateField('content')"
                      @input="handleContentInput"
                      :placeholder="$t('templatesManagement.addTemplateDialog.contentPlaceholder')"
                    ></textarea>
                    
                    <!-- JSON Format Button -->
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary btn-sm position-absolute"
                      style="top: 8px; right: 8px; z-index: 10;"
                      @click="formatJson"
                      :disabled="!form.content"
                      :title="$t('templatesManagement.addTemplateDialog.formatJson')"
                    >
                      <i class="mdi mdi-code-braces"></i>
                    </button>
                  </div>
                  
                  <div v-if="errors.content" class="invalid-feedback d-block">
                    {{ errors.content }}
                  </div>
                  <div v-else-if="isValidJson && form.content" class="valid-feedback d-block">
                    <i class="mdi mdi-check me-1"></i>{{ $t('templatesManagement.addTemplateDialog.validJson') }}
                  </div>
                  <div class="form-text">
                    {{ $t('templatesManagement.addTemplateDialog.contentHelp') }}
                  </div>
                </div>

                <!-- Active Toggle -->
                <div class="col-12">
                  <div class="form-check form-switch">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      id="active" 
                      v-model="form.active"
                    />
                    <label class="form-check-label" for="active">
                      {{ $t('templatesManagement.addTemplateDialog.active') }}
                    </label>
                    <div class="form-text">
                      {{ $t('templatesManagement.addTemplateDialog.activeHelp') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- File Import Section -->
            <div v-show="currentStep === 'upload'" class="upload-section">
              <div class="row g-4">
                <div class="col-12">
                  <!-- Import Mode Selection -->
                  <div class="mb-3">
                    <p class="form-label">{{ $t('templatesManagement.addTemplateDialog.importMode') }}</p>
                    <div class="btn-group w-100" role="group">
                      <input type="radio" class="btn-check" id="singleMode" v-model="importMode" value="single" autocomplete="off">
                      <label class="btn btn-outline-secondary" for="singleMode">
                        <i class="mdi mdi-file-document-outline me-2"></i>{{ $t('templatesManagement.addTemplateDialog.singleTemplate') }}
                      </label>
                      
                      <input type="radio" class="btn-check" id="multipleMode" v-model="importMode" value="multiple" autocomplete="off">
                      <label class="btn btn-outline-secondary" for="multipleMode">
                        <i class="mdi mdi-file-multiple-outline me-2"></i>{{ $t('templatesManagement.addTemplateDialog.multipleFiles') }}
                      </label>
                      
                      <input type="radio" class="btn-check" id="batchMode" v-model="importMode" value="batch" autocomplete="off">
                      <label class="btn btn-outline-secondary" for="batchMode">
                        <i class="mdi mdi-package-variant me-2"></i>{{ $t('templatesManagement.addTemplateDialog.batchFile') }}
                      </label>
                    </div>
                  </div>

                  <!-- File Input -->
                  <div class="mb-3">
                    <label for="fileInput" class="form-label">
                      {{ getFileInputLabel() }}
                    </label>
                    <input 
                      ref="fileInput"
                      id="fileInput"
                      type="file" 
                      class="form-control" 
                      accept=".json,.txt"
                      :multiple="importMode === 'multiple'"
                      @change="handleFileSelection"
                      :disabled="isLoading"
                    />
                    <div class="form-text">
                      {{ getFileInputHelp() }}
                    </div>
                  </div>

                  <!-- Selected Files Info -->
                  <div v-if="uploadedFiles.length > 0">
                    <!-- Single file mode -->
                    <div v-if="importMode === 'single' || importMode === 'batch'" class="alert alert-info d-flex align-items-center mb-3">
                      <i class="mdi mdi-file-document-outline me-2"></i>
                      <div class="flex-grow-1">
                        <strong>{{ uploadedFiles[0].name }}</strong>
                        <span class="badge bg-secondary ms-2">{{ formatFileSize(uploadedFiles[0].size) }}</span>
                      </div>
                      <div class="ms-2">
                        <button type="button" class="btn btn-success btn-sm me-2" @click="processFiles" :disabled="isLoading" :title="isLoading ? $t('templatesManagement.addTemplateDialog.processing') : $t('templatesManagement.addTemplateDialog.useThisFile')">
                          <div v-if="isLoading" class="spinner-border spinner-border-sm" role="status">
                            <span class="visually-hidden">Loading...</span>
                          </div>
                          <i v-else class="mdi mdi-check"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" @click="removeFiles" :disabled="isLoading" :title="$t('templatesManagement.addTemplateDialog.removeFile')">
                          <i class="mdi mdi-delete"></i>
                        </button>
                      </div>
                    </div>
                    
                    <!-- Multiple files mode -->
                    <div v-else-if="importMode === 'multiple'" class="card">
                      <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">
                          <i class="mdi mdi-file-multiple-outline me-2"></i>
                          {{ $t('templatesManagement.addTemplateDialog.selectedFiles') }} ({{ uploadedFiles.length }})
                        </h6>
                        <div>
                          <button type="button" class="btn btn-success btn-sm me-2" @click="processFiles" :disabled="isLoading">
                            <div v-if="isLoading" class="spinner-border spinner-border-sm me-1" role="status">
                              <span class="visually-hidden">Loading...</span>
                            </div>
                            <i v-else class="mdi mdi-check me-1"></i>
                            {{ $t('templatesManagement.addTemplateDialog.importAll') }}
                          </button>
                          <button type="button" class="btn btn-outline-secondary btn-sm" @click="removeFiles" :disabled="isLoading">
                            <i class="mdi mdi-delete"></i>
                          </button>
                        </div>
                      </div>
                      <div class="card-body p-0">
                        <div class="list-group list-group-flush">
                          <div v-for="(file, index) in uploadedFiles" :key="index" class="list-group-item d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                              <i class="mdi mdi-file-document-outline me-2 text-primary"></i>
                              <div>
                                <div class="fw-medium">{{ file.name }}</div>
                                <small class="text-muted">{{ formatFileSize(file.size) }}</small>
                              </div>
                            </div>
                            <button type="button" class="btn btn-outline-danger btn-sm" @click="removeFile(index)" :disabled="isLoading">
                              <i class="mdi mdi-close"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- File Processing Result -->
                <div v-if="fileProcessingResult" class="col-12">
                  <div class="card">
                    <div class="card-header bg-light">
                      <h6 class="card-title mb-0">
                        <i class="mdi mdi-information-outline me-2"></i>
                        {{ $t('templatesManagement.addTemplateDialog.extractedData') }}
                      </h6>
                    </div>
                    <div class="card-body">
                      <div class="row g-3">
                        <div class="col-md-6">
                          <strong>{{ $t('templatesManagement.addTemplateDialog.templateId') }}:</strong>
                          <span class="ms-2">{{ fileProcessingResult.templateId || 'N/A' }}</span>
                        </div>
                        <div class="col-md-6">
                          <strong>{{ $t('templatesManagement.addTemplateDialog.name') }}:</strong>
                          <span class="ms-2">{{ fileProcessingResult.name || 'N/A' }}</span>
                        </div>
                        <div class="col-12">
                          <strong>{{ $t('templatesManagement.addTemplateDialog.description') }}:</strong>
                          <span class="ms-2">{{ fileProcessingResult.description || $t('templatesManagement.addTemplateDialog.noDescription') }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step Navigation -->
            <div class="mt-4 pt-3 border-top">
              <div class="d-flex justify-content-between align-items-center">
                <div class="btn-group" role="group">
                  <button 
                    type="button" 
                    class="btn btn-outline-secondary"
                    :class="{ active: currentStep === 'upload' }"
                    @click="currentStep = 'upload'"
                  >
                    <i class="mdi mdi-file-upload-outline me-2"></i>{{ $t('templatesManagement.addTemplateDialog.fileImport') }}
                  </button>
                  <button 
                    type="button" 
                    class="btn btn-outline-secondary"
                    :class="{ active: currentStep === 'form' }"
                    @click="currentStep = 'form'"
                  >
                    <i class="mdi mdi-form-select me-2"></i>{{ $t('templatesManagement.addTemplateDialog.manualEntry') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer bg-light">
          <div class="d-flex justify-content-between align-items-center w-100">
            <div class="text-muted small">
              <i class="mdi mdi-information-outline me-1"></i>
              <span v-if="currentStep === 'form'">{{ $t('templatesManagement.addTemplateDialog.formHelp') }}</span>
              <span v-else>{{ $t('templatesManagement.addTemplateDialog.uploadHelp') }}</span>
            </div>
            <div class="d-flex gap-2">
              <button 
                type="button" 
                class="btn btn-secondary" 
                @click="closeModal"
                :disabled="isLoading"
              >
                {{ $t('templatesManagement.addTemplateDialog.cancel') }}
              </button>
              <button 
                type="button" 
                class="btn btn-secondary d-flex align-items-center"
                @click="submitForm"
                :disabled="!canSubmit || isLoading"
              >
                <div v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <i v-else class="mdi mdi-content-save me-2"></i>
                {{ isLoading ? $t('templatesManagement.addTemplateDialog.saving') : $t('templatesManagement.addTemplateDialog.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.js'

// Composables
const store = useStore()
const { t } = useI18n()

// Template refs
const modalElement = ref(null)
const fileInput = ref(null)

// State
const currentStep = ref('upload')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const uploadedFiles = ref([])
const fileProcessingResult = ref(null)
const importMode = ref('single')
const importResults = ref([])
const isEditMode = ref(false)
const editingTemplate = ref(null)

// Form data
const form = reactive({
  templateId: '',
  name: '',
  description: '',
  content: '',
  active: true
})

// Form validation
const errors = reactive({
  templateId: '',
  name: '',
  content: ''
})

// Bootstrap Modal Instance
let modalInstance = null

// Computed properties
const isValidJson = computed(() => {
  if (!form.content.trim()) return false
  try {
    JSON.parse(form.content)
    return true
  } catch {
    return false
  }
})

const canSubmit = computed(() => {
  return form.templateId.trim() && 
         form.name.trim() && 
         form.content.trim() && 
         isValidJson.value &&
         !Object.values(errors).some(error => error)
})

// Emits
const emit = defineEmits(['templateCreated'])

// Methods
const validateField = (fieldName) => {
  switch (fieldName) {
    case 'templateId':
      if (!form.templateId.trim()) {
        errors.templateId = t('templatesManagement.addTemplateDialog.templateIdRequired')
      } else if (!/^[a-zA-Z0-9-_.:]+$/.test(form.templateId)) {
        errors.templateId = t('templatesManagement.addTemplateDialog.templateIdInvalid')
      } else {
        errors.templateId = ''
      }
      break
    
    case 'name':
      if (!form.name.trim()) {
        errors.name = t('templatesManagement.addTemplateDialog.nameRequired')
      } else {
        errors.name = ''
      }
      break
    
    case 'content':
      if (!form.content.trim()) {
        errors.content = t('templatesManagement.addTemplateDialog.contentRequired')
      } else if (!isValidJson.value) {
        errors.content = t('templatesManagement.addTemplateDialog.invalidJsonError')
      } else {
        errors.content = ''
      }
      break
  }
}

const clearFieldError = (fieldName) => {
  errors[fieldName] = ''
}

const handleContentInput = () => {
  clearFieldError('content')
  // Auto-validate after a delay
  setTimeout(() => {
    if (form.content.trim()) {
      validateField('content')
    }
  }, 500)
}

const formatJson = () => {
  try {
    if (form.content.trim()) {
      const parsed = JSON.parse(form.content)
      form.content = JSON.stringify(parsed, null, 2)
      clearFieldError('content')
    }
  } catch {
    errors.content = t('templatesManagement.addTemplateDialog.invalidJsonError')
  }
}

const validateForm = () => {
  validateField('templateId')
  validateField('name') 
  validateField('content')
  
  return !Object.values(errors).some(error => error)
}

const resetForm = () => {
  form.templateId = ''
  form.name = ''
  form.description = ''
  form.content = ''
  form.active = true
  
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })
  
  currentStep.value = 'upload'
  errorMessage.value = ''
  successMessage.value = ''
  uploadedFiles.value = []
  fileProcessingResult.value = null
  importResults.value = []
  isEditMode.value = false
  editingTemplate.value = null
}

const setEditTemplate = (template) => {
  isEditMode.value = true
  editingTemplate.value = template
  
  // Populate form with template data
  form.templateId = template.templateId || ''
  form.name = template.name || ''
  form.description = template.description || ''
  form.content = template.content || ''
  form.active = template.active !== undefined ? template.active : true
  
  // Clear any existing errors
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })
  
  // Start with form view when editing
  currentStep.value = 'form'
  errorMessage.value = ''
  successMessage.value = ''
  uploadedFiles.value = []
  fileProcessingResult.value = null
}

const submitForm = async () => {
  if (!validateForm()) {
    errorMessage.value = t('templatesManagement.addTemplateDialog.validationErrors')
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const templateData = {
      templateId: form.templateId.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      content: form.content.trim(),
      active: form.active
    }

    let resultTemplate
    if (isEditMode.value) {
      // Update existing template
      resultTemplate = await store.dispatch('modeler/elementTemplates/updateElementTemplateFull', {
        templateId: editingTemplate.value.id,
        templateData: templateData
      })
      successMessage.value = t('templatesManagement.editTemplateDialog.updateSuccess', { name: form.name })
    } else {
      // Create new template
      resultTemplate = await store.dispatch('modeler/elementTemplates/createElementTemplate', templateData)
      successMessage.value = t('templatesManagement.addTemplateDialog.createSuccess', { name: form.name })
    }
    
    // Emit event to parent component
    emit('templateCreated', resultTemplate)
    
    // Close modal after short delay
    setTimeout(() => {
      closeModal()
    }, 1500)

  } catch (error) {
    console.error(`Error ${isEditMode.value ? 'updating' : 'creating'} template:`, error)
    const errorKey = isEditMode.value ? 'editTemplateDialog.updateError' : 'addTemplateDialog.createError'
    errorMessage.value = error.response?.data?.message || 
                        error.message || 
                        t(`templatesManagement.${errorKey}`)
  } finally {
    isLoading.value = false
  }
}

// File handling methods
const handleFileSelection = (event) => {
  const files = Array.from(event.target.files)
  uploadedFiles.value = []
  errorMessage.value = ''
  
  if (files.length === 0) return
  
  // Validate each file
  for (const file of files) {
    if (!validateFile(file)) return
  }
  
  uploadedFiles.value = files
  fileProcessingResult.value = null
  importResults.value = []
}

const validateFile = (file) => {
  // Validate file type
  const allowedTypes = ['.json', '.txt']
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
  
  if (!allowedTypes.includes(fileExtension)) {
    errorMessage.value = t('templatesManagement.addTemplateDialog.unsupportedFileType')
    return false
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    errorMessage.value = t('templatesManagement.addTemplateDialog.fileTooLarge')
    return false
  }
  
  return true
}

const removeFiles = () => {
  uploadedFiles.value = []
  fileProcessingResult.value = null
  importResults.value = []
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const removeFile = (index) => {
  uploadedFiles.value.splice(index, 1)
  if (uploadedFiles.value.length === 0) {
    removeFiles()
  }
}

const processFiles = async () => {
  if (uploadedFiles.value.length === 0) return

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  importResults.value = []

  try {
    if (importMode.value === 'single') {
      await processSingleFile()
    } else if (importMode.value === 'multiple') {
      await processMultipleFiles()
    } else if (importMode.value === 'batch') {
      await processBatchFile()
    }
  } catch (error) {
    console.error('Error processing files:', error)
    errorMessage.value = error.message || t('templatesManagement.addTemplateDialog.fileProcessingError')
  } finally {
    isLoading.value = false
  }
}

const processSingleFile = () => {
  return new Promise((resolve, reject) => {
    const file = uploadedFiles.value[0]
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const content = event.target.result
        const jsonData = JSON.parse(content)
        
        // Validate required fields
        const requiredFields = ['id', 'name']
        const missingFields = requiredFields.filter(field => !jsonData[field])
        
        if (missingFields.length > 0) {
          reject(new Error(t('templatesManagement.addTemplateDialog.missingRequiredFields', { 
            fields: missingFields.join(', ') 
          })))
          return
        }
        
        // Validate appliesTo field
        if (jsonData.appliesTo && !Array.isArray(jsonData.appliesTo)) {
          reject(new Error(t('templatesManagement.addTemplateDialog.invalidAppliesTo')))
          return
        }
        
        // Fill form with data
        form.templateId = jsonData.id || ''
        form.name = jsonData.name || ''
        form.description = jsonData.description || ''
        form.content = JSON.stringify(jsonData, null, 2)
        form.active = true
        
        // Clear validation errors
        Object.keys(errors).forEach(key => {
          errors[key] = ''
        })
        
        currentStep.value = 'form'
        successMessage.value = t('templatesManagement.addTemplateDialog.fileProcessed')
        resolve()
        
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error(t('templatesManagement.addTemplateDialog.invalidJsonFile')))
        } else {
          reject(error)
        }
      }
    }
    
    reader.onerror = () => reject(new Error(t('templatesManagement.addTemplateDialog.fileReadError')))
    reader.readAsText(file)
  })
}

const processMultipleFiles = async () => {
  const templates = []
  
  for (const file of uploadedFiles.value) {
    try {
      const template = await readFileAsTemplate(file)
      templates.push(template)
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      importResults.value.push({
        filename: file.name,
        success: false,
        error: error.message
      })
    }
  }
  
  if (templates.length === 0) {
    throw new Error(t('templatesManagement.addTemplateDialog.noValidTemplates'))
  }
  
  // Import templates using store action
  try {
    const result = await store.dispatch('modeler/elementTemplates/importTemplates', templates)
    
    // Update results
    templates.forEach((template, index) => {
      importResults.value.push({
        filename: uploadedFiles.value[index].name,
        templateId: template.templateId,
        success: true,
        error: null
      })
    })
    
    successMessage.value = t('templatesManagement.addTemplateDialog.templatesImported', { count: templates.length })
    
    // Emit success event
    emit('templateCreated', result)
    
    // Close modal after delay
    setTimeout(() => {
      closeModal()
    }, 2000)
    
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message)
  }
}

const processBatchFile = async () => {
  const file = uploadedFiles.value[0]
  
  try {
    const content = await readFileAsText(file)
    const jsonData = JSON.parse(content)
    
    // Check if it's an array of templates
    if (!Array.isArray(jsonData)) {
      throw new Error(t('templatesManagement.addTemplateDialog.batchFileNotArray'))
    }
    
    if (jsonData.length === 0) {
      throw new Error(t('templatesManagement.addTemplateDialog.batchFileEmpty'))
    }
    
    // Validate each template in the batch
    const templates = []
    for (let i = 0; i < jsonData.length; i++) {
      const template = jsonData[i]
      const requiredFields = ['id', 'name']
      const missingFields = requiredFields.filter(field => !template[field])
      
      if (missingFields.length > 0) {
        throw new Error(t('templatesManagement.addTemplateDialog.invalidTemplateInBatch', { 
          index: i + 1, 
          fields: missingFields.join(', ') 
        }))
      }
      
      templates.push({
        templateId: template.id,
        name: template.name,
        description: template.description || '',
        content: JSON.stringify(template),
        active: true
      })
    }
    
    // Import templates
    const result = await store.dispatch('modeler/elementTemplates/importTemplates', templates)
    
    successMessage.value = t('templatesManagement.addTemplateDialog.batchImported', { count: templates.length })
    
    // Emit success event
    emit('templateCreated', result)
    
    // Close modal after delay
    setTimeout(() => {
      closeModal()
    }, 2000)
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(t('templatesManagement.addTemplateDialog.invalidJsonFile'))
    }
    throw error
  }
}

const readFileAsTemplate = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const content = event.target.result
        const jsonData = JSON.parse(content)
        
        const requiredFields = ['id', 'name']
        const missingFields = requiredFields.filter(field => !jsonData[field])
        
        if (missingFields.length > 0) {
          reject(new Error(t('templatesManagement.addTemplateDialog.missingRequiredFields', { 
            fields: missingFields.join(', ') 
          })))
          return
        }
        
        resolve({
          templateId: jsonData.id,
          name: jsonData.name,
          description: jsonData.description || '',
          content: JSON.stringify(jsonData),
          active: true
        })
        
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error(t('templatesManagement.addTemplateDialog.invalidJsonFile')))
        } else {
          reject(error)
        }
      }
    }
    
    reader.onerror = () => reject(new Error(t('templatesManagement.addTemplateDialog.fileReadError')))
    reader.readAsText(file)
  })
}

const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target.result)
    reader.onerror = () => reject(new Error(t('templatesManagement.addTemplateDialog.fileReadError')))
    reader.readAsText(file)
  })
}

// Helper methods for UI
const getFileInputLabel = () => {
  switch (importMode.value) {
    case 'single':
      return t('templatesManagement.addTemplateDialog.selectFile')
    case 'multiple':
      return t('templatesManagement.addTemplateDialog.selectMultipleFiles')
    case 'batch':
      return t('templatesManagement.addTemplateDialog.selectBatchFile')
    default:
      return t('templatesManagement.addTemplateDialog.selectFile')
  }
}

const getFileInputHelp = () => {
  switch (importMode.value) {
    case 'single':
      return t('templatesManagement.addTemplateDialog.singleFileHelp')
    case 'multiple':
      return t('templatesManagement.addTemplateDialog.multipleFilesHelp')
    case 'batch':
      return t('templatesManagement.addTemplateDialog.batchFileHelp')
    default:
      return t('templatesManagement.addTemplateDialog.supportedFormats')
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const closeModal = () => {
  if (modalInstance) {
    modalInstance.hide()
  }
}

const show = () => {
  // Reset form only if not in edit mode (for new templates)
  if (!isEditMode.value) {
    resetForm()
  }
  
  if (modalInstance) {
    modalInstance.show()
  }
}

// Lifecycle
onMounted(() => {
  modalInstance = new bootstrap.Modal(modalElement.value)
  
  modalElement.value.addEventListener('shown.bs.modal', async () => {
    await nextTick()
    const firstInput = modalElement.value.querySelector('#templateId')
    if (firstInput) {
      firstInput.focus()
    }
  })
  
  modalElement.value.addEventListener('hidden.bs.modal', () => {
    resetForm()
  })
})

onUnmounted(() => {
  if (modalInstance) {
    modalInstance.dispose()
  }
})

// Expose methods
defineExpose({
  show,
  setEditTemplate
})
</script>

<style scoped>
.required::after {
  content: ' *';
  color: var(--bs-danger);
}

</style>
