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
import { describe, it, expect, afterEach } from 'vitest'
import {
    getServicesBasePath,
    setServicesBasePath,
    getModelerServicePath,
    getElementTemplatesPath,
    getInfoPath,
} from '../../services/servicesConfig'

describe('servicesConfig', () => {
    const originalBasePath = getServicesBasePath()

    afterEach(() => {
        setServicesBasePath(originalBasePath)
    })

    describe('getServicesBasePath', () => {
        it('returns default services base path', () => {
            setServicesBasePath('services/v1')
            const result = getServicesBasePath()
            expect(result).toBe('services/v1')
        })

        it('returns configured base path', () => {
            setServicesBasePath('api/services')
            const result = getServicesBasePath()
            expect(result).toBe('api/services')
        })
    })

    describe('setServicesBasePath', () => {
        it('updates services base path', () => {
            setServicesBasePath('custom/path')
            expect(getServicesBasePath()).toBe('custom/path')
        })

        it('allows setting different paths', () => {
            setServicesBasePath('path/v2')
            expect(getServicesBasePath()).toBe('path/v2')

            setServicesBasePath('path/v3')
            expect(getServicesBasePath()).toBe('path/v3')
        })

        it('handles empty path', () => {
            setServicesBasePath('')
            expect(getServicesBasePath()).toBe('')
        })
    })

    describe('getModelerServicePath', () => {
        it('returns modeler service path with default base path', () => {
            setServicesBasePath('services/v1')
            const result = getModelerServicePath()
            expect(result).toBe('services/v1/modeler')
        })

        it('appends modeler to custom base path', () => {
            setServicesBasePath('api/v2')
            const result = getModelerServicePath()
            expect(result).toBe('api/v2/modeler')
        })

        it('returns consistent path', () => {
            setServicesBasePath('services/v1')
            const path1 = getModelerServicePath()
            const path2 = getModelerServicePath()
            expect(path1).toBe(path2)
        })
    })

    describe('getElementTemplatesPath', () => {
        it('returns element templates path with default base path', () => {
            setServicesBasePath('services/v1')
            const result = getElementTemplatesPath()
            expect(result).toBe('services/v1/modeler/element-templates')
        })

        it('appends element-templates to custom base path', () => {
            setServicesBasePath('api/v2')
            const result = getElementTemplatesPath()
            expect(result).toBe('api/v2/modeler/element-templates')
        })

        it('includes modeler in path', () => {
            setServicesBasePath('services/v1')
            const result = getElementTemplatesPath()
            expect(result).toContain('modeler')
            expect(result).toContain('element-templates')
        })
    })

    describe('getInfoPath', () => {
        it('returns info path with default base path', () => {
            setServicesBasePath('services/v1')
            const result = getInfoPath()
            expect(result).toBe('services/v1/modeler-info')
        })

        it('appends modeler-info to custom base path', () => {
            setServicesBasePath('api/v2')
            const result = getInfoPath()
            expect(result).toBe('api/v2/modeler-info')
        })

        it('uses modeler-info suffix', () => {
            setServicesBasePath('services/v1')
            const result = getInfoPath()
            expect(result).toContain('modeler-info')
        })
    })

    describe('path composition', () => {
        it('all paths share same base path', () => {
            setServicesBasePath('custom/api')
            const modeler = getModelerServicePath()
            const templates = getElementTemplatesPath()
            const info = getInfoPath()

            expect(modeler).toContain('custom/api')
            expect(templates).toContain('custom/api')
            expect(info).toContain('custom/api')
        })

        it('modeler path is prefix of templates path', () => {
            setServicesBasePath('services/v1')
            const modeler = getModelerServicePath()
            const templates = getElementTemplatesPath()
            expect(templates.startsWith(modeler)).toBe(true)
        })

        it('paths are properly formatted with slashes', () => {
            setServicesBasePath('services/v1')
            const modeler = getModelerServicePath()
            const templates = getElementTemplatesPath()
            const info = getInfoPath()

            expect(modeler).not.toContain('//')
            expect(templates).not.toContain('//')
            expect(info).not.toContain('//')
        })
    })

    describe('base path changes affect all paths', () => {
        it('changing base path updates all derived paths', () => {
            setServicesBasePath('v1')
            const v1Modeler = getModelerServicePath()

            setServicesBasePath('v2')
            const v2Modeler = getModelerServicePath()

            expect(v1Modeler).not.toBe(v2Modeler)
            expect(v1Modeler).toContain('v1')
            expect(v2Modeler).toContain('v2')
        })

        it('reverting base path restores original paths', () => {
            setServicesBasePath('temporary/path')
            setServicesBasePath('services/v1')
            const restored = getModelerServicePath()

            expect(restored).toBe('services/v1/modeler')
        })
    })

    describe('edge cases', () => {
        it('handles base path with trailing slash', () => {
            setServicesBasePath('services/v1/')
            const modeler = getModelerServicePath()
            expect(modeler).toContain('modeler')
        })

        it('handles base path without leading slash', () => {
            setServicesBasePath('services/v1')
            const modeler = getModelerServicePath()
            expect(modeler).toBe('services/v1/modeler')
        })

        it('handles special characters in base path', () => {
            setServicesBasePath('api-v1')
            const modeler = getModelerServicePath()
            expect(modeler).toBe('api-v1/modeler')
        })
    })
})
