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
 * Standard axios mock method keys for service tests.
 * Vitest requires vi.hoisted() in each test file, so mocks stay inline there;
 * import these constants to keep method lists in sync across service test files.
 */
export const STANDARD_AXIOS_MOCK_METHODS = ['get', 'post', 'put', 'delete']

export const ELEMENT_TEMPLATE_AXIOS_MOCK_METHODS = [...STANDARD_AXIOS_MOCK_METHODS, 'patch']
