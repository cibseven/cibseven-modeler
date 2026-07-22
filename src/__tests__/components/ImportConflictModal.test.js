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
import { mount, flushPromises } from '@vue/test-utils'

const modalShow = vi.fn()
const modalHide = vi.fn()

vi.mock('bootstrap', () => ({
    Modal: vi.fn(function() {
        this.show = modalShow
        this.hide = modalHide
    }),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key }),
}))

import ImportConflictModal from '../../components/modals/ImportConflictModal.vue'

function mountModal(props = {}) {
    const functionAfterAccepting = vi.fn()
    const functionAfterCanceling = vi.fn()
    const functionApplyAll = vi.fn()
    const functionAfterRenaming = vi.fn()
    const validateRenameKey = vi.fn(() => '')

    const wrapper = mount(ImportConflictModal, {
        props: {
            showModal: false,
            modalData: {
                id: 'db-1',
                name: 'Process A',
                processkey: 'procA',
                xmlExternalUrl: '<xml/>',
                diagramType: 'process',
            },
            isBatch: false,
            functionAfterAccepting,
            functionAfterCanceling,
            functionApplyAll,
            functionAfterRenaming,
            validateRenameKey,
            ...props,
        },
        global: { mocks: { $t: (key) => key } },
        attachTo: document.body,
    })

    return {
        wrapper,
        functionAfterAccepting,
        functionAfterCanceling,
        functionApplyAll,
        functionAfterRenaming,
        validateRenameKey,
    }
}

describe('ImportConflictModal', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('opens bootstrap modal when showModal becomes true', async () => {
        const { wrapper } = mountModal()
        await wrapper.setProps({ showModal: true })
        await flushPromises()

        expect(modalShow).toHaveBeenCalled()
        expect(wrapper.emitted('hideModal')).toBeTruthy()
    })

    it('confirms replace action', async () => {
        const { wrapper, functionAfterAccepting } = mountModal()
        await wrapper.setProps({ showModal: true })
        await flushPromises()

        await wrapper.find('button.btn-primary').trigger('click')

        expect(functionAfterAccepting).toHaveBeenCalledWith(
            '<xml/>', 'db-1', 'Process A', 'procA', 'process', true, true, true,
        )
        expect(modalHide).toHaveBeenCalled()
    })

    it('confirms skip action', async () => {
        const { wrapper, functionAfterCanceling } = mountModal()
        await wrapper.setProps({ showModal: true })
        await flushPromises()

        const skipRadio = wrapper.find('#ic-skip')
        await skipRadio.setValue(true)
        await wrapper.find('button.btn-primary').trigger('click')

        expect(functionAfterCanceling).toHaveBeenCalled()
    })

    it('validates rename key before confirming rename', async () => {
        const validateRenameKey = vi.fn(() => 'duplicate key')
        const { wrapper, functionAfterRenaming } = mountModal({ validateRenameKey })
        await wrapper.setProps({ showModal: true })
        await flushPromises()

        await wrapper.find('#ic-rename').setValue(true)
        await wrapper.find('#ic-rename-key').setValue('new-key')
        await wrapper.find('button.btn-primary').trigger('click')

        expect(functionAfterRenaming).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('duplicate key')
        expect(validateRenameKey).toHaveBeenCalledWith('new-key')
    })

    it('confirms rename with valid key', async () => {
        const { wrapper, functionAfterRenaming } = mountModal()
        await wrapper.setProps({ showModal: true })
        await flushPromises()

        await wrapper.find('#ic-rename').setValue(true)
        await wrapper.find('#ic-rename-key').setValue('renamed-key')
        await wrapper.find('button.btn-primary').trigger('click')

        expect(functionAfterRenaming).toHaveBeenCalledWith('renamed-key')
    })

    it('disables continue when rename key is empty', async () => {
        const { wrapper } = mountModal()
        await wrapper.setProps({ showModal: true })
        await flushPromises()

        await wrapper.find('#ic-rename').setValue(true)
        await wrapper.find('#ic-rename-key').setValue('   ')

        expect(wrapper.find('button.btn-primary').attributes('disabled')).toBeDefined()
    })

    it('applies batch policy when applyAll is checked', async () => {
        const { wrapper, functionApplyAll } = mountModal({ isBatch: true })
        await wrapper.setProps({ showModal: true })
        await flushPromises()

        await wrapper.find('#ic-all').setValue(true)
        await wrapper.find('button.btn-primary').trigger('click')

        expect(functionApplyAll).toHaveBeenCalledWith('replace')
    })

    it('cancel remaining stops batch processing', async () => {
        const { wrapper, functionApplyAll } = mountModal({ isBatch: true })
        await wrapper.setProps({ showModal: true })
        await flushPromises()

        await wrapper.find('button.btn-secondary').trigger('click')

        expect(functionApplyAll).toHaveBeenCalledWith('stop')
    })

    it('dismiss calls cancel handler', async () => {
        const { wrapper, functionAfterCanceling } = mountModal()
        await wrapper.setProps({ showModal: true })
        await flushPromises()

        await wrapper.find('button.btn-close').trigger('click')

        expect(functionAfterCanceling).toHaveBeenCalled()
    })
})
