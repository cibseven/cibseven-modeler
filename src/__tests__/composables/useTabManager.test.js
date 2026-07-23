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
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

import useTabManager from '../../composables/useTabManager.js'
import { TAB_STORAGE_KEY } from '../../constants/diagramTypes.js'

describe('useTabManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const createMockModelerRef = () => ref({
    0: {
      destroyFormJs: vi.fn()
    }
  })

  describe('initialization', () => {
    it('initializes with empty refs', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      expect(composable.tabNavList.value).toEqual([])
      expect(composable.tabNavListXml.value).toEqual([])
      expect(composable.editorXML.value).toEqual([])
    })

    it('returns required methods', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      expect(typeof composable._copyArray).toBe('function')
      expect(typeof composable._saveTabNavSavedLocalStorage).toBe('function')
      expect(typeof composable._loadTabNavList).toBe('function')
      expect(typeof composable._closeSelectedTab).toBe('function')
      expect(typeof composable.orderTabNavListHiddenTab).toBe('function')
    })
  })

  describe('_copyArray', () => {
    it('creates a copy of array', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [{ id: 1, name: 'Tab 1' }, { id: 2, name: 'Tab 2' }]
      const copy = composable._copyArray(composable.tabNavList)
      
      expect(copy).toEqual([{ id: 1, name: 'Tab 1' }, { id: 2, name: 'Tab 2' }])
      expect(copy).not.toBe(composable.tabNavList.value)
    })

    it('preserves element references', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      const obj1 = { id: 1 }
      const testArray = [obj1]
      composable.tabNavList.value = testArray
      const copy = composable._copyArray(composable.tabNavList)
      
      expect(copy).toHaveLength(1)
      expect(copy[0].id).toBe(1)
    })
  })

  describe('_saveTabNavSavedLocalStorage', () => {
    it('persists only saved tabs with transient props cleared', () => {
      const composable = useTabManager(createMockModelerRef())
      composable.tabNavList.value = [
        { id: 1, isSaved: true, canSave: true, isModelerVisible: true, sessionId: 's1' },
        { id: 2, isSaved: false, canSave: true, isModelerVisible: true, sessionId: 's2' },
      ]
      composable._saveTabNavSavedLocalStorage()
      const stored = JSON.parse(localStorage.getItem(TAB_STORAGE_KEY))
      expect(stored).toHaveLength(1)
      expect(stored[0]).toMatchObject({
        id: 1,
        isSaved: true,
        canSave: false,
        isModelerVisible: false,
        sessionId: null,
      })
    })

    it('returns composable with save method', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      expect(typeof composable._saveTabNavSavedLocalStorage).toBe('function')
    })
  })

  describe('_loadTabNavList', () => {
    it('handles empty localStorage gracefully', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      localStorage.clear()
      composable._loadTabNavList()
      
      expect(composable.tabNavList.value).toEqual([])
    })

    it('handles invalid JSON in localStorage', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      localStorage.setItem('TAB_STORAGE_KEY', 'invalid json')
      
      expect(() => composable._loadTabNavList()).not.toThrow()
      expect(composable.tabNavList.value).toEqual([])
    })

    it('initializes tabNavListXml when tabs are loaded', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [{ id: 1, name: 'Tab 1', keyOfTabNav: 'key1' }]
      composable._loadTabNavList()
      
      expect(composable.tabNavListXml.value).toHaveLength(1)
    })

    it('generates unique keys if missing', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [{ id: 1, name: 'Tab 1' }]
      composable._loadTabNavList()
      
      expect(composable.tabNavList.value[0].keyOfTabNav).toEqual(expect.any(String))
    })
  })

  describe('_closeSelectedTab', () => {
    it('removes tab at specified index', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [
        { id: 1, name: 'Tab 1' },
        { id: 2, name: 'Tab 2' },
        { id: 3, name: 'Tab 3' }
      ]
      
      composable._closeSelectedTab(1)
      
      expect(composable.tabNavList.value).toHaveLength(2)
      expect(composable.tabNavList.value[1].name).toBe('Tab 3')
    })

    it('destroys form editor for form tabs', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [{ id: 1, type: 'form' }]
      composable._closeSelectedTab(0)
      
      expect(modelerRef.value[0].destroyFormJs).toHaveBeenCalled()
    })

    it('removes XML entries at same index', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [{ id: 1 }, { id: 2 }]
      composable.editorXML.value = ['xml1', 'xml2']
      
      composable._closeSelectedTab(0)
      
      expect(composable.editorXML.value).toEqual(['xml2'])
    })

    it('updates all arrays consistently when closing', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [{ id: 1 }]
      composable.editorXML.value = ['xml1']
      composable.tabNavListXml.value = ['xmlData1']
      
      composable._closeSelectedTab(0)
      
      expect(composable.tabNavList.value).toHaveLength(0)
      expect(composable.editorXML.value).toHaveLength(0)
      expect(composable.tabNavListXml.value).toHaveLength(0)
    })
  })

  describe('orderTabNavListHiddenTab', () => {
    it('moves hidden tab to front', async () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [
        { id: 1, name: 'Tab 1' },
        { id: 2, name: 'Tab 2' },
        { id: 3, name: 'Tab 3' }
      ]
      
      const selectFirstMock = vi.fn()
      await composable.orderTabNavListHiddenTab(1, selectFirstMock)
      
      expect(composable.tabNavList.value[0].id).toBe(3)
      expect(selectFirstMock).toHaveBeenCalled()
    })

    it('moves associated XML data with tab', async () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [{ id: 1 }, { id: 2 }, { id: 3 }]
      composable.editorXML.value = ['xml1', 'xml2', 'xml3']
      
      await composable.orderTabNavListHiddenTab(1, vi.fn())
      
      expect(composable.editorXML.value[0]).toBe('xml3')
    })

    it('calls selectFirst callback', async () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [{ id: 1 }, { id: 2 }]
      const selectFirstMock = vi.fn()
      
      await composable.orderTabNavListHiddenTab(0, selectFirstMock)
      
      expect(selectFirstMock).toHaveBeenCalled()
    })
  })

  describe('integration', () => {
    it('handles multiple tab operations', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [
        { id: 1, name: 'Tab 1' },
        { id: 2, name: 'Tab 2' },
        { id: 3, name: 'Tab 3' }
      ]
      
      composable._closeSelectedTab(1)
      expect(composable.tabNavList.value).toHaveLength(2)
      
      composable._closeSelectedTab(0)
      expect(composable.tabNavList.value).toHaveLength(1)
    })

    it('maintains consistency across refs', () => {
      const modelerRef = createMockModelerRef()
      const composable = useTabManager(modelerRef)
      
      composable.tabNavList.value = [{ id: 1 }]
      composable.editorXML.value = ['xml1']
      
      composable._closeSelectedTab(0)
      
      expect(composable.tabNavList.value.length).toBe(composable.editorXML.value.length)
    })
  })
})
