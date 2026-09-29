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

// bpmn-js grows a task changed into an expanded sub-process, and a collapsed
// sub-process that gets expanded, around the old centre, covering the neighbours.
// Keep the old left edge instead and push whatever is in the way aside with the
// space tool, inside the same command so a single undo restores the diagram.

import inherits from 'inherits-browser'
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor'
import { selfAndAllChildren } from 'diagram-js/lib/util/Elements'
import { getDirection } from 'diagram-js/lib/features/space-tool/SpaceUtil'
import { is, isAny } from 'bpmn-js/lib/util/ModelUtil'
import { isLabel } from 'bpmn-js/lib/util/LabelUtil'

// after bpmn-js' own replace behaviours
const REPLACE_PRIORITY = 500

// after ToggleElementCollapseBehaviour resized the shape (500)
const TOGGLE_PRIORITY = 250

// largest gap kept to a neighbour that gets pushed
const SPACING = 50

export function growsIntoExpandedSubProcess(oldShape, newData) {
    return is(newData, 'bpmn:SubProcess')
        && newData.isExpanded === true
        && grew(newData, oldShape)
}

// Auto-resize is held back while the shape still sits at bpmn-js' position, otherwise the
// enclosing pool grows for that position and again for the room made afterwards.
const NO_AUTO_RESIZE = { autoResize: false }

function MakeRoomOnExpandBehavior(injector, canvas, modeling, spaceTool) {
    injector.invoke(CommandInterceptor, this)

    this._canvas = canvas
    this._modeling = modeling
    this._spaceTool = spaceTool
    this._autoResize = injector.get('bpmnAutoResize', false)
    this._expanding = null

    this.preExecute('shape.replace', ({ context }) => {
        const { oldShape, newData } = context
        if (!growsIntoExpandedSubProcess(oldShape, newData)) return

        // shape.replace takes centre coordinates
        newData.x = Math.round(oldShape.x + newData.width / 2)
        context.makeRoomFor = bounds(oldShape)
        context.hints = { ...context.hints, ...NO_AUTO_RESIZE }
    })

    this.postExecuted('shape.replace', REPLACE_PRIORITY, ({ context }) => {
        if (!context.makeRoomFor || !context.newShape) return
        this.makeRoom(context.newShape, context.makeRoomFor)
        this.fitParent(context.newShape)
    })

    this.preExecute('shape.toggleCollapse', ({ context }) => {
        const { shape } = context
        this._expanding = null
        if (!is(shape, 'bpmn:SubProcess') || !shape.collapsed) return

        context.makeRoomFor = bounds(shape)
        context.hints = { ...context.hints, ...NO_AUTO_RESIZE }
        this._expanding = shape
    })

    // the resize ToggleElementCollapseBehaviour runs while expanding
    this.preExecute('shape.resize', ({ context }) => {
        if (this._expanding && context.shape === this._expanding) {
            context.hints = { ...context.hints, ...NO_AUTO_RESIZE }
        }
    })

    this.postExecuted('shape.toggleCollapse', TOGGLE_PRIORITY, ({ context }) => {
        const { shape, makeRoomFor: old } = context
        this._expanding = null
        if (!old || shape.collapsed || !grew(shape, old)) return

        // bpmn-js centres the expanded shape on its content and lifts the content's annotations
        // to the process; move all of it back to the old left edge
        const annotations = linkedAnnotations(shape)
        const delta = { x: old.x - shape.x, y: Math.round(old.y + old.height / 2 - (shape.y + shape.height / 2)) }
        if (delta.x || delta.y) this._modeling.moveElements([shape, ...annotations], delta, undefined, NO_AUTO_RESIZE)
        this.makeRoom(shape, old, annotations)
        this.fitParent(shape)
    })
}

inherits(MakeRoomOnExpandBehavior, CommandInterceptor)

MakeRoomOnExpandBehavior.$inject = ['injector', 'canvas', 'modeling', 'spaceTool']

MakeRoomOnExpandBehavior.prototype.fitParent = function(shape) {
    if (shape.parent) this._autoResize?._expand([shape], shape.parent)
}

MakeRoomOnExpandBehavior.prototype.makeRoom = function(shape, oldBounds, extra = []) {
    const own = new Set([...selfAndAllChildren(shape, true), ...(shape.attachers ?? []), ...extra])
    const isOwn = (element) => own.has(element) || own.has(element.labelTarget)

    const elements = selfAndAllChildren(this._canvas.getRootElement(), true).filter((element) => !isOwn(element))
    const neighbours = () => (shape.parent?.children ?? []).filter((element) =>
        !element.waypoints && !isLabel(element) && !isOwn(element) && !isAny(element, ['bpmn:Lane', 'bpmn:Group'])
    )

    const oldRight = oldBounds.x + oldBounds.width
    const oldBottom = oldBounds.y + oldBounds.height

    // sideways first: what that clears needs no vertical push
    this.pushAway(elements, neighbours().filter((n) => n.x > oldRight && overlaps(n, shape, 'y')), 'x', oldRight, end(shape, 'x'), 1)
    this.pushAway(elements, neighbours().filter((n) => end(n, 'x') < oldBounds.x && overlaps(n, shape, 'y')), 'x', oldBounds.x, shape.x, -1)
    this.pushAway(elements, neighbours().filter((n) => n.y > oldBottom && overlaps(n, shape, 'x')), 'y', oldBottom, end(shape, 'y'), 1)
    this.pushAway(elements, neighbours().filter((n) => end(n, 'y') < oldBounds.y && overlaps(n, shape, 'x')), 'y', oldBounds.y, shape.y, -1)
}

// push the candidates past the new edge, keeping their old gap up to SPACING
MakeRoomOnExpandBehavior.prototype.pushAway = function(elements, candidates, axis, start, edge, sign) {
    if (!candidates.length) return

    const near = candidates.map((n) => (sign > 0 ? n[axis] : end(n, axis)))
    const nearest = sign > 0 ? Math.min(...near) : Math.max(...near)
    const delta = edge + sign * Math.min(Math.abs(nearest - start), SPACING) - nearest
    if (delta * sign > 0) this.createSpace(elements, axis, delta, start)
}

MakeRoomOnExpandBehavior.prototype.createSpace = function(elements, axis, delta, start) {
    const { movingShapes, resizingShapes } = this._spaceTool.calculateAdjustments(elements, axis, delta, start)
    const point = axis === 'x' ? { x: delta, y: 0 } : { x: 0, y: delta }
    this._modeling.createSpace(movingShapes, resizingShapes, point, getDirection(axis, delta), start)
}

// text annotations tied to the content of a shape, outside the shape itself
function linkedAnnotations(shape) {
    const inside = new Set(selfAndAllChildren(shape, true))
    const found = new Set()
    for (const element of inside) {
        if (element === shape) continue
        for (const connection of [...(element.incoming ?? []), ...(element.outgoing ?? [])]) {
            if (!is(connection, 'bpmn:Association')) continue
            const other = connection.source === element ? connection.target : connection.source
            if (other && !inside.has(other) && is(other, 'bpmn:TextAnnotation')) found.add(other)
        }
    }
    return [...found]
}

function bounds({ x, y, width, height }) {
    return { x, y, width, height }
}

function grew(shape, old) {
    return shape.width > old.width || shape.height > old.height
}

function end(shape, axis) {
    return shape[axis] + shape[axis === 'x' ? 'width' : 'height']
}

function overlaps(a, b, axis) {
    return a[axis] < end(b, axis) && b[axis] < end(a, axis)
}

export default {
    __init__: ['makeRoomOnExpandBehavior'],
    makeRoomOnExpandBehavior: ['type', MakeRoomOnExpandBehavior]
}
