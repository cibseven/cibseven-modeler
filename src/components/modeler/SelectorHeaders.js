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
 * Shared headers for the version selector table modal in `BpmnModeler.vue` and `DmnModeler.vue`.
 */
const versionHeaders = [
    {
        key: 'version',
        sortKey: 'version',
        label: 'headerVersion',
        class: 'col'
    },
    {
        key: 'updated',
        sortKey: 'updated',
        label: 'headerDate',
        class: 'col'
    }
]

/**
 * (Not shown) header for list-like emulation using the CibsevenTable in `BpmnModeler.vue` and `DmnModeler.vue`.
 */
const simpleTableHeader = [
    {
        key: 'name',
        class: 'col'
    }
]

export const getHeadersForSelector = typeOfSelector => {
	switch (typeOfSelector) {
		case 'changeVersion':
			return versionHeaders
		case 'templates':
			return simpleTableHeader
		default:
			return []
	}
}
