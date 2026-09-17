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

function process(body) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
${body}
  </bpmn:process>
</bpmn:definitions>`
}

// Start -> [AdHocSubProcess containing one unconnected Task] -> End.
// This is the model from the bug report: valid BPMN, but the old packed rule set flagged it
// with five errors (no-disconnected, no-implicit-start, no-implicit-end, start-event-required,
// end-event-required).
const VALID_AD_HOC = process(`    <bpmn:startEvent id="Start"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:adHocSubProcess id="Middle">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:task id="Inside" />
    </bpmn:adHocSubProcess>
    <bpmn:endEvent id="End"><bpmn:incoming>Flow_2</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Middle" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Middle" targetRef="End" />`)

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

	describe('generated bundle', () => {

		// Guards against linterConfig.js drifting from .bpmnlintrc, which is what caused the
		// ad hoc false positives: .bpmnlintrc is not read at runtime, so an un-regenerated
		// bundle silently keeps the old rules. Compares rule names only — severities and rule
		// options are the packer's business, not ours.
		it('has the rules that .bpmnlintrc resolves to', () => {
			const rc = JSON.parse(fs.readFileSync(path.join(repoRoot, '.bpmnlintrc'), 'utf-8'))

			// bpmnlint:correctness, which .bpmnlintrc extends.
			const correctness = [
				'ad-hoc-sub-process',
				'conditional-event',
				'event-based-gateway',
				'event-sub-process-typed-start-event',
				'link-event',
				'no-duplicate-sequence-flows',
				'sub-process-blank-start-event',
				'single-blank-start-event',
			]
			const expected = new Set([
				...correctness,
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

		it('no longer enables the recommended-only rules that broke ad hoc sub processes', () => {
			for (const rule of ['no-disconnected', 'no-implicit-start', 'no-implicit-end', 'start-event-required', 'end-event-required']) {
				expect(bundle.config.rules).not.toHaveProperty(rule)
			}
		})
	})
})
