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
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
}))

vi.mock('../../axiosConfig', () => ({ getAxios: () => ({ get: m.get, post: m.post, put: m.put, delete: m.delete }) }))
vi.mock('../../services/servicesConfig', () => ({ 
    getModelerServicePath: () => '/api/modeler',
    getServicesBasePath: () => '/api/services'
}))
vi.mock('../../i18n.js', () => ({ language: 'en' }))
vi.mock('../../utils/regexUtils', () => ({ isHttpOrHttpsUrl: (url) => url.startsWith('http://') || url.startsWith('https://') }))

import { deployProcess, startProcess } from '../../services/deployService'

describe('deployService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('deployProcess', () => {
        it('deploys process with token authentication', async () => {
            m.post.mockResolvedValue({ data: { deploymentId: 'd1' } })

            const result = await deployProcess(
                'token',
                'Bearer token123',
                '',
                '',
                'Process 1',
                'http://instance.com',
                'tenant1',
                '<bpmn />',
                false,
                'bpmn'
            )

            expect(m.post).toHaveBeenCalled()
            expect(result.data).toEqual({ deploymentId: 'd1' })
        })

        it('deploys process with basic auth', async () => {
            m.post.mockResolvedValue({ data: { deploymentId: 'd2' } })

            const result = await deployProcess(
                'basicauth',
                '',
                'user',
                'pass',
                'Process 2',
                'http://instance.com',
                '',
                '<bpmn />',
                false,
                'bpmn'
            )

            expect(m.post).toHaveBeenCalled()
            expect(result.data).toEqual({ deploymentId: 'd2' })
        })

        it('deploys with custom endpoint', async () => {
            m.post.mockResolvedValue({ data: { deploymentId: 'd3' } })

            await deployProcess(
                'token',
                'Bearer token123',
                '',
                '',
                'Process 3',
                'http://custom.com',
                'tenant1',
                '<bpmn />',
                true,
                'bpmn'
            )

            expect(m.post).toHaveBeenCalled()
        })

        it('includes additional resources', async () => {
            m.post.mockResolvedValue({ data: { deploymentId: 'd4' } })

            const additionalResources = [
                { resourceName: 'form.json', blob: new Blob(['{}']) }
            ]

            await deployProcess(
                'token',
                'Bearer token123',
                '',
                '',
                'Process 4',
                'http://instance.com',
                'tenant1',
                '<bpmn />',
                false,
                'bpmn',
                additionalResources
            )

            expect(m.post).toHaveBeenCalled()
        })

        it('handles deployment errors', async () => {
            m.post.mockRejectedValue(new Error('Deployment failed'))

            try {
                await deployProcess(
                    'token',
                    'Bearer token123',
                    '',
                    '',
                    'Process 5',
                    'http://instance.com',
                    'tenant1',
                    '<bpmn />',
                    false,
                    'bpmn'
                )
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })

        it('throws error on invalid custom endpoint URL', async () => {
            try {
                await deployProcess(
                    'token',
                    'Bearer token123',
                    '',
                    '',
                    'Process 6',
                    'not-a-valid-url',
                    'tenant1',
                    '<bpmn />',
                    true,
                    'bpmn'
                )
                expect(true).toBe(false)
            } catch (error) {
                expect(error.message).toContain('Invalid http(s) deployment URL')
            }
        })

        it('requires authentication method', async () => {
            const result = await deployProcess(
                'invalid',
                '',
                '',
                '',
                'Process 7',
                'http://instance.com',
                'tenant1',
                '<bpmn />',
                false,
                'bpmn'
            )

            expect(result).toBeUndefined()
        })

        it('auto-adds Bearer prefix to token if missing', async () => {
            m.post.mockResolvedValue({ data: { deploymentId: 'd5' } })

            await deployProcess(
                'token',
                'token-without-bearer',
                '',
                '',
                'Process 8',
                'http://instance.com',
                '',
                '<bpmn />',
                false,
                'bpmn'
            )

            expect(m.post).toHaveBeenCalled()
        })

        it('handles DMN diagram deployment', async () => {
            m.post.mockResolvedValue({ data: { deploymentId: 'd6' } })

            await deployProcess(
                'token',
                'Bearer token123',
                '',
                '',
                'Decision 1',
                'http://instance.com',
                '',
                '<dmn />',
                false,
                'dmn'
            )

            expect(m.post).toHaveBeenCalled()
        })
    })

    describe('startProcess', () => {
        it('starts process with token authentication', async () => {
            m.post.mockResolvedValue({ data: { processInstanceId: 'pi1' } })

            const result = await startProcess(
                'token',
                'Bearer token123',
                '',
                '',
                'Process_1',
                'http://instance.com',
                false
            )

            expect(m.post).toHaveBeenCalled()
            expect(result.data).toEqual({ processInstanceId: 'pi1' })
        })

        it('starts process with basic auth', async () => {
            m.post.mockResolvedValue({ data: { processInstanceId: 'pi2' } })

            const result = await startProcess(
                'basicauth',
                '',
                'user',
                'pass',
                'Process_2',
                'http://instance.com',
                false
            )

            expect(m.post).toHaveBeenCalled()
            expect(result.data).toEqual({ processInstanceId: 'pi2' })
        })

        it('starts process with custom endpoint', async () => {
            m.post.mockResolvedValue({ data: { processInstanceId: 'pi3' } })

            await startProcess(
                'token',
                'Bearer token123',
                '',
                '',
                'Process_3',
                'http://custom.com',
                true
            )

            expect(m.post).toHaveBeenCalled()
        })

        it('includes language variable in request', async () => {
            m.post.mockResolvedValue({ data: { processInstanceId: 'pi4' } })

            await startProcess(
                'token',
                'Bearer token123',
                '',
                '',
                'Process_4',
                'http://instance.com',
                false
            )

            const callArgs = m.post.mock.calls[0]
            expect(callArgs[1]).toHaveProperty('variables')
            expect(callArgs[1].variables).toHaveProperty('_locale')
        })

        it('handles process start errors', async () => {
            m.post.mockRejectedValue(new Error('Start failed'))

            try {
                await startProcess(
                    'token',
                    'Bearer token123',
                    '',
                    '',
                    'Process_5',
                    'http://instance.com',
                    false
                )
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })

        it('requires valid authentication', async () => {
            const result = await startProcess(
                'invalid',
                '',
                '',
                '',
                'Process_6',
                'http://instance.com',
                false
            )

            expect(result).toBeUndefined()
        })

        it('handles missing username/password for basicauth', async () => {
            const result = await startProcess(
                'basicauth',
                '',
                '',
                '',
                'Process_7',
                'http://instance.com',
                false
            )

            expect(result).toBeUndefined()
        })

        it('constructs correct endpoint URL', async () => {
            m.post.mockResolvedValue({ data: {} })

            await startProcess(
                'token',
                'Bearer token123',
                '',
                '',
                'MyProcess_v1',
                'http://instance.com',
                false
            )

            const callArgs = m.post.mock.calls[0]
            expect(callArgs[0]).toContain('start/MyProcess_v1')
        })
    })
})
