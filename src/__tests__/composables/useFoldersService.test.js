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

/**
 * The composable over the real service, against an axios that answers the way the host's does.
 *
 * Every other folder test stubs the service, so none of them can see what the service actually
 * resolves with. The host installs `axios.interceptors.response.use(res => res.data)`, so a call
 * resolves with the payload and never with a response object - reading `.data` off it yields
 * undefined and the tree silently comes back empty.
 */
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('../../axiosConfig', () => ({ getAxios: () => http }))
vi.mock('../../services/servicesConfig', () => ({ getModelerServicePath: () => 'services/v1/modeler' }))

import useFolders from '../../composables/useFolders.js'

const TREE = [
  { id: 'general', parentId: null, name: 'General' },
  { id: 'invoicing', parentId: 'general', name: 'Invoicing' }
]

describe('useFolders over the real service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // What the host's interceptor hands back: the payload, not a response
    http.get.mockResolvedValue(TREE)
  })

  it('loads the tree the endpoint answers with', async () => {
    const folders = useFolders()

    await folders.load()

    expect(http.get).toHaveBeenCalledWith('services/v1/modeler/folders')
    expect(folders.folders.value).toHaveLength(2)
    expect(folders.currentChildren.value.map(f => f.name)).toEqual(['General'])
  })

  it('reads what a folder holds as the counts themselves', async () => {
    http.get.mockResolvedValue({ folders: 1, diagrams: 2, forms: 0 })
    const folders = useFolders()

    await expect(folders.contents('general')).resolves.toEqual({ folders: 1, diagrams: 2, forms: 0 })
  })

  it('shows a folder it just created without being told what the call returned', async () => {
    const folders = useFolders()
    await folders.load()
    http.post.mockResolvedValue({ id: 'drafts', parentId: null, name: 'Drafts' })
    http.get.mockResolvedValue([...TREE, { id: 'drafts', parentId: null, name: 'Drafts' }])

    await folders.create('Drafts')

    expect(folders.currentChildren.value.map(f => f.name)).toEqual(['Drafts', 'General'])
  })
})
