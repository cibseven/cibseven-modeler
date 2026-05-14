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

// CIB seven variant of @bpmn-io/element-template-icon-renderer.
//
// The upstream renderer reads icons from `zeebe:modelerTemplateIcon` on the
// businessObject. The element-templates handler used here never persists an
// icon attribute on the BO, so the upstream renderer's canRender() always
// returns false. This implementation instead resolves the icon by looking up
// the applied template via the `elementTemplates` service using the
// `camunda:modelerTemplate` ID stored on the BO.

import inherits from 'inherits-browser'
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import { is, isAny } from 'bpmn-js/lib/util/ModelUtil'
import { isLabel } from 'bpmn-js/lib/util/LabelUtil'
import {
    append as svgAppend,
    attr as svgAttr,
    create as svgCreate
} from 'tiny-svg'

const HIGH_PRIORITY = 1250

function ElementTemplateIconRenderer(eventBus, bpmnRenderer, elementTemplates) {
    this._bpmnRenderer = bpmnRenderer
    this._elementTemplates = elementTemplates
    BaseRenderer.call(this, eventBus, HIGH_PRIORITY)
}

inherits(ElementTemplateIconRenderer, BaseRenderer)

ElementTemplateIconRenderer.prototype._getIcon = function(element) {
    const template = this._elementTemplates.get(element)
    return template && template.icon && template.icon.contents
}

ElementTemplateIconRenderer.prototype.canRender = function(element) {
    if (isLabel(element)) return false
    if (!isAny(element, ['bpmn:Activity', 'bpmn:Event'])) return false
    return !!this._getIcon(element)
}

ElementTemplateIconRenderer.prototype.drawShape = function(parentGfx, element, attrs = {}) {
    const baseType = [
        'bpmn:BoundaryEvent',
        'bpmn:CallActivity',
        'bpmn:EndEvent',
        'bpmn:IntermediateCatchEvent',
        'bpmn:IntermediateThrowEvent',
        'bpmn:StartEvent',
        'bpmn:Task',
        'bpmn:AdHocSubProcess',
        'bpmn:Transaction',
        'bpmn:SubProcess'
    ].find(t => is(element, t))

    const renderer = this._bpmnRenderer.handlers[baseType]
    const gfx = renderer(parentGfx, element, { ...attrs, renderIcon: false })

    const icon = this._getIcon(element)
    const size = 18
    const padding = is(element, 'bpmn:Activity')
        ? { x: 5, y: 5 }
        : { x: (element.width - size) / 2, y: (element.height - size) / 2 }

    const img = svgCreate('image')
    svgAttr(img, { href: icon, width: size, height: size, ...padding })
    svgAppend(parentGfx, img)

    return gfx
}

ElementTemplateIconRenderer.$inject = ['eventBus', 'bpmnRenderer', 'elementTemplates']

export default {
    __init__: ['elementTemplateIconRenderer'],
    elementTemplateIconRenderer: ['type', ElementTemplateIconRenderer]
}
