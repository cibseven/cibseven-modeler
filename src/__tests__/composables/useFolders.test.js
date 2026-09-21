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

vi.mock('../../services/folderService.js', () => ({
  fetchFolders: vi.fn(),
  fetchFolderContents: vi.fn(),
  createFolder: vi.fn(),
  renameFolder: vi.fn(),
  moveFolder: vi.fn(),
  deleteFolder: vi.fn()
}))

import useFolders from '../../composables/useFolders.js'
import {
  createFolder,
  deleteFolder,
  fetchFolderContents,
  fetchFolders,
  moveFolder,
  renameFolder
} from '../../services/folderService.js'

// General and Archive at the top, Invoicing under General, 2024 under Invoicing
const TREE = [
  { id: 'general', parentId: null, name: 'General' },
  { id: 'archive', parentId: null, name: 'Archive' },
  { id: 'invoicing', parentId: 'general', name: 'Invoicing' },
  { id: '2024', parentId: 'invoicing', name: '2024' }
]

describe('useFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchFolders.mockResolvedValue(TREE)
  })

  const loaded = async () => {
    const folders = useFolders()
    await folders.load()
    return folders
  }

  describe('levels', () => {
    it('shows the folders without a parent at the top level', async () => {
      const folders = await loaded()

      expect(folders.currentChildren.value.map(f => f.id)).toEqual(['archive', 'general'])
    })

    it('shows the children of the folder that is open', async () => {
      const folders = await loaded()

      folders.open('general')

      expect(folders.currentChildren.value.map(f => f.id)).toEqual(['invoicing'])
    })

    it('sorts the folders of a level by name', async () => {
      fetchFolders.mockResolvedValue([
        { id: 'b', parentId: null, name: 'Beta' },
        { id: 'a', parentId: null, name: 'Alpha' }
      ])
      const folders = await loaded()

      expect(folders.currentChildren.value.map(f => f.name)).toEqual(['Alpha', 'Beta'])
    })

    it('answers with an empty tree when the call gives back something else', async () => {
      fetchFolders.mockResolvedValue(null)
      const folders = await loaded()

      expect(folders.folders.value).toEqual([])
      expect(folders.currentChildren.value).toEqual([])
    })
  })

  describe('breadcrumb', () => {
    it('is empty at the top level', async () => {
      const folders = await loaded()

      expect(folders.breadcrumb.value).toEqual([])
    })

    it('walks from the top level down to the folder that is open', async () => {
      const folders = await loaded()

      folders.open('2024')

      expect(folders.breadcrumb.value.map(f => f.name)).toEqual(['General', 'Invoicing', '2024'])
    })

    /** A parent that points back at a child would otherwise loop for ever. */
    it('stops instead of looping when the tree points at itself', async () => {
      fetchFolders.mockResolvedValue([
        { id: 'one', parentId: 'other', name: 'One' },
        { id: 'other', parentId: 'one', name: 'Other' }
      ])
      const folders = await loaded()

      folders.open('one')

      expect(folders.breadcrumb.value.map(f => f.id)).toEqual(['other', 'one'])
    })
  })

  describe('pathOf', () => {
    /** A tab shows a model that is not the folder open, so the path is asked for by id. */
    it('walks from the top level down to any folder, not only the one open', async () => {
      const folders = await loaded()

      expect(folders.pathOf('2024').map(f => f.name)).toEqual(['General', 'Invoicing', '2024'])
    })

    it('has no path for the top level or for a folder that is gone', async () => {
      const folders = await loaded()

      expect(folders.pathOf(null)).toEqual([])
      expect(folders.pathOf('removed')).toEqual([])
    })
  })

  describe('flatten', () => {
    it('gives every folder in tree order with its depth', async () => {
      const folders = await loaded()

      expect(folders.flatten()).toEqual([
        { id: 'archive', name: 'Archive', depth: 0 },
        { id: 'general', name: 'General', depth: 0 },
        { id: 'invoicing', name: 'Invoicing', depth: 1 },
        { id: '2024', name: '2024', depth: 2 }
      ])
    })

    /** Moving a folder into its own subtree would cut that subtree out of the tree. */
    it('leaves out the excluded folder and everything below it', async () => {
      const folders = await loaded()

      expect(folders.flatten('general').map(f => f.id)).toEqual(['archive'])
    })
  })

  describe('changing the tree', () => {
    it('creates inside the folder that is open', async () => {
      const folders = await loaded()
      createFolder.mockResolvedValue({ id: 'new' })
      folders.open('general')

      await folders.create('Drafts')

      expect(createFolder).toHaveBeenCalledWith('Drafts', 'general')
    })

    it('creates at the top level when none is open', async () => {
      const folders = await loaded()
      createFolder.mockResolvedValue({ id: 'new' })

      await folders.create('Drafts')

      expect(createFolder).toHaveBeenCalledWith('Drafts', null)
    })

    it('reads the tree again after a rename, so the list shows the new name', async () => {
      const folders = await loaded()
      renameFolder.mockResolvedValue({})

      await folders.rename('general', 'Common')

      expect(renameFolder).toHaveBeenCalledWith('general', 'Common')
      expect(fetchFolders).toHaveBeenCalledTimes(2)
    })

    it('sends no parent when a folder is moved to the top level', async () => {
      const folders = await loaded()
      moveFolder.mockResolvedValue({})

      await folders.move('invoicing', undefined)

      expect(moveFolder).toHaveBeenCalledWith('invoicing', null)
    })

    /** Standing in a folder that was just deleted would show a tree that is no longer there. */
    it('steps up to the parent when the folder that is open is deleted', async () => {
      const folders = await loaded()
      deleteFolder.mockResolvedValue({ folders: 0, diagrams: 1, forms: 0 })
      fetchFolders.mockResolvedValue(TREE.filter(f => f.id !== 'invoicing'))
      folders.open('invoicing')

      await folders.remove('invoicing')

      expect(folders.currentFolderId.value).toBe('general')
    })

    it('stays where it is when another folder is deleted', async () => {
      const folders = await loaded()
      deleteFolder.mockResolvedValue({ folders: 0, diagrams: 0, forms: 0 })
      fetchFolders.mockResolvedValue(TREE.filter(f => f.id !== 'archive'))
      folders.open('general')

      await folders.remove('archive')

      expect(folders.currentFolderId.value).toBe('general')
    })

    /** A folder removed in another tab must not leave the page pointing at nothing. */
    it('returns to the top level when the folder that is open is gone', async () => {
      const folders = await loaded()
      folders.open('invoicing')
      fetchFolders.mockResolvedValue([TREE[0], TREE[1]])

      await folders.load()

      expect(folders.currentFolderId.value).toBeNull()
    })

    it('reports what a folder holds', async () => {
      const folders = await loaded()
      fetchFolderContents.mockResolvedValue({ folders: 1, diagrams: 2, forms: 3 })

      await expect(folders.contents('general')).resolves.toEqual({ folders: 1, diagrams: 2, forms: 3 })
    })
  })
})
