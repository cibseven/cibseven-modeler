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
import { defineComponent, ref } from 'vue'

vi.mock('../../services/processService.js', () => ({ keyExistsRemote: vi.fn().mockResolvedValue(false) }))
import { keyExistsRemote } from '../../services/processService.js'
import useDiagramSave from '../../composables/useDiagramSave.js'

/**
 * Mount a minimal wrapper to exercise useDiagramSave.
 * Returns { save, emitted } via expose.
 */
function withSetup({ tabElement, tabElementIndex = 0, createSessionHook = null, autosaveHook = null } = {}) {
    let composableResult
    const wrapper = mount(defineComponent({
        name: 'TestWrapper',
        setup() {
            const props = { tabElement: ref(tabElement).value, tabElementIndex }
            const emitted = []
            const emit = (event, ...args) => emitted.push({ event, args })
            const sessionHooks = createSessionHook ? { createSessionHook } : {}
            composableResult = { ...useDiagramSave(props, emit, sessionHooks), emitted }
        },
        template: '<div />',
    }), autosaveHook ? { global: { provide: { autosaveHook } } } : undefined)
    return { ...composableResult, wrapper }
}

function makeTabElement(overrides = {}) {
    return { isSaved: false, replaceXml: false, ...overrides }
}

function makeSaveOpts(overrides = {}) {
    return {
        newName: 'My Diagram',
        newKey: 'my-key',
        storedKey: '',
        xml: '<xml/>',
        blob: {},
        storeStateSlice: [],
        itemKeyField: 'processkey',
        createFn: vi.fn().mockResolvedValue({ id: 'new-id', name: 'My Diagram', processkey: 'my-key' }),
        updateFn: vi.fn().mockResolvedValue({ id: 'upd-id', name: 'My Diagram', processkey: 'my-key' }),
        toTabPayload: r => ({ processId: r.id, processName: r.name, processKey: r.processkey, type: 'bpmn-c7' }),
        sessionResponse: null,
        ...overrides,
    }
}

describe('useDiagramSave', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('create path (isSaved = false)', () => {
        it('calls createFn and emits success events', async () => {
            const { save, emitted } = withSetup({ tabElement: makeTabElement() })
            const result = await save(makeSaveOpts())

            expect(result).toBe(true)
            const events = emitted.map(e => e.event)
            expect(events).toContain('updateStoredLocalStorageTabNavList')
            expect(events).toContain('showToastMessage')
            expect(events).toContain('toggleEnableSave')
            expect(events).toContain('toggleIsSaved')
            expect(events).toContain('toggleVersionNotSaved')
        })

        it('emits toastSaveSuccessful on create', async () => {
            const { save, emitted } = withSetup({ tabElement: makeTabElement() })
            await save(makeSaveOpts())

            const toast = emitted.find(e => e.event === 'showToastMessage')
            expect(toast.args[0].isSuccess).toBe(true)
            expect(toast.args[0].toastText).toBe('toastSaveSuccessful')
        })

        it('passes toTabPayload result to updateStoredLocalStorageTabNavList', async () => {
            const { save, emitted } = withSetup({ tabElement: makeTabElement() })
            const opts = makeSaveOpts()
            await save(opts)

            const update = emitted.find(e => e.event === 'updateStoredLocalStorageTabNavList')
            expect(update.args[0]).toEqual({ processId: 'new-id', processName: 'My Diagram', processKey: 'my-key', type: 'bpmn-c7' })
        })

        it('calls createFn not updateFn', async () => {
            const { save } = withSetup({ tabElement: makeTabElement() })
            const opts = makeSaveOpts()
            await save(opts)

            expect(opts.createFn).toHaveBeenCalledOnce()
            expect(opts.updateFn).not.toHaveBeenCalled()
        })

        it('calls optional afterSave callback', async () => {
            const afterSave = vi.fn()
            const { save } = withSetup({ tabElement: makeTabElement() })
            await save(makeSaveOpts({ afterSave }))

            expect(afterSave).toHaveBeenCalledOnce()
            expect(afterSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-id' }))
        })

        it('calls createSessionHook when sessionResponse is NO_SESSION', async () => {
            const createSessionHook = vi.fn()
            const { save } = withSetup({ tabElement: makeTabElement(), createSessionHook })
            await save(makeSaveOpts({ sessionResponse: { message: 'NO_SESSION' } }))

            expect(createSessionHook).toHaveBeenCalledOnce()
        })

        it('does not call createSessionHook when sessionResponse is null', async () => {
            const createSessionHook = vi.fn()
            const { save } = withSetup({ tabElement: makeTabElement(), createSessionHook })
            await save(makeSaveOpts({ sessionResponse: null }))

            expect(createSessionHook).not.toHaveBeenCalled()
        })

        it('returns false and emits error toast when createFn throws', async () => {
            const { save, emitted } = withSetup({ tabElement: makeTabElement() })
            const opts = makeSaveOpts({ createFn: vi.fn().mockRejectedValue(new Error('network')) })
            const result = await save(opts)

            expect(result).toBe(false)
            const toast = emitted.find(e => e.event === 'showToastMessage')
            expect(toast.args[0].isSuccess).toBe(false)
            expect(toast.args[0].toastText).toBe('toastSomethingWentWrong')
        })
    })

    describe('update path (isSaved = true)', () => {
        it('calls updateFn and emits update success events', async () => {
            const { save, emitted } = withSetup({ tabElement: makeTabElement({ isSaved: true }) })
            const result = await save(makeSaveOpts({ storedKey: 'my-key' }))

            expect(result).toBe(true)
            const events = emitted.map(e => e.event)
            expect(events).toContain('updateStoredLocalStorageTabNavList')
            expect(events).toContain('showToastMessage')
            expect(events).toContain('toggleEnableSave')
            expect(events).toContain('toggleVersionNotSaved')
            // toggleIsSaved should NOT be emitted on update
            expect(events).not.toContain('toggleIsSaved')
        })

        it('emits toastUpdateSuccessful on update', async () => {
            const { save, emitted } = withSetup({ tabElement: makeTabElement({ isSaved: true }) })
            await save(makeSaveOpts({ storedKey: 'my-key' }))

            const toast = emitted.find(e => e.event === 'showToastMessage')
            expect(toast.args[0].toastText).toBe('toastUpdateSuccessful')
        })

        it('calls updateFn not createFn', async () => {
            const { save } = withSetup({ tabElement: makeTabElement({ isSaved: true }) })
            const opts = makeSaveOpts({ storedKey: 'my-key' })
            await save(opts)

            expect(opts.updateFn).toHaveBeenCalledOnce()
            expect(opts.createFn).not.toHaveBeenCalled()
        })

        it('returns false and emits error toast when updateFn throws', async () => {
            const { save, emitted } = withSetup({ tabElement: makeTabElement({ isSaved: true }) })
            const opts = makeSaveOpts({ storedKey: 'my-key', updateFn: vi.fn().mockRejectedValue(new Error('fail')) })
            const result = await save(opts)

            expect(result).toBe(false)
            const toast = emitted.find(e => e.event === 'showToastMessage')
            expect(toast.args[0].isSuccess).toBe(false)
        })
    })

    describe('replaceXml path', () => {
        it('takes update path when replaceXml is true even if isSaved is false', async () => {
            const { save } = withSetup({ tabElement: makeTabElement({ isSaved: false, replaceXml: true }) })
            const opts = makeSaveOpts()
            await save(opts)

            expect(opts.updateFn).toHaveBeenCalledOnce()
            expect(opts.createFn).not.toHaveBeenCalled()
        })
    })

    describe('duplicate key validation', () => {
        it('returns false and emits duplicate key toast when key already exists', async () => {
            const storeStateSlice = [{ processkey: 'existing-key' }]
            const { save, emitted } = withSetup({ tabElement: makeTabElement() })
            const result = await save(makeSaveOpts({ newKey: 'existing-key', storedKey: '', storeStateSlice, itemKeyField: 'processkey' }))

            expect(result).toBe(false)
            const toast = emitted.find(e => e.event === 'showToastMessage')
            expect(toast.args[0].toastText).toBe('toastSaveErrorDuplicateKey')
        })

        it('allows save when key matches the currently stored key (update same key)', async () => {
            const storeStateSlice = [{ processkey: 'same-key' }]
            const { save } = withSetup({ tabElement: makeTabElement({ isSaved: true }) })
            const result = await save(makeSaveOpts({ newKey: 'same-key', storedKey: 'same-key', storeStateSlice, itemKeyField: 'processkey' }))

            expect(result).toBe(true)
        })

        it('emits duplicate toast when the key exists on the backend but not in the loaded list', async () => {
            keyExistsRemote.mockResolvedValueOnce(true)
            const { save, emitted } = withSetup({ tabElement: makeTabElement() })
            const result = await save(makeSaveOpts({ newKey: 'remote-dup', storedKey: '', storeStateSlice: [], itemKeyField: 'processkey' }))

            expect(keyExistsRemote).toHaveBeenCalledWith('remote-dup', 'process')
            expect(result).toBe(false)
            expect(emitted.find(e => e.event === 'showToastMessage').args[0].toastText).toBe('toastSaveErrorDuplicateKey')
        })
    })

    describe('functionToExecute', () => {
        it('is called with xml after successful create', async () => {
            const functionToExecute = vi.fn()
            const { save } = withSetup({ tabElement: makeTabElement() })
            await save(makeSaveOpts({ functionToExecute }))

            expect(functionToExecute).toHaveBeenCalledWith('<xml/>')
        })

        it('is not called when save fails', async () => {
            const functionToExecute = vi.fn()
            const { save } = withSetup({ tabElement: makeTabElement() })
            await save(makeSaveOpts({
                functionToExecute,
                createFn: vi.fn().mockRejectedValue(new Error('fail')),
            }))

            expect(functionToExecute).not.toHaveBeenCalled()
        })
    })

    describe('falsy response and session-hook failure (regression)', () => {
        it('returns false and warns when createFn resolves falsy', async () => {
            const { save, emitted } = withSetup({ tabElement: makeTabElement() })
            const result = await save(makeSaveOpts({ createFn: vi.fn().mockResolvedValue(null) }))

            expect(result).toBe(false)
            const toast = emitted.find(e => e.event === 'showToastMessage')
            expect(toast.args[0].isSuccess).toBe(false)
            expect(toast.args[0].toastText).toBe('toastSomethingWentWrong')
        })

        it('returns false when updateFn resolves falsy', async () => {
            const { save, emitted } = withSetup({ tabElement: makeTabElement({ isSaved: true }) })
            const result = await save(makeSaveOpts({ updateFn: vi.fn().mockResolvedValue(undefined) }))

            expect(result).toBe(false)
            expect(emitted.find(e => e.event === 'showToastMessage').args[0].toastText).toBe('toastSomethingWentWrong')
        })

        it('still succeeds but warns when the session hook fails', async () => {
            const createSessionHook = vi.fn().mockRejectedValue(new Error('session POST failed'))
            const { save, emitted } = withSetup({ tabElement: makeTabElement(), createSessionHook })
            const result = await save(makeSaveOpts({ sessionResponse: { message: 'NO_SESSION' } }))

            expect(result).toBe(true) // the diagram save itself succeeded
            expect(createSessionHook).toHaveBeenCalledOnce()
            const toasts = emitted.filter(e => e.event === 'showToastMessage').map(t => t.args[0].toastText)
            expect(toasts).toContain('toastSaveSuccessful')
            expect(toasts).toContain('toastSessionLockFailed')
        })

        it('does not warn when the session hook succeeds', async () => {
            const createSessionHook = vi.fn().mockResolvedValue({ sessionId: 's1' })
            const { save, emitted } = withSetup({ tabElement: makeTabElement(), createSessionHook })
            const result = await save(makeSaveOpts({ sessionResponse: { message: 'NO_SESSION' } }))

            expect(result).toBe(true)
            const toasts = emitted.filter(e => e.event === 'showToastMessage').map(t => t.args[0].toastText)
            expect(toasts).not.toContain('toastSessionLockFailed')
        })
    })

    /**
     * An autosave the user did not ask for reports through the status the indicator reads,
     * not through toasts. A silent failure is not acceptable either: the indicator would
     * keep showing the last successful time and the work would look saved.
     */
    describe('autosave', () => {
        const savedTab = () => makeTabElement({ isSaved: true })

        it('reports a failed autosave through the hook and raises no toast', async () => {
            const autosaveHook = vi.fn()
            const { save, emitted } = withSetup({ tabElement: savedTab(), autosaveHook })
            const result = await save(makeSaveOpts({
                updateFn: vi.fn().mockRejectedValue(new Error('boom')),
                isAutosave: true,
            }))

            expect(result).toBe(false)
            expect(autosaveHook).toHaveBeenCalledWith(expect.anything(), { state: 'failed' })
            expect(emitted.filter(e => e.event === 'showToastMessage')).toHaveLength(0)
        })

        it('reports a failure when the update yields no response', async () => {
            const autosaveHook = vi.fn()
            const { save, emitted } = withSetup({ tabElement: savedTab(), autosaveHook })
            const result = await save(makeSaveOpts({
                updateFn: vi.fn().mockResolvedValue(null),
                isAutosave: true,
            }))

            expect(result).toBe(false)
            expect(autosaveHook).toHaveBeenCalledWith(expect.anything(), { state: 'failed' })
            expect(emitted.filter(e => e.event === 'showToastMessage')).toHaveLength(0)
        })

        it('still toasts a failed manual save', async () => {
            const autosaveHook = vi.fn()
            const { save, emitted } = withSetup({ tabElement: savedTab(), autosaveHook })
            const result = await save(makeSaveOpts({ updateFn: vi.fn().mockRejectedValue(new Error('boom')) }))

            expect(result).toBe(false)
            const toasts = emitted.filter(e => e.event === 'showToastMessage').map(t => t.args[0].toastText)
            expect(toasts).toContain('toastSomethingWentWrong')
            expect(autosaveHook).not.toHaveBeenCalledWith(expect.anything(), { state: 'failed' })
        })

        it('keeps a failing session lock quiet during autosave', async () => {
            const createSessionHook = vi.fn().mockRejectedValue(new Error('nope'))
            const autosaveHook = vi.fn()
            const { save, emitted } = withSetup({ tabElement: savedTab(), createSessionHook, autosaveHook })
            const result = await save(makeSaveOpts({
                sessionResponse: { message: 'NO_SESSION' },
                isAutosave: true,
            }))

            expect(result).toBe(true)
            expect(createSessionHook).toHaveBeenCalledOnce()
            const toasts = emitted.filter(e => e.event === 'showToastMessage').map(t => t.args[0].toastText)
            expect(toasts).not.toContain('toastSessionLockFailed')
            expect(autosaveHook).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ state: 'saved' }))
        })

        it('reports the saved state and no success toast on a successful autosave', async () => {
            const autosaveHook = vi.fn()
            const { save, emitted } = withSetup({ tabElement: savedTab(), autosaveHook })
            const result = await save(makeSaveOpts({ isAutosave: true }))

            expect(result).toBe(true)
            const toasts = emitted.filter(e => e.event === 'showToastMessage').map(t => t.args[0].toastText)
            expect(toasts).not.toContain('toastUpdateSuccessful')
            expect(autosaveHook).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ state: 'saved' }))
        })
    })
})
