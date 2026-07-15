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
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { useResizable } from '../../composables/useResizable.js'

const wrappers = []

// Mount a minimal host wiring the composable to a size ref, the documented way.
function mountResizable(opts = {}) {
    const size = ref(opts.initial ?? 100)
    const disabled = ref(opts.disabled ?? false)
    const Harness = {
        setup() {
            const api = useResizable({
                axis: opts.axis ?? 'x',
                getSize: () => size.value,
                setSize: n => { size.value = n },
                min: () => opts.min ?? 0,
                max: () => opts.max ?? 500,
                disabled: () => disabled.value,
                keyboardStep: opts.keyboardStep ?? 16,
            })
            return { ...api, size, disabled }
        },
        template: '<div />',
    }
    const wrapper = mount(Harness)
    wrappers.push(wrapper)
    return wrapper
}

// The move/up listeners live on document.documentElement, so drive them with real events.
const move = (coord, axis = 'x') =>
    document.documentElement.dispatchEvent(
        new MouseEvent('mousemove', axis === 'x' ? { clientX: coord } : { clientY: coord })
    )
const up = () => document.documentElement.dispatchEvent(new MouseEvent('mouseup'))
const down = (vm, coord, axis = 'x') =>
    vm.onMouseDown({ [axis === 'x' ? 'clientX' : 'clientY']: coord, preventDefault: vi.fn() })

describe('useResizable', () => {
    afterEach(() => {
        wrappers.splice(0).forEach(w => w.unmount())
        vi.restoreAllMocks()
    })

    it('starts idle', () => {
        expect(mountResizable().vm.isResizing).toBe(false)
    })

    it('onMouseDown starts resizing and prevents default', () => {
        const w = mountResizable()
        const e = { clientX: 100, preventDefault: vi.fn() }
        w.vm.onMouseDown(e)
        expect(w.vm.isResizing).toBe(true)
        expect(e.preventDefault).toHaveBeenCalled()
    })

    it('resizes with the delta model: newSize = startSize + (startPos - pointer)', () => {
        const w = mountResizable({ initial: 100 })
        down(w.vm, 100)
        move(80) // dragged 20px toward the top/left edge
        expect(w.vm.size).toBe(120)
    })

    it('clamps to max and min', () => {
        const w = mountResizable({ initial: 100, min: 50, max: 300 })
        down(w.vm, 100)
        move(-1000) // far past max
        expect(w.vm.size).toBe(300)
        move(5000) // far past min
        expect(w.vm.size).toBe(50)
    })

    it('stops on mouseup; later moves do nothing', () => {
        const w = mountResizable({ initial: 100 })
        down(w.vm, 100)
        up()
        expect(w.vm.isResizing).toBe(false)
        move(0)
        expect(w.vm.size).toBe(100)
    })

    it('ignores resize while disabled', () => {
        const w = mountResizable({ initial: 100, disabled: true })
        const e = { clientX: 100, preventDefault: vi.fn() }
        w.vm.onMouseDown(e)
        expect(w.vm.isResizing).toBe(false)
        expect(e.preventDefault).not.toHaveBeenCalled()
        move(50)
        expect(w.vm.size).toBe(100)
    })

    it('removes the document listeners on unmount', () => {
        const remove = vi.spyOn(document.documentElement, 'removeEventListener')
        const w = mountResizable()
        w.unmount()
        wrappers.splice(wrappers.indexOf(w), 1) // already unmounted
        expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function), true)
        expect(remove).toHaveBeenCalledWith('mouseup', expect.any(Function), true)
    })

    it('keyboard (x axis): ArrowLeft grows, ArrowRight shrinks, others are ignored', () => {
        const w = mountResizable({ initial: 100, keyboardStep: 10 })
        const grow = { key: 'ArrowLeft', preventDefault: vi.fn() }
        w.vm.onKeydown(grow)
        expect(w.vm.size).toBe(110)
        expect(grow.preventDefault).toHaveBeenCalled()

        w.vm.onKeydown({ key: 'ArrowRight', preventDefault: vi.fn() })
        expect(w.vm.size).toBe(100)

        const other = { key: 'Enter', preventDefault: vi.fn() }
        w.vm.onKeydown(other)
        expect(w.vm.size).toBe(100)
        expect(other.preventDefault).not.toHaveBeenCalled()
    })

    it('keyboard resize clamps to bounds', () => {
        const w = mountResizable({ initial: 295, max: 300, keyboardStep: 16 })
        w.vm.onKeydown({ key: 'ArrowLeft', preventDefault: vi.fn() }) // 295 + 16 = 311 -> 300
        expect(w.vm.size).toBe(300)
    })

    it('y axis: drag uses clientY; ArrowUp/ArrowDown resize', () => {
        const w = mountResizable({ axis: 'y', initial: 100, keyboardStep: 10 })
        down(w.vm, 100, 'y')
        move(80, 'y')
        expect(w.vm.size).toBe(120)
        up()

        w.vm.onKeydown({ key: 'ArrowUp', preventDefault: vi.fn() })
        expect(w.vm.size).toBe(130)
        w.vm.onKeydown({ key: 'ArrowDown', preventDefault: vi.fn() })
        expect(w.vm.size).toBe(120)
    })
})
