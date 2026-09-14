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
import { getAxios } from '../axiosConfig'
import { getModelerServicePath } from './servicesConfig'

const foldersPath = () => getModelerServicePath() + '/folders'

// The whole tree in one call: every folder carries its parentId, so the caller builds the levels
const fetchFolders = () => {
  return getAxios().get(foldersPath())
}

// What a folder holds through its whole subtree, for the delete warning
const fetchFolderContents = id => {
  return getAxios().get(foldersPath() + '/' + id + '/contents')
}

// Without a parent the folder is created at the top level
const createFolder = (name, parentId = null) => {
  return getAxios().post(foldersPath(), { name, parentId })
}

const renameFolder = (id, name) => {
  return getAxios().put(foldersPath() + '/' + id, { name })
}

// A null parent moves the folder to the top level. It has to be explicit: an undefined value
// is dropped from the body, and the backend moves only when the key is there.
const moveFolder = (id, parentId) => {
  return getAxios().put(foldersPath() + '/' + id, { parentId: parentId ?? null })
}

// Removes everything below it, models included
const deleteFolder = id => {
  return getAxios().delete(foldersPath() + '/' + id)
}

const moveProcessToFolder = (id, folderId) => {
  return getAxios().post(getModelerServicePath() + '/process/' + id + '/move', { folderId })
}

// A copy needs a process key of its own: the engine resolves a process by key
const copyProcessToFolder = (id, folderId, processkey, name) => {
  return getAxios().post(getModelerServicePath() + '/process/' + id + '/copy', { folderId, processkey, name })
}

const moveFormToFolder = (id, folderId) => {
  return getAxios().post(getModelerServicePath() + '/form/' + id + '/move', { folderId })
}

export {
  fetchFolders,
  fetchFolderContents,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  moveProcessToFolder,
  copyProcessToFolder,
  moveFormToFolder,
}
