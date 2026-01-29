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
import { createRouter, createWebHashHistory } from 'vue-router'
import { axios } from './axiosConfig'

// Lazy load components
const CibsevenModeler = () => import('./components/modeler/CibsevenModeler.vue')
const AppContainer = () => import('./components/AppContainer.vue')

const routes = [
	{
		path: '/',
		component: AppContainer,
		meta: { checkToken: true },
		children: [
			{ path: '', redirect: '/main' },
			{ path: 'main', component: CibsevenModeler }
		]
	}
]

const router = createRouter({
	history: createWebHashHistory(),
	routes
})

router.beforeEach(async (to, from, next) => {
	if (to.meta.checkToken) {
		if (router.user) {
			next()
		} else {
			await getSelfInfo().catch(error => {
				if (error.response) {
					var res = error.response
					var params = res.data.params && res.data.params.length > 0
					if (res.data && res.data.type === 'TokenExpiredException' && params) {
						console && console.info('Prolonged token')
						if (sessionStorage.getItem('token')) {
							sessionStorage.setItem('token', res.data.params[0])
						} else if (localStorage.getItem('token')) {
							localStorage.setItem('token', res.data.params[0])
						}
						axios.defaults.headers.common.authorization = res.data.params[0]
						error.config.headers.authorization = res.data.params[0]
						next()
					} else {
						console && console.warn('Not authenticated')
						sessionStorage.getItem('token') ? sessionStorage.removeItem('token') : localStorage.removeItem('token')
						next()
					}
				} else {
					console && console.error('Strange AJAX error', error)
					next()
				}
			})
		}

		async function getSelfInfo() {
			var inst = axios.create() // bypass standard error handling
			// Check if token was passed via URL query param
			const params = new URLSearchParams(window.location.search)
			const urlToken = params.get('token')
			if (urlToken) {
				localStorage.setItem('token', decodeURIComponent(urlToken))
				params.delete('token')
				history.replaceState(null, '', `${window.location.pathname}?${params}`)
			}

			// When running as a library inside cibseven-webclient, the token
			// is already in sessionStorage/localStorage (shared context)
			var token = sessionStorage.getItem('token') || localStorage.getItem('token')
			if (token) {
				return inst.get('auth', { headers: { authorization: token } }).then(res => {
					if (sessionStorage.getItem('token')) {
						sessionStorage.setItem('token', res.data.authToken)
					} else if (localStorage.getItem('token')) {
						localStorage.setItem('token', res.data.authToken)
					}
					axios.defaults.headers.common.authorization = res.data.authToken
					router.user = res.data
					next()
				})
			} else {
				// No token available - user is not authenticated
				// When integrated as library in cibseven-webclient, the parent
				// app handles authentication, so token should already be present
				console && console.warn('No auth token found in storage')
				next()
			}
		}
	} else {
		next()
	}
})

export default router
