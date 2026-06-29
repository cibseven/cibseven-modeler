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
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

import usePropertiesPanel from '../../composables/usePropertiesPanel.js'

describe('usePropertiesPanel', () => {
  const createMockProps = (overrides = {}) => ({
    isActiveTab: true,
    ...overrides
  })

  const createMockEmit = () => vi.fn()

  const createMockRefs = () => ({
    containerModeler: ref({
      parentNode: { clientHeight: 600 },
      clientWidth: 400
    }),
    resizableDiv: ref({
      _changeWidth: vi.fn(() => 400),
      _resetPropertiesPanelWidth: vi.fn(),
      _restorePropertiesPanelWidth: vi.fn()
    }),
    propertiesPanelComponent: ref({
      detach: vi.fn(),
      attachTo: vi.fn()
    }),
    propertyPanel: ref({})
  })

  describe('initialization', () => {
    it('initializes with valid refs', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      expect(composable).toBeDefined()
    })

    it('returns required methods', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      expect(composable.updateParentHeight).toBeDefined()
      expect(composable.updateParentWidth).toBeDefined()
      expect(composable.changeWidth).toBeDefined()
      expect(composable.togglePropertiesPanel).toBeDefined()
    })

    it('initializes reactive properties', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      expect(composable.parentWidth.value).toBe(700)
      expect(composable.parentHeight.value).toBe(700)
      expect(composable.canvasWidth.value).toBe(0)
      expect(composable.isVisiblePropertyPanel.value).toBe(true)
    })
  })

  describe('updateParentHeight', () => {
    it('updates height when tab is active', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      composable.updateParentHeight()
      expect(composable.parentHeight.value).toBe(600)
    })

    it('does not update height when tab is inactive', () => {
      const props = createMockProps({ isActiveTab: false })
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      const initialHeight = composable.parentHeight.value
      composable.updateParentHeight()
      expect(composable.parentHeight.value).toBe(initialHeight)
    })
  })

  describe('updateParentWidth', () => {
    it('updates width when tab is active', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      composable.updateParentWidth()
      expect(composable.parentWidth.value).toBe(400)
    })

    it('emits resizeTabNav event', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      composable.updateParentWidth()
      expect(emit).toHaveBeenCalledWith('resizeTabNav', 400)
    })

    it('does not update when tab is inactive', () => {
      const props = createMockProps({ isActiveTab: false })
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      const initialWidth = composable.parentWidth.value
      composable.updateParentWidth()
      expect(composable.parentWidth.value).toBe(initialWidth)
    })
  })

  describe('togglePropertiesPanel', () => {
    it('shows properties panel when passed true', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      composable.togglePropertiesPanel(true)
      expect(composable.isVisiblePropertyPanel.value).toBe(true)
    })

    it('hides properties panel when passed false', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      composable.togglePropertiesPanel(false)
      expect(composable.isVisiblePropertyPanel.value).toBe(false)
      expect(propertiesPanelComponent.value.detach).toHaveBeenCalled()
    })

    it('calls reset methods when hiding panel', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      composable.togglePropertiesPanel(false)
      expect(resizableDiv.value._resetPropertiesPanelWidth).toHaveBeenCalled()
    })

    it('calls restore methods when showing panel', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      composable.togglePropertiesPanel(true)
      expect(resizableDiv.value._restorePropertiesPanelWidth).toHaveBeenCalled()
    })
  })

  describe('changeWidth', () => {
    it('updates canvas width', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      composable.changeWidth(500)
      expect(composable.canvasWidth.value).toBe(500)
    })

    it('handles different width values', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      composable.changeWidth(600)
      expect(composable.canvasWidth.value).toBe(600)
      composable.changeWidth(300)
      expect(composable.canvasWidth.value).toBe(300)
    })
  })

  describe('integration', () => {
    it('handles multiple operations in sequence', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      
      composable.updateParentHeight()
      composable.updateParentWidth()
      composable.changeWidth(450)
      
      expect(composable.parentHeight.value).toBe(600)
      expect(composable.parentWidth.value).toBe(400)
      expect(composable.canvasWidth.value).toBe(450)
    })

    it('maintains state consistently', () => {
      const props = createMockProps()
      const emit = createMockEmit()
      const { containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel } = createMockRefs()

      const composable = usePropertiesPanel(props, emit, containerModeler.value, resizableDiv, propertiesPanelComponent, propertyPanel)
      
      composable.togglePropertiesPanel(false)
      expect(composable.isVisiblePropertyPanel.value).toBe(false)
      
      composable.togglePropertiesPanel(true)
      expect(composable.isVisiblePropertyPanel.value).toBe(true)
    })
  })
})
