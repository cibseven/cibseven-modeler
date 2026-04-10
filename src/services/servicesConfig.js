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

// Default base path matching cibseven-webclient: services/v1
let servicesBasePath = 'services/v1'

export function getServicesBasePath() {
  return servicesBasePath
}

export function setServicesBasePath(basePath) {
  servicesBasePath = basePath
}

/**
 * Returns the full modeler service path
 * @returns {string} e.g., 'services/v1/modeler'
 */
export function getModelerServicePath() {
  return `${servicesBasePath}/modeler`
}

/**
 * Returns the element templates service path
 * @returns {string} e.g., 'services/v1/element-templates'
 */
export function getElementTemplatesPath() {
  return `${servicesBasePath}/element-templates`
}

/**
 * Returns the modeler-info service path
 * @returns {string} e.g., 'services/v1/modeler-info'
 */
export function getInfoPath() {
  return `${servicesBasePath}/modeler-info`
}
