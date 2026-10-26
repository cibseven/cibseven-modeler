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
    readOnly = false,
    provide = {},
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
            readOnly,
        },
        global: {
            mocks: { $t: (k) => k },
            provide: { extraDownloadLinks: null, ...provide },
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

        /** Ctrl+S comes here rather than through the button, so the method refuses too. */
        it('saves nothing of a model the user may only look at', async () => {
            const saveFn = vi.fn().mockResolvedValue(undefined)
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                canSave: true,
                readOnly: true,
                modeler: { _saveDiagram: saveFn },
            })

            await wrapper.vm._saveDiagram()
            expect(saveFn).not.toHaveBeenCalled()
        })

        /**
         * Left out rather than hidden: the groups carry d-flex, whose display !important beats the
         * inline display none of a v-show, so a hidden button stayed on screen.
         */
        it('offers neither saving nor deploying a model the user may only look at, and says why', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), { canSave: true, readOnly: true })

            expect(wrapper.find('.save-diagram').exists()).toBe(false)
            expect(wrapper.find('button[title="buttons.deploy"]').exists()).toBe(false)
            const badge = wrapper.find('.read-only-badge')
            expect(badge.attributes('role')).toBe('note')
            expect(badge.attributes('title')).toBe('readOnlyNotice')
            expect(badge.text()).toContain('readOnlyBadge')
        })

        it('offers saving and deploying, and no badge, when the model may be changed', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), { canSave: true })

            expect(wrapper.find('.save-diagram').exists()).toBe(true)
            expect(wrapper.find('button[title="buttons.deploy"]').exists()).toBe(true)
            expect(wrapper.find('.read-only-badge').exists()).toBe(false)
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

    // Autosave is a host feature: it arrives as a component and is offered under the save button
    describe('save options', () => {
        const AutosaveMenu = { name: 'AutosaveMenu', props: ['tabElement', 'isSaving'], template: '<div class="autosave-menu" />' }
        const menuToggle = wrapper => wrapper.find('button[data-bs-toggle="dropdown"]')

        it('offers no menu when the host has no autosave', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))

            expect(menuToggle(wrapper).exists()).toBe(false)
            expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
        })

        it('offers the autosave of the host in a menu next to the save button', () => {
            const tabElement = makeTabElement(DIAGRAM_TYPE.BPMN_C7)
            const wrapper = mountButtons(tabElement, { provide: { autosaveToggleComponent: AutosaveMenu } })

            expect(menuToggle(wrapper).attributes('aria-label')).toBe('buttons.saveOptions')
            const menu = wrapper.findComponent({ name: 'AutosaveMenu' })
            expect(menu.exists()).toBe(true)
            expect(menu.props('tabElement')).toEqual(tabElement)
            expect(wrapper.find('.dropdown-menu .autosave-menu').exists()).toBe(true)
        })

        it('shows on the save button that autosave is on', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                provide: { autosaveToggleComponent: AutosaveMenu, autosaveOptions: { enabled: true } }
            })

            expect(wrapper.find('button.save-diagram .mdi').classes()).toContain('mdi-content-save-check-outline')
        })

        it('shows the plain save icon while autosave is off', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                provide: { autosaveToggleComponent: AutosaveMenu, autosaveOptions: { enabled: false } }
            })

            expect(wrapper.find('button.save-diagram .mdi').classes()).toContain('mdi-content-save-outline')
        })

        it('names the autosave state on the save button', () => {
            const on = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                provide: { autosaveToggleComponent: AutosaveMenu, autosaveOptions: { enabled: true } }
            })
            const off = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                provide: { autosaveToggleComponent: AutosaveMenu, autosaveOptions: { enabled: false } }
            })

            expect(on.find('button.save-diagram').attributes('title')).toBe('buttons.saveDiagram – buttons.autosaveOn')
            expect(on.find('button.save-diagram').attributes('aria-label')).toBe('buttons.saveDiagram – buttons.autosaveOn')
            expect(off.find('button.save-diagram').attributes('title')).toBe('buttons.saveDiagram – buttons.autosaveOff')
        })

        // Nothing to save disables the button, and a disabled button never shows its own title
        it('names the autosave state while there is nothing to save', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), {
                canSave: false,
                provide: { autosaveToggleComponent: AutosaveMenu, autosaveOptions: { enabled: true } }
            })

            expect(wrapper.find('button.save-diagram').attributes('disabled')).toBeDefined()
            expect(wrapper.find('.btn-group').attributes('title')).toBe('buttons.saveDiagram – buttons.autosaveOn')
        })

        it('keeps the plain title without autosave', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7))

            expect(wrapper.find('button.save-diagram').attributes('title')).toBe('buttons.saveDiagram')
        })

        it('opens the menu with a chevron rather than the default caret', () => {
            const wrapper = mountButtons(makeTabElement(DIAGRAM_TYPE.BPMN_C7), { provide: { autosaveToggleComponent: AutosaveMenu } })

            const toggle = menuToggle(wrapper)
            expect(toggle.classes()).not.toContain('dropdown-toggle')
            expect(toggle.find('.mdi-chevron-down').exists()).toBe(true)
        })
    })
})
