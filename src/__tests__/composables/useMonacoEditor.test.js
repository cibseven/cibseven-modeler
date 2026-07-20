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

vi.mock('../../utils.js', () => ({
  getTimeStamp: vi.fn(() => '12:00:00'),
}))

import useMonacoEditor from '../../composables/useMonacoEditor.js'

function createMockMonaco() {
  const model = {
    getLineContent: vi.fn(() => 'error line'),
    onDidChangeContent: vi.fn(),
    getLineCount: vi.fn(() => 2),
    applyEdits: vi.fn(),
    getFullModelRange: vi.fn(() => ({ start: 0, end: 100 })),
    getLineMaxColumn: vi.fn(() => 20),
    setValue: vi.fn(),
  }
  const editor = {
    onMouseDown: vi.fn(),
    getModel: vi.fn(() => model),
    deltaDecorations: vi.fn(),
    setSelection: vi.fn(),
    focus: vi.fn(),
    trigger: vi.fn(),
    getValue: vi.fn(() => 'editor content'),
    getAction: vi.fn(() => ({ run: vi.fn() })),
    setValue: vi.fn(),
  }
  return {
    editor: {
      create: vi.fn(() => editor),
      defineTheme: vi.fn(),
    },
    Range: class Range {
      constructor(sL, sC, eL, eC) {
        this.startLine = sL
        this.startCol = sC
        this.endLine = eL
        this.endCol = eC
      }
    },
    _editor: editor,
    _model: model,
  }
}

describe('useMonacoEditor', () => {
  const createMockEmit = () => vi.fn()
  const createMockProps = (overrides = {}) => ({
    xml: '<xml>test</xml>',
    language: 'xml',
    consoleErrors: 'existing error',
    tabElementIndex: 0,
    ...overrides,
  })

  beforeEach(() => vi.clearAllMocks())

  describe('createMonacoForConsole', () => {
    it('creates read-only console editor with theme', () => {
      const monaco = createMockMonaco()
      const composable = useMonacoEditor(monaco, createMockProps(), createMockEmit())
      const container = document.createElement('div')
      composable.createMonacoForConsole(container)
      expect(monaco.editor.defineTheme).toHaveBeenCalledWith('consoleTheme', expect.any(Object))
      expect(monaco.editor.create).toHaveBeenCalledWith(container, expect.objectContaining({ readOnly: true, theme: 'consoleTheme' }))
    })
  })

  describe('createMonacoEditorEditable', () => {
    it('creates editable editor and emits on content change', () => {
      const monaco = createMockMonaco()
      const emit = createMockEmit()
      const composable = useMonacoEditor(monaco, createMockProps(), emit)
      const container = document.createElement('div')
      composable.createMonacoEditorEditable(container)
      expect(monaco.editor.create).toHaveBeenCalled()
      expect(monaco._model.onDidChangeContent).toHaveBeenCalled()
    })
  })

  describe('addLineWithError', () => {
    it('appends error line with decoration', () => {
      const monaco = createMockMonaco()
      const composable = useMonacoEditor(monaco, createMockProps(), createMockEmit())
      composable.createMonacoForConsole(document.createElement('div'))
      composable.addLineWithError('Validation failed')
      expect(monaco._model.applyEdits).toHaveBeenCalled()
      expect(monaco._editor.deltaDecorations).toHaveBeenCalled()
    })
  })

  describe('copyLine', () => {
    it('triggers clipboard copy action', () => {
      const monaco = createMockMonaco()
      const composable = useMonacoEditor(monaco, createMockProps(), createMockEmit())
      composable.createMonacoForConsole(document.createElement('div'))
      composable.copyLine()
      expect(monaco._editor.trigger).toHaveBeenCalledWith('source', 'editor.action.clipboardCopyAction')
    })
  })

  describe('cleanConsole', () => {
    it('clears editor value', () => {
      const monaco = createMockMonaco()
      const composable = useMonacoEditor(monaco, createMockProps(), createMockEmit())
      composable.createMonacoForConsole(document.createElement('div'))
      composable.cleanConsole()
      expect(monaco._editor.setValue).toHaveBeenCalledWith('')
    })
  })

  describe('focusLost', () => {
    it('resets line content selection', () => {
      const monaco = createMockMonaco()
      const composable = useMonacoEditor(monaco, createMockProps(), createMockEmit())
      composable.createMonacoForConsole(document.createElement('div'))
      composable.focusLost()
      composable.copyLine()
      expect(monaco._editor.setSelection).toHaveBeenCalled()
    })
  })
})
