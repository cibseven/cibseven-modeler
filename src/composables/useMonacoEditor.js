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
import { getTimeStamp } from '../utils.js'

// Monaco workers and language contributions are configured centrally in
// src/monaco-setup.js, which runs at app startup via main.js / library.js.

export default function useMonacoEditor(monacoRef, props, emit) {
  const monaco = monacoRef
  let monacoEditor = null
  const lineContent = ref(-1)

  const checkBeforeCreation = container => {
    if (!monaco) {
      console.error('Monaco Editor instance not found.')
      return
    }

    if (!container) {
      console.error('Container element not found.')
      return
    }
  }
  const createMonacoEditorForScripts = (container, text, language = 'java') => {
   return monacoEditor = monaco.editor.create(container, {
      value: text,
      // hides left margin with numbers
      lineNumbers: 'off',
      glyphMargin: false,
      //folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      //--
      overviewRulerBorder: false,
      language: language,
      //lineNumbers: 'on', // to show the left numbers
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      theme: 'vs',
      automaticLayout: true, //IMPORTANT to avoid bug when monaco editor is created inside a div with display none
      minimap: { enabled: false }, // hides the minimap
      quickSuggestions: true,
      parameterHints: { enabled: true },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      wordBasedSuggestions: true,
      selectionHighlight: true,
      // Render suggest / hover / parameter-hints widgets at document root with
      // position:fixed so they escape the properties-panel's overflow:hidden
      // wrapper — otherwise they're clipped and invisible.
      fixedOverflowWidgets: true
    })
  }

  const createMonacoForConsole = container => {
    checkBeforeCreation(container)
    defaultConsoleTheme()
    monacoEditor = monaco.editor.create(container, {
      value: props.consoleErrors,
      language: props.language,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      theme: 'consoleTheme'
    })
    monacoEditor.onMouseDown((e) => {
      const position = e.target.position
      if (position) lineContent.value = monacoEditor.getModel().getLineContent(position.lineNumber)
    })  
  }
  const createMonacoEditorEditable = container => {
    const editorValue = props.xml
    checkBeforeCreation(container)
    monacoEditor = monaco.editor.create(container, {
      value: editorValue,
      language: props.language,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      theme: 'vs',
      automaticLayout: true,
      quickSuggestions: true,
      parameterHints: { enabled: true },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      wordBasedSuggestions: true,
      selectionHighlight: true
    })
    //captures changes in xml
    monacoEditor.getModel().onDidChangeContent(() => {
      emit('updateFromEditor', monacoEditor.getValue(), props.tabElementIndex)
    })
  }

   //in case we want to add some style
   /*
  const defineCustomErrorTheme = () => {    
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--bs-primary').trim()
    monaco.editor.defineTheme('errorTheme', {
      base: 'vs', // Basado en el tema claro
      inherit: true, // Hereda las reglas del tema base
      rules: [
        { token: '', foreground: '000000' }, // Color por defecto para el texto
        { token: 'custom-error', foreground: primaryColor} // Rojo para el texto de error
      ],
      colors: {
        'editor.background': '#000000',
        'editorLineNumber.foreground': '#000000'
      }
    })
  }
*/

  const formatMonacoEditor = () => {
    monacoEditor.getAction('editor.action.formatDocument').run()
  }

  const defaultConsoleTheme = () =>{
    monaco.editor.defineTheme('consoleTheme', {
      base: 'vs', // or 'vs-dark' for dark theme
      inherit: true,
      rules: [],
      colors: {
          'editor.background': '#00000000', // Set background to transparent
          'focusBorder': '#00000000'
      }
    })
  }

  const addLineWithError = text => {
    const model = monacoEditor.getModel()
    const lineNumber = model.getLineCount()
    const message = `${getTimeStamp()}: ${text}`
    model.applyEdits([
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        text: message
      }
    ])

    monacoEditor.deltaDecorations(
      [],
      [
        {
          range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
          options: {
            inlineClassName: 'custom-error' //for the background
          }
        }
      ]
    )
  }

  const copyLine = () =>{
    if (lineContent.value === -1) {
      const range = monacoEditor.getModel().getFullModelRange()
      monacoEditor.setSelection(range)
    }
    monacoEditor.focus()
    monacoEditor.trigger('source','editor.action.clipboardCopyAction')
  }

  const focusLost = () => lineContent.value = -1

  const cleanConsole = () =>  monacoEditor.setValue('')

  return {
    createMonacoEditorForScripts,
    createMonacoEditorEditable,
    createMonacoForConsole,
    formatMonacoEditor,
    addLineWithError,
    cleanConsole,
    copyLine,
    focusLost
  }
}
