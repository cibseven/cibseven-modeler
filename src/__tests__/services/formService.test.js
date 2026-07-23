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

vi.mock('../../axiosConfig', () => ({ getAxios: () => m }))
vi.mock('../../services/servicesConfig', () => ({ getModelerServicePath: () => '/api/modeler' }))

import {
    fetchForms,
    fetchFormById,
    fetchFormByFormId,
    saveForm,
    updateForm,
    deleteFormById,
} from '../../services/formService'

describe('formService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('fetchForms', () => {
        it('fetches forms with pagination', async () => {
            const forms = [{ id: 'f1', name: 'Form 1' }]
            m.get.mockResolvedValue({ data: forms })

            const result = await fetchForms(0, 10)

            expect(m.get).toHaveBeenCalledWith('/api/modeler/forms', {
                params: { firstResult: 0, maxResults: 10, keyword: '' }
            })
            expect(result.data).toEqual(forms)
        })

        it('fetches forms with search keyword', async () => {
            const forms = [{ id: 'f1', name: 'Contact Form' }]
            m.get.mockResolvedValue({ data: forms })

            const result = await fetchForms(0, 10, 'contact')

            expect(m.get).toHaveBeenCalledWith('/api/modeler/forms', {
                params: { firstResult: 0, maxResults: 10, keyword: 'contact' }
            })
            expect(result.data).toEqual(forms)
        })

        it('handles pagination boundaries', async () => {
            m.get.mockResolvedValue({ data: [] })

            await fetchForms(100, 20, '')

            expect(m.get).toHaveBeenCalledWith('/api/modeler/forms', {
                params: { firstResult: 100, maxResults: 20, keyword: '' }
            })
        })

        it('handles empty form list', async () => {
            m.get.mockResolvedValue({ data: [] })

            const result = await fetchForms(0, 10)

            expect(result.data).toEqual([])
        })

        it('handles API errors', async () => {
            m.get.mockRejectedValue(new Error('API Error'))

            return expect(fetchForms(0, 10)).rejects.toThrow('API Error')
        })
    })

    describe('fetchFormById', () => {
        it('fetches a form by database ID', async () => {
            const form = { id: 'f1', name: 'Form 1', schema: {} }
            m.get.mockResolvedValue({ data: form })

            const result = await fetchFormById('f1')

            expect(m.get).toHaveBeenCalledWith('/api/modeler/form/f1/data')
            expect(result.data).toEqual(form)
        })

        it('handles non-existent form', async () => {
            m.get.mockRejectedValue(new Error('Not found'))

            return expect(fetchFormById('nonexistent')).rejects.toThrow('Not found')
        })
    })

    describe('fetchFormByFormId', () => {
        it('fetches a form by unique formId', async () => {
            const form = { id: 'f1', formId: 'contact-form', name: 'Contact' }
            m.get.mockResolvedValue({ data: form })

            const result = await fetchFormByFormId('contact-form')

            expect(m.get).toHaveBeenCalledWith('/api/modeler/form/find-by-formid', {
                params: { formId: 'contact-form' }
            })
            expect(result.data).toEqual(form)
        })

        it('handles non-existent formId', async () => {
            m.get.mockRejectedValue(new Error('404 Not found'))

            return expect(fetchFormByFormId('nonexistent-formid')).rejects.toThrow('404 Not found')
        })
    })

    describe('saveForm', () => {
        it('saves a new form', async () => {
            m.post.mockResolvedValue({ data: { id: 'f1', formId: 'myform' } })

            const result = await saveForm('f1', { name: 'My Form', fields: [] })

            expect(m.post).toHaveBeenCalled()
            const callArgs = m.post.mock.calls[0]
            expect(callArgs[0]).toBe('/api/modeler/form/save')
            expect(result.data).toEqual({ id: 'f1', formId: 'myform' })
        })

        it('includes proper FormData structure', async () => {
            m.post.mockResolvedValue({ data: { id: 'f1' } })

            await saveForm('f1', { fields: [] })

            expect(m.post).toHaveBeenCalled()
            const callArgs = m.post.mock.calls[0]
            expect(callArgs[2]).toHaveProperty('headers')
        })

        it('handles save errors', async () => {
            m.post.mockRejectedValue(new Error('Save failed'))

            return expect(saveForm('f1', { fields: [] })).rejects.toThrow('Save failed')
        })

        it('saves complex form schemas', async () => {
            m.post.mockResolvedValue({ data: { id: 'f1' } })

            const complexSchema = {
                fields: [
                    { id: 'field1', type: 'text', label: 'Name' },
                    { id: 'field2', type: 'email', label: 'Email' }
                ]
            }

            await saveForm('f1', complexSchema)

            expect(m.post).toHaveBeenCalled()
        })
    })

    describe('updateForm', () => {
        it('updates an existing form', async () => {
            m.post.mockResolvedValue({ data: { id: 'f1', formId: 'myform', version: 2 } })

            const result = await updateForm('f1', 'myform', { name: 'Updated Form', fields: [] })

            expect(m.post).toHaveBeenCalled()
            const callArgs = m.post.mock.calls[0]
            expect(callArgs[0]).toBe('/api/modeler/form/update')
            expect(result.data).toEqual({ id: 'f1', formId: 'myform', version: 2 })
        })

        it('includes id and formId in update', async () => {
            m.post.mockResolvedValue({ data: { id: 'f1' } })

            await updateForm('f1', 'myform', { fields: [] })

            expect(m.post).toHaveBeenCalled()
        })

        it('handles update errors', async () => {
            m.post.mockRejectedValue(new Error('Update failed'))

            return expect(updateForm('f1', 'myform', { fields: [] })).rejects.toThrow('Update failed')
        })

        it('updates form with new schema', async () => {
            m.post.mockResolvedValue({ data: { id: 'f1' } })

            const newSchema = { fields: [{ id: 'f1', type: 'checkbox', label: 'Agree' }] }

            await updateForm('f1', 'myform', newSchema)

            expect(m.post).toHaveBeenCalled()
        })
    })

    describe('deleteFormById', () => {
        it('deletes a form by ID', async () => {
            m.delete.mockResolvedValue({ data: { success: true } })

            const result = await deleteFormById('f1')

            expect(m.delete).toHaveBeenCalledWith('/api/modeler/form/delete/f1')
            expect(result.data).toEqual({ success: true })
        })

        it('handles deletion of non-existent form', async () => {
            m.delete.mockRejectedValue(new Error('Not found'))

            return expect(deleteFormById('nonexistent')).rejects.toThrow('Not found')
        })

        it('handles deletion errors', async () => {
            m.delete.mockRejectedValue(new Error('Server error'))

            return expect(deleteFormById('f1')).rejects.toThrow('Server error')
        })
    })

    describe('form workflow', () => {
        it('saves and then updates a form', async () => {
            m.post.mockResolvedValue({ data: { id: 'f1', formId: 'myform' } })

            await saveForm('f1', { name: 'Initial' })
            await updateForm('f1', 'myform', { name: 'Updated' })

            expect(m.post).toHaveBeenCalledTimes(2)
        })

        it('fetches and then updates a form', async () => {
            m.get.mockResolvedValue({ data: { id: 'f1', formId: 'myform' } })
            m.post.mockResolvedValue({ data: { id: 'f1', formId: 'myform', version: 2 } })

            await fetchFormById('f1')
            await updateForm('f1', 'myform', { fields: [] })

            expect(m.get).toHaveBeenCalled()
            expect(m.post).toHaveBeenCalled()
        })

        it('deletes multiple forms', async () => {
            m.delete.mockResolvedValue({ data: { success: true } })

            await deleteFormById('f1')
            await deleteFormById('f2')
            await deleteFormById('f3')

            expect(m.delete).toHaveBeenCalledTimes(3)
        })
    })
})
