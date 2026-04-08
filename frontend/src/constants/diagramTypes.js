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

/** Canonical diagram type identifiers used throughout the modeler. */
export const DIAGRAM_TYPE = Object.freeze({
  BPMN_C7: 'bpmn-c7',
  DMN: 'dmn',
  FORM: 'form',
})

/** Material Design Icon class for each diagram type. */
export const DIAGRAM_ICON = Object.freeze({
  'bpmn-c7': 'mdi-map-legend',
  'dmn': 'mdi-wall-sconce-flat-outline',
  'form': 'mdi-form-select',
})

/** File extension used when downloading each diagram type. */
export const DIAGRAM_FILE_EXT = Object.freeze({
  'bpmn-c7': '.bpmn',
  'dmn': '.dmn',
  'form': '.form',
})

/** localStorage key used to persist open tabs across page reloads. */
export const TAB_STORAGE_KEY = 'flow.modeler.navList'
