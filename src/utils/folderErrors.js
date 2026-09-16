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

/**
 * The translation key for a refused folder or model request, or null to leave it to the caller.
 * A refusal carries the exception's type and its data, whose English reason is meant for a log:
 * { "type": "InvalidFolderException", "params": ["name", "a folder with that name ..."] }
 */
export const folderErrorMessage = error => {
  const data = error?.response?.data
  const params = data?.params ?? []

  switch (data?.type) {
    case 'InvalidFolderException':
      if (params[0] === 'name') return { key: 'folders.nameTaken' }
      if (params[0] === 'parentId') return { key: 'folders.moveRefused' }
      return null
    case 'ExistingProcessKeyException':
    case 'ExistingFormIdException':
      return { key: 'folders.keyTaken', params: { key: params[0] } }
    // The field is already obvious from the input that was filled in; the limit is not
    case 'ValueTooLongException':
      return { key: 'folders.valueTooLong', params: { limit: params[1] } }
    default:
      return null
  }
}
