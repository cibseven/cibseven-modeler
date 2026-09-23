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
import { describe, it, expect, vi, afterEach } from 'vitest'
import useCustomizedTemplateModal from '../../composables/customizedTemplateModal.js'

const makeTemplate = id => ({ id, name: id, appliesTo: [], properties: [] })

// Wire the composable to a mock bpmn-js modeler. customizedModalElementTemplatesData()
// is what injects the modeler into the composable's closure (it also builds the task
// groups from getAll(), hence the well-formed template stubs).
function setup({ templates = [], elementPresent = true } = {}) {
  const applyTemplate = vi.fn()
  const elementRegistry = { get: vi.fn(() => (elementPresent ? { id: 'el-1' } : undefined)) }
  const elementTemplates = { getAll: () => templates, applyTemplate }
  const modeler = { get: key => (key === 'elementRegistry' ? elementRegistry : elementTemplates) }

  const api = useCustomizedTemplateModal()
  api.customizedModalElementTemplatesData(modeler, { value: null }, { value: null })
  return { ...api, applyTemplate, elementRegistry }
}

describe('useCustomizedTemplateModal — applyTemplateToTask', () => {
  const event = { element: { id: 'el-1' } }

  afterEach(() => vi.restoreAllMocks())

  it('applies the template when both element and template are present', () => {
    const template = makeTemplate('tmpl-1')
    const { applyTemplateToTask, applyTemplate } = setup({ templates: [template] })

    applyTemplateToTask('tmpl-1', event)

    expect(applyTemplate).toHaveBeenCalledWith({ id: 'el-1' }, template)
  })

  it('skips without throwing when the template is not loaded in the modeler', () => {
    const { applyTemplateToTask, applyTemplate } = setup({ templates: [makeTemplate('other')] })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => applyTemplateToTask('missing', event)).not.toThrow()
    expect(applyTemplate).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
  })

  it('skips when the element is missing from the registry', () => {
    const { applyTemplateToTask, applyTemplate } = setup({ templates: [makeTemplate('tmpl-1')], elementPresent: false })
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => applyTemplateToTask('tmpl-1', event)).not.toThrow()
    expect(applyTemplate).not.toHaveBeenCalled()
  })
})

describe('useCustomizedTemplateModal — customizedModalElementTemplatesData', () => {
  afterEach(() => vi.restoreAllMocks())

  // A template loaded into bpmn-js without id/name used to crash grouping for every task
  // type with "Cannot read properties of undefined (reading 'split')" instead of just
  // leaving that one template out of the picker.
  it('excludes a template missing id or name instead of throwing, and still groups the rest', () => {
    const good = { id: 'com.example.good-one', name: 'Group - Good', appliesTo: ['bpmn:ServiceTask'], properties: [] }
    const noId = { id: undefined, name: 'Group - NoId', appliesTo: ['bpmn:ServiceTask'], properties: [] }
    const noName = { id: 'com.example.no-name', name: undefined, appliesTo: ['bpmn:ServiceTask'], properties: [] }

    expect(() => setup({ templates: [good, noId, noName] })).not.toThrow()

    // call through the public API directly to capture the grouped return value
    const { customizedModalElementTemplatesData } = useCustomizedTemplateModal()
    const modeler = { get: key => (key === 'elementRegistry' ? { get: () => undefined } : { getAll: () => [good, noId, noName] }) }
    const taskGroups = customizedModalElementTemplatesData(modeler, { value: null }, { value: null })

    const names = taskGroups['bpmn:ServiceTask']['Group '].map(t => t.name)
    expect(names).toEqual([' Good'])
  })
})
