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
const fetchProcesses = () => {
  return getAxios().get(getModelerServicePath() + '/processes')
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

const createProcessSession = (name, id, blob, type) => {

  const formData = new FormData()
  formData.append('name', name)
  formData.append('id', id)
  formData.append('type', type)
  formData.append('diagram', blob)

  return getAxios().post(getModelerServicePath() + '/session/save', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const closeProcessSession = (sessionIds, type) => {
  const formData = new FormData()
  formData.append('sessionId', sessionIds)
  formData.append('type', type)
  return getAxios().post(getModelerServicePath() + '/session/close', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const checkProcessSession = id => {
  return getAxios().get(getModelerServicePath() + '/process/session/check/' + id)
}

// get list of process's history
const fetchProcessHistory = id => {
  return getAxios().get(getModelerServicePath() + '/process/history/' + id, {
    headers: { 'Content-Type': 'multipart/form-data' }
    }
  )
}

export {
  fetchProcessHistory,
  fetchDiagram,
  fetchDecisionDiagram,
  fetchProcesses,
  fetchProcessByName,
  fetchProcessById,
  saveDiagramProcess,
  updateDiagramProcess,
  deleteProcessById,
  createProcessSession,
  closeProcessSession,
  checkProcessSession
}
