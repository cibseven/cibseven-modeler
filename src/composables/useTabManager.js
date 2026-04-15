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
import { ref } from 'vue'
import { generateUniqueId } from '../utils.js'
import { TAB_STORAGE_KEY } from '../constants/diagramTypes.js'

/**
 * Manages the reactive tab state (tabNavList, tabNavListXml, editorXML) and the
 * related localStorage persistence / array-manipulation functions.
 *
 * @param {import('vue').Ref} modelerRef - Ref to the object map of modeler component instances
 *                                         (keyed by tab index). Optional — only used for form
 *                                         cleanup on tab close.
 */
export default function useTabManager(modelerRef) {
  const tabNavList = ref([])
  const tabNavListXml = ref([])
  const editorXML = ref([])

  const _copyArray = arrayRef => arrayRef.value.map(element => element)

  /** Persist currently saved tabs to localStorage so they can be restored on reload. */
  const _saveTabNavSavedLocalStorage = () => {
    const copyTabNavList = tabNavList.value.map(element => ({ ...element }))
    const filteredTabNavList = copyTabNavList.filter(element => {
      element.canSave = false
      element.isModelerVisible = false
      element.isEditorVisible = false
      element.sessionId = null
      return element.isSaved === true
    })
    localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(filteredTabNavList))
  }

  /** Restore previously saved tabs from localStorage on mount. */
  const _loadTabNavList = () => {
    try {
      const parseNavListTest = JSON.parse(localStorage.getItem(TAB_STORAGE_KEY)) ?? tabNavList.value
      if (parseNavListTest.length > 0) {
        tabNavList.value = parseNavListTest
        tabNavListXml.value = Array(tabNavList.value?.length)
        tabNavList.value.map(element => {
          if (!element.keyOfTabNav) element.keyOfTabNav = generateUniqueId()
          return element.keyOfTabNav
        })
      }
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Remove a tab and its associated XML / editor state.
   * Destroys the FormEditor instance if the tab is a form type.
   */
  const _closeSelectedTab = tabElementIndex => {
    if (tabNavList.value[tabElementIndex]?.type === 'form') {
      if (modelerRef?.value?.[tabElementIndex]) {
        modelerRef.value[tabElementIndex].destroyFormJs()
      }
    }
    const copyEditorXml = _copyArray(editorXML)
    const copyTabNavListXml = _copyArray(tabNavListXml)
    const copyTabNavList = _copyArray(tabNavList)
    copyEditorXml.splice(tabElementIndex, 1)
    copyTabNavListXml.splice(tabElementIndex, 1)
    copyTabNavList.splice(tabElementIndex, 1)
    tabNavListXml.value = copyTabNavListXml
    editorXML.value = copyEditorXml
    tabNavList.value = copyTabNavList
    _saveTabNavSavedLocalStorage()
  }

  /**
   * Move a hidden overflow tab to the front of the list.
   *
   * @param {number}   index       - The overflow index (from TabNav)
   * @param {function} selectFirst - Callback that switches the active tab to index 0
   */
  const orderTabNavListHiddenTab = async (index, selectFirst) => {
    const position = tabNavList.value.length - index
    const copyTabNavList = _copyArray(tabNavList)
    const copyEditorXml = _copyArray(editorXML)
    const moveToFirstElement = copyTabNavList.splice(position, 1)
    const moveToFirstEditorXml = copyEditorXml.splice(position, 1)
    copyTabNavList.unshift(moveToFirstElement[0])
    copyEditorXml.unshift(moveToFirstEditorXml[0])
    const copyForTabNavListXml = copyEditorXml.map(element => element)
    editorXML.value = copyEditorXml
    tabNavListXml.value = copyForTabNavListXml
    tabNavList.value = copyTabNavList
    selectFirst()
  }

  return {
    tabNavList,
    tabNavListXml,
    editorXML,
    _copyArray,
    _saveTabNavSavedLocalStorage,
    _loadTabNavList,
    _closeSelectedTab,
    orderTabNavListHiddenTab,
  }
}
