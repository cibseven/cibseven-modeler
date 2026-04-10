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
import { getAxios } from '../axiosConfig.js'
import { getServicesBasePath } from './servicesConfig.js'

const getBaseUrl = () => `/${getServicesBasePath()}`

// Diagram operations
export const getDiagrams = () => getAxios().get(`${getBaseUrl()}/diagram`)

export const getDiagram = (id) => getAxios().get(`${getBaseUrl()}/diagram/${id}`)

export const createDiagram = (diagram) => getAxios().post(`${getBaseUrl()}/diagram`, diagram)

export const updateDiagram = (id, diagram) => getAxios().put(`${getBaseUrl()}/diagram/${id}`, diagram)

export const deleteDiagram = (id) => getAxios().delete(`${getBaseUrl()}/diagram/${id}`)

export const getDiagramXml = (id) => getAxios().get(`${getBaseUrl()}/diagram/${id}/xml`)

export const saveDiagramXml = (id, xml) => getAxios().put(`${getBaseUrl()}/diagram/${id}/xml`, xml, {
	headers: { 'Content-Type': 'application/xml' }
})

// Form operations
export const getForms = () => getAxios().get(`${getBaseUrl()}/form`)

export const getForm = (id) => getAxios().get(`${getBaseUrl()}/form/${id}`)

export const createForm = (form) => getAxios().post(`${getBaseUrl()}/form`, form)

export const updateForm = (id, form) => getAxios().put(`${getBaseUrl()}/form/${id}`, form)

export const deleteForm = (id) => getAxios().delete(`${getBaseUrl()}/form/${id}`)

// Element template operations
export const getElementTemplates = () => getAxios().get(`${getBaseUrl()}/template`)

export const getElementTemplate = (id) => getAxios().get(`${getBaseUrl()}/template/${id}`)

export const createElementTemplate = (template) => getAxios().post(`${getBaseUrl()}/template`, template)

export const updateElementTemplate = (id, template) => getAxios().put(`${getBaseUrl()}/template/${id}`, template)

export const deleteElementTemplate = (id) => getAxios().delete(`${getBaseUrl()}/template/${id}`)

// Info operations
export const getInfo = () => getAxios().get(`${getBaseUrl()}/info/version`)

export const getProperties = () => getAxios().get(`${getBaseUrl()}/info/properties`)

// Deployment operations
export const deployDiagram = (id, engineUrl) => getAxios().post(`${getBaseUrl()}/diagram/${id}/deploy`, null, {
	params: { engineUrl }
})

// Export operations
export const exportDiagram = (id, format) => getAxios().get(`${getBaseUrl()}/diagram/${id}/export`, {
	params: { format },
	responseType: 'blob'
})

export default {
	// Diagrams
	getDiagrams,
	getDiagram,
	createDiagram,
	updateDiagram,
	deleteDiagram,
	getDiagramXml,
	saveDiagramXml,
	
	// Forms
	getForms,
	getForm,
	createForm,
	updateForm,
	deleteForm,
	
	// Element Templates
	getElementTemplates,
	getElementTemplate,
	createElementTemplate,
	updateElementTemplate,
	deleteElementTemplate,
	
	// Info
	getInfo,
	getProperties,
	
	// Deployment
	deployDiagram,
	
	// Export
	exportDiagram
}
