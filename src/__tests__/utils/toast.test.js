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
import { describe, it, expect, vi, afterEach } from 'vitest'
import { errorToast } from '../../utils/toast.js'

describe('errorToast', () => {
    afterEach(() => vi.restoreAllMocks())

    it('builds an error-toast payload from an i18n key', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(errorToast('templatesManagement.exportError')).toEqual({
            isSuccess: false,
            toastText: 'templatesManagement.exportError',
            bodyTextAlt: '',
        })
        // No error argument → nothing logged.
        expect(spy).not.toHaveBeenCalled()
    })

    it('logs the raw error for diagnostics when one is provided', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const err = new Error('boom')
        const payload = errorToast('toastLoadErrorFile', err)
        expect(payload.isSuccess).toBe(false)
        expect(spy).toHaveBeenCalledWith(err)
    })

    it('passes through an optional bodyTextAlt detail', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(errorToast('k', new Error('x'), { bodyTextAlt: 'detail' }).bodyTextAlt).toBe('detail')
    })
})
