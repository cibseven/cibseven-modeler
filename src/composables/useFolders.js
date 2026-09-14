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
import { computed, ref } from 'vue'
import {
  createFolder,
  deleteFolder,
  fetchFolderContents,
  fetchFolders,
  moveFolder,
  renameFolder
} from '../services/folderService'

/**
 * The folder a user is looking at and the folders around it. The whole tree arrives in one call
 * and the levels are derived here, so walking in and out of folders costs no request.
 */
export default function useFolders() {
  const folders = ref([])
  // Null is the top level, which holds folders only: a model always lives in a folder
  const currentFolderId = ref(null)

  const byId = computed(() => new Map(folders.value.map(folder => [folder.id, folder])))

  const childrenOf = parentId => folders.value
    .filter(folder => (folder.parentId ?? null) === (parentId ?? null))
    .sort((one, other) => one.name.localeCompare(other.name))

  const currentFolder = computed(() =>
    currentFolderId.value ? byId.value.get(currentFolderId.value) ?? null : null)

  const currentChildren = computed(() => childrenOf(currentFolderId.value))

  /** The folders from the top level down to the one open, for the breadcrumb. */
  const breadcrumb = computed(() => {
    const path = []
    // A cycle cannot be created through the API, but a stale list must not hang the page
    const seen = new Set()
    let folder = currentFolder.value
    while (folder && !seen.has(folder.id)) {
      seen.add(folder.id)
      path.unshift(folder)
      folder = folder.parentId ? byId.value.get(folder.parentId) : null
    }
    return path
  })

  const load = async () => {
    const { data } = await fetchFolders()
    folders.value = Array.isArray(data) ? data : []
    // A folder removed in another tab must not leave the view pointing at nothing
    if (currentFolderId.value && !byId.value.has(currentFolderId.value)) {
      currentFolderId.value = null
    }
    return folders.value
  }

  const open = folderId => {
    currentFolderId.value = folderId ?? null
  }

  /**
   * Every folder in tree order with its depth, for pickers. Skipping a folder skips what is
   * below it as well, which is how a folder is kept from being moved into its own subtree.
   */
  const flatten = (excluded = null) => {
    const rows = []
    const walk = (parentId, depth) => {
      childrenOf(parentId).forEach(folder => {
        if (folder.id === excluded) return
        rows.push({ id: folder.id, name: folder.name, depth })
        walk(folder.id, depth + 1)
      })
    }
    walk(null, 0)
    return rows
  }

  const create = async name => {
    const { data } = await createFolder(name, currentFolderId.value)
    await load()
    return data
  }

  const rename = async (folderId, name) => {
    const { data } = await renameFolder(folderId, name)
    await load()
    return data
  }

  const move = async (folderId, parentId) => {
    const { data } = await moveFolder(folderId, parentId ?? null)
    await load()
    return data
  }

  const remove = async folderId => {
    const { data } = await deleteFolder(folderId)
    // Standing in a folder that was just removed would show a tree that is no longer there
    if (currentFolderId.value === folderId) {
      currentFolderId.value = byId.value.get(folderId)?.parentId ?? null
    }
    await load()
    return data
  }

  const contents = async folderId => {
    const { data } = await fetchFolderContents(folderId)
    return data
  }

  return {
    folders,
    currentFolderId,
    currentFolder,
    currentChildren,
    breadcrumb,
    load,
    open,
    flatten,
    create,
    rename,
    move,
    remove,
    contents
  }
}
