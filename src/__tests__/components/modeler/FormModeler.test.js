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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, inject } from 'vue'

const formMocks = vi.hoisted(() => {
  const formEditor = {
    value: {
      getSchema: vi.fn(() => ({ id: 'form1' })),
      get: vi.fn(() => ({ undo: vi.fn(), redo: vi.fn() })),
    },
  }
  return {
    initializeFormEditor: vi.fn(),
    importJson: vi.fn(),
    saveXmlAfterUpdate: vi.fn(),
    save: vi.fn(),
    restartFormJs: vi.fn().mockResolvedValue(undefined),
    destroyFormJs: vi.fn(),
    getFormId: vi.fn().mockResolvedValue('form1'),
    getFormHistoryList: vi.fn().mockResolvedValue(null),
    changeActiveVersion: vi.fn(),
    formHistoryListComp: { value: null },
    activeVersion: { value: -1 },
    formEditor,
    propertiesPanelComponent: { value: null },
  }
})

const panelMocks = vi.hoisted(() => ({
  updateParentHeight: vi.fn(),
  updateParentWidth: vi.fn(),
  changeWidth: vi.fn(),
  canvasWidth: { value: 400 },
  parentWidth: { value: 700 },
  isVisiblePropertyPanel: { value: true },
  togglePropertiesPanel: vi.fn(),
}))

vi.mock('../../../composables/useForm.js', () => ({
  default: () => formMocks,
}))

vi.mock('../../../composables/usePropertiesPanel.js', () => ({
  default: () => panelMocks,
}))

vi.mock('../../../plugins/pluginsConfig', () => ({
  getPlugin: vi.fn(() => null),
}))

import FormModeler from '../../../components/modeler/FormModeler.vue'
import { defaultTabElement } from '../../helpers/modelerTestUtils.js'

function mountFormModeler(props = {}, slots = {}) {
  return mount(FormModeler, {
    props: {
      json: '{"id":"form1"}',
      isModelerVisible: false,
      isActiveTab: true,
      tabElementIndex: 0,
      tabElement: defaultTabElement,
      activePropertiesTab: 'properties',
      ...props,
    },
    slots: { default: '<div class="editor-slot">Editor</div>', ...slots },
    global: {
      stubs: {
        PropertiesPanel: { template: '<div class="properties-panel-stub" />' },
        MenuActionButtons: {
          template: '<div class="menu-stub"><slot name="leftButtons" /></div>',
        },
      },
    },
  })
}

describe('FormModeler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    panelMocks.canvasWidth.value = 400
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('history', () => {
    const menuWithRightButtons = {
      template: '<div class="menu-stub"><slot name="leftButtons" /><slot name="rightButtons" /></div>',
    }

    function mountWithHistory(historyList, extraProvides = {}) {
      formMocks.formHistoryListComp = ref(historyList)
      formMocks.activeVersion = ref(historyList?.[0]?.version ?? -1)
      return mount(FormModeler, {
        props: {
          json: '{"id":"form1"}',
          isModelerVisible: false,
          isActiveTab: true,
          tabElementIndex: 0,
          tabElement: defaultTabElement,
          activePropertiesTab: 'properties',
        },
        global: {
          provide: {
            ...extraProvides,
            versionButtonComponent: {
              name: 'VersionButtonStub',
              props: ['historyList', 'activeVersion', 'contentField'],
              template: '<button class="version-stub">{{ contentField }}-{{ activeVersion }}</button>',
            },
          },
          stubs: {
            PropertiesPanel: { template: '<div class="properties-panel-stub" />' },
            MenuActionButtons: menuWithRightButtons,
          },
        },
      })
    }

    /**
     * The version button lives in the enterprise package and restores through this hook,
     * so it is the contract between the two.
     */
    it('loads a selected snapshot without turning it into an unsaved edit', async () => {
      let loadVersion = null
      const wrapper = mount(FormModeler, {
        props: {
          json: '{"id":"form1"}',
          isModelerVisible: true,
          isActiveTab: true,
          tabElementIndex: 0,
          tabElement: defaultTabElement,
          activePropertiesTab: 'properties',
        },
        slots: {
          default: {
            name: 'HistoryConsumer',
            setup() {
              loadVersion = inject('loadVersionHook', null)
              return () => null
            },
          },
        },
        global: {
          stubs: {
            PropertiesPanel: { template: '<div class="properties-panel-stub" />' },
            MenuActionButtons: menuWithRightButtons,
          },
        },
      })
      await flushPromises()

      await loadVersion({ id: 'form1', components: [] }, 2)

      expect(formMocks.importJson).toHaveBeenCalledWith({ id: 'form1', components: [] })
      expect(formMocks.changeActiveVersion).toHaveBeenCalledWith(2)
      expect(wrapper.emitted('toggleVersionNotSaved')?.at(-1)).toEqual([true, 0])
      // Saving waits for a real edit, as it does after loading a diagram version
      expect(wrapper.emitted('toggleEnableSave')?.at(-1)).toEqual([false, 0])
    })

    /** Comparing needs two states to compare, as it does for diagrams. */
    it('offers the comparison once a form has more than one snapshot', async () => {
      const compare = {
        name: 'CompareButtonStub',
        props: ['historyList', 'type'],
        template: '<button class="compare-stub">{{ type }}-{{ historyList.length }}</button>'
      }

      const withTwo = mountWithHistory([{ version: 2 }, { version: 1 }], { compareButtonComponent: compare })
      await flushPromises()
      expect(withTwo.find('.compare-stub').text()).toBe('form-2')

      const withOne = mountWithHistory([{ version: 1 }], { compareButtonComponent: compare })
      await flushPromises()
      expect(withOne.find('.compare-stub').exists()).toBe(false)
    })

    /** The community edition provides no version button, so the toolbar stays as it was. */
    it('shows no version button without one provided', async () => {
      formMocks.formHistoryListComp = ref([{ version: 1 }])
      const wrapper = mountFormModeler({}, {})
      await flushPromises()

      expect(wrapper.find('.version-stub').exists()).toBe(false)
    })

    it('shows the provided version button once the form has a history', async () => {
      const wrapper = mountWithHistory([{ version: 2 }, { version: 1 }])
      await flushPromises()

      const button = wrapper.find('.version-stub')
      expect(button.exists()).toBe(true)
      // A form snapshot carries its schema where a diagram carries XML
      expect(button.text()).toBe('formSchema-2')
    })

    it('shows no version button for a form without a history', async () => {
      const wrapper = mountWithHistory([])
      await flushPromises()

      expect(wrapper.find('.version-stub').exists()).toBe(false)
    })
  })

  describe('rendering', () => {
    it('renders canvas when modeler is not visible', async () => {
      const wrapper = mountFormModeler({ isModelerVisible: false })
      await flushPromises()
      expect(wrapper.find('.canvas').isVisible()).toBe(true)
    })

    it('renders slot when modeler is visible', async () => {
      const wrapper = mountFormModeler({ isModelerVisible: true })
      await flushPromises()
      expect(wrapper.find('.editor-slot').exists()).toBe(true)
    })

    it('renders properties panel stub', async () => {
      const wrapper = mountFormModeler()
      await flushPromises()
      expect(wrapper.find('.properties-panel-stub').exists()).toBe(true)
    })
  })

  describe('lifecycle', () => {
    it('calls initializeFormEditor on mount', async () => {
      mountFormModeler()
      await flushPromises()
      expect(formMocks.initializeFormEditor).toHaveBeenCalledWith(defaultTabElement.id)
    })

    it('emits resizeTabNav on mount', async () => {
      const wrapper = mountFormModeler()
      await flushPromises()
      expect(wrapper.emitted('resizeTabNav')).toBeTruthy()
    })

    it('registers resize listeners on mount', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      mountFormModeler()
      await flushPromises()
      expect(addSpy).toHaveBeenCalledWith('resize', panelMocks.updateParentWidth, true)
      expect(addSpy).toHaveBeenCalledWith('resize', panelMocks.updateParentHeight, true)
      addSpy.mockRestore()
    })

    it('calls restartFormJs when isActiveTab changes', async () => {
      const wrapper = mountFormModeler({ isActiveTab: true })
      await flushPromises()
      await wrapper.setProps({ isActiveTab: false })
      await flushPromises()
      expect(formMocks.restartFormJs).toHaveBeenCalled()
    })
  })

  describe('exposed methods', () => {
    it('applySchema imports json and enables save', async () => {
      const wrapper = mountFormModeler()
      await flushPromises()
      wrapper.vm.applySchema({ id: 'new' })
      expect(formMocks.importJson).toHaveBeenCalled()
      expect(wrapper.emitted('toggleEnableSave')).toBeTruthy()
    })

    it('getCurrentSchemaJson returns stringified schema', async () => {
      const wrapper = mountFormModeler()
      await flushPromises()
      const json = wrapper.vm.getCurrentSchemaJson()
      expect(json).toContain('form1')
    })

    it('getCurrentSchemaJson returns null when no editor', async () => {
      formMocks.formEditor.value = null
      const wrapper = mountFormModeler()
      await flushPromises()
      expect(wrapper.vm.getCurrentSchemaJson()).toBeNull()
      formMocks.formEditor.value = {
        getSchema: vi.fn(() => ({ id: 'form1' })),
        get: vi.fn(() => ({ undo: vi.fn(), redo: vi.fn() })),
      }
    })

    it('_undo calls command stack undo', async () => {
      const undo = vi.fn()
      formMocks.formEditor.value = {
        getSchema: vi.fn(() => ({ id: 'form1' })),
        get: vi.fn(() => ({ undo, redo: vi.fn() })),
      }
      const wrapper = mountFormModeler()
      await flushPromises()
      wrapper.vm._undo()
      expect(undo).toHaveBeenCalled()
    })

    it('_redo calls command stack redo', async () => {
      const redo = vi.fn()
      formMocks.formEditor.value = {
        getSchema: vi.fn(() => ({ id: 'form1' })),
        get: vi.fn(() => ({ undo: vi.fn(), redo })),
      }
      const wrapper = mountFormModeler()
      await flushPromises()
      wrapper.vm._redo()
      expect(redo).toHaveBeenCalled()
    })

    it('togglePropertiesPanel is exposed', async () => {
      const wrapper = mountFormModeler()
      await flushPromises()
      wrapper.vm.togglePropertiesPanel(false)
      expect(panelMocks.togglePropertiesPanel).toHaveBeenCalledWith(false)
    })

    it('_saveDiagram calls save', async () => {
      const wrapper = mountFormModeler()
      await flushPromises()
      wrapper.vm._saveDiagram()
      expect(formMocks.save).toHaveBeenCalled()
    })
  })
})
