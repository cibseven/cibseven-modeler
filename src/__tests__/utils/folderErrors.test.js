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
import { describe, it, expect } from 'vitest'
import { folderErrorMessage } from '../../utils/folderErrors.js'

/**
 * The webclient answers a refused request with a type and the data the exception carried, never
 * with a `message`. Reading one was why every refusal used to show the same generic sentence.
 */
const refusal = (type, ...params) => ({ response: { data: { type, params } } })

describe('folderErrorMessage', () => {
  it('names a folder whose name is taken', () => {
    const error = refusal('InvalidFolderException', 'name', 'a folder with that name is already there')

    expect(folderErrorMessage(error)).toEqual({ key: 'folders.nameTaken' })
  })

  it('names a move that would put a folder inside itself', () => {
    const error = refusal('InvalidFolderException', 'parentId', 'a folder cannot move into itself')

    expect(folderErrorMessage(error)).toEqual({ key: 'folders.moveRefused' })
  })

  it.each(['ExistingProcessKeyException', 'ExistingFormIdException'])(
    'reports the key %s carries', type => {
      expect(folderErrorMessage(refusal(type, 'invoice-copy')))
        .toEqual({ key: 'folders.keyTaken', params: { key: 'invoice-copy' } })
    })

  it('reports the limit a value was longer than', () => {
    const error = refusal('ValueTooLongException', 'processkey', 100)

    expect(folderErrorMessage(error)).toEqual({ key: 'folders.valueTooLong', params: { limit: 100 } })
  })

  /** The reason the backend sends is English and written for a log, so it is never shown. */
  it('answers with nothing for a field it has no message for', () => {
    const error = refusal('InvalidFolderException', 'folderId', 'a model needs the folder it goes into')

    expect(folderErrorMessage(error)).toBeNull()
  })

  it.each([
    ['an unknown type', refusal('SystemException', 'boom')],
    ['a response with no body', { response: {} }],
    ['an error with no response at all', new Error('Network Error')],
    ['nothing', undefined],
  ])('answers with nothing for %s', (_case, error) => {
    expect(folderErrorMessage(error)).toBeNull()
  })
})
