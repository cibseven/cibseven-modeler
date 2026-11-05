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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useAutosave from '../../composables/useAutosave.js'

describe('useAutosave', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('does not schedule when options is null', () => {
        const saveFn = vi.fn()
        const { schedule } = useAutosave(saveFn, null)
        schedule()
        vi.runAllTimers()
        expect(saveFn).not.toHaveBeenCalled()
    })

    it('does not schedule when disabled', () => {
        const saveFn = vi.fn()
        const { schedule } = useAutosave(saveFn, { enabled: false, delayMs: 100 })
        schedule()
        vi.runAllTimers()
        expect(saveFn).not.toHaveBeenCalled()
    })

    it('debounces and calls saveFn after the delay when enabled', () => {
        const saveFn = vi.fn()
        const { schedule } = useAutosave(saveFn, { enabled: true, delayMs: 1000 })
        schedule()
        expect(saveFn).not.toHaveBeenCalled()
        vi.advanceTimersByTime(999)
        expect(saveFn).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        expect(saveFn).toHaveBeenCalledTimes(1)
    })

    it('restarts the debounce on repeated schedule (saves once)', () => {
        const saveFn = vi.fn()
        const { schedule } = useAutosave(saveFn, { enabled: true, delayMs: 1000 })
        schedule()
        vi.advanceTimersByTime(500)
        schedule() // restart
        vi.advanceTimersByTime(500)
        expect(saveFn).not.toHaveBeenCalled()
        vi.advanceTimersByTime(500)
        expect(saveFn).toHaveBeenCalledTimes(1)
    })

    it('cancel prevents a pending save', () => {
        const saveFn = vi.fn()
        const { schedule, cancel } = useAutosave(saveFn, { enabled: true, delayMs: 1000 })
        schedule()
        cancel()
        vi.runAllTimers()
        expect(saveFn).not.toHaveBeenCalled()
    })

    it('falls back to the default delay when delayMs is not provided', () => {
        const saveFn = vi.fn()
        const { schedule } = useAutosave(saveFn, { enabled: true })
        schedule()
        vi.advanceTimersByTime(1999)
        expect(saveFn).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        expect(saveFn).toHaveBeenCalledTimes(1)
    })
})
