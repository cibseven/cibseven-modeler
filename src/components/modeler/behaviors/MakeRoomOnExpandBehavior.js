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

// bpmn-js grows a shape replaced by an expanded sub-process to its default size
// around the old centre, covering the neighbours. Keep the left edge instead and
// push whatever is in the way aside with the space tool, inside the replace
// command so a single undo restores the diagram.

import inherits from 'inherits-browser'
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor'
import { selfAndAllChildren } from 'diagram-js/lib/util/Elements'
import { getDirection } from 'diagram-js/lib/features/space-tool/SpaceUtil'
import { is, isAny } from 'bpmn-js/lib/util/ModelUtil'
import { isLabel } from 'bpmn-js/lib/util/LabelUtil'

// after bpmn-js' own replace behaviours
const LOW_PRIORITY = 500

// largest gap kept to a neighbour that gets pushed
const SPACING = 50

export function growsIntoExpandedSubProcess(oldShape, newData) {
    return is(newData, 'bpmn:SubProcess')
        && newData.isExpanded === true
        && (newData.width > oldShape.width || newData.height > oldShape.height)
}

function MakeRoomOnExpandBehavior(injector, canvas, modeling, spaceTool) {
    injector.invoke(CommandInterceptor, this)

    this._canvas = canvas
    this._modeling = modeling
    this._spaceTool = spaceTool

    this.preExecute('shape.replace', ({ context }) => {
        const { oldShape, newData } = context
        if (!growsIntoExpandedSubProcess(oldShape, newData)) return

        // shape.replace takes centre coordinates
        newData.x = Math.round(oldShape.x + newData.width / 2)
        context.makeRoomFor = { x: oldShape.x, y: oldShape.y, width: oldShape.width, height: oldShape.height }
    })

    this.postExecuted('shape.replace', LOW_PRIORITY, ({ context }) => {
        if (!context.makeRoomFor || !context.newShape) return
        this.makeRoom(context.newShape, context.makeRoomFor)
    })
}

inherits(MakeRoomOnExpandBehavior, CommandInterceptor)

MakeRoomOnExpandBehavior.$inject = ['injector', 'canvas', 'modeling', 'spaceTool']

MakeRoomOnExpandBehavior.prototype.makeRoom = function(shape, oldBounds) {
    const own = new Set([...selfAndAllChildren(shape, true), ...(shape.attachers ?? [])])
    const isOwn = (element) => own.has(element) || own.has(element.labelTarget)

    const elements = selfAndAllChildren(this._canvas.getRootElement(), true).filter((element) => !isOwn(element))
    const neighbours = (shape.parent?.children ?? []).filter((element) =>
        !element.waypoints && !isLabel(element) && !isOwn(element) && !isAny(element, ['bpmn:Lane', 'bpmn:Group'])
    )

    const oldRight = oldBounds.x + oldBounds.width
    const ahead = neighbours.filter((n) => n.x > oldRight && overlaps(n, shape, 'y'))
    if (ahead.length) {
        const nearest = Math.min(...ahead.map((n) => n.x))
        const delta = right(shape) + Math.min(nearest - oldRight, SPACING) - nearest
        if (delta > 0) this.createSpace(elements, 'x', delta, oldRight)
    }

    const oldBottom = oldBounds.y + oldBounds.height
    const below = neighbours.filter((n) => n.y > oldBottom && overlaps(n, shape, 'x'))
    if (below.length) {
        const nearest = Math.min(...below.map((n) => n.y))
        const delta = bottom(shape) + Math.min(nearest - oldBottom, SPACING) - nearest
        if (delta > 0) this.createSpace(elements, 'y', delta, oldBottom)
    }

    const oldTop = oldBounds.y
    const above = neighbours.filter((n) => bottom(n) < oldTop && overlaps(n, shape, 'x'))
    if (above.length) {
        const nearest = Math.max(...above.map(bottom))
        const delta = shape.y - Math.min(oldTop - nearest, SPACING) - nearest
        if (delta < 0) this.createSpace(elements, 'y', delta, oldTop)
    }
}

MakeRoomOnExpandBehavior.prototype.createSpace = function(elements, axis, delta, start) {
    const { movingShapes, resizingShapes } = this._spaceTool.calculateAdjustments(elements, axis, delta, start)
    const point = axis === 'x' ? { x: delta, y: 0 } : { x: 0, y: delta }
    this._modeling.createSpace(movingShapes, resizingShapes, point, getDirection(axis, delta), start)
}

function right(shape) {
    return shape.x + shape.width
}

function bottom(shape) {
    return shape.y + shape.height
}

function overlaps(a, b, axis) {
    const size = axis === 'x' ? 'width' : 'height'
    return a[axis] < b[axis] + b[size] && b[axis] < a[axis] + a[size]
}

export default {
    __init__: ['makeRoomOnExpandBehavior'],
    makeRoomOnExpandBehavior: ['type', MakeRoomOnExpandBehavior]
}
