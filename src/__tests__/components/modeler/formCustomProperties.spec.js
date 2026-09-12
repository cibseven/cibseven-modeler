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
import { describe, it, expect, afterEach } from 'vitest'
import { FormEditor } from '@bpmn-io/form-js'

/**
 * Adding a custom property through the properties panel, with the editor set up the way the
 * composable sets it up. The order of that setup is what matters: the panel subscribes to
 * 'changed' from a layout effect, so it registers after any listener added right after the
 * import, and the event bus stops propagating as soon as a listener returns a value.
 */
describe('form-js custom properties', () => {
  const SCHEMA = {
    components: [
      { label: 'Text area', type: 'textarea', id: 'Field_0512nrn', key: 'textarea_kxkgca' }
    ],
    schemaVersion: 19,
    type: 'default',
    id: 'testForm'
  }

  // The panel observes its scroll container to keep group headers sticky; jsdom has neither
  // observer, and the exceptions from their absence abort the render being measured here.
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.IntersectionObserver = global.IntersectionObserver || NoopObserver
  global.ResizeObserver = global.ResizeObserver || NoopObserver

  let editor
  let panel

  // The panel renders through preact, so every assertion waits for it to flush
  const rendered = () => new Promise(resolve => setTimeout(resolve, 300))

  const mount = async onChanged => {
    const container = document.createElement('div')
    panel = document.createElement('div')
    document.body.appendChild(container)
    document.body.appendChild(panel)

    editor = new FormEditor({ container, propertiesPanel: { parent: panel } })
    await editor.importSchema(SCHEMA)
    if (onChanged) editor.on('changed', onChanged)
    editor.get('selection').set(editor.get('formFieldRegistry').get('Field_0512nrn'))
    await rendered()
  }

  afterEach(async () => {
    await editor?.destroy()
    document.body.innerHTML = ''
  })

  const group = () => panel.querySelector('[data-group-id="group-custom-values"]')

  const addProperty = async () => {
    group().querySelector('.bio-properties-panel-add-entry').click()
    await rendered()
  }

  const renderedEntries = () => group().querySelectorAll('.bio-properties-panel-list > *').length

  const storedProperties = async () => (await editor.getSchema()).components[0].properties

  it('renders an entry for the property it writes into the schema', async () => {
    await mount()

    await addProperty()

    expect(await storedProperties()).toEqual({ key1: 'value' })
    expect(renderedEntries()).toBe(1)
  })

})
