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

const TYPEC7 = 'bpmn-c7'
const TYPEDMN = 'dmn'
const BPMNC7TAG = 'xmlns:camunda'

export const getTimeStamp = () => {
	const currentTime = new Date()
	const hours = currentTime.getHours().toString().padStart(2, '0')
	const minutes = currentTime.getMinutes().toString().padStart(2, '0')
	const seconds = currentTime.getSeconds().toString().padStart(2, '0')
	return `${hours}:${minutes}:${seconds}`
}

// checks that the name and the key is not null and is unique in the database
// used in BpmnModeler.vue and DmnModeler.vue
export const checkBeforeAction = (
	newProcessKey,
	storedProcessSelectedProcesskey,
	storeList,
	searchKey
) => {
	let toastErrorMessage = ''
	if (
		checkIfProcessExists(storeList, searchKey, newProcessKey) &&
		newProcessKey !== storedProcessSelectedProcesskey
	) {
		// it already exists one with the same key
		toastErrorMessage = 'toastSaveErrorDuplicateKey'
	}
	return toastErrorMessage
}

// if returns true it cannot be created or updated because there is already one in the database
const checkIfProcessExists = (storedList, property, value) => {
	return storedList?.processes?.find((process) => {
		return process[property] === value
	})
}

export function decodeBase64ToUtf8(base64) {
	const binaryString = atob(base64)
	const byteArray = new Uint8Array(binaryString.length)
	for (let i = 0; i < binaryString.length; i++) {
		byteArray[i] = binaryString.charCodeAt(i)
	}
	const decoder = new TextDecoder('utf-8')
	return decoder.decode(byteArray)
}

export const getTagValueFromXml = (resXmlExternalUrl, xmlTag, xmlProperty) => {
	const attributes = new DOMParser().parseFromString(resXmlExternalUrl, 'text/xml')
	const processElement = attributes.querySelector(`*|${xmlTag}`)
	return processElement ? processElement.getAttribute(xmlProperty) : null
}

export const getProcessKeyFromBpmn = (resXmlExternalUrl) => {
	let foundExternalProcessKey = getTagValueFromXml(resXmlExternalUrl, 'collaboration', 'id')
	if (!foundExternalProcessKey) {
		foundExternalProcessKey = getTagValueFromXml(resXmlExternalUrl, 'process', 'id')
	}
	return foundExternalProcessKey
}

export const setTagValueOfXml = (resXmlExternalUrl, xmlTag, attribute, xmlPropertyValue) => {
	const xmlDoc = new DOMParser()
	const attributes = xmlDoc.parseFromString(resXmlExternalUrl, 'text/xml')
	const processElements = attributes.getElementsByTagName(xmlTag)
	processElements[0]?.setAttribute(attribute, xmlPropertyValue)
	return new XMLSerializer().serializeToString(attributes)
}

export const checkCamundaVersion = (xmlString) => {
	const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml')
	const attributes = xmlDoc.documentElement.attributes
	for (let i = attributes.length - 1; i >= 0; i--) {
		const attr = attributes[i]
		if (!attr) break
		if (attr.name === 'modeler:executionPlatformVersion') {
			return TYPEC7
		}
		if (attr.name === BPMNC7TAG) return TYPEC7
	}
	return TYPEC7
}

export const getOnlyNameOfTemplate = (templateWithVersion) => {
	const parts = templateWithVersion.split('-')
	return parts.slice(0, -1).join('-')
}

export const generateUniqueId = () => Math.random().toString(36).substring(2)

export const checkJSON = (xml, template) => {
	const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml')
	const camundaNamespace = 'http://camunda.org/schema/1.0/bpmn'
	const nodesArray = []

	const allElements = Array.from(xmlDoc.getElementsByTagName('*'))

	allElements.forEach((element) => {
		const modelerTemplate = element.getAttributeNS(camundaNamespace, 'modelerTemplate')
		if (modelerTemplate) {
			const tagName = element.nodeName.replace(/\d+/g, '') // clean tag name
			nodesArray.push({
				id: element.getAttribute('id'),
				name: element.getAttribute('name'),
				typeOfTask: tagName,
				nameOfTemplate: modelerTemplate,
			})
		}
	})

	return nodesArray.filter((node) => {
		const foundId = checkIfIdFromTemplateExistsInJson(template, node)
		return foundId
	})
}

export const checkIfIdFromTemplateExistsInJson = (template, node) => {
	const checkId = node.nameOfTemplate
	if (!checkId) return null
	let isFound = false
	const idToCheck = getOnlyNameOfTemplate(checkId)
	const foundTemplates = template.find((el) => el.id === checkId)
	if (foundTemplates) isFound = true
	else {
		for (let i = 0; i < template.length; i++) {
			const obj = template[i]
			const partialId = getOnlyNameOfTemplate(obj.id) // id until last dash
			// If the object is found
			if (partialId === idToCheck) {
				//the name without the version matches
				//check if the type of task matches
				const foundIndex = obj.appliesTo.find(
					(el) => el.toLowerCase() === node.typeOfTask.toLowerCase()
				)
				if (!foundIndex) isFound = true
				if (obj.id === checkId) isFound = true
				// if the ids are the same the id is not found ( in case there are 2 templates sharing id with different versions)
				break // finish the search if the exact id is found
			}
		}
	}
	return isFound ? null : checkId
}

export const compareXML = (xml1, xml2) => {
	const parser = new DOMParser()
	const xmlDoc1 = parser.parseFromString(xml1, 'text/xml')
	const xmlDoc2 = parser.parseFromString(xml2, 'text/xml')
	return xmlDoc1.isEqualNode(xmlDoc2)
}

export async function loadFromPublic(folder, file) {
	try {
		const response = await fetch(`/${folder}/${file}`)
		if (!response.ok) {
			console.warn(`[loadFromPublic] Failed to load ${folder}/${file}:`, response.status)
			return null
		}
		return await response.json()
	} catch (error) {
		console.warn(`[loadFromPublic] Error loading ${folder}/${file}:`, error)
		return null
	}
}

// Alias functions for library compatibility
export const parseXml = (xmlString) => {
	return new DOMParser().parseFromString(xmlString, 'text/xml')
}

export const base64Decode = decodeBase64ToUtf8

export const applyTheme = (theme) => {
	document.documentElement.setAttribute('data-bs-theme', theme)
	localStorage.setItem('theme', theme)
}

export const getTheme = () => {
	return localStorage.getItem('theme') || 'light'
}

export const getBearerToken = () => {
	const localStorageToken = localStorage.getItem('token')
	if (!localStorageToken) return null
	return localStorageToken.split(' ')[1] ?? null
}

/**
 * Regular expression to match wildcard cleanup criteria
 * It matches strings that consist only of asterisks (*) and optional whitespaces.
 */
export const wildcardCleanupRegex = /^\s*\*+\s*$/

/**
 * Cleans up the template criteria by removing empty strings and wildcard-only entries
 * @param {List} criteria 
 * @returns The cleaned list or an empty list if the input is undefined or empty.
 */
export const cleanupTemplateCriteria = (criteria) => {
	if (!criteria || criteria.length === 0) {
		return []
	}

	return criteria.filter(element => !(
		element.trim().length === 0 || wildcardCleanupRegex.test(element)
	))
}

/**
 * Filters templates based on exclusion criteria from the config
 * @param {List} templates The list of templates to filter
 * @param {Map} config The configuration object containing the filtering criteria
 * @returns The filtered list of templates
 */
export const filterTemplates = (templates, config) => {
	if (!Array.isArray(templates) || templates.length === 0) {
		return []
	}

	if (!config) {
		return templates
	}

	try {
		let exclusionCriteria = config.modeler?.excludeTemplates ?? config.excludeTemplates

		if (!exclusionCriteria || exclusionCriteria.length === 0) {
			return templates
		}

		exclusionCriteria = cleanupTemplateCriteria(exclusionCriteria)

		return templates.filter(template => !exclusionCriteria.some(criteria => {
			// Check with wildcard criteria
			if (criteria.startsWith('*') && criteria.endsWith('*')) {
				return template.id.includes(criteria.replace(/\*/g, '')) // Match found in the middle
			}
			else if (criteria.startsWith('*')) {
				return template.id.endsWith(criteria.replace('*', '')) // Match found at the start
			}
			else if (criteria.endsWith('*')) {
				return template.id.startsWith(criteria.replace('*', '')) // Match found at the end
			}

			if (template.id === criteria) {
				return true // Exact match by ID
			}

			const splitName = template.name.split('-').map(part => part.trim())

			if (splitName.length > 1) {
				if (splitName[0].toLowerCase() === criteria.toLowerCase()) {
					return true
				}
			}
			return false
		}))

	} catch (error) {
		console.error('Error filtering templates', error)
		return templates
	}
}

/**
 * Combines two lists of element templates, giving priority to the custom list.
 */
export const mergeTemplates = (defaultList, customList) => {
	const defaultTemplatesMap = Object.fromEntries(defaultList.map(item => [item.id, item]))
	
	customList.forEach(template => {
		defaultTemplatesMap[template.id] = template
	})
	
	return Object.values(defaultTemplatesMap)
}

// Add errors in html to the console log panel
export const addHtmlErrorsToConsole = error => {
	return error
}

/**
 * Formats last-saved timestamp and optional user id for unified diagram list rows.
 * @param {string|number|Date} updated
 * @param {string} [updatedBy]
 * @returns {string}
 */
export const formatUnifiedListLastSaved = (updated, updatedBy) => {
	const parts = []
	if (updatedBy) parts.push(updatedBy)
	if (updated != null && updated !== '') {
		const d = new Date(updated)
		if (!isNaN(d.getTime())) {
			parts.push(
				d.toLocaleString(undefined, {
					dateStyle: 'short',
					timeStyle: 'short'
				})
			)
		}
	}
	return parts.join(' · ')
}

export const formatFileSize = (bytes) => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export { TYPEC7, TYPEDMN }
