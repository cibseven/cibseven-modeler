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

const m = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
}))
vi.mock('../../axiosConfig', () => ({ getAxios: () => ({ get: m.get, post: m.post, put: m.put, delete: m.delete }) }))
vi.mock('../../services/servicesConfig', () => ({ getModelerServicePath: () => 'svc' }))

import {
    fetchFolders,
    fetchFolderContents,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    moveProcessToFolder,
    copyProcessToFolder,
    moveFormToFolder,
    copyFormToFolder,
} from '../../services/folderService'

describe('folderService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('reads the whole tree in one call', () => {
        fetchFolders()

        expect(m.get).toHaveBeenCalledWith('svc/folders')
    })

    it('reads what a folder holds', () => {
        fetchFolderContents('folder-1')

        expect(m.get).toHaveBeenCalledWith('svc/folders/folder-1/contents')
    })

    it('creates a folder inside another', () => {
        createFolder('Drafts', 'folder-1')

        expect(m.post).toHaveBeenCalledWith('svc/folders', { name: 'Drafts', parentId: 'folder-1' })
    })

    /** Without a parent the backend files it at the top level. */
    it('creates a folder at the top level when no parent is given', () => {
        createFolder('Drafts')

        expect(m.post).toHaveBeenCalledWith('svc/folders', { name: 'Drafts', parentId: null })
    })

    it('renames without touching the parent', () => {
        renameFolder('folder-1', 'Billing')

        expect(m.put).toHaveBeenCalledWith('svc/folders/folder-1', { name: 'Billing' })
    })

    it('moves without touching the name', () => {
        moveFolder('folder-1', 'folder-2')

        expect(m.put).toHaveBeenCalledWith('svc/folders/folder-1', { parentId: 'folder-2' })
    })

    it('sends a null parent to move a folder to the top level', () => {
        moveFolder('folder-1', undefined)

        expect(m.put).toHaveBeenCalledWith('svc/folders/folder-1', { parentId: null })
    })

    it('deletes a folder', () => {
        deleteFolder('folder-1')

        expect(m.delete).toHaveBeenCalledWith('svc/folders/folder-1')
    })

    it('moves a diagram to a folder', () => {
        moveProcessToFolder('p1', 'folder-2')

        expect(m.post).toHaveBeenCalledWith('svc/process/p1/move', { folderId: 'folder-2' })
    })

    /** The engine resolves a process by key, so a copy carries one of its own. */
    it('copies a diagram with a key of its own', () => {
        copyProcessToFolder('p1', 'folder-2', 'invoice-copy', 'Invoice')

        expect(m.post).toHaveBeenCalledWith('svc/process/p1/copy', {
            folderId: 'folder-2',
            processkey: 'invoice-copy',
            name: 'Invoice',
        })
    })

    /** A form is referenced by its form id, so a copy needs one of its own. */
    it('copies a form with a form id of its own', () => {
        copyFormToFolder('f1', 'folder-2', 'invoice-form-copy')

        expect(m.post).toHaveBeenCalledWith('svc/form/f1/copy', {
            folderId: 'folder-2',
            formId: 'invoice-form-copy',
        })
    })

    it('moves a form to a folder', () => {
        moveFormToFolder('f1', 'folder-2')

        expect(m.post).toHaveBeenCalledWith('svc/form/f1/move', { folderId: 'folder-2' })
    })
})
