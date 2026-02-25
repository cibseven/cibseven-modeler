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
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue"
import { useStore } from 'vuex'
import { FormEditor } from '@bpmn-io/form-js'
import { saveForm, updateForm, createFormSession, checkFormSession, closeFormSession } from'../services/formService.js'
import { checkBeforeAction } from '../utils.js'

export default function useForm(props, emit, canvas, propertyPanel, notificationModalRef) {
    const store = useStore()
    const formEditor = ref(null)
    let schema = JSON.parse(props.json)
	  const propertiesPanelComponent = ref(null)
    const notificationModal = ref(notificationModalRef)

    let notificationMessageData = ref({})
    let json = null
    if (!props.json) return

    onMounted(async()=> {
      //check if you have a session already opened for that form
      let { sessionResponse } = await checkIfFormBlocked(notificationModal, false)
      if(sessionResponse.sessionId) emit('assignSessionIdToProcess', props.tabElementIndex, sessionResponse.sessionId)
    })

    onBeforeUnmount(async()=> {
      await closeFormSession(props.tabElement.sessionId, props.tabElement.type)
    })

    const initializeFormEditor = async () => {
        formEditor.value = new FormEditor({
            container: canvas.value,
            propertiesPanel: {
                parent: propertyPanel.value
            }
        })
        if (typeof(schema) !== 'object') schema = JSON.parse(schema)
        await formEditor.value.importSchema(schema)
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

    const save = async (notificationModal) => {
      let { sessionResponse } = await checkIfFormBlocked(notificationModal, true)

      emit('updateEditorXML', JSON.stringify(json, null, 2),  props.tabElementIndex)
      let newFormId = json.id
      let stringifyJson = JSON.stringify(json, null, 2)
      let keyTocompare = props.tabElement.key
      if (!props.tabElement.isSaved) keyTocompare = ""

      let toastErrorMessage = checkBeforeAction(
        newFormId,
        keyTocompare,
        store.state.modeler?.forms,
        'formId'
      )
      
      if (toastErrorMessage) {
        emit('showToastMessage', {
          isSuccess: false,
          toastText: toastErrorMessage,
          bodyTextAlt: ''
        })
        return false
      }
          
          if (props.tabElement.isSaved || props.tabElement.replaceXml) {
            try {
              const response = await updateForm(
                props.tabElement.id,
                newFormId,
                json
              )
              if (response) {
                emit(
                  'updateStoredLocalStorageTabNavList',
                  {
                    processId: response.id,
                    processName: response.formId,
                    processKey: response.formId,
                    type: 'form'
                  },
                  props.tabElementIndex,
                  stringifyJson
                )
                emit('showToastMessage', {
                  isSuccess: true,
                  toastText: 'toastUpdateSuccessful',
                  bodyTextAlt: ''
                })
                emit('toggleEnableSave', false, props.tabElementIndex)
                emit('toggleVersionNotSaved', false, props.tabElementIndex) //enables save button when changing version
                if (sessionResponse.message === 'NO_SESSION') createSession( response, json, props.tabElementIndex )
                return true
              }
              
            } catch (error) {
              emit('showToastMessage', { isSuccess: false, toastText: 'toastSomethingWentWrong' })
              console.error(error)
              return false
            }
          } else {
            try {
              const response = await saveForm(
                newFormId,
                json
              )
              if (response) {
                emit(
                  'updateStoredLocalStorageTabNavList',
                  {
                    processId: response.id,
                    processName: response.formId,
                    processKey: response.formId,
                    type: 'form'
                  },
                  props.tabElementIndex,
                  stringifyJson
                )
                emit('showToastMessage', { isSuccess: true, toastText: 'toastSaveSuccessful' })
                emit('toggleEnableSave', false, props.tabElementIndex)
                emit('toggleIsSaved', true, props.tabElementIndex)
                emit('toggleVersionNotSaved', false, props.tabElementIndex) //enables save button when changing version
                if (sessionResponse.message === 'NO_SESSION') createSession( response, json, props.tabElementIndex )

                return true
              }
            
            } catch (error) {
              emit('showToastMessage', { isSuccess: false, toastText: 'toastSomethingWentWrong' })
              console.error(error)
              return false
            }
          }
          if (functionToExecute) functionToExecute(xml)
    }

    const destroyFormJs = () => {
      if (formEditor.value) formEditor.value.destroy()
    }
 
    const importJson = async json => {
      if (!json) return
      if(formEditor.value) formEditor.value.importSchema(JSON.parse(json))
        validateJson(json)
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
        let json = JSON.parse(updatedJson)
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
      let json = await formEditor.value.getSchema()
      return json?.id
    }

    const checkIfFormBlocked = async (notificationModal, showForceSave) => {
      let canSave = true
      const sessionResponse = await checkFormSession(props.tabElement.id)
      if (sessionResponse.message === 'SESSION_FOUND' || ( sessionResponse.message !== 'NO_SESSION' && sessionResponse.message !== 'SAME_USER') && !props.tabElement.sessionId) {
          notificationMessageData.value = {
          processName: props.tabElement?.name ?? props.tabElement?.id,
          header: ['blockedSession.user', 'blockedSession.openedAt'],
          body: [sessionResponse.userId, new Date(sessionResponse.openedAt).toLocaleString()]
        }
        canSave = await notificationModal.value.show(showForceSave)
       
      }
      return { sessionResponse, forceSave: canSave} 
    }

    const createSession = async(response, selectedProcess, tabElementIndex) => {
  
      if(!response.sessionId) {
        const responseSession = await createFormSession(
          response.formId,
          response.id,
          selectedProcess,
          'form'        
        )
        emit('assignSessionIdToProcess', tabElementIndex, responseSession.sessionId)
        return responseSession
      }
   
    }
      return { 
        initializeFormEditor,
        importJson,
        saveXmlAfterUpdate,
        save,
        restartFormJs,
        destroyFormJs,
        getFormId,
        formEditor,
        propertiesPanelComponent,
        notificationMessageData
    }
}
