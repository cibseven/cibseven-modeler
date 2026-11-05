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
import { describe, it, expect } from 'vitest'
import ContextPad from 'diagram-js/lib/features/context-pad/ContextPad'
import CenteredContextPadModule, {
    CenteredContextPad, CENTERED_CLASS, BELOW_CLASS
} from '../../../components/modeler/context-pad/CenteredContextPadModule.js'

// The pad as diagram-js holds it while open, inside a canvas whose container starts at (100, 50)
function openPad({ targetBounds, padHeight = 60 }) {
    const html = document.createElement('div')
    Object.defineProperty(html, 'offsetHeight', { value: padHeight })
    const pad = Object.create(CenteredContextPad.prototype)
    pad._current = { html }
    pad._canvas = {
        getContainer: () => ({ getBoundingClientRect: () => ({ left: 100, top: 50 }) }),
        viewbox: () => ({ x: 0, y: 0, scale: 1 }),
        zoom: () => 1,
    }
    pad._getTargetBounds = () => targetBounds
    return { pad, html }
}

const shape = { id: 'Task_1' }

describe('CenteredContextPadModule', () => {
    it('replaces the context pad of diagram-js', () => {
        expect(CenteredContextPadModule.contextPad).toEqual(['type', CenteredContextPad])
        expect(Object.getPrototypeOf(CenteredContextPad.prototype)).toBe(ContextPad.prototype)
        expect(CenteredContextPad.$inject).toEqual(ContextPad.$inject)
    })

    it('anchors the pad at the middle of the top edge, 2rem above the element', () => {
        const { pad, html } = openPad({ targetBounds: { left: 300, right: 400, top: 250, bottom: 330 } })

        expect(pad._getPosition(shape)).toEqual({ left: 250, top: 168 })
        expect(html.classList.contains(CENTERED_CLASS)).toBe(true)
        expect(html.classList.contains(BELOW_CLASS)).toBe(false)
    })

    it('puts it below an element too close to the top for it', () => {
        const { pad, html } = openPad({ targetBounds: { left: 300, right: 400, top: 100, bottom: 180 } })

        expect(pad._getPosition(shape)).toEqual({ left: 250, top: 162 })
        expect(html.classList.contains(BELOW_CLASS)).toBe(true)
    })

    it('centers on several selected elements together', () => {
        const { pad } = openPad({ targetBounds: { left: 200, right: 600, top: 300, bottom: 400 } })

        expect(pad._getPosition([shape, { id: 'Task_2' }]).left).toBe(300)
    })

    it('leaves the pad of a connection beside its end, without the centering', () => {
        const { pad, html } = openPad({ targetBounds: null })
        html.classList.add(CENTERED_CLASS, BELOW_CLASS)
        const connection = { id: 'Flow_1', waypoints: [{ x: 10, y: 20 }, { x: 200, y: 120 }] }

        expect(pad._getPosition(connection)).toEqual({ left: 208, top: 120 })
        expect(html.classList.contains(CENTERED_CLASS)).toBe(false)
        expect(html.classList.contains(BELOW_CLASS)).toBe(false)
    })
})
