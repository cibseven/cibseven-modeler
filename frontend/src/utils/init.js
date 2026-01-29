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

// Dynamically import theme SCSS files
const themeModules = import.meta.glob('@/themes/**/variables.scss', { eager: false, query: '?inline' })

/**
 * Load theme CSS dynamically
 * @param {string} themeName - The name of the theme to load (e.g., 'cib', 'generic')
 */
export async function loadTheme(themeName) {
	try {
		const themePath = `/src/themes/${themeName}/variables.scss`
		const moduleLoader = themeModules[themePath]
		if (moduleLoader) {
			const module = await moduleLoader()
			const style = document.createElement('style')
			style.textContent = module.default
			document.head.appendChild(style)
			console.info(`[Theme] Theme "${themeName}" loaded successfully`)
		} else {
			console.warn(`[Theme] Theme "${themeName}" not found, available themes:`, Object.keys(themeModules))
			// Try to load default 'cib' theme as fallback
			if (themeName !== 'cib') {
				console.info('[Theme] Falling back to "cib" theme')
				await loadTheme('cib')
			}
		}
	} catch (error) {
		console.error('[Theme] Error loading theme:', error)
	}
}

/**
 * Apply theme-specific assets like favicon
 * @param {string} theme - The name of the theme
 */
export function applyTheme(theme) {
	const favicon = document.createElement('link')
	favicon.setAttribute('rel', 'icon')
	favicon.setAttribute('type', 'image/x-icon')
	favicon.setAttribute('href', 'themes/' + theme + '/favicon.ico')
	document.head.appendChild(favicon)
}
