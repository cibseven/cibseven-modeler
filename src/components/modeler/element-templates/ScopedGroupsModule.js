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

// bpmn-js-element-templates (Camunda Platform) emits one flat group per scope
// (e.g. <camunda:Connector>), ignoring the `group` field on each scoped property.
// Normal (non-scoped) properties are grouped via the template's top-level `groups`.
// This provider runs after the upstream one and splits each scope group into
// sub-groups according to `entry.property.group`, using labels from the
// template's top-level `groups`.

// Upstream ElementTemplatesPropertiesProvider registers at priority 300.
// @bpmn-io/properties-panel applies providers in descending priority,
// so a lower number runs later and sees the populated groups.
const POST_TEMPLATES_PRIORITY = 200

const SCOPE_GROUP_ID_PREFIX = 'ElementTemplates__CustomGroup-'

class ScopedTemplateGroupsProvider {
    constructor(elementTemplates, propertiesPanel, translate) {
        this._elementTemplates = elementTemplates
        this._translate = translate
        propertiesPanel.registerProvider(POST_TEMPLATES_PRIORITY, this)
    }

    getGroups(element) {
        return (groups) => {
            const template = this._elementTemplates.get(element)
            const templateGroups = template && Array.isArray(template.groups) ? template.groups : null
            if (!templateGroups || !templateGroups.length) return groups

            const templateGroupsById = Object.create(null)
            for (const tg of templateGroups) templateGroupsById[tg.id] = tg

            const result = []
            for (const group of groups) {
                if (!isScopeGroup(group)) {
                    result.push(group)
                    continue
                }
                result.push(...this._splitScopeGroup(group, templateGroups, templateGroupsById))
            }
            return result
        }
    }

    _splitScopeGroup(group, templateGroups, templateGroupsById) {
        const partitions = new Map()
        const defaults = []

        for (const entry of group.entries || []) {
            const groupId = entry && entry.property && entry.property.group
            if (groupId && templateGroupsById[groupId]) {
                if (!partitions.has(groupId)) partitions.set(groupId, [])
                partitions.get(groupId).push(entry)
            } else {
                defaults.push(entry)
            }
        }

        if (!partitions.size) return [group]

        const out = []
        for (const tg of templateGroups) {
            if (!partitions.has(tg.id)) continue
            out.push({
                ...group,
                id: `${group.id}--${tg.id}`,
                label: this._translate(tg.label || tg.id),
                entries: partitions.get(tg.id),
                shouldOpen: !!tg.openByDefault
            })
        }
        if (defaults.length) {
            out.push({ ...group, entries: defaults })
        }
        return out
    }
}

ScopedTemplateGroupsProvider.$inject = ['elementTemplates', 'propertiesPanel', 'translate']

function isScopeGroup(group) {
    return group && typeof group.id === 'string' && group.id.startsWith(SCOPE_GROUP_ID_PREFIX)
}

export default {
    __init__: ['scopedTemplateGroupsProvider'],
    scopedTemplateGroupsProvider: ['type', ScopedTemplateGroupsProvider]
}
