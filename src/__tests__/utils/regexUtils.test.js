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
import { describe, it, expect } from 'vitest'
import { isHttpOrHttpsUrl } from '../../utils/regexUtils.js'

describe('isHttpOrHttpsUrl', () => {

    describe('localhost URLs', () => {
        it('accepts http://localhost', () => {
            expect(isHttpOrHttpsUrl('http://localhost')).toBe(true)
        })
        it('accepts https://localhost', () => {
            expect(isHttpOrHttpsUrl('https://localhost')).toBe(true)
        })
        it('accepts http://localhost with port and path', () => {
            expect(isHttpOrHttpsUrl('http://localhost:8081/engine-rest/')).toBe(true)
        })
        it('accepts http://localhost:8080', () => {
            expect(isHttpOrHttpsUrl('http://localhost:8080')).toBe(true)
        })
    })

    describe('IPv4 URLs', () => {
        it('accepts http://127.0.0.1', () => {
            expect(isHttpOrHttpsUrl('http://127.0.0.1')).toBe(true)
        })
        it('accepts http://127.0.0.1 with port', () => {
            expect(isHttpOrHttpsUrl('http://127.0.0.1:3000')).toBe(true)
        })
        it('accepts http://192.168.1.100:8080/path', () => {
            expect(isHttpOrHttpsUrl('http://192.168.1.100:8080/path')).toBe(true)
        })
    })

    describe('IPv6 URLs', () => {
        it('accepts http://[::1]:8080', () => {
            expect(isHttpOrHttpsUrl('http://[::1]:8080')).toBe(true)
        })
        it('accepts https://[2001:db8::1]/path', () => {
            expect(isHttpOrHttpsUrl('https://[2001:db8::1]/path')).toBe(true)
        })
    })

    describe('domain URLs', () => {
        it('accepts https://example.com', () => {
            expect(isHttpOrHttpsUrl('https://example.com')).toBe(true)
        })
        it('accepts http://example.com/path', () => {
            expect(isHttpOrHttpsUrl('http://example.com/path')).toBe(true)
        })
        it('accepts https://sub.example.com:443/path', () => {
            expect(isHttpOrHttpsUrl('https://sub.example.com:443/path')).toBe(true)
        })
    })

    describe('invalid URLs', () => {
        it('rejects empty string', () => {
            expect(isHttpOrHttpsUrl('')).toBe(false)
        })
        it('rejects ftp protocol', () => {
            expect(isHttpOrHttpsUrl('ftp://example.com')).toBe(false)
        })
        it('rejects plain text', () => {
            expect(isHttpOrHttpsUrl('not-a-url')).toBe(false)
        })
        it('rejects URL without protocol', () => {
            expect(isHttpOrHttpsUrl('example.com/path')).toBe(false)
        })
        it('rejects invalid port > 65535', () => {
            expect(isHttpOrHttpsUrl('http://localhost:99999/engine-rest/')).toBe(false)
        })
    })
})
