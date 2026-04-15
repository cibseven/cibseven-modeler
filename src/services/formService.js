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

// get list of forms
const fetchForms = (firstResult, maxResults, keyword = '') => {
  return getAxios().get(getModelerServicePath() + '/forms', {
    params: { firstResult, maxResults, keyword }
  })
}

const fetchFormById = id => {
    return getAxios().get(getModelerServicePath() + '/form/' + id + '/data')
}

const saveForm = (id, formJson) => {
  const blob = new Blob([JSON.stringify(formJson)], { type: 'application/json' })

  const formData = new FormData()
  formData.append('formid', id)
  formData.append('form_schema', blob)

  return getAxios().post(getModelerServicePath() + '/form/save', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const updateForm = (id, formid, formJson) => {
  const blob = new Blob([JSON.stringify(formJson)], { type: 'application/json' })

  const formData = new FormData() 
  formData.append('id', id)
  formData.append('formid', formid)
  formData.append('form_schema', blob)

  return getAxios().post(getModelerServicePath() + '/form/update', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
  })
}

const deleteFormById = id => {
  return getAxios().delete(getModelerServicePath() + '/form/delete/' + id)
}

export {
  fetchForms,
  fetchFormById,
  saveForm,
  updateForm,
  deleteFormById,
}
