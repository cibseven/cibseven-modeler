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
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'

const mockFormEditor = vi.hoisted(() => {
  const instance = {
    importSchema: vi.fn().mockResolvedValue(undefined),
    getSchema: vi.fn(() => ({ id: 'form1', name: 'Test' })),
    get: vi.fn(() => ({ detach: vi.fn() })),
    destroy: vi.fn(),
    on: vi.fn(),
  }
  return { instance, FormEditor: vi.fn(function () { return instance }) }
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

const saveMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))

vi.mock('../../composables/useDiagramSave.js', () => ({
  default: () => ({ save: saveMock }),
}))

import useForm from '../../composables/useForm.js'

function withSetup(propsOverrides = {}, provide = {}) {
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
  }), { global: { provide } })

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
      expect(composable.initializeFormEditor).toBeDefined()
      expect(composable.importJson).toBeDefined()
      expect(composable.save).toBeDefined()
      expect(composable.destroyFormJs).toBeDefined()
    })
  })

  describe('history', () => {
    /** Only the enterprise edition provides the hook, so the community edition has no history. */
    it('has no history without the hook', async () => {
      const { formHistoryListComp, activeVersion } = withSetup()
      await flushPromises()

      expect(formHistoryListComp.value).toBeNull()
      expect(activeVersion.value).toBe(-1)
    })

    it('loads the history of the open form and selects its newest version', async () => {
      const history = [{ version: 3 }, { version: 2 }]
      const fetchFormSnapshotsHook = vi.fn().mockResolvedValue(history)

      const { formHistoryListComp, activeVersion } = withSetup({}, { fetchFormSnapshotsHook })
      await flushPromises()

      expect(fetchFormSnapshotsHook).toHaveBeenCalledWith('tab1')
      expect(formHistoryListComp.value).toEqual(history)
      expect(activeVersion.value).toBe(3)
    })

    it('leaves the version unset for a form saved for the first time', async () => {
      const fetchFormSnapshotsHook = vi.fn().mockResolvedValue([])

      const { activeVersion } = withSetup({}, { fetchFormSnapshotsHook })
      await flushPromises()

      expect(activeVersion.value).toBe(-1)
    })

    /** A tab created in this session has no stored form yet, so there is nothing to ask for. */
    it('asks for no history before the form has been saved once', async () => {
      const fetchFormSnapshotsHook = vi.fn().mockResolvedValue([])

      withSetup({ tabElement: { id: null, key: 'form1', sessionId: null, type: 'form' } },
        { fetchFormSnapshotsHook })
      await flushPromises()

      expect(fetchFormSnapshotsHook).not.toHaveBeenCalled()
    })

    /** Saving it the first time is what turns it into a form with a history. */
    it('reads the history of a form saved for the first time under its new id', async () => {
      const fetchFormSnapshotsHook = vi.fn().mockResolvedValue([{ version: 0 }])

      const { initializeFormEditor, save, formHistoryListComp, activeVersion } = withSetup(
        { tabElement: { id: null, key: 'form1', sessionId: null, type: 'form' } },
        { fetchFormSnapshotsHook })
      await flushPromises()
      await initializeFormEditor()
      await save()
      await saveMock.mock.calls.at(-1)[0].afterSave({ id: 'stored-id' })

      expect(fetchFormSnapshotsHook).toHaveBeenCalledWith('stored-id')
      expect(formHistoryListComp.value).toHaveLength(1)
      expect(activeVersion.value).toBe(0)
    })

    /** A save adds a version, so the list the toolbar reads has to be fetched again. */
    it('reloads the history after a save', async () => {
      const fetchFormSnapshotsHook = vi.fn()
        .mockResolvedValueOnce([{ version: 1 }])
        .mockResolvedValueOnce([{ version: 2 }, { version: 1 }])

      const { initializeFormEditor, save, formHistoryListComp, activeVersion } =
        withSetup({}, { fetchFormSnapshotsHook })
      await flushPromises()
      await initializeFormEditor()
      await save()
      // The shared save calls it back once the form is stored
      await saveMock.mock.calls.at(-1)[0].afterSave()

      expect(fetchFormSnapshotsHook).toHaveBeenCalledTimes(2)
      expect(formHistoryListComp.value).toHaveLength(2)
      expect(activeVersion.value).toBe(2)
    })

    /** Restoring a snapshot makes it the version the toolbar reports. */
    it('follows the version that was restored', async () => {
      const fetchFormSnapshotsHook = vi.fn().mockResolvedValue([{ version: 3 }, { version: 2 }])

      const { activeVersion, changeActiveVersion } = withSetup({}, { fetchFormSnapshotsHook })
      await flushPromises()
      changeActiveVersion(2)

      expect(activeVersion.value).toBe(2)
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
    /**
     * form-js reports an import as a change, unlike bpmn-js. Restoring a snapshot would
     * otherwise look like an edit and offer to save content nobody touched.
     */
    it('does not enable saving for a schema it loaded itself', async () => {
      const { initializeFormEditor, importJson, emitted } = withSetup()
      await initializeFormEditor()
      const changed = mockFormEditor.instance.on.mock.calls.find(([event]) => event === 'changed')[1]

      const importing = importJson({ id: 'form1', components: [] })
      await changed()
      await importing

      expect(emitted.some(e => e.event === 'toggleEnableSave')).toBe(false)
    })

    it('enables saving when the user edits the form', async () => {
      const { initializeFormEditor, emitted } = withSetup()
      await initializeFormEditor()
      const changed = mockFormEditor.instance.on.mock.calls.find(([event]) => event === 'changed')[1]

      await changed()

      expect(emitted.some(e => e.event === 'toggleEnableSave' && e.args[0] === true)).toBe(true)
    })

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
  })
})
