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
import IconRendererModule from '../../components/modeler/element-templates/IconRendererModule.js'

const ICON_DATA_URI = 'data:image/svg+xml;base64,PHN2Zy8+'

// Extract the constructor from the registered diagram-js module shape.
const ElementTemplateIconRenderer = IconRendererModule.elementTemplateIconRenderer[1]

function makeElement({ type, instanceOfTypes = [type], businessObject = {}, labelTarget, width = 100, height = 80 } = {}) {
    return {
        type,
        width,
        height,
        ...(labelTarget !== undefined ? { labelTarget } : {}),
        businessObject: {
            $instanceOf: (t) => instanceOfTypes.includes(t),
            ...businessObject,
        },
    }
}

function makeRenderer({ template = null } = {}) {
    const eventBus = { on: vi.fn() }
    const handlers = {
        'bpmn:Task': vi.fn((parentGfx, _el, _attrs) => ({ tag: 'task-gfx', parentGfx })),
        'bpmn:StartEvent': vi.fn((parentGfx, _el, _attrs) => ({ tag: 'startEvent-gfx', parentGfx })),
        'bpmn:CallActivity': vi.fn((parentGfx, _el, _attrs) => ({ tag: 'callActivity-gfx', parentGfx })),
        'bpmn:SubProcess': vi.fn((parentGfx, _el, _attrs) => ({ tag: 'subProcess-gfx', parentGfx })),
    }
    const bpmnRenderer = { handlers }
    const elementTemplates = { get: vi.fn(() => template) }
    const instance = new ElementTemplateIconRenderer(eventBus, bpmnRenderer, elementTemplates)
    return { instance, eventBus, bpmnRenderer, elementTemplates, handlers }
}

describe('IconRendererModule — module shape', () => {
    it('registers under the elementTemplateIconRenderer name and is auto-initialised', () => {
        expect(IconRendererModule.__init__).toEqual(['elementTemplateIconRenderer'])
        expect(IconRendererModule.elementTemplateIconRenderer[0]).toBe('type')
        expect(typeof IconRendererModule.elementTemplateIconRenderer[1]).toBe('function')
    })

    it('declares the expected DI dependencies', () => {
        expect(ElementTemplateIconRenderer.$inject).toEqual([
            'eventBus', 'bpmnRenderer', 'elementTemplates',
        ])
    })

    it('subscribes to render events on the eventBus with HIGH_PRIORITY (1250)', () => {
        const { eventBus } = makeRenderer()
        const events = eventBus.on.mock.calls.map(([eventName]) => eventName)
        // BaseRenderer subscribes twice: render.shape/connection and render.getShapePath/Path
        expect(events).toContainEqual(['render.shape', 'render.connection'])
        // Priority arg is the 2nd argument on the BaseRenderer subscription
        const priorities = eventBus.on.mock.calls.map(([, priority]) => priority)
        expect(priorities.every((p) => p === 1250)).toBe(true)
    })
})

describe('IconRendererModule — canRender', () => {
    let renderer
    let elementTemplates

    beforeEach(() => {
        ({ instance: renderer, elementTemplates } = makeRenderer({
            template: { icon: { contents: ICON_DATA_URI } },
        }))
    })

    it('returns true for an Activity that has a template with an icon', () => {
        const el = makeElement({
            type: 'bpmn:ServiceTask',
            instanceOfTypes: ['bpmn:ServiceTask', 'bpmn:Task', 'bpmn:Activity'],
        })
        expect(renderer.canRender(el)).toBe(true)
    })

    it('returns true for an Event that has a template with an icon', () => {
        const el = makeElement({
            type: 'bpmn:StartEvent',
            instanceOfTypes: ['bpmn:StartEvent', 'bpmn:Event'],
        })
        expect(renderer.canRender(el)).toBe(true)
    })

    it('returns false for labels even when a template icon is present', () => {
        const el = makeElement({
            type: 'bpmn:ServiceTask',
            instanceOfTypes: ['bpmn:ServiceTask', 'bpmn:Task', 'bpmn:Activity'],
            labelTarget: { id: 'parent' },
        })
        expect(renderer.canRender(el)).toBe(false)
    })

    it('returns false for elements that are neither Activity nor Event', () => {
        const el = makeElement({
            type: 'bpmn:SequenceFlow',
            instanceOfTypes: ['bpmn:SequenceFlow', 'bpmn:FlowElement'],
        })
        expect(renderer.canRender(el)).toBe(false)
    })

    it('returns false when no template is applied (elementTemplates.get returns null)', () => {
        const { instance, elementTemplates: et } = makeRenderer({ template: null })
        const el = makeElement({
            type: 'bpmn:ServiceTask',
            instanceOfTypes: ['bpmn:ServiceTask', 'bpmn:Task', 'bpmn:Activity'],
        })
        expect(instance.canRender(el)).toBe(false)
        expect(et.get).toHaveBeenCalledWith(el)
    })

    it('returns false when the applied template has no icon', () => {
        const { instance } = makeRenderer({ template: { /* no icon */ } })
        const el = makeElement({
            type: 'bpmn:ServiceTask',
            instanceOfTypes: ['bpmn:ServiceTask', 'bpmn:Task', 'bpmn:Activity'],
        })
        expect(instance.canRender(el)).toBe(false)
    })

    it('returns false when the applied template has an icon object without contents', () => {
        const { instance } = makeRenderer({ template: { icon: {} } })
        const el = makeElement({
            type: 'bpmn:ServiceTask',
            instanceOfTypes: ['bpmn:ServiceTask', 'bpmn:Task', 'bpmn:Activity'],
        })
        expect(instance.canRender(el)).toBe(false)
    })

    it('looks up icon via the elementTemplates service, not the businessObject', () => {
        // BO has no zeebe:modelerTemplateIcon — would defeat upstream renderer.
        // Our impl must resolve via elementTemplates.get(element).icon.contents.
        const el = makeElement({
            type: 'bpmn:ServiceTask',
            instanceOfTypes: ['bpmn:ServiceTask', 'bpmn:Task', 'bpmn:Activity'],
            businessObject: { 'camunda:modelerTemplate': 'com.example.foo' },
        })
        expect(renderer.canRender(el)).toBe(true)
        expect(elementTemplates.get).toHaveBeenCalledWith(el)
    })
})

describe('IconRendererModule — drawShape', () => {
    it('delegates to the bpmn renderer handler for the matching base type with renderIcon=false', () => {
        const { instance, handlers } = makeRenderer({
            template: { icon: { contents: ICON_DATA_URI } },
        })
        const el = makeElement({
            type: 'bpmn:ServiceTask',
            instanceOfTypes: ['bpmn:ServiceTask', 'bpmn:Task', 'bpmn:Activity'],
        })
        const parentGfx = document.createElementNS('http://www.w3.org/2000/svg', 'g')

        instance.drawShape(parentGfx, el, { foo: 'bar' })

        expect(handlers['bpmn:Task']).toHaveBeenCalledTimes(1)
        const [gfxArg, elArg, attrsArg] = handlers['bpmn:Task'].mock.calls[0]
        expect(gfxArg).toBe(parentGfx)
        expect(elArg).toBe(el)
        expect(attrsArg).toEqual({ foo: 'bar', renderIcon: false })
    })

    it('returns the gfx produced by the delegated handler', () => {
        const { instance, handlers } = makeRenderer({
            template: { icon: { contents: ICON_DATA_URI } },
        })
        const fakeGfx = { tag: 'custom' }
        handlers['bpmn:StartEvent'].mockReturnValueOnce(fakeGfx)
        const el = makeElement({
            type: 'bpmn:StartEvent',
            instanceOfTypes: ['bpmn:StartEvent', 'bpmn:Event'],
        })
        const parentGfx = document.createElementNS('http://www.w3.org/2000/svg', 'g')

        const result = instance.drawShape(parentGfx, el)

        expect(result).toBe(fakeGfx)
    })

    it('appends an SVG image with the template icon as href', () => {
        const { instance } = makeRenderer({
            template: { icon: { contents: ICON_DATA_URI } },
        })
        const el = makeElement({
            type: 'bpmn:ServiceTask',
            instanceOfTypes: ['bpmn:ServiceTask', 'bpmn:Task', 'bpmn:Activity'],
        })
        const parentGfx = document.createElementNS('http://www.w3.org/2000/svg', 'g')

        instance.drawShape(parentGfx, el)

        const img = parentGfx.querySelector('image')
        expect(img).not.toBeNull()
        expect(img.getAttribute('href')).toBe(ICON_DATA_URI)
        expect(img.getAttribute('width')).toBe('18')
        expect(img.getAttribute('height')).toBe('18')
    })

    it('positions the icon at fixed top-left padding for Activities', () => {
        const { instance } = makeRenderer({
            template: { icon: { contents: ICON_DATA_URI } },
        })
        const el = makeElement({
            type: 'bpmn:ServiceTask',
            instanceOfTypes: ['bpmn:ServiceTask', 'bpmn:Task', 'bpmn:Activity'],
            width: 100,
            height: 80,
        })
        const parentGfx = document.createElementNS('http://www.w3.org/2000/svg', 'g')

        instance.drawShape(parentGfx, el)

        const img = parentGfx.querySelector('image')
        expect(img.getAttribute('x')).toBe('5')
        expect(img.getAttribute('y')).toBe('5')
    })

    it('centers the icon within the element bounds for Events', () => {
        const { instance } = makeRenderer({
            template: { icon: { contents: ICON_DATA_URI } },
        })
        const el = makeElement({
            type: 'bpmn:StartEvent',
            instanceOfTypes: ['bpmn:StartEvent', 'bpmn:Event'],
            width: 36,
            height: 36,
        })
        const parentGfx = document.createElementNS('http://www.w3.org/2000/svg', 'g')

        instance.drawShape(parentGfx, el)

        const img = parentGfx.querySelector('image')
        // (36 - 18) / 2 = 9
        expect(img.getAttribute('x')).toBe('9')
        expect(img.getAttribute('y')).toBe('9')
    })

    it('uses the CallActivity handler for call activities', () => {
        const { instance, handlers } = makeRenderer({
            template: { icon: { contents: ICON_DATA_URI } },
        })
        const el = makeElement({
            type: 'bpmn:CallActivity',
            instanceOfTypes: ['bpmn:CallActivity', 'bpmn:Activity'],
        })
        const parentGfx = document.createElementNS('http://www.w3.org/2000/svg', 'g')

        instance.drawShape(parentGfx, el)

        expect(handlers['bpmn:CallActivity']).toHaveBeenCalledTimes(1)
        expect(handlers['bpmn:Task']).not.toHaveBeenCalled()
    })

    it('uses the SubProcess handler for subprocesses', () => {
        const { instance, handlers } = makeRenderer({
            template: { icon: { contents: ICON_DATA_URI } },
        })
        const el = makeElement({
            type: 'bpmn:SubProcess',
            instanceOfTypes: ['bpmn:SubProcess', 'bpmn:Activity'],
        })
        const parentGfx = document.createElementNS('http://www.w3.org/2000/svg', 'g')

        instance.drawShape(parentGfx, el)

        expect(handlers['bpmn:SubProcess']).toHaveBeenCalledTimes(1)
    })
})
