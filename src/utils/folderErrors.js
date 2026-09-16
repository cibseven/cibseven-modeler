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
 * What to tell the user about a refused folder or model request.
 *
 * A refusal arrives as the webclient's error shape - a type and the data the exception carried,
 * not a message - so `error.response.data.message` is always undefined:
 *
 *     { "type": "InvalidFolderException", "params": ["name", "a folder with that name ..."] }
 *
 * The reason in `params` is English, written for a developer reading a log, so it is not shown.
 * A type this knows about is answered with a translation key instead; anything else returns null
 * and the caller falls back to its own message.
 *
 * @returns an object with a translation key and its parameters, or null
 */
export const folderErrorMessage = error => {
  const data = error?.response?.data
  const params = data?.params ?? []

  switch (data?.type) {
    case 'InvalidFolderException':
      // The field the backend names is what tells the cases apart
      if (params[0] === 'name') return { key: 'folders.nameTaken' }
      if (params[0] === 'parentId') return { key: 'folders.moveRefused' }
      return null
    case 'ExistingProcessKeyException':
    case 'ExistingFormIdException':
      return { key: 'folders.keyTaken', params: { key: params[0] } }
    default:
      return null
  }
}
