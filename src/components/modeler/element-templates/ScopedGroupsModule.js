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

const POST_TEMPLATES_PRIORITY = 200

const ELEMENT_TEMPLATES_INPUT_GROUP_ID = 'ElementTemplates__Input'
const SCOPE_GROUP_ID_PREFIX = 'ElementTemplates__CustomGroup-'
const CAMUNDA_PLATFORM_INPUT_GROUP_ID = 'CamundaPlatform__Input'
const CAMUNDA_INPUT_PARAMETER_TYPE = 'camunda:inputParameter'

class ScopedTemplateGroupsProvider {
    constructor(elementTemplates, propertiesPanel, translate) {
        this._elementTemplates = elementTemplates
        this._translate = translate
        this._debugEnabled = !!(import.meta.env?.DEV || import.meta.env?.VITE_DEBUG_TEMPLATE_GROUPING === 'true')
        propertiesPanel.registerProvider(POST_TEMPLATES_PRIORITY, this)
    }

    getGroups(element) {
        return (groups) => {
            if (!Array.isArray(groups)) {
                return groups
            }

            const template = this._elementTemplates?.get?.(element) || null
            const templateGroups = getTemplateGroups(template)
            const templateGroupsById = createTemplateGroupLookup(templateGroups)

            this._logElementSelection(element, template, templateGroups)
            this._logGroups('upstream', groups)

            const processedGroups = groups.flatMap((group) => {
                if (isElementTemplatesInputGroup(group)) {
                    return splitElementTemplateInputGroup({
                        group,
                        template,
                        templateGroups,
                        templateGroupsById,
                        translate: this._translate
                    })
                }

                if (isScopeGroup(group)) {
                    return splitScopeGroupEntries({
                        group,
                        templateGroups,
                        templateGroupsById,
                        translate: this._translate
                    })
                }

                return [group]
            })

            this._logGroups('final', processedGroups)

            return processedGroups
        }
    }

    _logElementSelection(element, template, templateGroups) {
        if (!this._debugEnabled || !globalThis.console?.debug) {
            return
        }

        const elementId = element?.id || null
        const elementType = element?.type || element?.businessObject?.$type || null
        const resolved = !!template
        const templateId = template?.id || null
        const availableTemplateGroups = templateGroups.map((group) => ({
            id: group.id,
            label: group.label || null
        }))

        this._debugLog('element-template-context', {
            elementId,
            elementType,
            templateResolved: resolved,
            templateId,
            availableTemplateGroups
        })
    }

    _logGroups(stage, groups) {
        if (!this._debugEnabled || !globalThis.console?.debug || !Array.isArray(groups)) {
            return
        }

        const summary = groups.map((group) => ({
            id: group?.id || null,
            label: group?.label || null,
            hasEntries: Array.isArray(group?.entries) && group.entries.length > 0,
            hasItems: Array.isArray(group?.items) && group.items.length > 0
        }))
        const visibility = summary.reduce((acc, group) => {
            const groupId = group.id
            if (groupId === ELEMENT_TEMPLATES_INPUT_GROUP_ID) {
                acc.elementTemplatesInput = true
            } else if (groupId === CAMUNDA_PLATFORM_INPUT_GROUP_ID) {
                acc.camundaPlatformInput = true
            } else if (typeof groupId === 'string' && groupId.startsWith(SCOPE_GROUP_ID_PREFIX)) {
                acc.customScopeGroups = true
            }
            return acc
        }, {
            elementTemplatesInput: false,
            customScopeGroups: false,
            camundaPlatformInput: false
        })

        this._debugLog('properties-panel-groups', {
            stage,
            groups: summary,
            visibility
        })
    }

    _debugLog(message, payload) {
        if (!this._debugEnabled || !globalThis.console?.debug) {
            return
        }

        console.debug(`[ScopedTemplateGroupsProvider] ${message}`, payload)
    }
}

function getTemplateGroups(template) {
    if (!Array.isArray(template?.groups)) {
        return []
    }
    return template.groups.filter((group) => !!group?.id)
}

function createTemplateGroupLookup(templateGroups) {
    return templateGroups.reduce((acc, templateGroup) => {
        acc[templateGroup.id] = templateGroup
        return acc
    }, Object.create(null))
}

function getInputProperties(template) {
    if (!Array.isArray(template?.properties)) {
        return []
    }

    return template.properties.filter((property) => {
        const bindingType = property?.binding?.type
        return !property?.type && bindingType === CAMUNDA_INPUT_PARAMETER_TYPE
    })
}

function mapInputPropertiesToItems(properties, sourceItems) {
    const pairs = []
    const remainingItems = [...sourceItems]

    for (const property of properties) {
        if (!remainingItems.length) {
            continue
        }

        const matchingIndex = typeof property?.id === 'string'
            ? remainingItems.findIndex((item) => item?.id === property.id)
            : -1
        const itemIndex = matchingIndex >= 0 ? matchingIndex : 0
        const [item] = remainingItems.splice(itemIndex, 1)

        pairs.push({
            property,
            item
        })
    }

    return { pairs, remainingItems }
}

function getTranslatedLabel(translate, templateGroup) {
    const rawLabel = templateGroup?.label || templateGroup?.id
    if (typeof translate !== 'function') {
        return rawLabel
    }
    return translate(rawLabel)
}

export function splitElementTemplateInputGroup({
    group,
    template,
    templateGroups,
    templateGroupsById,
    translate
}) {
    if (!isElementTemplatesInputGroup(group)) {
        return [group]
    }

    if (!Array.isArray(group?.items) || !group.items.length) {
        return [group]
    }

    const inputProperties = getInputProperties(template)
    if (!inputProperties.length || !templateGroups.length) {
        return [group]
    }

    const { pairs, remainingItems } = mapInputPropertiesToItems(inputProperties, group.items)
    if (!pairs.length) {
        return [group]
    }

    const partitions = new Map()
    const defaults = [...remainingItems]

    for (const pair of pairs) {
        const groupId = pair?.property?.group
        const item = pair?.item

        if (!item) {
            continue
        }

        if (groupId && templateGroupsById[groupId]) {
            if (!partitions.has(groupId)) {
                partitions.set(groupId, [])
            }
            partitions.get(groupId).push(item)
        } else {
            defaults.push(item)
        }
    }

    if (!partitions.size) {
        return [group]
    }

    const out = []
    for (const templateGroup of templateGroups) {
        if (!partitions.has(templateGroup.id)) {
            continue
        }

        out.push({
            ...group,
            id: `${group.id}--${templateGroup.id}`,
            label: getTranslatedLabel(translate, templateGroup),
            items: partitions.get(templateGroup.id),
            shouldOpen: !!templateGroup.openByDefault
        })
    }

    if (defaults.length) {
        out.push({
            ...group,
            items: defaults
        })
    }

    return out.length ? out : [group]
}

export function splitScopeGroupEntries({
    group,
    templateGroups,
    templateGroupsById,
    translate
}) {
    if (!isScopeGroup(group)) {
        return [group]
    }

    if (!Array.isArray(group?.entries) || !group.entries.length) {
        return [group]
    }

    if (!templateGroups.length) {
        return [group]
    }

    const partitions = new Map()
    const defaults = []

    for (const entry of group.entries) {
        const groupId = entry?.property?.group
        if (groupId && templateGroupsById[groupId]) {
            if (!partitions.has(groupId)) {
                partitions.set(groupId, [])
            }
            partitions.get(groupId).push(entry)
            continue
        }

        defaults.push(entry)
    }

    if (!partitions.size) {
        return [group]
    }

    const out = []
    for (const templateGroup of templateGroups) {
        if (!partitions.has(templateGroup.id)) {
            continue
        }

        out.push({
            ...group,
            id: `${group.id}--${templateGroup.id}`,
            label: getTranslatedLabel(translate, templateGroup),
            entries: partitions.get(templateGroup.id),
            shouldOpen: !!templateGroup.openByDefault
        })
    }

    if (defaults.length) {
        out.push({ ...group, entries: defaults })
    }

    return out.length ? out : [group]
}

ScopedTemplateGroupsProvider.$inject = ['elementTemplates', 'propertiesPanel', 'translate']

function isScopeGroup(group) {
    return group && typeof group.id === 'string' && group.id.startsWith(SCOPE_GROUP_ID_PREFIX)
}

function isElementTemplatesInputGroup(group) {
    return group && group.id === ELEMENT_TEMPLATES_INPUT_GROUP_ID
}

export default {
    __init__: ['scopedTemplateGroupsProvider'],
    scopedTemplateGroupsProvider: ['type', ScopedTemplateGroupsProvider]
}
