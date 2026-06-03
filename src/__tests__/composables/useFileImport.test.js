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
import { ref } from 'vue'

// --- mocks (hoisted so the vi.mock factories can reference them) ---
const m = vi.hoisted(() => ({
    saveDiagramProcess: vi.fn(),
    updateDiagramProcess: vi.fn(),
    getUnifiedDiagrams: vi.fn(),
    saveForm: vi.fn(),
    updateForm: vi.fn(),
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k, p) => (p ? `${k}` : k) }) }))
vi.mock('../../services/processService.js', () => ({
    saveDiagramProcess: m.saveDiagramProcess,
    updateDiagramProcess: m.updateDiagramProcess,
    getUnifiedDiagrams: m.getUnifiedDiagrams,
}))
vi.mock('../../services/formService.js', () => ({
    saveForm: m.saveForm,
    updateForm: m.updateForm,
}))

import useFileImport from '../../composables/useFileImport.js'

// --- fixtures ---
const bpmn = id =>
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">` +
    `<bpmn:process id="${id}"><bpmn:startEvent id="Start_1"/></bpmn:process></bpmn:definitions>`

const form = (id, components = []) => JSON.stringify({ type: 'default', id, components, schemaVersion: 19 })

function fileEvent(files) {
    return { target: { files: files.map(f => new File([f.content], f.name, { type: 'text/plain' })) } }
}

function makeDeps(overrides = {}) {
    return {
        store: {
            state: { modeler: { processes: { processSelected: null }, forms: { formSelected: null } } },
            dispatch: vi.fn().mockResolvedValue(undefined),
        },
        tabNavList: ref([]),
        tabNavListXml: ref([]),
        editorXML: ref([]),
        processes: ref([]),
        forms: ref([]),
        showToastMessage: vi.fn(),
        openDiagramFromChild: vi.fn(),
        showModalAcceptCancelMessage: ref({ show: false, type: 'bpmn' }),
        modalData: ref({}),
        modelerTabNav: ref({ selectTab: vi.fn() }),
        switchTabFromTabNav: vi.fn(),
        onBatchComplete: vi.fn().mockResolvedValue(undefined),
        nextModalHiddenPromise: () => Promise.resolve(),
        updateDiagramXml: vi.fn(),
        ...overrides,
    }
}

const waitForModal = deps => vi.waitFor(() => expect(deps.showModalAcceptCancelMessage.value.show).toBe(true))

describe('useFileImport', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        m.getUnifiedDiagrams.mockResolvedValue([])
        m.saveDiagramProcess.mockResolvedValue({ id: 'new-id' })
        m.updateDiagramProcess.mockResolvedValue({})
        m.saveForm.mockResolvedValue({ id: 'new-form-id' })
        m.updateForm.mockResolvedValue({})
    })

    describe('process import', () => {
        it('saves a brand-new process (no conflict)', async () => {
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)
            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(m.saveDiagramProcess).toHaveBeenCalledOnce()
            expect(deps.showModalAcceptCancelMessage.value.show).toBe(false)
        })

        it('shows a conflict and updates on replace', async () => {
            const deps = makeDeps()
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA' }]
            deps.store.state.modeler.processes.processSelected = bpmn('procA-OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))
            await waitForModal(deps)
            resolveConflict('replace')
            await p

            expect(m.updateDiagramProcess).toHaveBeenCalledOnce()
            expect(m.saveDiagramProcess).not.toHaveBeenCalled()
        })

        it('does not update on skip', async () => {
            const deps = makeDeps()
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA' }]
            deps.store.state.modeler.processes.processSelected = bpmn('procA-OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))
            await waitForModal(deps)
            resolveConflict('skip')
            await p

            expect(m.updateDiagramProcess).not.toHaveBeenCalled()
            expect(m.saveDiagramProcess).not.toHaveBeenCalled()
        })

        it('saves under the new key with rewritten id on rename', async () => {
            const deps = makeDeps()
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA' }]
            deps.store.state.modeler.processes.processSelected = bpmn('procA-OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))
            await waitForModal(deps)
            resolveConflict('rename', false, { newKey: 'procRenamed' })
            await p

            expect(m.saveDiagramProcess).toHaveBeenCalledOnce()
            const [key, , blob, type] = m.saveDiagramProcess.mock.calls[0]
            expect(key).toBe('procRenamed')
            expect(type).toBe('bpmn-c7')
            const xmlText = await blob.text()
            expect(xmlText).toContain('id="procRenamed"')
            expect(m.updateDiagramProcess).not.toHaveBeenCalled()
        })

        it('treats identical content as unchanged (no modal)', async () => {
            const deps = makeDeps()
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA' }]
            deps.store.state.modeler.processes.processSelected = bpmn('procA')
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(deps.showModalAcceptCancelMessage.value.show).toBe(false)
            expect(m.updateDiagramProcess).not.toHaveBeenCalled()
            expect(deps.openDiagramFromChild).toHaveBeenCalledOnce()
        })

        it('detects a conflict for a process not on the current page via DB lookup', async () => {
            const deps = makeDeps()
            // not in the loaded processes list...
            deps.processes.value = []
            // ...but the targeted DB lookup finds it
            m.getUnifiedDiagrams.mockResolvedValue([{ id: 'db9', name: 'Proc A', processkey: 'procA' }])
            deps.store.state.modeler.processes.processSelected = bpmn('procA-OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))
            await waitForModal(deps)
            resolveConflict('replace')
            await p

            expect(m.getUnifiedDiagrams).toHaveBeenCalled()
            expect(m.updateDiagramProcess).toHaveBeenCalledOnce()
        })
    })

    describe('form import', () => {
        it('saves a brand-new form (no conflict)', async () => {
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)
            await handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))

            expect(m.saveForm).toHaveBeenCalledOnce()
            expect(deps.showModalAcceptCancelMessage.value.show).toBe(false)
        })

        it('shows a conflict and updates on replace (different content)', async () => {
            const deps = makeDeps()
            deps.forms.value = [{ id: 'fdb', formId: 'formA' }]
            deps.store.state.modeler.forms.formSelected = form('formA', [{ type: 'textfield' }])
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))
            await waitForModal(deps)
            resolveConflict('replace')
            await p

            expect(m.updateForm).toHaveBeenCalledOnce()
        })

        it('treats identical form content as unchanged even when double-encoded in the store', async () => {
            const deps = makeDeps()
            deps.forms.value = [{ id: 'fdb', formId: 'formA' }]
            // Store double-encodes formSelected; canonical comparison must see through it.
            deps.store.state.modeler.forms.formSelected = JSON.stringify(form('formA'))
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))

            expect(deps.showModalAcceptCancelMessage.value.show).toBe(false)
            expect(m.updateForm).not.toHaveBeenCalled()
        })
    })

    describe('batch import', () => {
        it('applies "replace all" to subsequent conflicts without re-prompting', async () => {
            const deps = makeDeps()
            deps.processes.value = [
                { id: '1', name: 'A', processkey: 'procA' },
                { id: '2', name: 'B', processkey: 'procB' },
            ]
            deps.store.state.modeler.processes.processSelected = bpmn('OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([
                { name: 'a.bpmn', content: bpmn('procA') },
                { name: 'b.bpmn', content: bpmn('procB') },
            ]))
            await waitForModal(deps)
            resolveConflict('replace', true) // apply to all
            await p

            expect(m.updateDiagramProcess).toHaveBeenCalledTimes(2)
        })

        it('"cancel remaining" stops the batch without processing further files', async () => {
            const deps = makeDeps()
            deps.processes.value = [
                { id: '1', name: 'A', processkey: 'procA' },
                { id: '2', name: 'B', processkey: 'procB' },
            ]
            deps.store.state.modeler.processes.processSelected = bpmn('OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([
                { name: 'a.bpmn', content: bpmn('procA') },
                { name: 'b.bpmn', content: bpmn('procB') },
            ]))
            await waitForModal(deps)
            resolveConflict('stop', true)
            await p

            expect(m.updateDiagramProcess).not.toHaveBeenCalled()
        })
    })

    describe('invalid files', () => {
        it('rejects unsupported extensions with an error toast', async () => {
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)
            await handleFile(fileEvent([{ name: 'notes.txt', content: 'hello' }]))

            expect(m.saveDiagramProcess).not.toHaveBeenCalled()
            expect(deps.showToastMessage).toHaveBeenCalledWith(
                expect.objectContaining({ isSuccess: false, toastText: 'toastLoadErrorFileExtension' })
            )
        })
    })
})
