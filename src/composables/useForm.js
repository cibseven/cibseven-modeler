/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, inject, watch } from "vue"
import { useStore } from 'vuex'
import { FormEditor } from '@bpmn-io/form-js'
import { saveForm, updateForm } from'../services/formService.js'
import useDiagramSave from './useDiagramSave.js'
import useAutosave from './useAutosave.js'

export default function useForm(props, emit, canvas, propertyPanel) {
    const store = useStore()
    const formEditor = ref(null)
    const schema = JSON.parse(props.json)
	  const propertiesPanelComponent = ref(null)
    const checkSessionHook = inject('checkFormSessionHook', null)
    const createSessionHook = inject('createFormSessionHook', null)
    const closeSessionHook = inject('closeFormSessionHook', null)
    const fetchSnapshotsHook = inject('fetchFormSnapshotsHook', null)
    const autosaveOptions = inject('autosaveOptions', null)
    const autosaveHook = inject('autosaveHook', null)
    const autosave = useAutosave(() => save(true), autosaveOptions)
    const formHistoryListComp = ref(null)
    const activeVersion = ref(-1) // the actual selected version of the form

    let json = null
    if (!props.json) return

    onMounted(async()=> {
      formHistoryListComp.value = await getFormHistoryList()
      if (checkSessionHook) await checkSessionHook(props.tabElement, props.tabElementIndex, false)
    })

    onBeforeUnmount(async()=> {
      autosave.cancel()
      if (closeSessionHook) await closeSessionHook(props.tabElement.sessionId, props.tabElement.type)
    })

    watch(() => props.isActiveTab, async (isActive, wasActive) => {
      if (wasActive && !isActive && closeSessionHook) {
        await closeSessionHook(props.tabElement.sessionId, props.tabElement.type)
        props.tabElement.sessionId = null
      } else if (!wasActive && isActive && checkSessionHook) {
        await checkSessionHook(props.tabElement, props.tabElementIndex, false)
      }
    })

    const initializeFormEditor = async () => {
        formEditor.value = new FormEditor({
            container: canvas.value,
            propertiesPanel: {
                parent: propertyPanel.value
            }
        })
        let schemaToLoad = json || schema
        if (typeof(schemaToLoad) !== 'object') schemaToLoad = JSON.parse(schemaToLoad)
        await formEditor.value.importSchema(schemaToLoad)
        json = await formEditor.value.getSchema()
        emit('updateEditorXML', JSON.stringify(json, null, 2),  props.tabElementIndex)
        validateJson(json)
        emit('updateIsButtonDisabled', false, props.tabElementIndex)
        propertiesPanelComponent.value = formEditor.value.get('propertiesPanel')

        formEditor.value.on("changed", async () => {
            if (!formEditor.value) return
            json = formEditor.value?.getSchema()
            emit('updateEditorXML', JSON.stringify(json, null, 2),  props.tabElementIndex)
            validateJson(json)
            emit('toggleEnableSave', true, props.tabElementIndex) //enables save button
            if (autosaveOptions?.enabled && props.tabElement.isSaved) autosave.schedule()
        })
    }

    //to avoid drag and drop error and double initializations
    const restartFormJs = async activeValue => {
      await nextTick()
      if (!activeValue) {
        if (formEditor.value) {
          await formEditor.value.destroy()
          propertiesPanelComponent.value.detach() 
        }
      }
      if (activeValue) {
        if (!canvas.value.querySelector('.fjs-form-container')) {
          await initializeFormEditor()
        }
       }
       await nextTick()
       return formEditor.value    
    }

    const { save: _sharedSave } = useDiagramSave(props, emit, { checkSessionHook, createSessionHook })

    const save = async (isAutosave = false) => {
      // The form id is the backend key (unique & not-null). Never save without one,
      // otherwise the request fails with a confusing constraint error.
      const newFormId = json?.id
      if (!newFormId || !String(newFormId).trim()) {
        emit('showToastMessage', { isSuccess: false, toastText: 'toastSaveErrorMissingId' })
        return false
      }

      let sessionResponse = null
      if (checkSessionHook) {
        const result = await checkSessionHook(props.tabElement, props.tabElementIndex, !isAutosave, { silent: isAutosave })
        if (!result.forceSave) {
          if (isAutosave && autosaveHook) autosaveHook(props.tabElement, { state: 'skipped', reason: 'locked' })
          return false
        }
        sessionResponse = result.sessionResponse
      }

      emit('updateEditorXML', JSON.stringify(json, null, 2),  props.tabElementIndex)
      const stringifyJson = JSON.stringify(json, null, 2)

      return _sharedSave({
        newName: newFormId,
        newKey: newFormId,
        storedKey: props.tabElement.key,
        xml: stringifyJson,
        blob: json,
        storeStateSlice: store.state.modeler?.forms?.forms,
        itemKeyField: 'formId',
        createFn: () => saveForm(newFormId, json),
        updateFn: () => updateForm(props.tabElement.id, newFormId, json),
        toTabPayload: response => ({ processId: response.id, processName: response.formId, processKey: response.formId, type: 'form' }),
        sessionResponse,
        afterSave: async () => { await getFormHistoryList() },
        isAutosave,
      })
    }

    // Only the enterprise edition keeps a history, so without the hook there is none
    const getFormHistoryList = async () => {
      if (!fetchSnapshotsHook) return null
      formHistoryListComp.value = await fetchSnapshotsHook(props.tabElement.id)
      activeVersion.value = formHistoryListComp.value?.[0]?.version ?? -1
      return formHistoryListComp.value
    }

    const changeActiveVersion = version => { activeVersion.value = version }

    const destroyFormJs = () => {
      if (formEditor.value) formEditor.value.destroy()
    }
 
    const importJson = async incomingJson => {
      if (!incomingJson) return
      const parsed = typeof incomingJson === 'object' ? incomingJson : JSON.parse(incomingJson)
      // Update the closure schema so a later destroy/re-init (restartFormJs on tab
      // switch) reloads THIS content instead of the stale snapshot captured at setup.
      json = parsed
      if (formEditor.value) await formEditor.value.importSchema(parsed)
      validateJson(parsed)
    }

    //*TODO refactor name of this method and useModeler composable to a generic one
    const validateJson = async json => {
        try {
            json = JSON.stringify(json, null, 2)
            emit('isValidated', { validation: true, text: '' }, props.tabElementIndex)
            emit('updateEditorXML', json,  props.tabElementIndex)
            setEncondedJson(json)
        } catch (error) {
          emit('isValidated', { validation: false, text: error.message }, props.tabElementIndex)
        }
      }
     
      //called from monaco editor to update the form editor
      const saveXmlAfterUpdate = updatedJson => {
        const json = JSON.parse(updatedJson)
        formEditor.value.importSchema(json)
        setEncondedJson(json)
      }

      //called from on change
      const setEncondedJson = async json => {

        emit('updateDownloadLink', {
            href: `data:application/json;charset=UTF-8,${encodeURIComponent(json)}`,
            download: json.id ?? props.tabElement.id,
            tabElementIndex: props.tabElementIndex
        })
    }
    const getFormId = async() => {
      const json = await formEditor.value.getSchema()
      return json?.id
    }

      return {
        initializeFormEditor,
        importJson,
        saveXmlAfterUpdate,
        save,
        restartFormJs,
        destroyFormJs,
        getFormId,
        getFormHistoryList,
        changeActiveVersion,
        formHistoryListComp,
        activeVersion,
        formEditor,
        propertiesPanelComponent,
    }
}
