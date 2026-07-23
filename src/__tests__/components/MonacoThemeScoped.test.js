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

const monacoMocks = vi.hoisted(() => {
  const mockTheme = {
    getColor: vi.fn(() => ({ toString: () => '#ffffff' })),
  }
  const knownThemes = new Map([['vs', mockTheme], ['vs-dark', mockTheme], ['consoleTheme', mockTheme]])
  return {
    IStandaloneThemeService: Symbol('IStandaloneThemeService'),
    StandaloneServices: {
      get: vi.fn(() => ({ _knownThemes: knownThemes })),
    },
    Registry: {
      as: vi.fn(() => ({
        getColors: vi.fn(() => [{ id: 'editor.background' }]),
      })),
    },
    asCssVariableName: (name) => `--${name}`,
    Extensions: { ColorContribution: 'colorContribution' },
  }
})

vi.mock('monaco-editor/esm/vs/editor/standalone/common/standaloneTheme', () => ({
  IStandaloneThemeService: monacoMocks.IStandaloneThemeService,
}))

vi.mock('monaco-editor/esm/vs/editor/standalone/browser/standaloneServices', () => ({
  StandaloneServices: monacoMocks.StandaloneServices,
}))

vi.mock('monaco-editor/esm/vs/platform/registry/common/platform.js', () => ({
  Registry: monacoMocks.Registry,
}))

vi.mock('monaco-editor/esm/vs/platform/theme/common/colorRegistry', () => ({
  asCssVariableName: monacoMocks.asCssVariableName,
  Extensions: monacoMocks.Extensions,
}))

import MonacoThemeScoped from '../../components/layout/MonacoThemeScoped.vue'

function mountTheme(props = {}, slots = {}) {
  return mount(MonacoThemeScoped, {
    props: { overrideTheme: 'vs-dark', ...props },
    slots: { default: '<div class="slot-content">Child</div>', ...slots },
  })
}

describe('MonacoThemeScoped', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  describe('rendering', () => {
    it('renders container with theme class', async () => {
      const wrapper = mountTheme({ overrideTheme: 'vs-dark' })
      await flushPromises()
      expect(wrapper.find('.MonacoThemeScope-theme-vs-dark').exists()).toBe(true)
    })

    it('renders slot content', async () => {
      const wrapper = mountTheme()
      await flushPromises()
      expect(wrapper.find('.slot-content').text()).toBe('Child')
    })

    it('applies h-100 class', async () => {
      const wrapper = mountTheme()
      await flushPromises()
      expect(wrapper.find('.h-100').exists()).toBe(true)
    })
  })

  describe('lifecycle', () => {
    it('creates style element on mount', async () => {
      mountTheme({ overrideTheme: 'consoleTheme' })
      await flushPromises()
      expect(document.getElementById('MonacoThemeScope-theme-consoleTheme')).toBeTruthy()
    })

    it('reuses existing style element', async () => {
      const existing = document.createElement('style')
      existing.id = 'MonacoThemeScope-theme-vs'
      document.head.appendChild(existing)
      mountTheme({ overrideTheme: 'vs' })
      await flushPromises()
      expect(document.querySelectorAll('#MonacoThemeScope-theme-vs').length).toBe(1)
    })
  })

  describe('props', () => {
    it('updates class when overrideTheme changes', async () => {
      const wrapper = mountTheme({ overrideTheme: 'vs-dark' })
      await flushPromises()
      await wrapper.setProps({ overrideTheme: 'vs-light' })
      await flushPromises()
      expect(wrapper.find('.MonacoThemeScope-theme-vs-light').exists()).toBe(true)
    })
  })
})
