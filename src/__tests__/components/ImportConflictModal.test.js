/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

vi.mock('bootstrap', () => ({
    Modal: vi.fn(function() {
        this.show = vi.fn()
        this.hide = vi.fn()
    })
}))

import ImportConflictModal from '../../components/modals/ImportConflictModal.vue'

enableAutoUnmount(afterEach)

const MODAL_DATA = {
    id: 'm1', name: 'Invoice', processkey: 'invoice', xmlExternalUrl: '<bpmn/>', diagramType: 'bpmn-c7',
}

const mountModal = (modalData, handlers = {}) => mount(ImportConflictModal, {
    props: {
        showModal: false,
        modalData,
        functionAfterAccepting: vi.fn(),
        functionAfterCanceling: vi.fn(),
        ...handlers,
    },
    global: { plugins: [createI18n({ legacy: false, locale: 'en', messages: { en: {} }, missingWarn: false, fallbackWarn: false })] },
    attachTo: document.body,
})

const answer = async (wrapper, choice) => {
    await wrapper.find(`#ic-${choice}`).setValue(true)
    await wrapper.find('.modal-footer .btn-primary').trigger('click')
}

describe('ImportConflictModal', () => {
    it('hands on the conflicting model when its version replaces the stored one', async () => {
        const wrapper = mountModal(MODAL_DATA)

        await answer(wrapper, 'replace')

        expect(wrapper.props('functionAfterAccepting')).toHaveBeenCalledWith('<bpmn/>', 'm1', 'Invoice', 'invoice', 'bpmn-c7', true, true, true, null)
    })

    /** The tab then opens where the model lives, not in the folder on screen. */
    it('hands on the folder of the stored model, when it knows it', async () => {
        const wrapper = mountModal({ ...MODAL_DATA, folderId: 'archive' })

        await answer(wrapper, 'replace')

        expect(wrapper.props('functionAfterAccepting').mock.calls[0][8]).toBe('archive')
    })

    it('offers renaming the incoming version', () => {
        const wrapper = mountModal(MODAL_DATA)

        expect(wrapper.find('#ic-rename').exists()).toBe(true)
    })

    it('speaks of an import when a file is imported', () => {
        const wrapper = mountModal(MODAL_DATA)

        expect(wrapper.find('.modal-body p').text()).toBe('modalImportedFile.body')
        expect(wrapper.find('label[for="ic-replace"]').text()).toContain('buttons.replace')
        expect(wrapper.find('label[for="ic-skip"]').text()).toContain('buttons.skip')
    })

    /** Opened from Cockpit, nothing is imported, so there is nothing to store under a new key. */
    it('does not offer renaming for a deployed version', () => {
        const wrapper = mountModal({ ...MODAL_DATA, source: 'deployment' })

        expect(wrapper.find('#ic-rename').exists()).toBe(false)
        expect(wrapper.find('#ic-replace').exists()).toBe(true)
        expect(wrapper.find('#ic-skip').exists()).toBe(true)
    })

    it('asks which version to open for a deployed version', () => {
        const wrapper = mountModal({ ...MODAL_DATA, source: 'deployment' })

        expect(wrapper.find('.modal-body p').text()).toBe('modalImportedFile.bodyDeployed')
        expect(wrapper.find('label[for="ic-replace"]').text()).toBe('modalImportedFile.deployedLabelmodalImportedFile.deployedHint')
        expect(wrapper.find('label[for="ic-skip"]').text()).toBe('modalImportedFile.storedLabelmodalImportedFile.storedHint')
    })

    it('keeps the stored model when it is skipped', async () => {
        const wrapper = mountModal(MODAL_DATA)

        await answer(wrapper, 'skip')

        expect(wrapper.props('functionAfterCanceling')).toHaveBeenCalledOnce()
        expect(wrapper.props('functionAfterAccepting')).not.toHaveBeenCalled()
    })
})
