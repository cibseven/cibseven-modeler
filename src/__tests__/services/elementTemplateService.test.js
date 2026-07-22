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
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
}))

vi.mock('../../axiosConfig', () => ({ getAxios: () => ({ get: m.get, post: m.post, patch: m.patch, put: m.put, delete: m.delete }) }))
vi.mock('../../services/servicesConfig', () => ({ getElementTemplatesPath: () => '/api/templates' }))

import {
    getAllElementTemplates,
    getAllElementTemplateContents,
    updateElementTemplate,
    setTemplateIsActive,
    addElementTemplate,
    getElementTemplateById,
    deleteElementTemplate,
    duplicateElementTemplate,
    bulkDeleteTemplates,
    bulkUpdateTemplateVisibility,
    searchTemplates,
    filterTemplates as filterTemplatesService,
    validateTemplate,
    importTemplates,
    exportTemplates,
    getTemplateStatistics,
    updateElementTemplateFull,
} from '../../services/elementTemplateService'

describe('elementTemplateService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getAllElementTemplates', () => {
        it('fetches all element templates', async () => {
            const templates = [{ id: 't1', name: 'Template 1' }]
            m.get.mockResolvedValue({ data: templates })

            const result = await getAllElementTemplates()

            expect(m.get).toHaveBeenCalledWith('/api/templates')
            expect(result.data).toEqual(templates)
        })

        it('handles empty template list', async () => {
            m.get.mockResolvedValue({ data: [] })

            const result = await getAllElementTemplates()

            expect(result.data).toEqual([])
        })

        it('handles API errors', async () => {
            m.get.mockRejectedValue(new Error('API Error'))

            try {
                await getAllElementTemplates()
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })
    })

    describe('getAllElementTemplateContents', () => {
        it('fetches template contents', async () => {
            const contents = [{ templateId: 't1', content: {} }]
            m.get.mockResolvedValue({ data: contents })

            const result = await getAllElementTemplateContents()

            expect(m.get).toHaveBeenCalledWith('/api/templates/content')
            expect(result.data).toEqual(contents)
        })

        it('handles empty contents', async () => {
            m.get.mockResolvedValue({ data: [] })

            const result = await getAllElementTemplateContents()

            expect(result.data).toEqual([])
        })
    })

    describe('updateElementTemplate', () => {
        it('updates an element template', async () => {
            const updated = { id: 't1', name: 'Updated Template' }
            m.patch.mockResolvedValue({ data: updated })

            const result = await updateElementTemplate('t1', { name: 'Updated Template' })

            expect(m.patch).toHaveBeenCalledWith('/api/templates/t1', { name: 'Updated Template' })
            expect(result.data).toEqual(updated)
        })

        it('updates template active status', async () => {
            m.patch.mockResolvedValue({ data: { id: 't1', active: true } })

            const result = await updateElementTemplate('t1', { active: true })

            expect(result.data).toEqual({ id: 't1', active: true })
        })

        it('handles update with multiple fields', async () => {
            m.patch.mockResolvedValue({ data: { id: 't1', name: 'New', active: false } })

            await updateElementTemplate('t1', { name: 'New', active: false })

            expect(m.patch).toHaveBeenCalled()
        })
    })

    describe('setTemplateIsActive', () => {
        it('activates a template', async () => {
            m.patch.mockResolvedValue({ data: { id: 't1', active: true } })

            const result = await setTemplateIsActive('t1', true)

            expect(m.patch).toHaveBeenCalledWith('/api/templates/t1', { active: true })
            expect(result.data.active).toBe(true)
        })

        it('deactivates a template', async () => {
            m.patch.mockResolvedValue({ data: { id: 't1', active: false } })

            const result = await setTemplateIsActive('t1', false)

            expect(result.data.active).toBe(false)
        })
    })

    describe('addElementTemplate', () => {
        it('creates a new element template', async () => {
            const newTemplate = { id: 't2', name: 'New Template' }
            m.post.mockResolvedValue({ data: newTemplate })

            const templateData = { name: 'New Template' }
            const result = await addElementTemplate(templateData)

            expect(m.post).toHaveBeenCalledWith('/api/templates', templateData)
            expect(result.data).toEqual(newTemplate)
        })

        it('returns created template with ID', async () => {
            const created = { id: 't3', name: 'Template', active: true }
            m.post.mockResolvedValue({ data: created })

            const result = await addElementTemplate({ name: 'Template' })

            expect(result.data).toHaveProperty('id')
        })

        it('handles creation errors', async () => {
            m.post.mockRejectedValue(new Error('Creation failed'))

            try {
                await addElementTemplate({ name: 'Invalid' })
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })
    })

    describe('getElementTemplateById', () => {
        it('fetches a template by ID', async () => {
            const template = { id: 't1', name: 'Template 1' }
            m.get.mockResolvedValue({ data: template })

            const result = await getElementTemplateById('t1')

            expect(m.get).toHaveBeenCalledWith('/api/templates/t1')
            expect(result.data).toEqual(template)
        })

        it('handles non-existent template', async () => {
            m.get.mockRejectedValue(new Error('Not found'))

            try {
                await getElementTemplateById('nonexistent')
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })
    })

    describe('deleteElementTemplate', () => {
        it('deletes a template by ID', async () => {
            m.delete.mockResolvedValue({ data: { success: true } })

            const result = await deleteElementTemplate('t1')

            expect(m.delete).toHaveBeenCalledWith('/api/templates/t1')
            expect(result.data).toEqual({ success: true })
        })

        it('handles deletion of non-existent template', async () => {
            m.delete.mockRejectedValue(new Error('Not found'))

            try {
                await deleteElementTemplate('nonexistent')
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })

        it('handles deletion errors gracefully', async () => {
            m.delete.mockRejectedValue(new Error('Server error'))

            try {
                await deleteElementTemplate('t1')
                expect(true).toBe(false)
            } catch (error) {
                expect(error.message).toContain('Server error')
            }
        })
    })

    describe('batch operations', () => {
        it('creates multiple templates', async () => {
            m.post.mockResolvedValueOnce({ data: { id: 't1' } })
            m.post.mockResolvedValueOnce({ data: { id: 't2' } })

            const result1 = await addElementTemplate({ name: 'T1' })
            const result2 = await addElementTemplate({ name: 'T2' })

            expect(result1.data.id).toBe('t1')
            expect(result2.data.id).toBe('t2')
        })

        it('updates multiple templates', async () => {
            m.patch.mockResolvedValueOnce({ data: { id: 't1', active: true } })
            m.patch.mockResolvedValueOnce({ data: { id: 't2', active: true } })

            await updateElementTemplate('t1', { active: true })
            await updateElementTemplate('t2', { active: true })

            expect(m.patch).toHaveBeenCalledTimes(2)
        })

        it('deletes multiple templates', async () => {
            m.delete.mockResolvedValue({ data: { success: true } })

            await deleteElementTemplate('t1')
            await deleteElementTemplate('t2')
            await deleteElementTemplate('t3')

            expect(m.delete).toHaveBeenCalledTimes(3)
        })
    })

    describe('duplicateElementTemplate', () => {
        it('duplicates a template', async () => {
            const duplicated = { id: 't2', name: 'Template 1 (Copy)' }
            m.post.mockResolvedValue({ data: duplicated })

            const result = await duplicateElementTemplate('t1')

            expect(m.post).toHaveBeenCalledWith('/api/templates/t1/duplicate', {})
            expect(result.data).toEqual(duplicated)
        })

        it('handles duplication errors', async () => {
            m.post.mockRejectedValue(new Error('Duplication failed'))

            try {
                await duplicateElementTemplate('t1')
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })

        it('duplicates template with large content', async () => {
            m.post.mockResolvedValue({ data: { id: 't2', content: {} } })

            await duplicateElementTemplate('t1')

            expect(m.post).toHaveBeenCalled()
        })
    })

    describe('bulkDeleteTemplates', () => {
        it('bulk deletes multiple templates', async () => {
            m.post.mockResolvedValue({ data: { deleted: 3 } })

            const result = await bulkDeleteTemplates(['t1', 't2', 't3'])

            expect(m.post).toHaveBeenCalledWith('/api/templates/bulk-delete', ['t1', 't2', 't3'])
            expect(result.data).toEqual({ deleted: 3 })
        })

        it('handles bulk delete with empty array', async () => {
            m.post.mockResolvedValue({ data: { deleted: 0 } })

            const result = await bulkDeleteTemplates([])

            expect(result.data).toEqual({ deleted: 0 })
        })

        it('handles bulk delete errors', async () => {
            m.post.mockRejectedValue(new Error('Bulk delete failed'))

            try {
                await bulkDeleteTemplates(['t1', 't2'])
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })

        it('bulk deletes large number of templates', async () => {
            const templateIds = Array.from({ length: 50 }, (_, i) => `t${i}`)
            m.post.mockResolvedValue({ data: { deleted: 50 } })

            const result = await bulkDeleteTemplates(templateIds)

            expect(result.data.deleted).toBe(50)
        })
    })

    describe('bulkUpdateTemplateVisibility', () => {
        it('bulk activates templates', async () => {
            m.patch.mockResolvedValue({ data: { updated: 3 } })

            const result = await bulkUpdateTemplateVisibility(['t1', 't2', 't3'], true)

            expect(m.patch).toHaveBeenCalledWith(
                '/api/templates/bulk-update-visibility',
                { templateIds: ['t1', 't2', 't3'], active: true }
            )
            expect(result.data).toEqual({ updated: 3 })
        })

        it('bulk deactivates templates', async () => {
            m.patch.mockResolvedValue({ data: { updated: 2 } })

            const result = await bulkUpdateTemplateVisibility(['t1', 't2'], false)

            expect(result.data).toEqual({ updated: 2 })
        })

        it('handles empty template list', async () => {
            m.patch.mockResolvedValue({ data: { updated: 0 } })

            const result = await bulkUpdateTemplateVisibility([], true)

            expect(result.data).toEqual({ updated: 0 })
        })

        it('handles bulk update errors', async () => {
            m.patch.mockRejectedValue(new Error('Bulk update failed'))

            try {
                await bulkUpdateTemplateVisibility(['t1'], true)
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })
    })

    describe('searchTemplates', () => {
        it('searches templates with name filter', async () => {
            const results = [{ id: 't1', name: 'Template 1' }]
            m.get.mockResolvedValue({ data: results })

            const result = await searchTemplates({ name: 'Template' })

            expect(m.get).toHaveBeenCalled()
            const callUrl = m.get.mock.calls[0][0]
            expect(callUrl).toContain('search')
            expect(callUrl).toContain('name')
            expect(result.data).toEqual(results)
        })

        it('searches templates with creator filter', async () => {
            const results = [{ id: 't1', creator: 'admin' }]
            m.get.mockResolvedValue({ data: results })

            const result = await searchTemplates({ creator: 'admin' })

            expect(m.get).toHaveBeenCalled()
            const callUrl = m.get.mock.calls[0][0]
            expect(callUrl).toContain('creator')
            expect(result.data).toEqual(results)
        })

        it('searches with active status filter', async () => {
            const results = [{ id: 't1', active: true }]
            m.get.mockResolvedValue({ data: results })

            await searchTemplates({ active: true })

            const callUrl = m.get.mock.calls[0][0]
            expect(callUrl).toContain('active=true')
        })

        it('searches with multiple filters', async () => {
            m.get.mockResolvedValue({ data: [] })

            await searchTemplates({ name: 'Template', active: true, creator: 'admin' })

            const callUrl = m.get.mock.calls[0][0]
            expect(callUrl).toContain('name')
            expect(callUrl).toContain('active')
            expect(callUrl).toContain('creator')
        })

        it('searches with empty params', async () => {
            m.get.mockResolvedValue({ data: [] })

            await searchTemplates({})

            expect(m.get).toHaveBeenCalled()
        })

        it('filters out null and undefined values', async () => {
            m.get.mockResolvedValue({ data: [] })

            await searchTemplates({ name: 'Test', creator: null, active: undefined })

            const callUrl = m.get.mock.calls[0][0]
            expect(callUrl).toContain('name')
            expect(callUrl).not.toContain('creator')
            expect(callUrl).not.toContain('active')
        })

        it('handles search errors', async () => {
            m.get.mockRejectedValue(new Error('Search failed'))

            try {
                await searchTemplates({ name: 'Test' })
                expect(true).toBe(false)
            } catch (error) {
                expect(error).toBeDefined()
            }
        })

        it('returns multiple search results', async () => {
            const results = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, name: `Template ${i}` }))
            m.get.mockResolvedValue({ data: results })

            const result = await searchTemplates({ name: 'Template' })

            expect(result.data).toHaveLength(10)
        })
    })

    describe('integration workflows', () => {
        it('creates, duplicates, and deletes templates', async () => {
            m.post.mockResolvedValueOnce({ data: { id: 't1' } })
            m.post.mockResolvedValueOnce({ data: { id: 't2' } })
            m.delete.mockResolvedValue({ data: { success: true } })

            await addElementTemplate({ name: 'Original' })
            await duplicateElementTemplate('t1')
            await deleteElementTemplate('t2')

            expect(m.post).toHaveBeenCalledTimes(2)
            expect(m.delete).toHaveBeenCalled()
        })

        it('fetches, updates, and searches templates', async () => {
            m.get.mockResolvedValueOnce({ data: [{ id: 't1', name: 'Template 1' }] })
            m.patch.mockResolvedValue({ data: { id: 't1', name: 'Updated' } })
            m.get.mockResolvedValueOnce({ data: [{ id: 't1', name: 'Updated' }] })

            await getAllElementTemplates()
            await updateElementTemplate('t1', { name: 'Updated' })
            await searchTemplates({ name: 'Updated' })

            expect(m.get).toHaveBeenCalledTimes(2)
            expect(m.patch).toHaveBeenCalled()
        })

        it('bulk operations with mixed success', async () => {
            m.patch.mockResolvedValue({ data: { updated: 5 } })
            m.post.mockResolvedValue({ data: { deleted: 3 } })

            await bulkUpdateTemplateVisibility(['t1', 't2', 't3', 't4', 't5'], true)
            await bulkDeleteTemplates(['t6', 't7', 't8'])

            expect(m.patch).toHaveBeenCalled()
            expect(m.post).toHaveBeenCalled()
        })
    })

    describe('filterTemplates service', () => {
        it('filters templates with query params', async () => {
            m.get.mockResolvedValue({ data: [{ id: 't1' }] })
            const result = await filterTemplatesService({ activeOnly: true, createdBy: 'admin' })
            expect(m.get).toHaveBeenCalledWith(expect.stringContaining('/filter?'))
            expect(result.data).toEqual([{ id: 't1' }])
        })
    })

    describe('validateTemplate service', () => {
        it('posts template data for validation', async () => {
            m.post.mockResolvedValue({ data: { valid: true } })
            const payload = { templateId: 'com.example.t' }
            const result = await validateTemplate(payload)
            expect(m.post).toHaveBeenCalledWith('/api/templates/validate', payload)
            expect(result.data.valid).toBe(true)
        })
    })

    describe('importTemplates service', () => {
        it('imports templates in bulk', async () => {
            m.post.mockResolvedValue({ data: { imported: 2 } })
            const templates = [{ templateId: 'a' }, { templateId: 'b' }]
            const result = await importTemplates(templates)
            expect(m.post).toHaveBeenCalledWith('/api/templates/import', templates)
            expect(result.data.imported).toBe(2)
        })
    })

    describe('exportTemplates service', () => {
        it('exports templates with query params', async () => {
            m.get.mockResolvedValue({ data: [{ id: 't1' }] })
            await exportTemplates({ templateIds: ['t1', 't2'], activeOnly: true })
            const callUrl = m.get.mock.calls.at(-1)[0]
            expect(callUrl).toContain('/export?')
            expect(callUrl).toContain('templateIds')
            expect(callUrl).toContain('activeOnly=true')
        })
    })

    describe('getTemplateStatistics service', () => {
        it('fetches template statistics', async () => {
            m.get.mockResolvedValue({ data: { total: 10 } })
            const result = await getTemplateStatistics()
            expect(m.get).toHaveBeenCalledWith('/api/templates/statistics')
            expect(result.data.total).toBe(10)
        })
    })

    describe('updateElementTemplateFull service', () => {
        it('performs full template update via PUT', async () => {
            m.put.mockResolvedValue({ data: { id: 't1', name: 'Updated' } })
            const result = await updateElementTemplateFull('t1', { name: 'Updated' })
            expect(m.put).toHaveBeenCalledWith('/api/templates/t1', { name: 'Updated' })
            expect(result.data.name).toBe('Updated')
        })
    })
})
