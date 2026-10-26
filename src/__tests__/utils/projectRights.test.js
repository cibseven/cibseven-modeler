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
import { describe, it, expect, afterEach } from 'vitest'
import { canEditFolder, setProjectRights } from '../../utils/projectRights.js'

const TREE = [
  { id: 'claims', parentId: null },
  { id: 'drafts', parentId: 'claims' },
  { id: 'old', parentId: 'drafts' },
  { id: 'sales', parentId: null },
]
const VIEWER = { role: 'VIEWER', restricted: true, edit: false, manageMembers: false }

describe('projectRights', () => {
  afterEach(() => setProjectRights([], null))

  it('lets everything be changed until the rights are known', () => {
    expect(canEditFolder('drafts')).toBe(true)
  })

  it('gives every folder of a project the rights of the project', () => {
    setProjectRights(TREE, { projects: { claims: VIEWER } })

    expect(canEditFolder('claims')).toBe(false)
    expect(canEditFolder('old')).toBe(false)
    expect(canEditFolder('sales')).toBe(true)
  })

  /** A new model has no folder yet, and is the user's own until saved. */
  it('lets a model without a folder be changed', () => {
    setProjectRights(TREE, { projects: { claims: VIEWER } })

    expect(canEditFolder(null)).toBe(true)
  })

  it('does not hang on a broken parent chain', () => {
    setProjectRights([{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }], { projects: {} })

    expect(canEditFolder('a')).toBe(true)
  })
})
