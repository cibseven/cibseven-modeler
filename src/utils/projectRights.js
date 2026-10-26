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
import { reactive } from 'vue'

/**
 * What the user may do in which folder, for the whole modeler: the start page fills it whenever it
 * reads the tree, and an open tab asks it whether its model may be changed. Until it is filled, and
 * where the backend lists no rights, everything may be changed.
 */
const state = reactive({ parents: {}, projects: {} })

export const setProjectRights = (folders, access) => {
  state.parents = Object.fromEntries((folders ?? []).map(folder => [folder.id, folder.parentId ?? null]))
  state.projects = access?.projects ?? {}
}

const projectOf = folderId => {
  let current = folderId
  // A cycle cannot be created through the API, but a stale tree must not hang the page
  const seen = new Set()
  while (state.parents[current] && !seen.has(current)) {
    seen.add(current)
    current = state.parents[current]
  }
  return current
}

/** Whether a model in this folder may be changed; a model without a folder is a new one. */
export const canEditFolder = folderId => !folderId || (state.projects[projectOf(folderId)]?.edit ?? true)
