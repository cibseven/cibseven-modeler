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

const fetchDiagram = processId => {
  return getAxios().get('/client/cibseven-engine/process/' + processId + '/diagram')
}

const fetchDecisionDiagram = decisionId => {
  return getAxios().get('/client/cibseven-engine/decision/id/' + decisionId + '/xml')
}

// get list of processes
const fetchProcesses = (firstResult, maxResults, keyword = '', diagramType = '') => {
  return getAxios().get(getModelerServicePath() + '/processes', {
    params: {
      firstResult,
      maxResults,
      keyword,
      diagramType
    }
  })
}

// get unified paginated list of processes and forms
const getUnifiedDiagrams = (firstResult, maxResults, keyword, type) => {
  return getAxios().get(getModelerServicePath() + '/unified-diagrams', {
    params: {
      firstResult,
      maxResults,
      keyword,
      type
    }
  })
}

/**
 * Authoritative (database-backed) duplicate-key check, beyond the loaded/paginated
 * store list. Returns true when a diagram/form with this EXACT key already exists.
 * The unified-diagrams search is keyword-based, so we fetch a small page and require
 * an exact match. On any error we return false so a transient failure never blocks the
 * user — the backend's unique constraint remains the final guard.
 *
 * @param {string} key - process key (bpmn/dmn) or form id.
 * @param {'form'|string} type - 'form' matches forms (formId); otherwise processes (processkey).
 */
const keyExistsRemote = async (key, type) => {
  if (!key) return false
  try {
    const results = await getUnifiedDiagrams(0, 10, key, '')
    const field = type === 'form' ? 'formId' : 'processkey'
    return (results ?? []).some(d => d[field] === key)
  } catch {
    return false
  }
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

const saveDiagramProcess = (name, processkey, blob, type) => {

  const formData = new FormData()
  formData.append('name', name)
  formData.append('processkey', processkey)
  formData.append('diagram', blob)
  formData.append('type', type)
  return getAxios().post(getModelerServicePath() + '/process/save', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const updateDiagramProcess = (id, name, processkey, blob, type) => {
  const formData = new FormData()
  formData.append('id', id)
  formData.append('name', name)
  formData.append('processkey', processkey)
  formData.append('diagram', blob)
  formData.append('type', type)

  return getAxios().post(getModelerServicePath() + '/process/update', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export {
  fetchDiagram,
  fetchDecisionDiagram,
  fetchProcesses,
  getUnifiedDiagrams,
  keyExistsRemote,
  fetchProcessByName,
  fetchProcessById,
  saveDiagramProcess,
  updateDiagramProcess,
  deleteProcessById,
}
