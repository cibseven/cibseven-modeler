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

// bpmn-js-token-simulation names its speed buttons "Set animation speed = Slow/Normal/Fast", in English
// only. Word them "Slow/Normal/Fast animation speed" and translate them. The token simulation comes from
// the host (EE) among the extra modules, so this does nothing where it is absent.

const WORDING = {
    0.5: 'Slow animation speed',
    1: 'Normal animation speed',
    2: 'Fast animation speed'
}

export function AnimationSpeedWording(eventBus, canvas, translate) {
    eventBus.on('diagram.init', () => {
        canvas.getContainer().querySelectorAll('.bts-animation-speed-button[data-speed]').forEach(button => {
            const wording = WORDING[button.dataset.speed]
            if (!wording) return
            button.title = translate(wording)
            button.setAttribute('aria-label', translate(wording))
        })
    })
}

AnimationSpeedWording.$inject = ['eventBus', 'canvas', 'translate']

export default {
    __init__: ['animationSpeedWording'],
    animationSpeedWording: ['type', AnimationSpeedWording]
}
