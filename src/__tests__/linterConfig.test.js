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
import { Linter } from 'bpmnlint'
import { BpmnModdle } from 'bpmn-moddle'
import fs from 'node:fs'
import path from 'node:path'
import bundle from '../../linterConfig.js'

// linterConfig.js is generated from .bpmnlintrc via `npx bpmnlint-pack-config` and is what
// the modeler actually feeds to bpmn-js-bpmnlint at runtime — .bpmnlintrc itself is never
// read in the browser. These tests lint against the generated bundle for that reason: a
// stale linterConfig.js is exactly the failure mode they exist to catch.

// eslint-disable-next-line no-undef
const repoRoot = path.resolve(__dirname, '../../')

// `di` is the content of the BPMNPlane; without it no-bpmndi reports every element.
function process(body, di = '') {
	return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
${body}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_1">
${di}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
}

// Start -> [AdHocSubProcess containing one unconnected Task] -> End.
// This is the model from the bug report: valid BPMN, but the stale packed rule set flagged it
// with five errors (no-disconnected, no-implicit-start, no-implicit-end, start-event-required,
// end-event-required). bpmnlint >= 11.15 handles ad hoc sub processes in those rules.
const VALID_AD_HOC = process(`    <bpmn:startEvent id="Start"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:adHocSubProcess id="Middle">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:task id="Inside" />
    </bpmn:adHocSubProcess>
    <bpmn:endEvent id="End"><bpmn:incoming>Flow_2</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Middle" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Middle" targetRef="End" />`, `      <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="100" y="102" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Middle_di" bpmnElement="Middle" isExpanded="true"><dc:Bounds x="200" y="60" width="200" height="120" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Inside_di" bpmnElement="Inside"><dc:Bounds x="250" y="80" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="460" y="102" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="136" y="120" /><di:waypoint x="200" y="120" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="400" y="120" /><di:waypoint x="460" y="120" /></bpmndi:BPMNEdge>`)

// Start and end events are not allowed inside an ad hoc sub process.
const AD_HOC_WITH_START_EVENT = process(`    <bpmn:startEvent id="Start"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:adHocSubProcess id="Middle">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:startEvent id="InnerStart" />
      <bpmn:task id="Inside" />
    </bpmn:adHocSubProcess>
    <bpmn:endEvent id="End"><bpmn:incoming>Flow_2</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Middle" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Middle" targetRef="End" />`)

// Two blank start events in one process — a correctness violation that must still be caught,
// so the suite fails if the rule set is ever emptied out rather than narrowed.
const TWO_BLANK_START_EVENTS = process(`    <bpmn:startEvent id="Start_1"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:startEvent id="Start_2"><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:startEvent>
    <bpmn:task id="Task_1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Start_2" targetRef="Task_1" />`)

// Unnamed elements, an inclusive gateway and a task joining two flows without a gateway.
// The CIB overrides turn off label-required, no-inclusive-gateway and fake-join.
const HOUSE_RULES_OFF = process(`    <bpmn:startEvent id="Start"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:inclusiveGateway id="Fork">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:inclusiveGateway>
    <bpmn:task id="Task_A"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_B"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_C">
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:incoming>Flow_5</bpmn:incoming>
      <bpmn:outgoing>Flow_6</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="End"><bpmn:incoming>Flow_6</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Fork" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Fork" targetRef="Task_A" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Fork" targetRef="Task_B" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_A" targetRef="Task_C" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_B" targetRef="Task_C" />
    <bpmn:sequenceFlow id="Flow_6" sourceRef="Task_C" targetRef="End" />`)

// Two identical sequence flows between the same elements.
const DUPLICATE_SEQUENCE_FLOWS = process(`    <bpmn:startEvent id="Start"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:task id="Task_1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="End" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_1" targetRef="End" />`)

async function lint(xml, categories = null) {
	const { rootElement } = await new BpmnModdle().fromXML(xml)
	const linter = new Linter({ config: bundle.config, resolver: bundle.resolver })
	const reports = await linter.lint(rootElement)

	// Linter.lint() returns { <rule>: [ { id, message, category }, ... ] }; flatten it to
	// the rule names that actually produced a report, optionally keeping only some severities.
	return Object.entries(reports)
		.filter(([, issues]) => issues.some(i => !categories || categories.includes(i.category)))
		.map(([rule]) => rule)
}

describe('linterConfig', () => {

	describe('ad hoc sub process', () => {

		it.each([
			'no-disconnected',
			'no-implicit-start',
			'no-implicit-end',
			'start-event-required',
			'end-event-required',
		])('does not report %s for a valid ad hoc sub process', async rule => {
			expect(await lint(VALID_AD_HOC)).not.toContain(rule)
		})

		// The remaining report is camunda-compat/history-time-to-live at severity "info",
		// which the model has no TTL for — Camunda 7 Modeler surfaces that one the same way.
		it('reports no errors or warnings for a valid ad hoc sub process', async () => {
			expect(await lint(VALID_AD_HOC, ['error', 'warn'])).toEqual([])
		})

		it('reports ad-hoc-sub-process for a start event inside an ad hoc sub process', async () => {
			expect(await lint(AD_HOC_WITH_START_EVENT)).toContain('ad-hoc-sub-process')
		})
	})

	describe('correctness rules', () => {

		it('still reports multiple blank start events', async () => {
			expect(await lint(TWO_BLANK_START_EVENTS)).toContain('single-blank-start-event')
		})
	})

	// CIB severity overrides on top of bpmnlint:recommended, see .bpmnlintrc.
	describe('CIB house rules', () => {

		it.each([
			['start-event-required', 'error'],
			['end-event-required', 'error'],
			['no-disconnected', 'error'],
			['no-implicit-start', 'error'],
			['no-bpmndi', 'error'],
			['no-complex-gateway', 'error'],
			['single-event-definition', 'error'],
			['no-implicit-split', 'error'],
			['no-duplicate-sequence-flows', 'error'],
			['conditional-event', 'error'],
			['no-implicit-end', 'warn'],
			['no-gateway-join-fork', 'warn'],
			['superfluous-gateway', 'warn'],
			['superfluous-termination', 'warn'],
		])('enables %s as %s', (rule, severity) => {
			expect(bundle.config.rules[rule]).toBe(severity)
		})

		it.each(['label-required', 'fake-join', 'no-inclusive-gateway'])('disables %s', rule => {
			expect(bundle.config.rules[rule]).toBe(0)
		})

		it('does not report unnamed elements, inclusive gateways or joins into tasks', async () => {
			const reported = await lint(HOUSE_RULES_OFF)
			expect(reported).not.toContain('label-required')
			expect(reported).not.toContain('no-inclusive-gateway')
			expect(reported).not.toContain('fake-join')
		})

		it('reports duplicate sequence flows as an error', async () => {
			expect(await lint(DUPLICATE_SEQUENCE_FLOWS, ['error'])).toContain('no-duplicate-sequence-flows')
		})
	})

	describe('generated bundle', () => {

		// Guards against linterConfig.js drifting from .bpmnlintrc, which is what caused the
		// ad hoc false positives: .bpmnlintrc is not read at runtime, so an un-regenerated
		// bundle silently keeps the old rules. Compares rule names only — severities and rule
		// options are the packer's business, not ours.
		it('has the rules that .bpmnlintrc resolves to', () => {
			const rc = JSON.parse(fs.readFileSync(path.join(repoRoot, '.bpmnlintrc'), 'utf-8'))

			// bpmnlint:recommended, which .bpmnlintrc extends.
			const recommended = [
				'ad-hoc-sub-process',
				'conditional-flows',
				'end-event-required',
				'event-based-gateway',
				'event-sub-process-typed-start-event',
				'fake-join',
				'global',
				'label-required',
				'link-event',
				'no-bpmndi',
				'no-complex-gateway',
				'no-disconnected',
				'no-duplicate-sequence-flows',
				'no-gateway-join-fork',
				'no-implicit-split',
				'no-implicit-end',
				'no-implicit-start',
				'no-inclusive-gateway',
				'no-overlapping-elements',
				'single-blank-start-event',
				'single-event-definition',
				'start-event-required',
				'sub-process-blank-start-event',
				'superfluous-gateway',
				'superfluous-label',
				'superfluous-termination',
			]
			const expected = new Set([
				...recommended,
				// plugin:camunda-compat/camunda-platform-7-24
				'camunda-compat/history-time-to-live',
				...Object.keys(rc.rules),
			])

			expect(new Set(Object.keys(bundle.config.rules))).toEqual(expected)
		})

		it('bundles a rule implementation for every enabled rule', () => {
			const enabled = Object.entries(bundle.config.rules)
				.filter(([, severity]) => (Array.isArray(severity) ? severity[0] : severity) !== 0)
				.map(([rule]) => rule)

			expect(enabled.length).toBeGreaterThan(0)
			for (const rule of enabled) {
				const [pkg, name] = rule.includes('/') ? rule.split('/') : [null, rule]
				const resolve = () => (pkg
					? bundle.resolver.resolveRule(`bpmnlint-plugin-${pkg}`, name)
					: bundle.resolver.resolveRule('bpmnlint', name))
				expect(resolve, `rule <${rule}> is not bundled`).not.toThrow()
			}
		})
	})
})
