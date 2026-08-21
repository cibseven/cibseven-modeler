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
import { mount } from '@vue/test-utils'

const mockMonacoEditor = {
  create: vi.fn(() => ({
    getModel: vi.fn(() => ({
      onDidChangeContent: vi.fn(),
      getValue: vi.fn(() => '<xml></xml>'),
      getLineContent: vi.fn(),
      getLineCount: vi.fn(),
      getLineMaxColumn: vi.fn(),
      applyEdits: vi.fn(),
      getFullModelRange: vi.fn()
    })),
    onMouseDown: vi.fn(),
    setSelection: vi.fn(),
    focus: vi.fn(),
    trigger: vi.fn(),
    deltaDecorations: vi.fn(),
    getValue: vi.fn(() => '<xml></xml>'),
    getAction: vi.fn(() => ({ run: vi.fn() })),
    dispose: vi.fn()
  })),
  defineTheme: vi.fn(),
  setTheme: vi.fn(),
  Range: function(startLine, startColumn, endLine, endColumn) {
    this.startLine = startLine
    this.startColumn = startColumn
    this.endLine = endLine
    this.endColumn = endColumn
  }
}

vi.mock('../../composables/useMonacoEditor.js', () => ({
  default: () => ({
    createMonacoEditorEditable: vi.fn()
  })
}))

import MonacoEditor from '../../components/monaco/MonacoEditor.vue'

describe('MonacoEditor', () => {
  let wrapper

  const mountMonacoEditor = (props = {}) => {
    const defaultProps = {
      xml: '<process></process>',
      tabElementIndex: 0,
      isBpmn: true,
      language: 'xml',
      ...props
    }
    wrapper = mount(MonacoEditor, {
      props: defaultProps,
      global: {
        provide: {
          monaco: mockMonacoEditor
        }
      }
    })
    return wrapper
  }

  describe('rendering', () => {
    it('renders editor container', () => {
      const wrapper = mountMonacoEditor()
      expect(wrapper.find('.editor').exists()).toBe(true)
    })

    it('has correct container dimensions', () => {
      const wrapper = mountMonacoEditor()
      const editor = wrapper.find('.editor')
      expect(editor.attributes('style')).toContain('width: 100%')
      expect(editor.attributes('style')).toContain('height: 100%')
    })

    it('creates a ref for the editor container', () => {
      const wrapper = mountMonacoEditor()
      expect(wrapper.vm.$refs.editor).toBeDefined()
    })
  })

  describe('props', () => {
    it('accepts xml prop', () => {
      const xmlContent = '<process id="123"></process>'
      const wrapper = mountMonacoEditor({ xml: xmlContent })
      expect(wrapper.props('xml')).toBe(xmlContent)
    })

    it('accepts tabElementIndex prop', () => {
      const wrapper = mountMonacoEditor({ tabElementIndex: 5 })
      expect(wrapper.props('tabElementIndex')).toBe(5)
    })

    it('accepts isBpmn prop', () => {
      const wrapper = mountMonacoEditor({ isBpmn: false })
      expect(wrapper.props('isBpmn')).toBe(false)
    })

    it('accepts language prop', () => {
      const wrapper = mountMonacoEditor({ language: 'xml' })
      expect(wrapper.props('language')).toBe('xml')
    })

    it('has default language of xml', () => {
      const wrapper = mountMonacoEditor({ language: undefined })
      expect(wrapper.vm.$options.props.language.default).toBe('xml')
    })

    it('has default isBpmn of true', () => {
      const wrapper = mountMonacoEditor({ isBpmn: undefined })
      expect(wrapper.vm.$options.props.isBpmn.default).toBe(true)
    })
  })

  describe('emits', () => {
    it('defines updateFromEditor emit', () => {
      const wrapper = mountMonacoEditor()
      expect(wrapper.vm.$options.emits).toContain('updateFromEditor')
    })
  })

  describe('lifecycle', () => {
    it('initializes monaco editor on mount', async () => {
      const wrapper = mountMonacoEditor()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.$refs.editor).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('handles empty xml', () => {
      const wrapper = mountMonacoEditor({ xml: '' })
      expect(wrapper.props('xml')).toBe('')
    })

    it('handles large xml content', () => {
      const largeXml = '<process>' + '<task></task>'.repeat(1000) + '</process>'
      const wrapper = mountMonacoEditor({ xml: largeXml })
      expect(wrapper.props('xml')).toBe(largeXml)
    })

    it('handles special characters in xml', () => {
      const xmlWithSpecialChars = '<process>&lt;&gt;"\'</process>'
      const wrapper = mountMonacoEditor({ xml: xmlWithSpecialChars })
      expect(wrapper.props('xml')).toBe(xmlWithSpecialChars)
    })

    it('handles zero tabElementIndex', () => {
      const wrapper = mountMonacoEditor({ tabElementIndex: 0 })
      expect(wrapper.props('tabElementIndex')).toBe(0)
    })

    it('handles large tabElementIndex', () => {
      const wrapper = mountMonacoEditor({ tabElementIndex: 99999 })
      expect(wrapper.props('tabElementIndex')).toBe(99999)
    })

    it('handles negative tabElementIndex', () => {
      const wrapper = mountMonacoEditor({ tabElementIndex: -1 })
      expect(wrapper.props('tabElementIndex')).toBe(-1)
    })

    it('renders with different languages', () => {
      const languages = ['xml', 'json', 'javascript', 'typescript']
      languages.forEach(lang => {
        const wrapper = mountMonacoEditor({ language: lang })
        expect(wrapper.props('language')).toBe(lang)
      })
    })
  })

  describe('styling', () => {
    it('editor container has scoped styling', () => {
      const wrapper = mountMonacoEditor()
      const editor = wrapper.find('.editor')
      expect(editor.exists()).toBe(true)
    })

    it('editor container uses 100% width', () => {
      const wrapper = mountMonacoEditor()
      const style = wrapper.find('.editor').attributes('style')
      expect(style).toContain('width: 100%')
    })

    it('editor container uses 100% height', () => {
      const wrapper = mountMonacoEditor()
      const style = wrapper.find('.editor').attributes('style')
      expect(style).toContain('height: 100%')
    })
  })

  describe('prop combinations', () => {
    it('handles BPMN with XML language', () => {
      const wrapper = mountMonacoEditor({
        isBpmn: true,
        language: 'xml',
        xml: '<bpmn></bpmn>'
      })
      expect(wrapper.props('isBpmn')).toBe(true)
      expect(wrapper.props('language')).toBe('xml')
    })

    it('handles non-BPMN with JSON language', () => {
      const wrapper = mountMonacoEditor({
        isBpmn: false,
        language: 'json',
        xml: '{}'
      })
      expect(wrapper.props('isBpmn')).toBe(false)
      expect(wrapper.props('language')).toBe('json')
    })

    it('handles multiple tab indices', () => {
      const wrapper1 = mountMonacoEditor({ tabElementIndex: 1 })
      const wrapper2 = mountMonacoEditor({ tabElementIndex: 2 })
      expect(wrapper1.props('tabElementIndex')).toBe(1)
      expect(wrapper2.props('tabElementIndex')).toBe(2)
    })
  })

  describe('integration', () => {
    it('renders without errors with default props', () => {
      const wrapper = mountMonacoEditor()
      expect(wrapper.vm).toBeDefined()
      expect(wrapper.find('.editor').exists()).toBe(true)
    })

    it('mounts and unmounts without errors', async () => {
      const wrapper = mountMonacoEditor()
      expect(wrapper.find('.editor').exists()).toBe(true)
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })
  })
})
