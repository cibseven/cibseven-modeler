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
    fetchProcessByKey: vi.fn(),
    fetchFormByFormId: vi.fn(),
    saveForm: vi.fn(),
    updateForm: vi.fn(),
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k, p) => (p ? `${k} ${JSON.stringify(p)}` : k) }) }))
vi.mock('../../services/processService.js', () => ({
    saveDiagramProcess: m.saveDiagramProcess,
    updateDiagramProcess: m.updateDiagramProcess,
    fetchProcessByKey: m.fetchProcessByKey,
}))
vi.mock('../../services/formService.js', () => ({
    saveForm: m.saveForm,
    updateForm: m.updateForm,
    fetchFormByFormId: m.fetchFormByFormId,
}))

import useFileImport from '../../composables/useFileImport.js'

// --- fixtures ---
const dmn = id => {
    const idAttr = id ? ` id="${id}"` : ''
    return (
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<definitions${idAttr} xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" namespace="http://camunda.org/schema/1.0/dmn">` +
        `<decision id="Decision_1" name="D"><decisionTable id="dt1"><output id="o1" typeRef="string"/></decisionTable></decision>` +
        `</definitions>`
    )
}

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
        importFolderId: { value: 'general' },
        ...overrides,
    }
}

const notFound = () => Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } })

const waitForModal = deps => vi.waitFor(() => expect(deps.showModalAcceptCancelMessage.value.show).toBe(true))

describe('useFileImport', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // The backend answers an unknown key with a 404, which is the only 'nothing there'
        m.fetchProcessByKey.mockRejectedValue(notFound())
        m.fetchFormByFormId.mockRejectedValue(notFound())
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
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA', folderId: 'general' }]
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
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA', folderId: 'general' }]
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
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA', folderId: 'general' }]
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

        // Before CIB7-2680 the collaboration and the process both got the new key, and the diagram kept the old one
        it('renames only the collaboration of a pool, and its diagram follows', async () => {
            const pooled = '<?xml version="1.0" encoding="UTF-8"?>' +
                '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI">' +
                '<bpmn:collaboration id="procA"><bpmn:participant id="P" processRef="Process_1"/></bpmn:collaboration>' +
                '<bpmn:process id="Process_1"><bpmn:startEvent id="Start_1"/></bpmn:process>' +
                '<bpmndi:BPMNDiagram id="D"><bpmndi:BPMNPlane id="Plane" bpmnElement="procA"/></bpmndi:BPMNDiagram>' +
                '</bpmn:definitions>'
            const deps = makeDeps()
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA', folderId: 'general' }]
            deps.store.state.modeler.processes.processSelected = bpmn('procA-OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: pooled }]))
            await waitForModal(deps)
            resolveConflict('rename', false, { newKey: 'procRenamed' })
            await p

            const xmlText = await m.saveDiagramProcess.mock.calls[0][2].text()
            expect(xmlText).toContain('<bpmn:collaboration id="procRenamed"')
            expect(xmlText).toContain('bpmnElement="procRenamed"')
            expect(xmlText).toContain('<bpmn:process id="Process_1"')
            expect(xmlText).toContain('processRef="Process_1"')
        })

        it('treats identical content as unchanged (no modal)', async () => {
            const deps = makeDeps()
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA', folderId: 'general' }]
            deps.store.state.modeler.processes.processSelected = bpmn('procA')
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(deps.showModalAcceptCancelMessage.value.show).toBe(false)
            expect(m.updateDiagramProcess).not.toHaveBeenCalled()
            expect(deps.openDiagramFromChild).toHaveBeenCalledOnce()
        })

        /**
         * Nothing is stored and nothing is asked, so without a word the import of a file that is
         * already there looks like it went nowhere — least of all into the folder asked for.
         */
        it('says where the model it opened instead is stored', async () => {
            const deps = makeDeps()
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA', folderId: 'general' }]
            deps.store.state.modeler.processes.processSelected = bpmn('procA')
            deps.folderNameFor = folderId => folderId === 'general' ? 'General' : null
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(deps.showToastMessage).toHaveBeenCalledWith(expect.objectContaining({
                isSuccess: true,
                toastText: 'toastImportExists',
                bodyTextAlt: expect.stringContaining('toastImportExists.bodyInFolder'),
            }))
        })

        /**
         * The loaded list may not hold the whole folder, so the backend is asked as well - about the
         * folder the import goes into only, as a key is unique within a folder (CIB7-2277).
         */
        it('detects a conflict for a process of the folder that is not loaded', async () => {
            const deps = makeDeps()
            // not in the loaded processes list...
            deps.processes.value = []
            // ...but it is there, in the folder the import goes into
            m.fetchProcessByKey.mockResolvedValue({ id: 'db9', name: 'Proc A', processkey: 'procA', folderId: 'general' })
            deps.store.state.modeler.processes.processSelected = bpmn('procA-OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))
            await waitForModal(deps)
            resolveConflict('replace')
            await p

            expect(m.fetchProcessByKey).toHaveBeenCalledWith('procA', 'general')
            expect(m.updateDiagramProcess).toHaveBeenCalledOnce()
            expect(deps.modalData.value.folderId).toBe('general')
        })

        /** Two files of the same process may sit side by side in different folders. */
        it('imports a process whose key only another folder has as a new one', async () => {
            const deps = makeDeps()
            deps.processes.value = [{ id: 'db9', name: 'Proc A', processkey: 'procA', folderId: 'archive' }]
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(deps.showModalAcceptCancelMessage.value.show).toBe(false)
            expect(m.saveDiagramProcess).toHaveBeenCalledOnce()
            expect(m.updateDiagramProcess).not.toHaveBeenCalled()
        })

        /** The same key may be open for the model of another folder, whose tab is not the one replaced. */
        it('replaces the stored model without touching the tab of the same key in another folder', async () => {
            const deps = makeDeps()
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA', folderId: 'general' }]
            deps.tabNavList.value = [{ id: 'dbB', key: 'procA', type: 'bpmn-c7', folderId: 'archive', isSaved: true, canSave: true }]
            deps.editorXML.value = [bpmn('procA-edited-in-archive')]
            deps.store.state.modeler.processes.processSelected = bpmn('procA-OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))
            await waitForModal(deps)
            // Compared with what is stored in the folder, not with the other tab's edits
            expect(deps.modalData.value.xmlFromModeler).toBe(bpmn('procA-OLD'))
            resolveConflict('replace')
            await p

            expect(m.updateDiagramProcess).toHaveBeenCalledWith('db1', 'procA', 'procA', expect.anything(), 'bpmn-c7')
            expect(deps.updateDiagramXml).not.toHaveBeenCalled()
            expect(deps.tabNavList.value[0].canSave).toBe(true)
        })

        it('stores a new import although an unsaved tab of another folder has its key', async () => {
            const deps = makeDeps()
            deps.tabNavList.value = [{ id: 'procA', key: 'procA', type: 'bpmn-c7', folderId: 'archive', isSaved: false, canSave: true }]
            deps.editorXML.value = [bpmn('procA-draft')]
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(deps.showModalAcceptCancelMessage.value.show).toBe(false)
            expect(m.saveDiagramProcess).toHaveBeenCalledOnce()
            // The draft of the other folder stays a draft
            expect(deps.tabNavList.value[0].isSaved).toBe(false)
        })

        /** The dialog has to say where it found it, now that "the modeler" is more than one place. */
        it('names the folder the existing diagram lives in', async () => {
            const deps = makeDeps()
            deps.processes.value = []
            deps.folderNameFor = folderId => (folderId === 'general' ? 'General' : null)
            m.fetchProcessByKey.mockResolvedValue({ id: 'db9', name: 'Proc A', processkey: 'procA', folderId: 'general' })
            deps.store.state.modeler.processes.processSelected = bpmn('procA-OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))
            await waitForModal(deps)

            expect(deps.modalData.value.folderName).toBe('General')
            resolveConflict('skip')
            await p
        })

        /** A near match is not a conflict: the unique constraint is on the exact key. */
        it('treats a process whose key merely resembles another as new', async () => {
            const deps = makeDeps()
            deps.processes.value = []
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(m.fetchProcessByKey).toHaveBeenCalledWith('procA', 'general')
            expect(m.saveDiagramProcess).toHaveBeenCalledOnce()
            expect(deps.showModalAcceptCancelMessage.value.show).toBe(false)
        })

        /** An import opens a tab and is stored on save, so the tab has to remember the folder. */
        it('opens the tab in the folder the import was started from', async () => {
            const deps = makeDeps()
            deps.importFolderId = { value: 'invoicing' }
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(deps.tabNavList.value.at(-1).folderId).toBe('invoicing')
        })

        /** A definition opened from Cockpit names the folder its tab is saved into. */
        it('opens a new tab in the folder its caller names', () => {
            const deps = makeDeps()
            deps.importFolderId = { value: 'invoicing' }
            const { _addNewBpmnFromLoadedXml } = useFileImport(deps)

            _addNewBpmnFromLoadedXml('bpmn-c7', bpmn('procA'), 'procA', true, 'home')

            expect(deps.tabNavList.value.at(-1)).toMatchObject({ key: 'procA', folderId: 'home', isSaved: false })
        })
    })

    describe('before anything has been loaded', () => {
        /**
         * The store starts at null and stays there where nothing was fetched, such as the top
         * level, which holds folders only. Reading .find off it took the whole import down.
         */
        it('imports a process when the loaded list is still null', async () => {
            const deps = makeDeps()
            deps.processes.value = null
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(m.saveDiagramProcess).toHaveBeenCalledOnce()
            expect(deps.showToastMessage).not.toHaveBeenCalled()
        })

        it('imports a form when the loaded list is still null', async () => {
            const deps = makeDeps()
            deps.forms.value = null
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))

            expect(m.saveForm).toHaveBeenCalledOnce()
            expect(deps.showToastMessage).not.toHaveBeenCalled()
        })
    })

    describe('a file that cannot be read', () => {
        /** The console had the reason and the toast did not, leaving nothing to act on. */
        it.each([
            ['an empty file', '', 'importErrors.empty'],
            ['a file that is not XML', 'not xml at all', 'importErrors.notXml'],
            ['XML without definitions', '<?xml version="1.0"?><root/>', 'importErrors.noDefinitions'],
        ])('names the file and the reason for %s', async (_case, content, reason) => {
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'broken.bpmn', content }]))

            const toast = deps.showToastMessage.mock.calls.at(-1)[0]
            expect(toast.isSuccess).toBe(false)
            expect(toast.toastText).toBe('toastLoadErrorFile')
            expect(toast.bodyTextAlt).toContain('broken.bpmn')
            expect(toast.bodyTextAlt).toContain(reason)
        })

        it('stores nothing when the file cannot be read', async () => {
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'broken.bpmn', content: '' }]))

            expect(m.saveDiagramProcess).not.toHaveBeenCalled()
        })

        /**
         * Only a 404 says the key is free. Any other answer is unknown, and importing anyway
         * would write a second diagram under a key the database refuses.
         */
        it.each([
            ['a server error', Object.assign(new Error('boom'), { response: { status: 500 } })],
            ['a failed request', new Error('Network Error')],
        ])('imports nothing when the key cannot be looked up: %s', async (_case, failure) => {
            m.fetchProcessByKey.mockRejectedValue(failure)
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'procA.bpmn', content: bpmn('procA') }]))

            expect(m.saveDiagramProcess).not.toHaveBeenCalled()
            const toast = deps.showToastMessage.mock.calls.at(-1)[0]
            expect(toast.isSuccess).toBe(false)
            // The file is fine: it is reported as not saved, not as one that could not be loaded
            expect(toast.toastText).toBe('toastImportSaveError')
            expect(toast.bodyTextAlt).toContain('importErrors.lookupFailed')
        })
    })

    describe('dmn import', () => {
        it('uses the definitions id as the process key when present', async () => {
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)
            await handleFile(fileEvent([{ name: 'my-decision.dmn', content: dmn('myDmnId') }]))

            expect(m.saveDiagramProcess).toHaveBeenCalledOnce()
            const [key] = m.saveDiagramProcess.mock.calls[0]
            expect(key).toBe('myDmnId')
        })

        it('falls back to the file name when definitions has no id', async () => {
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)
            await handleFile(fileEvent([{ name: 'my-decision.dmn', content: dmn(null) }]))

            expect(m.saveDiagramProcess).toHaveBeenCalledOnce()
            const [key] = m.saveDiagramProcess.mock.calls[0]
            expect(key).toBe('my-decision')
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
            deps.forms.value = [{ id: 'fdb', formId: 'formA', folderId: 'general' }]
            deps.store.state.modeler.forms.formSelected = form('formA', [{ type: 'textfield' }])
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))
            await waitForModal(deps)
            resolveConflict('replace')
            await p

            expect(m.updateForm).toHaveBeenCalledOnce()
        })

        /** A form id is unique within a folder: the backend is asked about the import's folder only. */
        it('detects a conflict for a form of the folder that is not loaded', async () => {
            const deps = makeDeps()
            deps.forms.value = []
            deps.folderNameFor = folderId => (folderId === 'general' ? 'General' : null)
            m.fetchFormByFormId.mockResolvedValue({ id: 'fdb', formId: 'formA', folderId: 'general' })
            deps.store.state.modeler.forms.formSelected = form('formA', [{ type: 'textfield' }])
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))
            await waitForModal(deps)

            expect(m.fetchFormByFormId).toHaveBeenCalledWith('formA', 'general')
            expect(deps.modalData.value.folderName).toBe('General')
            resolveConflict('replace')
            await p

            expect(m.updateForm).toHaveBeenCalledOnce()
        })

        it('opens the stored form rather than moving the tab of the same form id in another folder', async () => {
            const deps = makeDeps()
            deps.forms.value = [{ id: 'fdb', formId: 'formA', folderId: 'general' }]
            deps.tabNavList.value = [{ id: 'fB', key: 'formA', type: 'form', folderId: 'archive', isSaved: true, canSave: false }]
            deps.store.state.modeler.forms.formSelected = form('formA')
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))

            expect(deps.tabNavList.value[0].folderId).toBe('archive')
            expect(deps.modelerTabNav.value.selectTab).not.toHaveBeenCalled()
            expect(deps.openDiagramFromChild).toHaveBeenCalledWith(expect.anything(), 'fdb', 'formA', 'formA', 'form', true, false, false, 'general')
        })

        it('imports a form whose form id only another folder has as a new one', async () => {
            const deps = makeDeps()
            deps.forms.value = [{ id: 'fdb', formId: 'formA', folderId: 'archive' }]
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))

            expect(deps.showModalAcceptCancelMessage.value.show).toBe(false)
            expect(m.saveForm).toHaveBeenCalledOnce()
        })

        /** Without a folder the backend picks one and refuses a key it holds, so nothing is looked up. */
        it('looks nothing up for an import without a folder', async () => {
            const deps = makeDeps({ importFolderId: { value: null } })
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))

            expect(m.fetchFormByFormId).not.toHaveBeenCalled()
            expect(m.saveForm).toHaveBeenCalledOnce()
        })

        it('treats identical form content as unchanged even when double-encoded in the store', async () => {
            const deps = makeDeps()
            deps.forms.value = [{ id: 'fdb', formId: 'formA', folderId: 'general' }]
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
                { id: '1', name: 'A', processkey: 'procA', folderId: 'general' },
                { id: '2', name: 'B', processkey: 'procB', folderId: 'general' },
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
                { id: '1', name: 'A', processkey: 'procA', folderId: 'general' },
                { id: '2', name: 'B', processkey: 'procB', folderId: 'general' },
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

    describe('a save or update the backend refuses', () => {
        const refused = message => Object.assign(new Error('Request failed with status code 500'), { response: { status: 500, data: { params: [message] } } })
        const lastToast = deps => deps.showToastMessage.mock.calls.at(-1)[0]

        it('counts a batch file whose save fails as not saved, with its name, not as imported', async () => {
            m.saveDiagramProcess
                .mockResolvedValueOnce({ id: 'id-a' })
                .mockRejectedValueOnce(refused('Duplicate key'))
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }, { name: 'b.bpmn', content: bpmn('procB') }]))

            const toast = lastToast(deps)
            expect(toast.isSuccess).toBe(false)
            expect(toast.bodyTextAlt).toContain('importSummary.imported {"count":1}')
            expect(toast.bodyTextAlt).toContain('importSummary.notSaved {"count":1,"names":"b.bpmn"}')
            expect(toast.bodyTextAlt).not.toContain('importSummary.skipped')
            expect(deps.onBatchComplete).toHaveBeenCalledOnce()
        })

        it('says a single file was not saved, with the reason, and leaves its tab unsaved for Save', async () => {
            m.saveDiagramProcess.mockRejectedValue(refused('Duplicate key'))
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(lastToast(deps)).toEqual({
                isSuccess: false,
                toastText: 'toastImportSaveError',
                bodyTextAlt: 'toastImportSaveError.body: Duplicate key',
            })
            expect(deps.tabNavList.value[0]).toMatchObject({ key: 'procA', isSaved: false, canSave: true })
        })

        it('says a known refusal in the user\'s words rather than the bare key the backend sends', async () => {
            m.saveDiagramProcess.mockRejectedValue(Object.assign(new Error('Request failed with status code 500'), {
                response: { status: 500, data: { type: 'ExistingProcessKeyException', params: ['procA'] } },
            }))
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(lastToast(deps).bodyTextAlt).toBe('toastImportSaveError.body: folders.keyTaken {"key":"procA"}')
        })

        it('shows no bare field name for a refusal it does not know', async () => {
            m.saveDiagramProcess.mockRejectedValue(Object.assign(new Error('Request failed with status code 400'), {
                response: { status: 400, data: { type: 'InvalidFolderException', params: ['folderId', 'a model needs the folder it goes into'] } },
            }))
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))

            expect(lastToast(deps)).toEqual({ isSuccess: false, toastText: 'toastImportSaveError', bodyTextAlt: '' })
        })

        it('stops a batch when the backend does not answer, and counts the rest as skipped', async () => {
            m.saveDiagramProcess.mockRejectedValue(new Error('Network Error'))
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([
                { name: 'a.bpmn', content: bpmn('procA') },
                { name: 'b.bpmn', content: bpmn('procB') },
                { name: 'c.bpmn', content: bpmn('procC') },
            ]))

            expect(m.saveDiagramProcess).toHaveBeenCalledOnce()
            const toast = lastToast(deps)
            expect(toast.bodyTextAlt).toContain('importSummary.skipped {"count":2}')
            expect(toast.bodyTextAlt).toContain('importSummary.notSaved {"count":1,"names":"a.bpmn"}')
            expect(toast.bodyTextAlt.endsWith('. Network Error')).toBe(true)
        })

        it('also stops a batch when the key lookup gets no answer', async () => {
            m.fetchProcessByKey.mockRejectedValue(new Error('Network Error'))
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }, { name: 'b.bpmn', content: bpmn('procB') }]))

            expect(m.fetchProcessByKey).toHaveBeenCalledOnce()
            expect(lastToast(deps).bodyTextAlt).toContain('importSummary.skipped {"count":1}')
        })

        it('keeps a batch going after a refusal that got an answer', async () => {
            m.saveDiagramProcess.mockRejectedValueOnce(refused('Duplicate key'))
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }, { name: 'b.bpmn', content: bpmn('procB') }]))

            expect(m.saveDiagramProcess).toHaveBeenCalledTimes(2)
        })

        it('lists the first three names and how many more, with the reason they share', async () => {
            m.saveDiagramProcess.mockRejectedValue(refused('Duplicate key'))
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent(['a', 'b', 'c', 'd', 'e'].map(n => ({ name: `${n}.bpmn`, content: bpmn(`proc${n}`) }))))

            const summary = lastToast(deps).bodyTextAlt
            expect(summary).toContain('importSummary.namesAndMore')
            expect(summary).toContain('a.bpmn, b.bpmn, c.bpmn')
            expect(summary).toContain('\\"count\\":2')
            expect(summary).not.toContain('d.bpmn')
            expect(summary.endsWith('. Duplicate key')).toBe(true)
        })

        it('leaves the reason out of a batch summary when the failures differ', async () => {
            m.saveDiagramProcess
                .mockRejectedValueOnce(refused('Duplicate key'))
                .mockRejectedValueOnce(refused('Locked'))
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }, { name: 'b.bpmn', content: bpmn('procB') }]))

            const summary = lastToast(deps).bodyTextAlt
            expect(summary.endsWith('.')).toBe(true)
            expect(summary).not.toContain('Duplicate key')
        })

        it('treats a save that answers without an id as not saved', async () => {
            m.saveForm.mockResolvedValue({})
            const deps = makeDeps()
            const { handleFile } = useFileImport(deps)

            await handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))

            expect(lastToast(deps)).toMatchObject({ isSuccess: false, toastText: 'toastImportSaveError' })
            expect(deps.tabNavList.value[0]).toMatchObject({ isSaved: false, canSave: true })
        })

        const openStoredProcess = deps => {
            deps.processes.value = [{ id: 'db1', name: 'Proc A', processkey: 'procA', folderId: 'general' }]
            deps.store.state.modeler.processes.processSelected = bpmn('procA-OLD')
            deps.tabNavList.value = [{ id: 'db1', key: 'procA', type: 'bpmn-c7', isSaved: true, canSave: false }]
        }

        it('leaves the open tab with unsaved changes when Replace fails, so Save can store the import', async () => {
            m.updateDiagramProcess.mockRejectedValue(refused('Locked by another user'))
            const deps = makeDeps()
            openStoredProcess(deps)
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))
            await waitForModal(deps)
            resolveConflict('replace')
            await p

            expect(deps.updateDiagramXml).toHaveBeenCalledWith(bpmn('procA'), 0, false, 'bpmn-c7')
            expect(deps.tabNavList.value[0]).toMatchObject({ isSaved: true, canSave: true })
            expect(lastToast(deps)).toMatchObject({ isSuccess: false, toastText: 'toastImportSaveError', bodyTextAlt: 'toastImportSaveError.body: Locked by another user' })
        })

        it('marks the open tab as saved when Replace works', async () => {
            const deps = makeDeps()
            openStoredProcess(deps)
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }]))
            await waitForModal(deps)
            resolveConflict('replace')
            await p

            expect(deps.tabNavList.value[0]).toMatchObject({ isSaved: true, canSave: false })
            expect(deps.showToastMessage).not.toHaveBeenCalled()
        })

        it('leaves an open form tab with unsaved changes when its Replace fails', async () => {
            m.updateForm.mockRejectedValue(refused('Locked'))
            const deps = makeDeps()
            deps.forms.value = [{ id: 'fdb1', formId: 'formA', folderId: 'general' }]
            deps.store.state.modeler.forms.formSelected = form('formA', [{ type: 'textfield', key: 'old' }])
            deps.tabNavList.value = [{ id: 'fdb1', key: 'formA', type: 'form', isSaved: true, canSave: false }]
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))
            await waitForModal(deps)
            resolveConflict('replace')
            await p

            expect(deps.tabNavList.value[0]).toMatchObject({ isSaved: true, canSave: true })
            expect(lastToast(deps)).toMatchObject({ isSuccess: false, toastText: 'toastImportSaveError' })
        })

        it('marks the form tab the conflict dialog opened as saved after Replace', async () => {
            const deps = makeDeps()
            deps.forms.value = [{ id: 'fdb1', formId: 'formA', folderId: 'general' }]
            deps.store.state.modeler.forms.formSelected = form('formA', [{ type: 'textfield', key: 'old' }])
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'f.form', content: form('formA') }]))
            await waitForModal(deps)
            // Accepting the dialog opens the stored form before it answers 'replace'
            deps.tabNavList.value.push({ id: 'fdb1', key: 'formA', type: 'form', isSaved: true, canSave: true })
            resolveConflict('replace')
            await p

            expect(deps.tabNavList.value[0]).toMatchObject({ isSaved: true, canSave: false })
            expect(deps.switchTabFromTabNav).toHaveBeenCalledWith(0)
        })

        it('counts a batch "replace all" whose update fails as not saved, not as imported', async () => {
            m.updateDiagramProcess.mockRejectedValue(refused('Locked'))
            const deps = makeDeps()
            deps.processes.value = [
                { id: 'db1', name: 'A', processkey: 'procA', folderId: 'general' },
                { id: 'db2', name: 'B', processkey: 'procB', folderId: 'general' },
            ]
            deps.store.state.modeler.processes.processSelected = bpmn('OLD')
            const { handleFile, resolveConflict } = useFileImport(deps)

            const p = handleFile(fileEvent([{ name: 'a.bpmn', content: bpmn('procA') }, { name: 'b.bpmn', content: bpmn('procB') }]))
            await waitForModal(deps)
            resolveConflict('replace', true)
            await p

            const toast = lastToast(deps)
            expect(toast.bodyTextAlt).toContain('importSummary.notSaved {"count":2,"names":"a.bpmn, b.bpmn"}')
            expect(toast.bodyTextAlt).not.toContain('importSummary.imported')
            expect(deps.onBatchComplete).not.toHaveBeenCalled()
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
