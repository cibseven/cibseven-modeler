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
import { resolver } from '../../../linterConfig.js'

describe('custom-conditional-flows bpmnlint rule', () => {
    const { check } = resolver.resolveRule('bpmnlint-plugin-local', 'custom-conditional-flows')()

    function createReporter() {
        const reports = []
        return {
            reports,
            report: (id, message, paths) => reports.push({ id, message, paths }),
        }
    }

    it('reports flows missing conditions when gateway has a default flow', () => {
        const flowWithCondition = { id: 'flow1', conditionExpression: {} }
        const flowMissingCondition = { id: 'flow2' }
        const node = {
            id: 'gateway1',
            default: flowWithCondition,
            outgoing: [flowWithCondition, flowMissingCondition],
        }
        const reporter = createReporter()

        check(node, reporter)

        expect(reporter.reports).toEqual([{
            id: 'flow2',
            message: 'Sequence flow is missing condition or condition type is invalid',
            paths: ['conditionExpression'],
        }])
    })

    it('does not report when all outgoing flows have conditions or are default', () => {
        const defaultFlow = { id: 'flow1' }
        const conditionalFlow = { id: 'flow2', conditionExpression: {} }
        const node = {
            id: 'gateway1',
            default: defaultFlow,
            outgoing: [defaultFlow, conditionalFlow],
        }
        const reporter = createReporter()

        check(node, reporter)

        expect(reporter.reports).toEqual([])
    })

    it('reports exclusive gateway with multiple outgoing flows and no conditional forking', () => {
        const node = {
            id: 'gateway1',
            $type: 'bpmn:ExclusiveGateway',
            outgoing: [{ id: 'flow1' }, { id: 'flow2' }],
        }
        const reporter = createReporter()

        check(node, reporter)

        expect(reporter.reports).toEqual([{
            id: 'gateway1',
            message: 'Sequence flow is missing condition or condition type is invalid',
            paths: ['conditionExpression'],
        }])
    })
})

describe('custom-no-overlapping-elements bpmnlint rule', () => {
    const { check } = resolver.resolveRule('bpmnlint-plugin-local', 'custom-no-overlapping-elements')()

    function createReporter() {
        const reports = []
        return {
            reports,
            report: (id, message) => reports.push({ id, message }),
        }
    }

    function makeBounds(x, y, width = 100, height = 80) {
        return { $type: 'dc:Bounds', x, y, width, height }
    }

    function makeDefinitions(taskBounds) {
        const task1 = { id: 'Task_1', $type: 'bpmn:Task' }
        const task2 = { id: 'Task_2', $type: 'bpmn:Task' }
        const process = {
            id: 'Process_1',
            $type: 'bpmn:Process',
            flowElements: [task1, task2],
        }

        return {
            id: 'Definitions_1',
            $type: 'bpmn:Definitions',
            rootElements: [process],
            diagrams: [{
                plane: {
                    planeElement: [
                        { bpmnElement: task1, bounds: taskBounds[0] },
                        { bpmnElement: task2, bounds: taskBounds[1] },
                    ],
                },
            }],
        }
    }

    it('ignores non-definitions nodes', () => {
        const reporter = createReporter()
        check({ $type: 'bpmn:Process', id: 'proc1' }, reporter)
        expect(reporter.reports).toEqual([])
    })

    it('reports overlapping elements in a process', () => {
        const definitions = makeDefinitions([
            makeBounds(0, 0),
            makeBounds(10, 10),
        ])
        const reporter = createReporter()

        check(definitions, reporter)

        expect(reporter.reports.some(r => r.message === 'Element overlaps with other element')).toBe(true)
    })

    it('does not report non-overlapping elements', () => {
        const definitions = makeDefinitions([
            makeBounds(0, 0),
            makeBounds(200, 0),
        ])
        const reporter = createReporter()

        check(definitions, reporter)

        expect(reporter.reports.filter(r => r.message === 'Element overlaps with other element')).toEqual([])
    })
})
