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

const traditionalChineseTags = ['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant']

/**
 * Maps a language tag to one of the keys in the translations.
 * Traditional Chinese variants share the `zh-tw` resources, all other Chinese
 * variants the `zh` ones, and every other language its primary subtag.
 *
 * Kept free of browser globals so it can be used from any module.
 *
 * @param {string} value - e.g. "zh-TW", "zh_HK", "en-US"
 * @returns {string|null} normalized locale, or null for an empty value
 */
export function normalizeLanguage(value) {
	if (!value) return null
	const tag = String(value).toLowerCase().replaceAll('_', '-')
	if (traditionalChineseTags.includes(tag)) return 'zh-tw'
	if (tag === 'zh' || tag.startsWith('zh-')) return 'zh'
	return tag.split('-')[0]
}
