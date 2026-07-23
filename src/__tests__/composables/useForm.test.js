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
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

const mockFormEditor = vi.hoisted(() => {
  const instance = {
    importSchema: vi.fn().mockResolvedValue(undefined),
    getSchema: vi.fn(() => ({ id: 'form1', name: 'Test' })),
    get: vi.fn(() => ({ detach: vi.fn() })),
    destroy: vi.fn(),
    on: vi.fn(),
  }
  return { instance, FormEditor: vi.fn(() => instance) }
})

vi.mock('@bpmn-io/form-js', () => ({
  FormEditor: mockFormEditor.FormEditor,
}))

vi.mock('../../services/formService.js', () => ({
  saveForm: vi.fn(),
  updateForm: vi.fn(),
}))

vi.mock('vuex', () => ({
  useStore: () => ({
    state: { modeler: { forms: { forms: [] } } },
  }),
}))

const mockSharedSave = vi.hoisted(() => vi.fn().mockResolvedValue(true))

vi.mock('../../composables/useDiagramSave.js', () => ({
  default: () => ({
    save: mockSharedSave,
  }),
}))

import useForm from '../../composables/useForm.js'

function withSetup(propsOverrides = {}, provideOverrides = {}) {
  let composableResult
  const emitted = []
  const emit = (event, ...args) => emitted.push({ event, args })
  const canvas = { value: document.createElement('div') }
  const propertyPanel = { value: document.createElement('div') }

  mount(defineComponent({
    name: 'UseFormTest',
    setup() {
      const props = {
        json: '{"id":"form1","name":"Test Form"}',
        tabElement: { id: 'tab1', key: 'form1', sessionId: null, type: 'form' },
        tabElementIndex: 0,
        isActiveTab: true,
        ...propsOverrides,
      }
      composableResult = useForm(props, emit, canvas, propertyPanel)
      return () => null
    },
  }), {
    global: {
      provide: provideOverrides,
    },
  })

  return { ...composableResult, emitted }
}

describe('useForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormEditor.instance.getSchema.mockReturnValue({ id: 'form1', name: 'Test' })
  })

  describe('initialization', () => {
    it('returns required methods', () => {
      const composable = withSetup()
      expect(typeof composable.initializeFormEditor).toBe('function')
      expect(typeof composable.importJson).toBe('function')
      expect(typeof composable.save).toBe('function')
      expect(typeof composable.destroyFormJs).toBe('function')
    })
  })

  describe('save', () => {
    it('emits toast when form id is missing', async () => {
      mockFormEditor.instance.getSchema.mockReturnValue({ id: '' })
      const { save, emitted } = withSetup()
      await save()
      expect(emitted.some(e => e.event === 'showToastMessage' && e.args[0].toastText === 'toastSaveErrorMissingId')).toBe(true)
    })
  })

  describe('importJson', () => {
    it('imports schema into form editor', async () => {
      const { initializeFormEditor, importJson } = withSetup()
      await initializeFormEditor()
      await importJson({ id: 'form2', name: 'Updated' })
      expect(mockFormEditor.instance.importSchema).toHaveBeenCalledWith({ id: 'form2', name: 'Updated' })
    })

    it('emits isValidated on successful import', async () => {
      const { importJson, emitted } = withSetup()
      await importJson({ id: 'form2' })
      expect(emitted.some(e => e.event === 'isValidated')).toBe(true)
    })
  })

  describe('destroyFormJs', () => {
    it('destroys form editor when present', async () => {
      const { initializeFormEditor, destroyFormJs } = withSetup()
      await initializeFormEditor()
      destroyFormJs()
      expect(mockFormEditor.instance.destroy).toHaveBeenCalled()
    })
  })

  describe('saveXmlAfterUpdate', () => {
    it('imports parsed json from editor update', async () => {
      const { initializeFormEditor, saveXmlAfterUpdate } = withSetup()
      await initializeFormEditor()
      saveXmlAfterUpdate('{"id":"form1","name":"Updated"}')
      expect(mockFormEditor.instance.importSchema).toHaveBeenCalled()
    })

    it('emits updateDownloadLink after update', async () => {
      const { initializeFormEditor, saveXmlAfterUpdate, emitted } = withSetup()
      await initializeFormEditor()
      saveXmlAfterUpdate('{"id":"form1","name":"Updated"}')
      expect(emitted.some(e => e.event === 'updateDownloadLink')).toBe(true)
    })
  })

  describe('initializeFormEditor', () => {
    it('creates editor, imports schema, and wires changed handler', async () => {
      const { initializeFormEditor, emitted } = withSetup()
      await initializeFormEditor()

      expect(mockFormEditor.FormEditor).toHaveBeenCalled()
      expect(mockFormEditor.instance.importSchema).toHaveBeenCalled()
      expect(emitted.some(e => e.event === 'updateEditorXML')).toBe(true)
      expect(emitted.some(e => e.event === 'updateIsButtonDisabled')).toBe(true)
      expect(mockFormEditor.instance.on).toHaveBeenCalledWith('changed', expect.any(Function))
    })
  })

  describe('restartFormJs', () => {
    it('destroys editor when deactivated', async () => {
      const { initializeFormEditor, restartFormJs } = withSetup()
      await initializeFormEditor()
      await restartFormJs(false)
      expect(mockFormEditor.instance.destroy).toHaveBeenCalled()
    })

    it('re-initializes editor when activated and container is empty', async () => {
      const { restartFormJs, formEditor } = withSetup()
      await restartFormJs(true)
      expect(mockFormEditor.FormEditor).toHaveBeenCalled()
      expect(formEditor.value).toBeTruthy()
    })
  })

  describe('getFormId', () => {
    it('returns schema id from editor', async () => {
      const { initializeFormEditor, getFormId } = withSetup()
      await initializeFormEditor()
      return expect(getFormId()).resolves.toBe('form1')
    })
  })

  describe('save success path', () => {
    it('delegates to shared save when form id is present', async () => {
      const { initializeFormEditor, save } = withSetup()
      await initializeFormEditor()
      await save()
      expect(mockSharedSave).toHaveBeenCalled()
    })

    it('aborts save when session hook returns forceSave false', async () => {
      const checkSessionHook = vi.fn().mockResolvedValue({ forceSave: false })
      const { initializeFormEditor, save } = withSetup({}, { checkFormSessionHook: checkSessionHook })
      await initializeFormEditor()
      await save()
      expect(checkSessionHook).toHaveBeenCalled()
      expect(mockSharedSave).not.toHaveBeenCalled()
    })
  })

  describe('importJson edge cases', () => {
    it('returns early for falsy json', async () => {
      const { importJson } = withSetup()
      await importJson(null)
      expect(mockFormEditor.instance.importSchema).not.toHaveBeenCalled()
    })
  })
})
