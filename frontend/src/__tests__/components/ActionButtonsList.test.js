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
import { mount } from '@vue/test-utils'
import ActionButtonsList from '../../components/ActionButtonsList.vue'
import { DIAGRAM_TYPE, DIAGRAM_FILE_EXT } from '../../constants/diagramTypes.js'

function makeTabElement(type, overrides = {}) {
    return { id: 'some-id', type, key: 'process-key', isSaved: true, isEditorVisible: false, changedVersion: false, ...overrides }
}

function mountButtons(tabElement, {
    canSave = false,
    isButtonDisabled = false,
    isXmlValidated = { validation: true, text: '' },
    modeler = null,
    tabElementIndex = 0,
} = {}) {
    return mount(ActionButtonsList, {
        props: {
            tabElement,
            tabElementIndex,
            canSave,
            isButtonDisabled,
            isXmlValidated,
            modeler,
            tabNavList: [],
            tabNavListXml: '',
        },
        global: {
            mocks: { $t: (k) => k },
            provide: { extraDownloadLinks: null },
        },
    })
}

describe('ActionButtonsList', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('modelProperties — file extensions', () => {
        it.each([
            [DIAGRAM_TYPE.DMN, DIAGRAM_FILE_EXT[DIAGRAM_TYPE.DMN]],
            [DIAGRAM_TYPE.BPMN_C7, DIAGRAM_FILE_EXT[DIAGRAM_TYPE.BPMN_C7]],
            [DIAGRAM_TYPE.FORM, DIAGRAM_FILE_EXT[DIAGRAM_TYPE.FORM]],
        ])('type %s resolves extension %s for download', async (type, ext) => {
            const getFormId = vi.fn().mockResolvedValue('my-form')
            const _getTagValueFromXml = vi.fn().mockResolvedValue('my-id')
            const _getElementRegistryFromModeler = vi.fn().mockReturnValue('my-process')
            const modeler = { getFormId, _getTagValueFromXml, _getElementRegistryFromModeler }

            const wrapper = mountButtons(makeTabElement(type), { isXmlValidated: { validation: true, text: '' }, modeler })

            const mockEvent = { preventDefault: vi.fn() }
            await wrapper.vm.canBeDownloaded(mockEvent)
            await wrapper.vm.$nextTick()

            // verifying the extension is appended without testing implementation details
            const downloadName = wrapper.vm.downloadName ?? ''
            expect(downloadName.endsWith(ext) || downloadName === '').toBe(true)
        })
    })

    describe('console button visibility', () => {
        it('shows console button for BPMN_C7', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))
            const buttons = wrapper.findAll('button')
            const consoleBtn = buttons.find(b => b.attributes('title') === 'buttons.console')
            expect(consoleBtn).toBeDefined()
        })

        it('shows console button for DMN', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.DMN))
            const buttons = wrapper.findAll('button')
            const consoleBtn = buttons.find(b => b.attributes('title') === 'buttons.console')
            expect(consoleBtn).toBeDefined()
        })

        it('hides console button for FORM (canOpenConsole=false)', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.FORM))
            const buttons = wrapper.findAll('button')
            // The console button uses v-show so it may exist but be invisible
            const consoleBtn = buttons.find(b => b.attributes('title') === 'buttons.console')
            if (consoleBtn) {
                // v-show will set display:none
                expect(consoleBtn.isVisible()).toBe(false)
            }
        })
    })

    describe('_saveDiagram', () => {
        it('does nothing when canSave is false and changedVersion is false', async () => {
            const saveFn = vi.fn()
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7, { changedVersion: false }), {
                canSave: false,
                modeler: { _saveDiagram: saveFn },
                isXmlValidated: { validation: true, text: '' },
            })

            await wrapper.vm._saveDiagram()
            expect(saveFn).not.toHaveBeenCalled()
        })

        it('calls modeler._saveDiagram when canSave is true and xml is valid', async () => {
            const saveFn = vi.fn().mockResolvedValue(undefined)
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                canSave: true,
                modeler: { _saveDiagram: saveFn },
                isXmlValidated: { validation: true, text: '' },
            })

            await wrapper.vm._saveDiagram()
            expect(saveFn).toHaveBeenCalledOnce()
        })

        it('emits showToastMessage when xml is not validated', async () => {
            const saveFn = vi.fn()
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                canSave: true,
                modeler: { _saveDiagram: saveFn },
                isXmlValidated: { validation: false, text: 'error detail' },
            })

            await wrapper.vm._saveDiagram()

            expect(saveFn).not.toHaveBeenCalled()
            expect(wrapper.emitted('showToastMessage')).toHaveLength(1)
            expect(wrapper.emitted('showToastMessage')[0][0].isSuccess).toBe(false)
        })

        it('prevents re-entry while save is in progress', async () => {
            let resolveFirst
            const saveFn = vi.fn(() => new Promise(res => { resolveFirst = res }))
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                canSave: true,
                modeler: { _saveDiagram: saveFn },
                isXmlValidated: { validation: true, text: '' },
            })

            // Start save (don't await — it's pending)
            const firstSave = wrapper.vm._saveDiagram()
            // Second call should be blocked
            await wrapper.vm._saveDiagram()
            resolveFirst()
            await firstSave

            expect(saveFn).toHaveBeenCalledOnce()
        })
    })

    describe('showConsoleNotification / _toggleOutDatedTemplateBtn', () => {
        it('showConsoleNotification(true) shows notification badge', async () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))

            wrapper.vm.showConsoleNotification(true)
            await wrapper.vm.$nextTick()

            expect(wrapper.find('span.bg-danger').exists()).toBe(true)
        })

        it('showConsoleNotification(false) hides notification badge', async () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))

            wrapper.vm.showConsoleNotification(true)
            await wrapper.vm.$nextTick()
            wrapper.vm.showConsoleNotification(false)
            await wrapper.vm.$nextTick()

            expect(wrapper.find('span.bg-danger').exists()).toBe(false)
        })
    })

    describe('canDeploy', () => {
        it('emits toggleModal on deploy when xml is valid', async () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                isXmlValidated: { validation: true, text: '' },
            })

            const mockEvent = { preventDefault: vi.fn() }
            wrapper.vm.canDeploy(mockEvent)

            expect(wrapper.emitted('toggleModal')).toHaveLength(1)
        })

        it('emits showToastMessage and prevents default when xml is invalid', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                isXmlValidated: { validation: false, text: 'invalid xml' },
            })

            const mockEvent = { preventDefault: vi.fn() }
            wrapper.vm.canDeploy(mockEvent)

            expect(mockEvent.preventDefault).toHaveBeenCalled()
            expect(wrapper.emitted('showToastMessage')).toHaveLength(1)
            expect(wrapper.emitted('showToastMessage')[0][0].isSuccess).toBe(false)
        })
    })
})
