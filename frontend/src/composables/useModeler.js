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
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue'
import { useStore } from 'vuex'
import { checkBeforeAction } from '../utils.js'
//to update or save process
import { saveDiagramProcess, updateDiagramProcess } from '../services/processService.js'

export default function useModeler(propsRef, emitRef, monacoEditorConsole, consolePanel) {
  const store = useStore()
  const props = propsRef
  const emit = emitRef
  const afterXmlUpdateHook = inject('afterXmlUpdateHook', null)
  const checkSessionHook = inject('checkSessionHook', null)
  const createSessionHook = inject('createSessionHook', null)
  const closeSessionHook = inject('closeSessionHook', null)
  const fetchSnapshotsHook = inject('fetchSnapshotsHook', null)
  const processHistoryListComp = ref(null)
  const processId = ref(null)
  const processInformation = ref(null)
  const templatesList = ref(null)
  const typeOfSelector = ref(null)
  const isShowModalListSelector = ref(false)
  const activeVersion = ref(-1) // the actual selected version of the diagram
  const isConsoleOpen = ref(false)

  const listDataForSelector = computed(() => {
    switch (typeOfSelector.value) {
      case 'templates': return templatesList.value
      case 'changeVersion': return processHistoryListComp.value
      default: return []
    }
  })  

  watch(processHistoryListComp, (newValue, oldValue) => {
    if (!oldValue && newValue?.length > 1 && newValue[0]) activeVersion.value = newValue[0].version
  })

  onMounted(async()=> {
    processId.value = props.tabElement.id
    processHistoryListComp.value = await getProcessHistoryList()
    if (checkSessionHook) await checkSessionHook(props.tabElement, props.tabElementIndex, false)
  })

  onBeforeUnmount(async()=> {
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

   const saveDecisionTable = async (modeler, typeOfDiagram) =>{
    if (checkSessionHook) {
      const { sessionResponse, forceSave } = await checkSessionHook(props.tabElement, props.tabElementIndex, true)
      if (!forceSave) return
      var savedSessionResponse = sessionResponse
    }
    const dmn = modeler.getViews()[0]
    if (!dmn) return
    const { xml } = await modeler.saveXML({ format: true })
    const blob = new Blob([xml], { type: 'text/plain' })
    const newProcessKey = dmn.id
    const storedProcessSelectedId = props.tabElement.id
    const storedProcessSelectedProcesskey = props.tabElement.key
    const newProcessName = dmn.name === '' || !props.tabElement.key === '' ? dmn.id : dmn.name
   
    save(storedProcessSelectedId, newProcessName, storedProcessSelectedProcesskey, newProcessKey, xml, blob, typeOfDiagram, null, savedSessionResponse)
  }

  const save = async (storedProcessSelectedId, newProcessName, storedProcessSelectedProcesskey, newProcessKey, xml, blob, typeOfDiagram, functionToExecute, sessionResponse) => {
    let keyTocompare = storedProcessSelectedProcesskey

    if (!props.tabElement.isSaved) keyTocompare = ""

    const toastErrorMessage = checkBeforeAction(
      newProcessKey,
      keyTocompare,
      store.state.modeler?.processes,
    'processkey'
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
        const response = await updateDiagramProcess(
          storedProcessSelectedId,
          newProcessName,
          newProcessKey,
          blob,
          typeOfDiagram
        )
        if (response) {
          emit(
            'updateStoredLocalStorageTabNavList',
            {
              processId: response.id,
              processName: response.name,
              processKey: response.processkey,
              type: typeOfDiagram
            },
            props.tabElementIndex,
            xml
          )
          emit('showToastMessage', {
            isSuccess: true,
            toastText: 'toastUpdateSuccessful',
            bodyTextAlt: ''
          })
          emit('toggleEnableSave', false, props.tabElementIndex)
          emit('toggleVersionNotSaved', false, props.tabElementIndex) //enables save button when changing version
          processId.value = response.id
          await getProcessHistoryList()
          if (createSessionHook && sessionResponse?.message === 'NO_SESSION') createSessionHook(response, blob, props.tabElementIndex, props.tabElement)
          return true
        }
        
      } catch (error) {
        emit('showToastMessage', { isSuccess: false, toastText: 'toastSomethingWentWrong' })
        console.error(error)
        return false
      }
    } else {
      try {
        const response = await saveDiagramProcess(
          newProcessName,
          newProcessKey,
          blob,
          typeOfDiagram
        )

        if (response) {
          emit(
            'updateStoredLocalStorageTabNavList',
            {
              processId: response.id,
              processName: response.name,
              processKey: response.processkey,
              type: typeOfDiagram
            },
            props.tabElementIndex,
            xml
          )
          emit('showToastMessage', { isSuccess: true, toastText: 'toastSaveSuccessful' })
          emit('toggleEnableSave', false, props.tabElementIndex)
          emit('toggleIsSaved', true, props.tabElementIndex)
          emit('toggleVersionNotSaved', false, props.tabElementIndex) //enables save button when changing version
          processId.value = response.id
          await getProcessHistoryList()
          if (createSessionHook && sessionResponse?.message === 'NO_SESSION') createSessionHook(response, blob, props.tabElementIndex, props.tabElement)
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

  const saveProcess = async (modeler, typeOfDiagram, _setupDiagramFunctions, functionToExecute) => {
    let sessionResponse = null
    if (checkSessionHook) {
      const result = await checkSessionHook(props.tabElement, props.tabElementIndex, true)
      if (!result.forceSave) return
      sessionResponse = result.sessionResponse
    }
  
    if(_setupDiagramFunctions) _setupDiagramFunctions() // updates the xml
    processInformation.value = getProcessInformation(modeler)
    const { xml } = await modeler.saveXML({ format: true })
    const blob = new Blob([xml], { type: 'text/plain' })
    const storedProcessSelectedId = props.tabElement.id
    const storedProcessSelectedProcesskey = props.tabElement.key
    const newProcessName = processInformation.value.name === '' || !processInformation.value.name ? processInformation.value.id :processInformation.value.name // name of the process from the properties panel, if the diagram doesnt have a name it would be the same as the id
    const newProcessKey = processInformation.value.id // id of the process from the properties panel
    save(storedProcessSelectedId, newProcessName, storedProcessSelectedProcesskey, newProcessKey, xml, blob, typeOfDiagram, functionToExecute, sessionResponse)
  }

  const getProcessHistoryList = async () => {
    if (!fetchSnapshotsHook) return null
    const historyList = await fetchSnapshotsHook(processId.value)
    processHistoryListComp.value = historyList
    activeVersion.value = processHistoryListComp.value?.[0]?.version ?? -1 // update version
    return processHistoryListComp.value
  }

  const validate = async (modeler, xml) => {
    try {
      await modeler.importXML(xml)
      emit('isValidated', { validation: true, text: '' }, props.tabElementIndex)
      emit('updateEditorXML', xml, props.tabElementIndex)
      processInformation.value = getProcessInformation(modeler)
    } catch (error) {
      emit('isValidated', { validation: false, text: error.message }, props.tabElementIndex)
    }
  }

  // to be called from parent CIB Seven modeler and get the modeler
  const getProcessInformation = modeler => {
    if (!modeler) return
    let canvas;

    try {
      canvas = modeler.get('canvas')
    } catch {
        // If the above fails, try to get the canvas from the active viewer
        try {
            canvas = modeler.getActiveViewer().get('canvas')
        } catch {
            canvas = null // or any other fallback action
        }
      }
      if (!canvas) return
      processInformation.value = canvas.getRootElement().businessObject
      return processInformation.value
    }

  const getElementRegistryFromModeler = (modeler, type) => {
    const elementsRegistry = modeler.get('elementRegistry')._elements
    const foundProcess = Object.values(elementsRegistry).find(
      (entry) => entry.element.type.toLowerCase() === type.toLowerCase()
    )
    const foundProcessId = foundProcess ? foundProcess.element.id : null
    return foundProcessId
  }

  const changeActiveVersion = value => activeVersion.value = value

  const saveXmlAfterUpdate = (isBpmn, updateXml, tabElementIndex, modeler) => {
    try {
      isBpmn ? _setEncondedSvgAndXml(updateXml, tabElementIndex, modeler, isBpmn) : _setEncondedSvgAndXml(updateXml, tabElementIndex, modeler, isBpmn)
      } catch (err) {
      // if an error occurs during saving, log the error and set up the download link as null
      console.error('Error happened saving XML: ', err)
      isBpmn ? _setEncondedSvgAndXml(null, tabElementIndex, modeler, isBpmn) : _setEncondedSvgAndXml(null, tabElementIndex, modeler, isBpmn)
    }
  }

  const selectDiagramVersion = () => {
    if (!fetchSnapshotsHook) return
    typeOfSelector.value = 'changeVersion'
    isShowModalListSelector.value = true
  }

  const toggleVersionNotSaved = (isEnabled, index) => {
    emit('toggleVersionNotSaved', isEnabled, index)
  }

  const toggleEnableSave = (isEnabled, index) => {
    emit('toggleEnableSave', isEnabled, index)
  }

  const _setEncondedSvgAndXml = async (updateXml, tabElementIndex, modeler, isBpmn) => {
    const fileNameAndData = isBpmn ? _setEncoded(updateXml, tabElementIndex, '.bpmn') : _setEncoded(updateXml, tabElementIndex, '.dmn')
    emit('updateDownloadLink',{ href: `data:application/bpmn20-xml;charset=UTF-8,${fileNameAndData.encodedData}`, download: fileNameAndData.fileName, tabElementIndex: tabElementIndex })
    if (afterXmlUpdateHook) await afterXmlUpdateHook(modeler, tabElementIndex, props.tabElement.key)
  }
  
  const _setEncoded = (data, tabElementIndex, extension) => {
    // encode the provided data for safe URL inclusion
    const encodedData = encodeURIComponent(data)
    if (data) {
      emit('updateIsButtonDisabled',false, tabElementIndex)
      // change the name of the file here
      return { fileName: `${props.tabElement.key}${extension}` || `defaultFilename${extension}`, encodedData }
    }
  }
  
  const toggleConsole = isVisible => isConsoleOpen.value = consolePanel.value.toggleConsole(isVisible)

  const isConsolePanelShowing = () => consolePanel.value.isOpen() // check if the console is open

  const addLineWithErrorToConsole = error => monacoEditorConsole.value.addLineWithError(error)

  const copyLine = () => monacoEditorConsole.value.copyLine()

  const cleanConsole = () => monacoEditorConsole.value.cleanConsole()

  return { 
    saveXmlAfterUpdate,
    toggleEnableSave,
    toggleVersionNotSaved,
    saveProcess,
    validate,
    getElementRegistryFromModeler,
    getProcessHistoryList,
    getProcessInformation,
    processHistoryListComp,
    selectDiagramVersion,
    changeActiveVersion,
    //refs for list selectors
    activeVersion,
    listDataForSelector,
    typeOfSelector,
    templatesList,
    isShowModalListSelector,
     //for the console
     toggleConsole,
     addLineWithErrorToConsole,
     copyLine,
     cleanConsole,
     isConsolePanelShowing,
     isConsoleOpen,
     saveDecisionTable,
    }
}
