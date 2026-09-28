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
import EventBus from 'diagram-js/lib/core/EventBus'
import SpaceTool from 'diagram-js/lib/features/space-tool/SpaceTool'
import MakeRoomOnExpandModule, { growsIntoExpandedSubProcess } from '../../../components/modeler/behaviors/MakeRoomOnExpandBehavior.js'

const MakeRoomOnExpandBehavior = MakeRoomOnExpandModule.makeRoomOnExpandBehavior[1]

const TASK = ['bpmn:Task', 'bpmn:Activity']
const EVENT = ['bpmn:StartEvent', 'bpmn:Event']
const SUB_PROCESS = ['bpmn:SubProcess', 'bpmn:Activity']
const AD_HOC = ['bpmn:AdHocSubProcess', 'bpmn:SubProcess', 'bpmn:Activity']

function bo(types) {
    return { $instanceOf: (type) => types.includes(type) }
}

function shape(id, x, y, width, height, types = TASK) {
    return { id, x, y, width, height, businessObject: bo(types), children: [], attachers: [], incoming: [], outgoing: [] }
}

function add(parent, ...children) {
    for (const child of children) {
        child.parent = parent
        parent.children.push(child)
    }
    return parent
}

function label(target) {
    const l = { id: `${target.id}_label`, x: target.x, y: target.y + target.height + 5, width: 40, height: 14, labelTarget: target, children: [], businessObject: target.businessObject }
    target.label = l
    return l
}

function flow(id, source, target) {
    return { id, source, target, waypoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }], children: [], businessObject: bo(['bpmn:SequenceFlow']) }
}

function setup() {
    const eventBus = new EventBus()
    const root = { id: 'root', children: [], businessObject: bo(['bpmn:Process']) }
    const canvas = { getRootElement: () => root }
    const move = (shapes, delta) => {
        for (const s of shapes) {
            s.x += delta.x
            s.y += delta.y
        }
    }
    const modeling = {
        // move the shapes like the real commands, so later steps see the new positions
        createSpace: vi.fn((movingShapes, _resizingShapes, delta) => move(movingShapes, delta)),
        moveElements: vi.fn((shapes, delta) => move(shapes.flatMap((s) => [s, ...s.children, ...s.attachers]), delta))
    }
    const spaceTool = { _rules: { allowed: () => true }, calculateAdjustments: SpaceTool.prototype.calculateAdjustments }
    const injector = { invoke: (Fn, that) => Fn.call(that, eventBus) }
    const behavior = new MakeRoomOnExpandBehavior(injector, canvas, modeling, spaceTool)
    return { eventBus, root, modeling, behavior }
}

// the task the user changes, and the expanded sub-process bpmn-js puts in its place
const OLD = { x: 200, y: 100, width: 100, height: 80 }

function expanded(types = AD_HOC) {
    return shape('SubProcess_1', OLD.x, 40, 350, 200, types)
}

function replace(eventBus, oldShape, newShape) {
    const context = {
        oldShape,
        newData: { businessObject: newShape.businessObject, isExpanded: true, x: 250, y: 140, width: newShape.width, height: newShape.height },
        hints: {}
    }
    eventBus.fire('commandStack.shape.replace.preExecute', { command: 'shape.replace', context })
    context.newShape = newShape
    eventBus.fire('commandStack.shape.replace.postExecuted', { command: 'shape.replace', context })
    return context
}

describe('growsIntoExpandedSubProcess', () => {
    const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)

    it('is true for a task turned into a bigger expanded (ad-hoc) sub-process', () => {
        expect(growsIntoExpandedSubProcess(task, { businessObject: bo(AD_HOC), isExpanded: true, width: 350, height: 200 })).toBe(true)
        expect(growsIntoExpandedSubProcess(task, { businessObject: bo(SUB_PROCESS), isExpanded: true, width: 350, height: 200 })).toBe(true)
    })

    it('is false for a collapsed sub-process, another task type, or no growth', () => {
        expect(growsIntoExpandedSubProcess(task, { businessObject: bo(SUB_PROCESS), isExpanded: false, width: 100, height: 80 })).toBe(false)
        expect(growsIntoExpandedSubProcess(task, { businessObject: bo(TASK), width: 100, height: 80 })).toBe(false)
        expect(growsIntoExpandedSubProcess(task, { businessObject: bo(SUB_PROCESS), isExpanded: true, width: 100, height: 80 })).toBe(false)
    })
})

describe('MakeRoomOnExpandBehavior', () => {
    let eventBus, root, modeling, behavior

    beforeEach(() => {
        ({ eventBus, root, modeling, behavior } = setup())
    })

    it('registers as an auto-initialised behaviour with its dependencies', () => {
        expect(MakeRoomOnExpandModule.__init__).toEqual(['makeRoomOnExpandBehavior'])
        expect(MakeRoomOnExpandBehavior.$inject).toEqual(['injector', 'canvas', 'modeling', 'spaceTool'])
    })

    it('keeps the left edge of the task instead of centring the sub-process on it', () => {
        const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)
        add(root, task)

        const context = replace(eventBus, task, expanded())

        // centre coordinates: left edge 200 + half of 350
        expect(context.newData.x).toBe(375)
        expect(context.newData.y).toBe(140)
        expect(context.makeRoomFor).toEqual(OLD)
    })

    it('leaves a replace that does not grow into an expanded sub-process alone', () => {
        const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)
        add(root, task, shape('End_1', 352, 122, 36, 36, EVENT))
        const context = { oldShape: task, newData: { businessObject: bo(TASK), x: 250, y: 140, width: 100, height: 80 } }

        eventBus.fire('commandStack.shape.replace.preExecute', { command: 'shape.replace', context })
        context.newShape = shape('Task_2', OLD.x, OLD.y, OLD.width, OLD.height)
        eventBus.fire('commandStack.shape.replace.postExecuted', { command: 'shape.replace', context })

        expect(context.newData.x).toBe(250)
        expect(context.makeRoomFor).toBeUndefined()
        expect(modeling.createSpace).not.toHaveBeenCalled()
    })

    it('pushes Start → Task → End apart so both events stay outside the sub-process', () => {
        const start = shape('Start_1', 130, 122, 36, 36, EVENT)
        const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)
        const end = shape('End_1', 352, 122, 36, 36, EVENT)
        const endLabel = label(end)
        const subProcess = expanded()
        add(root, start, end, endLabel, subProcess, flow('Flow_1', start, subProcess), flow('Flow_2', subProcess, end))

        replace(eventBus, task, subProcess)

        expect(modeling.createSpace).toHaveBeenCalledTimes(1)
        const [movingShapes, resizingShapes, delta, direction, start_] = modeling.createSpace.mock.calls[0]
        // end keeps its original gap of 52 capped to 50 behind the new right edge (550)
        expect(delta).toEqual({ x: 248, y: 0 })
        expect(direction).toBe('e')
        expect(start_).toBe(300)
        expect(movingShapes).toEqual(expect.arrayContaining([end, endLabel]))
        expect(movingShapes).not.toContain(start)
        expect(movingShapes).not.toContain(subProcess)
        expect(resizingShapes).toEqual([])
        expect(end.x).toBe(600)
        expect(start.x).toBe(130)
    })

    it('grows the enclosing pool instead of moving it', () => {
        const pool = shape('Pool_1', 0, 0, 600, 300, ['bpmn:Participant'])
        const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)
        const end = shape('End_1', 352, 122, 36, 36, EVENT)
        const subProcess = expanded()
        add(root, add(pool, end, subProcess))

        replace(eventBus, task, subProcess)

        const [movingShapes, resizingShapes] = modeling.createSpace.mock.calls[0]
        expect(resizingShapes).toEqual([pool])
        expect(movingShapes).toEqual([end])
    })

    it('does nothing when the neighbours are already far enough away', () => {
        const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)
        const end = shape('End_1', 1000, 122, 36, 36, EVENT)
        const lane = shape('Lane_1', 0, 0, 1200, 400, ['bpmn:Lane'])
        add(root, lane, end, expanded())

        replace(eventBus, task, root.children[2])

        expect(modeling.createSpace).not.toHaveBeenCalled()
    })

    it('pushes neighbours right under or above the sub-process away vertically', () => {
        const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)
        const below = shape('Below_1', 220, 260, 100, 80)
        const above = shape('Above_1', 220, -60, 100, 80)
        add(root, below, above, expanded())

        replace(eventBus, task, root.children[2])

        expect(modeling.createSpace).toHaveBeenCalledTimes(2)
        const [down, up] = modeling.createSpace.mock.calls
        // new bottom 240, kept gap 50
        expect(down.slice(2)).toEqual([{ x: 0, y: 30 }, 's', 180])
        expect(down[0]).toEqual([below])
        // new top 40, kept gap 50
        expect(up.slice(2)).toEqual([{ x: 0, y: -30 }, 'n', 100])
        expect(up[0]).toEqual([above])
        expect(below.y).toBe(290)
        expect(above.y).toBe(-90)
    })

    it('never moves the sub-process\'s own content or boundary events', () => {
        const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)
        const subProcess = expanded(SUB_PROCESS)
        const inner = shape('InnerStart_1', 250, 122, 36, 36, EVENT)
        add(subProcess, inner)
        const boundary = shape('Boundary_1', 530, 222, 36, 36, ['bpmn:BoundaryEvent', 'bpmn:Event'])
        boundary.host = subProcess
        subProcess.attachers.push(boundary)
        const boundaryLabel = label(boundary)
        const end = shape('End_1', 352, 122, 36, 36, EVENT)
        add(root, subProcess, boundary, boundaryLabel, end)

        replace(eventBus, task, subProcess)

        const [movingShapes, resizingShapes] = modeling.createSpace.mock.calls[0]
        expect(movingShapes).toEqual([end])
        expect(resizingShapes).toEqual([])
        expect(inner.x).toBe(250)
        expect(boundary.x).toBe(530)
    })

    it('skips the post step when the replace produced no shape', () => {
        const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)
        const context = { oldShape: task, newData: { businessObject: bo(AD_HOC), isExpanded: true, x: 250, y: 140, width: 350, height: 200 } }

        eventBus.fire('commandStack.shape.replace.preExecute', { command: 'shape.replace', context })
        eventBus.fire('commandStack.shape.replace.postExecuted', { command: 'shape.replace', context })

        expect(modeling.createSpace).not.toHaveBeenCalled()
    })

    it('pushes a neighbour on the left away when the shape grew to the left', () => {
        const before = shape('Before_1', 60, 100, 100, 80)
        const subProcess = expanded()
        subProcess.x = 100
        add(root, before, subProcess)

        behavior.makeRoom(subProcess, OLD)

        const [movingShapes, , delta, direction, start] = modeling.createSpace.mock.calls[0]
        // old gap 40 kept in front of the new left edge 100
        expect([delta, direction, start]).toEqual([{ x: -100, y: 0 }, 'w', 200])
        expect(movingShapes).toEqual([before])
        expect(before.x).toBe(-40)
    })
})

describe('MakeRoomOnExpandBehavior — expanding a collapsed sub-process', () => {
    let eventBus, root, modeling

    beforeEach(() => {
        ({ eventBus, root, modeling } = setup())
    })

    // what bpmn-js does to the shape between the two hooks
    function toggle(subProcess, expandTo) {
        const context = { shape: subProcess }
        eventBus.fire('commandStack.shape.toggleCollapse.preExecute', { command: 'shape.toggleCollapse', context })
        subProcess.collapsed = !subProcess.collapsed
        Object.assign(subProcess, expandTo)
        eventBus.fire('commandStack.shape.toggleCollapse.postExecuted', { command: 'shape.toggleCollapse', context })
        return context
    }

    function collapsed() {
        const subProcess = shape('SubProcess_1', OLD.x, OLD.y, OLD.width, OLD.height, SUB_PROCESS)
        subProcess.collapsed = true
        return subProcess
    }

    it('moves the expanded shape and its content back to the old left edge, then makes room', () => {
        const subProcess = collapsed()
        const inner = shape('InnerTask_1', 150, 150, 100, 80)
        add(subProcess, inner)
        const end = shape('End_1', 352, 122, 36, 36, EVENT)
        add(root, subProcess, end)

        // bpmn-js centred it on its content
        const context = toggle(subProcess, { x: 100, y: 60, width: 350, height: 200 })

        expect(context.makeRoomFor).toEqual(OLD)
        expect(modeling.moveElements).toHaveBeenCalledWith([subProcess], { x: 100, y: -20 })
        expect(subProcess.x).toBe(200)
        expect(subProcess.y).toBe(40)
        expect(inner.x).toBe(250)
        expect(modeling.createSpace).toHaveBeenCalledTimes(1)
        expect(modeling.createSpace.mock.calls[0].slice(2)).toEqual([{ x: 248, y: 0 }, 'e', 300])
        expect(end.x).toBe(600)
    })

    it('does not move a shape that already sits at the old left edge', () => {
        const subProcess = collapsed()
        add(root, subProcess)

        toggle(subProcess, { x: 200, y: 40, width: 350, height: 200 })

        expect(modeling.moveElements).not.toHaveBeenCalled()
    })

    it('leaves collapsing, a shape that did not grow and other element types alone', () => {
        const open = shape('SubProcess_2', OLD.x, 40, 350, 200, SUB_PROCESS)
        open.collapsed = false
        const same = collapsed()
        const task = shape('Task_1', OLD.x, OLD.y, OLD.width, OLD.height)
        task.collapsed = true
        add(root, open, same, task, shape('End_1', 352, 122, 36, 36, EVENT))

        const collapsing = toggle(open, { x: 325, y: 100, width: 100, height: 80 })
        toggle(same, {})
        const other = toggle(task, { width: 350, height: 200 })

        expect(collapsing.makeRoomFor).toBeUndefined()
        expect(other.makeRoomFor).toBeUndefined()
        expect(modeling.moveElements).not.toHaveBeenCalled()
        expect(modeling.createSpace).not.toHaveBeenCalled()
    })
})
