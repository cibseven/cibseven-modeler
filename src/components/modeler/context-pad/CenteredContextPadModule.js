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

// diagram-js opens the context pad beside the element's top right corner. Center it above
// the element instead, 2rem away, and below it where there is no room above. The returned
// position is only the anchor: the pad's CSS (.djs-context-pad-centered) shifts it by half
// its width and, above the element, by its full height.

import inherits from 'inherits-browser'
import ContextPad from 'diagram-js/lib/features/context-pad/ContextPad'
import { isConnection } from 'diagram-js/lib/util/ModelUtil'

// 2rem
const GAP = 32

export const CENTERED_CLASS = 'djs-context-pad-centered'
export const BELOW_CLASS = 'djs-context-pad-below'

export function CenteredContextPad(canvas, elementRegistry, eventBus, scheduler) {
    ContextPad.call(this, canvas, elementRegistry, eventBus, scheduler)
}

inherits(CenteredContextPad, ContextPad)

CenteredContextPad.$inject = ContextPad.$inject

CenteredContextPad.prototype._getPosition = function(target) {
    const html = this._current?.html

    // A connection has no box to center on, so its pad stays beside its end
    if (!Array.isArray(target) && isConnection(target)) {
        html?.classList.remove(CENTERED_CLASS, BELOW_CLASS)
        return ContextPad.prototype._getPosition.call(this, target)
    }

    const containerBounds = this._canvas.getContainer().getBoundingClientRect()
    const targetBounds = this._getTargetBounds(target)
    const above = targetBounds.top - containerBounds.top - GAP
    const fitsAbove = above - (html?.offsetHeight ?? 0) >= 0

    html?.classList.add(CENTERED_CLASS)
    html?.classList.toggle(BELOW_CLASS, !fitsAbove)

    return {
        left: (targetBounds.left + targetBounds.right) / 2 - containerBounds.left,
        top: fitsAbove ? above : targetBounds.bottom - containerBounds.top + GAP
    }
}

export default {
    contextPad: ['type', CenteredContextPad]
}
