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
import { fetchFormByFormId } from './formService'

const fetchDiagram = processId => {
  return getAxios().get('/client/cibseven-engine/process/' + processId + '/diagram')
}

const fetchDecisionDiagram = decisionId => {
  return getAxios().get('/client/cibseven-engine/decision/id/' + decisionId + '/xml')
}

// get unified paginated list of processes and forms
const getUnifiedDiagrams = (firstResult, maxResults, keyword, type, folderId) => {
  return getAxios().get(getModelerServicePath() + '/unified-diagrams', {
    params: {
      firstResult,
      maxResults,
      keyword,
      type,
      folderId
    }
  })
}

const getUnifiedDiagramById = id => {
  return getAxios().get(getModelerServicePath() + '/unified-diagrams/' + id)
}

/**
 * The diagram with this key in the folder given. Without a folder, the latest among those the
 * user may see: a key is unique only within a folder, so several folders may hold it.
 */
const fetchProcessByKey = (key, folderId = null, config = {}) => {
  const params = folderId ? { key, folderId } : { key }
  return getAxios().get(getModelerServicePath() + '/process/find-by-key', { ...config, params })
}

/**
 * Authoritative (database-backed) duplicate-key check, beyond the loaded/paginated
 * store list. A key is unique within a folder, so only the folder the model goes into
 * is asked: true when a diagram/form with this EXACT key is already there (200), false
 * when not (404). On any other error we return false so a transient failure never
 * blocks the user; the backend refuses the save itself as the final guard.
 *
 * @param {string} key - process key (bpmn/dmn) or form id.
 * @param {'form'|string} type - 'form' looks up forms by formId; otherwise processes by processkey.
 * @param {string|null} folderId - the folder the model is saved in; without one nothing can collide.
 */
const keyExistsRemote = async (key, type, folderId) => {
  if (!key || !folderId) return false
  try {
    await (type === 'form' ? fetchFormByFormId(key, folderId) : fetchProcessByKey(key, folderId)) // 404 rejects → caught below
    return true
  } catch {
    return false
  }
}

/**
 * Whether another model has the key, in any folder and any project, including those hidden
 * from the user; the answer names none of them. The engine keeps one definition per process
 * key and resolves a form reference by form id, so deploying either replaces the other.
 *
 * @param {string|null} id - the model to leave out, when it is saved.
 */
const keyInUseElsewhere = async (key, type, id = null) => {
  if (!key) return false
  const params = type === 'form' ? { formId: key } : { key }
  if (id) params.id = id
  return (await getAxios().get(getModelerServicePath() + (type === 'form' ? '/form' : '/process') + '/key-in-use', { params })) === true
}

const fetchProcessByName = name => {
  const formData = new FormData()
  formData.append('name', name)
  return getAxios().post(getModelerServicePath() + '/process/find-by-name/data', formData,{
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

const fetchProcessById = id => {
  return getAxios().get(getModelerServicePath() + '/process/' + id + '/data')
}

const deleteProcessById = id => {
  return getAxios().delete(getModelerServicePath() + '/process/delete/' + id)
}

// config: extra axios config, as REPORTS_OWN_ERRORS for a caller that reports a refusal itself
const saveDiagramProcess = (name, processkey, blob, type, folderId = null, config = {}) => {

  const formData = new FormData()
  formData.append('name', name)
  formData.append('processkey', processkey)
  formData.append('diagram', blob)
  formData.append('type', type)
  // Left out the backend files it under its default folder, which is rarely what the user meant
  if (folderId) formData.append('folderId', folderId)
  return getAxios().post(getModelerServicePath() + '/process/save', formData, {
    ...config,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const updateDiagramProcess = (id, name, processkey, blob, type, config = {}) => {
  const formData = new FormData()
  formData.append('id', id)
  formData.append('name', name)
  formData.append('processkey', processkey)
  formData.append('diagram', blob)
  formData.append('type', type)

  return getAxios().post(getModelerServicePath() + '/process/update', formData, {
    ...config,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export {
  fetchDiagram,
  fetchDecisionDiagram,
  getUnifiedDiagrams,
  getUnifiedDiagramById,
  keyExistsRemote,
  keyInUseElsewhere,
  fetchProcessByKey,
  fetchProcessByName,
  fetchProcessById,
  saveDiagramProcess,
  updateDiagramProcess,
  deleteProcessById,
}
