/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import FilesTable from '../../components/modeler/FilesTable.vue'
import { DIAGRAM_TYPE } from '../../constants/diagramTypes.js'

enableAutoUnmount(afterEach)

const PROJECT = { id: 'project', parentId: null, name: 'Billing', updated: '2026-10-01T10:00:00Z', updatedBy: 'anna' }
const USER_FOLDER = { id: 'demo', parentId: null, name: 'demo', userFolder: true, updated: '2026-09-01T10:00:00Z' }
const SUBFOLDER = { id: 'sub', parentId: 'project', name: 'Archive', updated: '2026-10-05T10:00:00Z' }

const PROCESS = { id: 'p1', name: 'Invoice', processkey: 'invoice', type: DIAGRAM_TYPE.BPMN_C7, folderId: 'project', updated: '2026-10-10T10:00:00Z', updatedBy: 'bob' }
const DECISION = { id: 'd1', name: 'Approval', processkey: 'approval', type: DIAGRAM_TYPE.DMN, folderId: 'project', updated: [2026, 10, 12, 9, 30, 0, 0], updatedBy: 'anna' }
const FORM = { id: 'f1', formId: 'request', type: DIAGRAM_TYPE.FORM, folderId: 'sub', updated: '2026-10-11T10:00:00Z', updatedBy: 'carl' }

// The menus are the shared ones; what matters here is which entries a row offers
const { BDropdown, BDropdownItemButton } = vi.hoisted(() => ({
  BDropdown: {
    name: 'BDropdown',
    props: ['label', 'toggleClass'],
    methods: { hide: vi.fn() },
    // Like the real menu, a click inside it does not reach the row
    template: '<div class="menu-stub" :aria-label="label" :data-toggle-class="toggleClass" @click.stop><slot /></div>',
  },
  BDropdownItemButton: {
    name: 'BDropdownItemButton',
    emits: ['click'],
    template: '<button type="button" class="menu-item" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('@cib/common-frontend', async () => {
  const actual = await vi.importActual('@cib/common-frontend')
  return { FlowTable: actual.FlowTable, BDropdown, BDropdownItemButton }
})

function mountTable(props = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} }, missingWarn: false, fallbackWarn: false })
  const wrapper = mount(FilesTable, {
    props: {
      folders: [PROJECT, USER_FOLDER],
      models: [PROCESS, DECISION, FORM],
      'onUpdate:sort': sort => wrapper.setProps({ sort }),
      ...props,
    },
    global: { plugins: [i18n] },
  })
  return wrapper
}

const labels = wrapper => wrapper.findAll('tbody tr').map(row => row.find('td button').text())
const row = (wrapper, label) => wrapper.findAll('tbody tr').find(tr => tr.find('td button').text() === label)
const menuOf = (wrapper, label) => row(wrapper, label).findAll('.menu-item').map(item => item.text())
const sortBy = (wrapper, column) => wrapper.findAll('thead th button').find(button => button.text() === column).trigger('click')

describe('FilesTable', () => {
  describe('rows', () => {
    it('lists the folders before the models, the newest first in each group', () => {
      const wrapper = mountTable()

      expect(labels(wrapper)).toEqual(['Billing', 'demo', 'Approval.dmn', 'request.form', 'Invoice.bpmn'])
    })

    it('names a form by its form id and a diagram by its name, with the file extension', () => {
      const wrapper = mountTable({ folders: [] })

      expect(labels(wrapper)).toEqual(expect.arrayContaining(['Invoice.bpmn', 'Approval.dmn', 'request.form']))
    })

    it('tells projects, folders and the user folder apart by their icon', () => {
      const wrapper = mountTable({ folders: [PROJECT, USER_FOLDER, SUBFOLDER], models: [] })

      expect(row(wrapper, 'Billing').find('.mdi-briefcase').exists()).toBe(true)
      expect(row(wrapper, 'Archive').find('.mdi-folder-outline').exists()).toBe(true)
      expect(row(wrapper, 'demo').find('.mdi-folder-account-outline').exists()).toBe(true)
    })

    it('marks the default folder', () => {
      const wrapper = mountTable({ isDefault: id => id === 'project' })

      expect(row(wrapper, 'Billing').find('.badge').text()).toBe('folders.defaultBadge')
      expect(row(wrapper, 'demo').find('.badge').exists()).toBe(false)
    })

    it('shows who changed a row last', () => {
      const wrapper = mountTable()

      expect(row(wrapper, 'Invoice.bpmn').text()).toContain('bob')
    })

    /** A folder only gets an update stamp once it is renamed or moved. */
    it('shows who created a folder that was never changed, and sorts it by that date', () => {
      const created = { id: 'fresh', parentId: null, name: 'Fresh', created: '2026-10-15T10:00:00Z', createdBy: 'dora' }
      const wrapper = mountTable({ folders: [PROJECT, created], models: [] })

      expect(row(wrapper, 'Fresh').text()).toContain('dora')
      expect(row(wrapper, 'Fresh').findAll('td')[1].text()).not.toBe('')
      expect(labels(wrapper)).toEqual(['Fresh', 'Billing'])
    })

    it('names a diagram stored without a name by its key', () => {
      const wrapper = mountTable({ folders: [], models: [{ ...PROCESS, name: 'undefined' }] })

      expect(labels(wrapper)).toEqual(['invoice.bpmn'])
    })

    it('shows the key of a diagram, and in a search where the model lives', () => {
      const wrapper = mountTable({ folders: [], locationOf: id => (id === 'project' ? 'Billing' : 'Billing / Archive') })

      expect(row(wrapper, 'Invoice.bpmn').find('.small').text()).toBe('invoice · Billing')
      expect(row(wrapper, 'request.form').find('.small').text()).toBe('Billing / Archive')
    })
  })

  describe('sorting', () => {
    it('takes the order it is given', () => {
      const wrapper = mountTable({ sort: { by: 'name', desc: false } })

      expect(labels(wrapper)).toEqual(['Billing', 'demo', 'Approval.dmn', 'Invoice.bpmn', 'request.form'])
    })

    it('reports a newly chosen date column as newest first', async () => {
      const wrapper = mountTable({ sort: { by: 'name', desc: false } })

      await sortBy(wrapper, 'folders.columnModified')

      expect(wrapper.emitted('update:sort')).toEqual([[{ by: 'updated', desc: true }]])
    })

    it('sorts by name from A when the name column is chosen, and turns the order on a second click', async () => {
      const wrapper = mountTable()

      await sortBy(wrapper, 'folders.columnName')
      expect(labels(wrapper)).toEqual(['Billing', 'demo', 'Approval.dmn', 'Invoice.bpmn', 'request.form'])

      await sortBy(wrapper, 'folders.columnName')
      expect(labels(wrapper)).toEqual(['demo', 'Billing', 'request.form', 'Invoice.bpmn', 'Approval.dmn'])
    })

    it('sorts by the user who changed a row last', async () => {
      const wrapper = mountTable({ folders: [] })

      await sortBy(wrapper, 'folders.columnModifiedBy')

      expect(labels(wrapper)).toEqual(['Approval.dmn', 'Invoice.bpmn', 'request.form'])
    })

    it('reports the order to assistive technology on the header', async () => {
      const wrapper = mountTable()

      const header = wrapper.findAll('thead th')[1]
      expect(header.attributes('aria-sort')).toBe('bcomponents.ariaSortDesc')
    })
  })

  describe('actions', () => {
    it('offers only opening a locked folder', () => {
      const wrapper = mountTable({ isLocked: folder => !!folder.userFolder })

      expect(menuOf(wrapper, 'demo')).toEqual(['folders.open'])
    })

    it('does not offer moving a project, which has nowhere above it to go', () => {
      const wrapper = mountTable()

      expect(menuOf(wrapper, 'Billing')).toEqual(['folders.open', 'folders.rename', 'folders.delete'])
    })

    it('offers moving a folder inside a project', () => {
      const wrapper = mountTable({ folders: [SUBFOLDER] })

      expect(menuOf(wrapper, 'Archive')).toEqual(['folders.open', 'folders.rename', 'folders.moveTo', 'folders.delete'])
    })

    it('offers everything that can be done with a model', () => {
      const wrapper = mountTable()

      expect(menuOf(wrapper, 'Invoice.bpmn'))
        .toEqual(['folders.open', 'buttons.download', 'folders.moveTo', 'folders.copyTo', 'folders.delete'])
    })

    it('shows only deleting as dangerous', () => {
      const wrapper = mountTable()

      const dangerous = row(wrapper, 'Invoice.bpmn').findAll('.menu-item')
        .filter(item => item.find('.text-danger').exists()).map(item => item.text())
      expect(dangerous).toEqual(['folders.delete'])
    })

    it('explains the cells that may be cut off', () => {
      const wrapper = mountTable()
      const cells = row(wrapper, 'Invoice.bpmn').findAll('td')

      expect(cells[1].find('span').attributes('title')).not.toBe('')
      expect(cells[2].find('span').attributes('title')).toBe('bob')
    })

    it('names the row on the menu button', () => {
      const wrapper = mountTable()

      expect(row(wrapper, 'Billing').find('.menu-stub').attributes('aria-label')).toBe('folders.actionsFor')
    })

    it('explains the menu button with a tooltip', () => {
      const wrapper = mountTable()

      expect(row(wrapper, 'Billing').find('.menu-stub').element.parentElement.getAttribute('title')).toBe('folders.actionsFor')
    })

    it('styles the menu button like the other table action buttons', () => {
      const wrapper = mountTable()

      expect(row(wrapper, 'Billing').find('.menu-stub').attributes('data-toggle-class').split(' ')).toContain('hovered-button')
    })

    it('gives every menu entry a tooltip', () => {
      const wrapper = mountTable()

      const titles = row(wrapper, 'Invoice.bpmn').findAll('.menu-item').map(item => item.attributes('title'))
      expect(titles).toEqual(['folders.open', 'buttons.download', 'folders.moveTo', 'folders.copyTo', 'folders.delete'])
    })

    it.each([
      ['Billing', 'folders.rename', 'renameFolder', PROJECT],
      ['Archive', 'folders.moveTo', 'moveFolder', SUBFOLDER],
      ['Billing', 'folders.delete', 'removeFolder', PROJECT],
      ['Invoice.bpmn', 'buttons.download', 'downloadModel', PROCESS],
      ['Invoice.bpmn', 'folders.moveTo', 'moveModel', PROCESS],
      ['Invoice.bpmn', 'folders.copyTo', 'copyModel', PROCESS],
      ['Invoice.bpmn', 'folders.delete', 'removeModel', PROCESS],
    ])('reports "%s" → %s as %s', async (label, entry, event, source) => {
      const wrapper = mountTable({ folders: [PROJECT, SUBFOLDER] })

      await row(wrapper, label).findAll('.menu-item').find(item => item.text() === entry).trigger('click')

      expect(wrapper.emitted(event)).toEqual([[source]])
      expect(BDropdown.methods.hide).toHaveBeenCalled()
    })

    it('opens a folder from its menu by id', async () => {
      const wrapper = mountTable()

      await row(wrapper, 'Billing').find('.menu-item').trigger('click')

      expect(wrapper.emitted('openFolder')).toEqual([['project']])
    })
  })

  describe('project rights', () => {
    const VIEWER = { role: 'VIEWER', restricted: true, edit: false, manageMembers: false }
    const viewing = { canEdit: () => false, canChange: () => false, rightsOf: () => VIEWER }

    it('offers only opening what the user may not change', () => {
      const wrapper = mountTable({ folders: [PROJECT, SUBFOLDER], ...viewing })

      expect(menuOf(wrapper, 'Billing')).toEqual(['folders.open'])
      expect(menuOf(wrapper, 'Archive')).toEqual(['folders.open'])
    })

    /** Reading and copying need no more than seeing the model. */
    it('offers a viewer to open, download and copy a model', () => {
      const wrapper = mountTable(viewing)

      expect(menuOf(wrapper, 'Invoice.bpmn')).toEqual(['folders.open', 'buttons.download', 'folders.copyTo'])
    })

    it('marks a restricted project, and one the user may only look at', () => {
      const wrapper = mountTable({ folders: [PROJECT, SUBFOLDER], ...viewing })

      expect(row(wrapper, 'Billing').find('.mdi-lock-outline').attributes('aria-label')).toBe('folders.restricted')
      expect(row(wrapper, 'Billing').text()).toContain('folders.viewerBadge')
      // The folders inside carry the project's rights without repeating them
      expect(row(wrapper, 'Archive').find('.mdi-lock-outline').exists()).toBe(false)
    })

    it('marks nothing where the backend lists no rights', () => {
      const wrapper = mountTable()

      expect(row(wrapper, 'Billing').find('.mdi-lock-outline').exists()).toBe(false)
      expect(row(wrapper, 'Billing').text()).not.toContain('folders.viewerBadge')
    })

    /** An edition adds its own entries, such as the members of a project, before deleting. */
    it('offers the entries an edition adds where they apply, and reports them', async () => {
      const members = { id: 'members', icon: 'mdi-account-multiple-outline', label: 'projectMembers.menu',
        visible: (folder, rights) => !folder.parentId && rights === VIEWER }
      const wrapper = mountTable({ folders: [PROJECT, SUBFOLDER], extraActions: [members], rightsOf: () => VIEWER })

      expect(menuOf(wrapper, 'Billing')).toEqual(['folders.open', 'folders.rename', 'projectMembers.menu', 'folders.delete'])
      expect(menuOf(wrapper, 'Archive')).not.toContain('projectMembers.menu')

      await row(wrapper, 'Billing').findAll('.menu-item').find(item => item.text() === 'projectMembers.menu').trigger('click')

      expect(wrapper.emitted('extraAction')).toEqual([[members, PROJECT]])
    })

    it('offers the added entries also on a locked folder', () => {
      const wrapper = mountTable({ isLocked: folder => !!folder.userFolder,
        extraActions: [{ id: 'members', icon: 'mdi-account', label: 'projectMembers.menu' }] })

      expect(menuOf(wrapper, 'demo')).toEqual(['folders.open', 'projectMembers.menu'])
    })
  })

  describe('opening', () => {
    it('opens a folder by its name', async () => {
      const wrapper = mountTable()

      await row(wrapper, 'Billing').find('td button').trigger('click')

      expect(wrapper.emitted('openFolder')).toEqual([['project']])
    })

    it('opens a model from anywhere on its row', async () => {
      const wrapper = mountTable()

      await row(wrapper, 'Invoice.bpmn').trigger('click')

      expect(wrapper.emitted('openModel')).toEqual([[PROCESS]])
    })

    it('does not open a model that is being deleted, and shows that it is', async () => {
      const wrapper = mountTable({ deletingId: 'p1' })

      await row(wrapper, 'Invoice.bpmn').trigger('click')

      expect(wrapper.emitted('openModel')).toBeUndefined()
      expect(row(wrapper, 'Invoice.bpmn').find('.spinner-border').exists()).toBe(true)
      expect(row(wrapper, 'Invoice.bpmn').find('.menu-stub').exists()).toBe(false)
    })
  })
})
