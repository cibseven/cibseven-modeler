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
import { axios } from '../axiosConfig'
import { getModelerServicePath } from './servicesConfig'

// get list of forms
const fetchForms = () => {
  return axios.get(getModelerServicePath() + '/forms')
}

const fetchFormById = id => {
    return axios.get(getModelerServicePath() + '/form/' + id + '/data')
}

const saveForm = (id, formJson) => {
  const blob = new Blob([JSON.stringify(formJson)], { type: 'application/json' })

  let formData = new FormData()
  formData.append('formid', id)
  formData.append('form_schema', blob)

  return axios.post(getModelerServicePath() + '/form/save', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const updateForm = (id, formid, formJson) => {
  const blob = new Blob([JSON.stringify(formJson)], { type: 'application/json' })

  let formData = new FormData() 
  formData.append('id', id)
  formData.append('formid', formid)
  formData.append('form_schema', blob)

  return axios.post(getModelerServicePath() + '/form/update', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const deleteFormById = id => {
  return axios.delete(getModelerServicePath() + '/form/delete/' + id)
}


const createFormSession = (name, id, blob, type) => {

  let formData = new FormData()
  formData.append('name', name)
  formData.append('id', id)
  formData.append('type', type)
  formData.append('form', blob)

  return axios.post(getModelerServicePath() + '/session/save', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const closeFormSession = (sessionIds, type) => {
  let formData = new FormData()
  formData.append('sessionId', sessionIds)
  formData.append('type', type)
  return axios.post(getModelerServicePath() + '/session/close', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const checkFormSession = id => {
  return axios.get(getModelerServicePath() + '/form/session/check/' + id)
}

export {
  fetchForms,
  fetchFormById,
  saveForm,
  updateForm,
  deleteFormById,
  createFormSession,
  closeFormSession,
  checkFormSession
}
