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
import AnimationSpeedWordingModule, { AnimationSpeedWording } from '../../../components/modeler/token-simulation/AnimationSpeedWordingModule.js'

// The canvas as bpmn-js-token-simulation leaves it, with or without its speed buttons
function initDiagram(speedButtons) {
    const container = document.createElement('div')
    container.innerHTML = speedButtons
        .map(speed => `<button class="bts-animation-speed-button" data-speed="${speed}" title="Set animation speed = x"></button>`)
        .join('')
    const listeners = {}
    const eventBus = { on: (event, fn) => { listeners[event] = fn } }
    new AnimationSpeedWording(eventBus, { getContainer: () => container }, text => `[${text}]`)
    listeners['diagram.init']()
    return [...container.querySelectorAll('button')]
}

describe('AnimationSpeedWordingModule', () => {
    it('starts with the diagram', () => {
        expect(AnimationSpeedWordingModule.__init__).toEqual(['animationSpeedWording'])
        expect(AnimationSpeedWording.$inject).toEqual(['eventBus', 'canvas', 'translate'])
    })

    it('words and translates the speed buttons', () => {
        const buttons = initDiagram(['0.5', '1', '2'])

        expect(buttons.map(button => button.title)).toEqual([
            '[Slow animation speed]', '[Normal animation speed]', '[Fast animation speed]'
        ])
        expect(buttons[1].getAttribute('aria-label')).toBe('[Normal animation speed]')
    })

    it('leaves a speed it does not know as the simulation named it', () => {
        const [button] = initDiagram(['3'])

        expect(button.title).toBe('Set animation speed = x')
    })

    it('does nothing without a token simulation', () => {
        expect(initDiagram([])).toEqual([])
    })
})
