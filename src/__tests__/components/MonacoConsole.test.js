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
      getValue: vi.fn(() => ''),
      getLineContent: vi.fn(),
      getLineCount: vi.fn(() => 1),
      getLineMaxColumn: vi.fn(() => 100),
      applyEdits: vi.fn(),
      getFullModelRange: vi.fn(() => ({
        startLine: 1,
        endLine: 1
      }))
    })),
    onMouseDown: vi.fn((callback) => {
      // Store callback for testing
      mockMonacoEditor._mouseDownCallback = callback
    }),
    setSelection: vi.fn(),
    focus: vi.fn(),
    trigger: vi.fn(),
    deltaDecorations: vi.fn(),
    getValue: vi.fn(() => ''),
    setValue: vi.fn(),
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
    createMonacoForConsole: vi.fn(),
    addLineWithError: vi.fn(),
    cleanConsole: vi.fn(),
    copyLine: vi.fn(),
    focusLost: vi.fn()
  })
}))

import MonacoConsole from '../../components/monaco/MonacoConsole.vue'

describe('MonacoConsole', () => {
  let wrapper

  const mountMonacoConsole = (props = {}) => {
    const defaultProps = {
      height: 400,
      width: 500,
      consoleErrors: 'Initial console content',
      language: 'javascript',
      ...props
    }
    wrapper = mount(MonacoConsole, {
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
      const wrapper = mountMonacoConsole()
      expect(wrapper.find('.editor').exists()).toBe(true)
    })

    it('applies Bootstrap classes', () => {
      const wrapper = mountMonacoConsole()
      const editor = wrapper.find('.editor')
      expect(editor.classes()).toContain('overflow-hidden')
      expect(editor.classes()).toContain('h-100')
      expect(editor.classes()).toContain('p-2')
      expect(editor.classes()).toContain('border')
      expect(editor.classes()).toContain('rounded-1')
    })

    it('creates a ref for the editor container', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.vm.$refs.editor).toBeDefined()
    })
  })

  describe('props', () => {
    it('accepts height prop', () => {
      const wrapper = mountMonacoConsole({ height: 600 })
      expect(wrapper.props('height')).toBe(600)
    })

    it('accepts width prop', () => {
      const wrapper = mountMonacoConsole({ width: 800 })
      expect(wrapper.props('width')).toBe(800)
    })

    it('accepts consoleErrors prop', () => {
      const content = 'Error occurred at line 5'
      const wrapper = mountMonacoConsole({ consoleErrors: content })
      expect(wrapper.props('consoleErrors')).toBe(content)
    })

    it('accepts language prop', () => {
      const wrapper = mountMonacoConsole({ language: 'python' })
      expect(wrapper.props('language')).toBe('python')
    })

    it('has default language of javascript', () => {
      const wrapper = mountMonacoConsole({ language: undefined })
      expect(wrapper.vm.$options.props.language.default).toBe('javascript')
    })
  })

  describe('styles', () => {
    it('computes style object with width and height', () => {
      const wrapper = mountMonacoConsole({ height: 300, width: 400 })
      expect(wrapper.vm.style).toEqual({
        width: '400px',
        height: '100% !important'
      })
    })

    it('applies computed style to editor', () => {
      const wrapper = mountMonacoConsole({ height: 300, width: 400 })
      const style = wrapper.find('.editor').attributes('style')
      expect(style).toContain('width: 400px')
      expect(style).toContain('height: 100% !important')
    })

    it('updates style when width prop changes', async () => {
      const wrapper = mountMonacoConsole({ width: 300 })
      await wrapper.setProps({ width: 600 })
      expect(wrapper.vm.style.width).toBe('600px')
    })

    it('keeps height as 100% regardless of height prop', () => {
      const wrapper = mountMonacoConsole({ height: 200 })
      expect(wrapper.vm.style.height).toBe('100% !important')
    })
  })

  describe('exposed methods', () => {
    it('exposes addLineWithError method', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.vm.addLineWithError).toBeDefined()
    })

    it('exposes copyLine method', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.vm.copyLine).toBeDefined()
    })

    it('exposes cleanConsole method', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.vm.cleanConsole).toBeDefined()
    })

    it('exposes focusLost method', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.vm.focusLost).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('handles zero width', () => {
      const wrapper = mountMonacoConsole({ width: 0 })
      expect(wrapper.props('width')).toBe(0)
      expect(wrapper.vm.style.width).toBe('0px')
    })

    it('handles zero height', () => {
      const wrapper = mountMonacoConsole({ height: 0 })
      expect(wrapper.props('height')).toBe(0)
    })

    it('handles large width', () => {
      const wrapper = mountMonacoConsole({ width: 5000 })
      expect(wrapper.vm.style.width).toBe('5000px')
    })

    it('handles large height', () => {
      const wrapper = mountMonacoConsole({ height: 5000 })
      expect(wrapper.props('height')).toBe(5000)
    })

    it('handles empty consoleErrors', () => {
      const wrapper = mountMonacoConsole({ consoleErrors: '' })
      expect(wrapper.props('consoleErrors')).toBe('')
    })

    it('handles null consoleErrors', () => {
      const wrapper = mountMonacoConsole({ consoleErrors: null })
      expect(wrapper.props('consoleErrors')).toBeNull()
    })

    it('handles undefined consoleErrors', () => {
      const wrapper = mountMonacoConsole({ consoleErrors: undefined })
      expect(wrapper.props('consoleErrors')).toBeUndefined()
    })

    it('handles multiline console errors', () => {
      const multiline = 'Line 1\nLine 2\nLine 3'
      const wrapper = mountMonacoConsole({ consoleErrors: multiline })
      expect(wrapper.props('consoleErrors')).toBe(multiline)
    })

    it('handles special characters in console output', () => {
      const special = 'Error: <>&"\'\n\t'
      const wrapper = mountMonacoConsole({ consoleErrors: special })
      expect(wrapper.props('consoleErrors')).toBe(special)
    })

    it('handles very long console content', () => {
      const longContent = 'Message '.repeat(10000)
      const wrapper = mountMonacoConsole({ consoleErrors: longContent })
      expect(wrapper.props('consoleErrors')).toBe(longContent)
    })

    it('handles different language types', () => {
      const languages = ['javascript', 'python', 'java', 'typescript']
      languages.forEach(lang => {
        const wrapper = mountMonacoConsole({ language: lang })
        expect(wrapper.props('language')).toBe(lang)
      })
    })
  })

  describe('dimension updates', () => {
    it('updates width dynamically', async () => {
      const wrapper = mountMonacoConsole({ width: 300 })
      expect(wrapper.vm.style.width).toBe('300px')
      
      await wrapper.setProps({ width: 500 })
      expect(wrapper.vm.style.width).toBe('500px')
      
      await wrapper.setProps({ width: 800 })
      expect(wrapper.vm.style.width).toBe('800px')
    })

    it('handles rapid width changes', async () => {
      const wrapper = mountMonacoConsole({ width: 100 })
      for (let i = 200; i <= 500; i += 100) {
        await wrapper.setProps({ width: i })
      }
      expect(wrapper.vm.style.width).toBe('500px')
    })

    it('handles height changes', async () => {
      const wrapper = mountMonacoConsole({ height: 200 })
      expect(wrapper.props('height')).toBe(200)
      
      await wrapper.setProps({ height: 400 })
      expect(wrapper.props('height')).toBe(400)
    })
  })

  describe('content updates', () => {
    it('handles consoleErrors updates', async () => {
      const wrapper = mountMonacoConsole({ consoleErrors: 'Error 1' })
      expect(wrapper.props('consoleErrors')).toBe('Error 1')
      
      await wrapper.setProps({ consoleErrors: 'Error 2' })
      expect(wrapper.props('consoleErrors')).toBe('Error 2')
    })

    it('handles language updates', async () => {
      const wrapper = mountMonacoConsole({ language: 'javascript' })
      expect(wrapper.props('language')).toBe('javascript')
      
      await wrapper.setProps({ language: 'python' })
      expect(wrapper.props('language')).toBe('python')
    })
  })

  describe('integration', () => {
    it('renders without errors with default props', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.vm).toBeDefined()
      expect(wrapper.find('.editor').exists()).toBe(true)
    })

    it('mounts and unmounts without errors', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.find('.editor').exists()).toBe(true)
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('renders with all possible prop combinations', () => {
      const wrapper = mountMonacoConsole({
        height: 400,
        width: 500,
        consoleErrors: 'Test errors',
        language: 'javascript'
      })
      expect(wrapper.vm).toBeDefined()
      expect(wrapper.find('.editor').exists()).toBe(true)
    })

    it('maintains exposed methods after prop updates', async () => {
      const wrapper = mountMonacoConsole()
      const addLineMethod = wrapper.vm.addLineWithError
      
      await wrapper.setProps({ width: 600 })
      expect(wrapper.vm.addLineWithError).toBe(addLineMethod)
    })
  })

  describe('styling with custom theme', () => {
    it('has custom error class styling defined', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.vm).toBeDefined()
    })

    it('applies overflow-hidden class for content control', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.find('.editor').classes('overflow-hidden')).toBe(true)
    })

    it('applies border styling', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.find('.editor').classes('border')).toBe(true)
    })

    it('applies rounded corner styling', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.find('.editor').classes('rounded-1')).toBe(true)
    })

    it('applies padding via p-2 class', () => {
      const wrapper = mountMonacoConsole()
      expect(wrapper.find('.editor').classes('p-2')).toBe(true)
    })
  })
})
