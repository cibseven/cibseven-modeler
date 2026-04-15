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
import { ref } from 'vue'
import { language } from '../i18n.js'
import { isHttpOrHttpsUrl } from '../utils/regexUtils'
import { getModelerServicePath, getServicesBasePath } from './servicesConfig'

const getBaseDeploymentUrl = () => getModelerServicePath() + '/deployment'

const deploy = async (myAuthorization, deploymentName, deployUrl, tenantID, diagram, type, additionalResources = []) => {
  const baseDeploymentUrl = getBaseDeploymentUrl()
  if (deployUrl != baseDeploymentUrl && !isHttpOrHttpsUrl(deployUrl)) { // If not default path, check if it's a valid http(s) URL
    throw new Error(`Invalid http(s) deployment URL: ${deployUrl}`)
  }

  const mainResourceName = `${deploymentName}.${type}`

  const myFormData = ref(new FormData())

  const blob = new Blob([diagram], { type: 'text/plain' })
  myFormData.value.append('deployment-name', deploymentName)
  myFormData.value.append('deployment-source', 'CIB seven Web Modeler')
  myFormData.value.append('enable-duplicate-filtering', 'true')
  myFormData.value.append(mainResourceName, blob, mainResourceName)
  if (tenantID !== '') {
    myFormData.value.append('tenant-id', tenantID)
  }
  additionalResources.forEach(({ resourceName, blob: partBlob }) => {
    const name = resourceName.trim()
    myFormData.value.append(name, partBlob, name)
  })

  return await getAxios().post(`${deployUrl}/create`, myFormData.value, {
    headers: {
      authorization: myAuthorization,
      'Content-Type': 'multipart/form-data'
    }
  })
}

const deployProcess = async (
  method,
  token,
  username,
  password,
  deploymentName,
  cibsevenInstanceUrl,
  tenantID,
  rememberMe,
  diagram,
  ownEndPoint,
  type,
  additionalResources = []
) => {
  const baseDeploymentUrl = getBaseDeploymentUrl()
  const deployUrl = ownEndPoint
    ? cibsevenInstanceUrl + '/' + getServicesBasePath() + '/modeler-service/deployment'
    : baseDeploymentUrl
  const headers = _generateHeaders(method, token, username, password, deployUrl)

  if (headers) {
    return deploy(
      headers['headers']['authorization'],
      deploymentName,
      deployUrl,
      tenantID,
      diagram,
      type,
      additionalResources
    )
  }
}

const startProcess = async (
  method,
  token,
  username,
  password,
  processName,
  cibsevenInstanceUrl,
  ownEndPoint
) => {
  const baseDeploymentUrl = getBaseDeploymentUrl()
  const startUrl = ownEndPoint
    ? cibsevenInstanceUrl + '/' + getServicesBasePath() + '/modeler-service/process'
    : baseDeploymentUrl

  const headers = _generateHeaders(method, token, username, password, startUrl)

  if (headers) {
    return await getAxios().post(
      `${startUrl}/start/${processName}`,
      {
        variables: {
          _locale: {
            value: language,
            type: "String"
          }
        }
      },
      { headers: { authorization: headers['headers']['authorization'] } }
    )
  }
}

const _generateBasicAuthToken = (username, password) => {
  const token = username + ':' + password
  const hash = btoa(token)
  return 'Basic ' + hash
}

const _generateHeaders = (method, token, username, password, deployUrl) => {// TODO: remove deployUrl as parameter
  if (
    deployUrl &&
    (method === 'token' && token) ||
    (method === 'basicauth' && username && password))
  {
    return {
      headers: {
        authorization: method === 'token'?
          token.startsWith('Bearer ')? token : 'Bearer ' + token : // If token does not start with 'Bearer ', prepend it
          _generateBasicAuthToken(username, password)
      }
    }
  }
  return null
}

export { deployProcess, startProcess }
