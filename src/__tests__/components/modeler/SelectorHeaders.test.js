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
import { describe, it, expect } from 'vitest'

import { getHeadersForSelector } from '../../../components/modeler/SelectorHeaders.js'

describe('SelectorHeaders', () => {
  describe('getHeadersForSelector', () => {
    it('returns version headers for changeVersion', () => {
      const headers = getHeadersForSelector('changeVersion')
      
      expect(headers).toBeDefined()
      expect(headers.length).toBeGreaterThan(0)
      expect(headers[0].key).toBe('version')
    })

    it('returns headers with version and date columns', () => {
      const headers = getHeadersForSelector('changeVersion')
      
      const keys = headers.map(h => h.key)
      expect(keys).toContain('version')
      expect(keys).toContain('updated')
    })

    it('includes sortKey for version header', () => {
      const headers = getHeadersForSelector('changeVersion')
      
      const versionHeader = headers.find(h => h.key === 'version')
      expect(versionHeader.sortKey).toBe('version')
    })

    it('includes label for version header', () => {
      const headers = getHeadersForSelector('changeVersion')
      
      const versionHeader = headers.find(h => h.key === 'version')
      expect(versionHeader.label).toBe('headerVersion')
    })

    it('includes CSS class for version header', () => {
      const headers = getHeadersForSelector('changeVersion')
      
      const versionHeader = headers.find(h => h.key === 'version')
      expect(versionHeader.class).toBe('col')
    })

    it('returns simple headers for templates', () => {
      const headers = getHeadersForSelector('templates')
      
      expect(headers).toBeDefined()
      expect(headers.length).toBeGreaterThan(0)
      expect(headers[0].key).toBe('name')
    })

    it('simple headers only have name key', () => {
      const headers = getHeadersForSelector('templates')
      
      expect(headers).toHaveLength(1)
      expect(headers[0].key).toBe('name')
    })

    it('simple headers have CSS class', () => {
      const headers = getHeadersForSelector('templates')
      
      expect(headers[0].class).toBe('col')
    })

    it('returns empty array for unknown selector type', () => {
      const headers = getHeadersForSelector('unknown')
      
      expect(headers).toEqual([])
    })

    it('returns empty array for null selector', () => {
      const headers = getHeadersForSelector(null)
      
      expect(headers).toEqual([])
    })

    it('returns empty array for undefined selector', () => {
      const headers = getHeadersForSelector(undefined)
      
      expect(headers).toEqual([])
    })

    it('handles case-sensitive selector types', () => {
      const lowercaseHeaders = getHeadersForSelector('changeversion')
      expect(lowercaseHeaders).toEqual([])
      
      const correctHeaders = getHeadersForSelector('changeVersion')
      expect(correctHeaders.length).toBeGreaterThan(0)
    })

    it('version headers have correct labels', () => {
      const headers = getHeadersForSelector('changeVersion')
      
      const labels = headers.map(h => h.label)
      expect(labels).toContain('headerVersion')
      expect(labels).toContain('headerDate')
    })

    it('all headers have required properties', () => {
      const headers = getHeadersForSelector('changeVersion')
      
      headers.forEach(header => {
        expect(header.key).toBeDefined()
        expect(header.sortKey).toBeDefined()
        expect(header.label).toBeDefined()
        expect(header.class).toBeDefined()
      })
    })
  })

  describe('integration', () => {
    it('provides consistent structure for different selector types', () => {
      const versionHeaders = getHeadersForSelector('changeVersion')
      const simpleHeaders = getHeadersForSelector('templates')
      
      versionHeaders.forEach(h => expect(h.class).toBe('col'))
      simpleHeaders.forEach(h => expect(h.class).toBe('col'))
    })

    it('supports selector type switching', () => {
      const versionHeaders = getHeadersForSelector('changeVersion')
      const templateHeaders = getHeadersForSelector('templates')
      
      expect(versionHeaders.length).not.toBe(templateHeaders.length)
    })
  })
})
