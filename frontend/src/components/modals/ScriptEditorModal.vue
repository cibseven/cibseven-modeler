<!--
  Copyright CIB software GmbH and/or licensed to CIB software GmbH
  under one or more contributor license agreements. See the NOTICE file
  distributed with this work for additional information regarding copyright
  ownership. CIB software licenses this file to you under the Apache License,
  Version 2.0; you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
-->
<template>
  <BModal
    ref="bModal"
    :title="$t('scriptEditorModal.title')"
    size="xl"
    body-class="p-0"
    @shown="onShown"
    @hidden="onHidden"
  >
    <div ref="editorEl" class="w-100" style="height: 70vh"></div>
    <template #modal-footer>
      <button type="button" class="btn btn-primary" @click="accept">
        {{ $t('buttons.accept') }}
      </button>
      <button type="button" class="btn btn-secondary" @click="cancel">
        {{ $t('buttons.cancel') }}
      </button>
    </template>
  </BModal>
</template>

<script setup>
import { BModal } from '@cib/common-frontend'
import { ref, inject } from 'vue'

const bModal = ref(null)
const editorEl = ref(null)
const monaco = inject('monaco')

let resolvePromise = null
let monacoEditor = null

const _mapLanguage = (scriptFormat) => {
  const map = { javascript: 'javascript', python: 'python', ruby: 'ruby', xml: 'xml', sql: 'sql' }
  return map[scriptFormat?.toLowerCase()] ?? 'java'
}

const onShown = () => {
  if (monacoEditor) {
    monacoEditor.dispose()
    monacoEditor = null
  }
  monacoEditor = monaco.editor.create(editorEl.value, {
    value: _pendingText,
    language: _pendingLanguage,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly: false,
    theme: 'vs',
    automaticLayout: true,
    minimap: { enabled: true },
    quickSuggestions: true,
    parameterHints: { enabled: true },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    wordBasedSuggestions: true,
    selectionHighlight: true
  })
}

const onHidden = () => {
  if (monacoEditor) {
    monacoEditor.dispose()
    monacoEditor = null
  }
  if (resolvePromise) {
    resolvePromise(null)
    resolvePromise = null
  }
}

let _pendingText = ''
let _pendingLanguage = 'java'

const open = (text, scriptFormat) => {
  _pendingText = text ?? ''
  _pendingLanguage = _mapLanguage(scriptFormat)
  return new Promise((resolve) => {
    resolvePromise = resolve
    bModal.value.show()
  })
}

const accept = () => {
  const value = monacoEditor ? monacoEditor.getValue() : _pendingText
  resolvePromise?.(value)
  resolvePromise = null
  bModal.value.hide('ok')
}

const cancel = () => {
  resolvePromise?.(null)
  resolvePromise = null
  bModal.value.hide('cancel')
}

defineExpose({ open })
</script>
