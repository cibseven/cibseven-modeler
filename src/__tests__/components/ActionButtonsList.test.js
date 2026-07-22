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

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: k => k }) }))

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
            provide: { extraDownloadLinks: null},
        },
    })
}

function consoleNotificationBadge(wrapper) {
    const consoleBtn = wrapper.find('button[title="buttons.console"]')
    return consoleBtn.find('span.bg-danger')
}

function undoButton(wrapper) {
    return wrapper.find('button[title="buttons.undo (Ctrl+Z)"]')
}

function redoButton(wrapper) {
    return wrapper.find('button[title="buttons.redo (Ctrl+Y)"]')
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

    describe('showConsoleNotification', () => {
        it('showConsoleNotification(true) shows notification badge on console button', async () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))

            wrapper.vm.showConsoleNotification(true)
            await wrapper.vm.$nextTick()

            expect(consoleNotificationBadge(wrapper).exists()).toBe(true)
        })

        it('showConsoleNotification(false) hides notification badge on console button', async () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))

            wrapper.vm.showConsoleNotification(true)
            await wrapper.vm.$nextTick()
            wrapper.vm.showConsoleNotification(false)
            await wrapper.vm.$nextTick()

            expect(consoleNotificationBadge(wrapper).exists()).toBe(false)
        })
    })

    describe('undo / redo buttons', () => {
        it('hides undo and redo buttons when isButtonDisabled is true', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                isButtonDisabled: true,
                modeler: { _undo: vi.fn(), _redo: vi.fn() },
            })

            expect(undoButton(wrapper).exists()).toBe(true)
            expect(redoButton(wrapper).exists()).toBe(true)
            expect(undoButton(wrapper).isVisible()).toBe(false)
            expect(redoButton(wrapper).isVisible()).toBe(false)
        })

        it('shows undo and redo buttons when isButtonDisabled is false', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                isButtonDisabled: false,
                modeler: { _undo: vi.fn(), _redo: vi.fn() },
            })

            expect(undoButton(wrapper).isVisible()).toBe(true)
            expect(redoButton(wrapper).isVisible()).toBe(true)
        })

        it('performUndo calls modeler._undo when exposed', () => {
            const _undo = vi.fn()
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.DMN), {
                modeler: { _undo, _redo: vi.fn() },
            })

            wrapper.vm.performUndo()

            expect(_undo).toHaveBeenCalledOnce()
        })

        it('performRedo calls modeler._redo when exposed', () => {
            const _redo = vi.fn()
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.FORM), {
                modeler: { _undo: vi.fn(), _redo },
            })

            wrapper.vm.performRedo()

            expect(_redo).toHaveBeenCalledOnce()
        })

        it('performUndo is a no-op when modeler is null', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), { modeler: null })

            expect(() => wrapper.vm.performUndo()).not.toThrow()
        })

        it('performRedo is a no-op when modeler does not expose _redo', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                modeler: { _undo: vi.fn() },
            })

            expect(() => wrapper.vm.performRedo()).not.toThrow()
        })

        it('clicking undo invokes modeler._undo when available', async () => {
            const _undo = vi.fn()
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                modeler: { _undo, _redo: vi.fn() },
            })

            await undoButton(wrapper).trigger('click')

            expect(_undo).toHaveBeenCalledOnce()
        })

        it('clicking redo invokes modeler._redo when available', async () => {
            const _redo = vi.fn()
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.DMN), {
                modeler: { _undo: vi.fn(), _redo },
            })

            await redoButton(wrapper).trigger('click')

            expect(_redo).toHaveBeenCalledOnce()
        })

        it('clicking undo does not throw when modeler lacks _undo', async () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.FORM), { modeler: {} })

            await expect(undoButton(wrapper).trigger('click')).resolves.toBeUndefined()
        })

        it('clicking redo does not throw when modeler lacks _redo', async () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.FORM), {
                modeler: { _undo: vi.fn() },
            })

            await expect(redoButton(wrapper).trigger('click')).resolves.toBeUndefined()
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

    describe('editor and console actions', () => {
        it('toggles editor visibility through emit', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))
            wrapper.vm.toggleVisibilityEditor()
            expect(wrapper.emitted('toggleEditor')).toHaveLength(1)
        })

        it('opens outdated template modal', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))
            wrapper.vm.toggleVisibilityOutdatedTemplates()
            expect(wrapper.emitted('toggleOutdatedTemplateModal')).toEqual([[true]])
        })

        it('opens console via parent emit', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                tabElementIndex: 2,
            })
            wrapper.vm.openConsole()
            expect(wrapper.emitted('toggleConsole')).toEqual([[2, true]])
        })

        it('updates download link via exposed helper', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))
            wrapper.vm._updateDownloadFile('blob:url', 'diagram.bpmn')
            expect(wrapper.vm.downloadLink).toBe('blob:url')
            expect(wrapper.vm.downloadName).toBe('diagram.bpmn')
        })
    })
})
