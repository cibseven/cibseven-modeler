# Element Templates Grouping in Scoped Connector Inputs — Memory / Implementation Notes

## Context

We investigated how to support **grouping of input fields in the properties panel for element templates**, specifically **not only for first-level properties**, but also for **scoped inputs**, with focus on **Camunda connector inputs**.

Repositories discussed:

- `bpmn-io/properties-panel`
- `bpmn-io/bpmn-js-properties-panel`
- `bpmn-io/bpmn-js-element-templates`
- `cibseven/cibseven-modeler`

Branch in `cibseven/cibseven-modeler`:

- `element-templates-grouping-in-scopes`

Compare URL reviewed:

- `https://github.com/cibseven/cibseven-modeler/compare/main...element-templates-grouping-in-scopes`

Current custom file in the branch:

- `src/components/modeler/element-templates/ScopedGroupsModule.js`

Integration point in the app:

- `src/components/modeler/BpmnModeler.vue`

---

## User goal

The user wants to support **grouping of element-template fields for scoped connector inputs** in the properties panel.

This grouping should work for **Camunda connector inputs**, not only for top-level custom properties.

---

## Main findings from investigation

### 1. Out-of-the-box support does not exist for the desired case

The current `bpmn-js-element-templates` implementation supports grouping for **top-level custom properties** through the template `groups` definition.

However, for **connector input parameters**, the code path is different and grouping is not implemented in the same way.

### 2. Top-level custom property grouping exists

In `bpmn-js-element-templates`, top-level custom properties are grouped by `group id` in:

- `src/element-templates/properties-panel/properties/CustomProperties.js`

Relevant behavior:

- properties are grouped via `groupByGroupId(properties)`
- matching template group definitions are found via `findCustomGroup(...)`
- UI groups are created with IDs like:
  - `ElementTemplates__CustomProperties-${groupId}`

This means grouping is already implemented for regular custom properties.

### 3. Connector inputs are handled differently

Connector input parameters are created through:

- `src/element-templates/properties-panel/ElementTemplatesPropertiesProvider.js`
- `src/element-templates/properties-panel/properties/InputProperties.js`

Important observation:

`createInputGroup(...)` creates a single list group:

- group id: `ElementTemplates__Input`
- component: `ListGroup`
- items: created by `InputProperties(...)`

This path does **not** group items by template `property.group`.

### 4. Metadata is likely lost too early for the current post-processing approach

The current upstream `InputProperties(...)` implementation returns an item shaped roughly like:

- `id`
- `label`
- `entries`

Example from upstream:

```javascript
const item = {
  id,
  label: label || name,
  entries
};
```

The original `property` object is not retained on the returned `item`.

That means a downstream provider that tries to split already-created `ElementTemplates__Input` items later may no longer have access to `property.group`.

This is the key architectural reason why simple post-processing of already-built list items is likely insufficient.

---

## What was already implemented in cibseven-modeler

The branch `element-templates-grouping-in-scopes` already contains a custom module:

- `src/components/modeler/element-templates/ScopedGroupsModule.js`

And it is already integrated into the bpmn-js modeler configuration in:

- `src/components/modeler/BpmnModeler.vue`

The registration currently looks correct:

- `ScopedTemplateGroupsModule` is imported
- it is added to `additionalModules`

So the likely issue is **not** that it was forgotten as a module/plugin.

---

## Why the current implementation likely does not work

The current custom provider in `ScopedGroupsModule.js` is focused on groups whose IDs start with:

- `ElementTemplates__CustomGroup-`

It assumes that these groups expose:

- `group.entries`
- and each entry has `entry.property.group`

This approach may work only for actual custom scope groups.

However, the user’s target is **scoped connector inputs**, and those are likely rendered through the upstream `ElementTemplates__Input` list-group path instead.

That means the current implementation is likely operating on the wrong shape:

- it expects `entries`
- but connector input UI is organized via `items`
- and grouping metadata may already be lost by then

So the most likely root cause is:

1. the module is integrated correctly,
2. but it transforms the wrong group type,
3. and it runs after the relevant grouping metadata has already been discarded for input list items.

---

## Agreed direction

The user agrees to proceed with **option 3**.

### Option 3

Implement a new/custom solution that groups **`ElementTemplates__Input` list items properly**, instead of only trying to split already-created scope groups.

This means:

- do **not** rely only on post-processing `ElementTemplates__CustomGroup-*`
- instead, build or rebuild grouped connector input list groups from the original template data
- use the template property definitions while `property.group` is still available

---

## Important implementation decision

### Recommended strategy

Implement a custom bpmn-js/properties-panel module in `cibseven-modeler` that:

1. resolves the active element template via `elementTemplates.get(element)`
2. inspects `elementTemplate.properties`
3. filters relevant connector input properties
4. groups them by `property.group`
5. creates multiple input list groups, instead of a single flat `ElementTemplates__Input`

This should be done in app code through a modeler module/plugin, while continuing to use upstream npm libraries.

### Avoid relying on pure Vue wrapper code

The grouping behavior is determined inside the bpmn-js properties provider layer, not in ordinary Vue presentation code.

So the implementation should stay in a bpmn-js module/plugin registered in `additionalModules`.

---

## Additional required improvements

The following two additions were explicitly requested to be included in the future implementation work.

### 1. Add null checks

Null checks should be added to harden the implementation.

Examples of places where null-safety matters:

- template lookup may return `null`
- group lookup may fail
- expected upstream groups may be absent
- `items` / `entries` may be missing
- selected element may not currently resolve to a template
- connector-specific structures may not exist yet

At minimum, future implementation should defensively guard:

- missing `template`
- missing `template.groups`
- missing target group(s)
- missing `property.group`
- missing `items` / `entries`

### 2. Add debugging/diagnostics

The proposed debugging should also be added.

This is important to verify what group structure actually exists at runtime.

Recommended diagnostics:

- log selected element id/type
- log whether an element template was resolved
- log template id and available template groups
- log final properties-panel groups after upstream providers run
- for each group log:
  - `id`
  - `label`
  - whether it has `entries`
  - whether it has `items`
- specifically check whether the runtime contains:
  - `ElementTemplates__Input`
  - `ElementTemplates__CustomGroup-*`
  - `CamundaPlatform__Input`

The debugging should be easy to remove or guard behind a development flag later.

---

## Upstream code references that informed the decision

### `bpmn-js-element-templates` input item creation

File:

- `src/element-templates/properties-panel/properties/InputProperties.js`

Key conclusion:

- `InputProperties(...)` returns list items without clearly preserving template grouping metadata on the returned item.

### `bpmn-js-element-templates` input group creation

File:

- `src/element-templates/properties-panel/ElementTemplatesPropertiesProvider.js`

Key conclusion:

- connector inputs are collected into one flat `ElementTemplates__Input` `ListGroup`

### `bpmn-js-element-templates` custom property grouping

File:

- `src/element-templates/properties-panel/properties/CustomProperties.js`

Key conclusion:

- top-level custom grouping already exists there, but that mechanism does not automatically apply to connector inputs

---

## Current custom implementation in cibseven-modeler

### Existing custom module

File:

- `src/components/modeler/element-templates/ScopedGroupsModule.js`

Current behavior:

- post-processes groups after upstream element-template provider
- only targets group IDs starting with `ElementTemplates__CustomGroup-`
- partitions `group.entries` by `entry.property.group`
- creates derived groups with labels from top-level template groups

Assessment:

- structurally valid as a module
- probably insufficient for connector input grouping
- likely still useful as reference or partial fallback for true custom scope groups

### Existing registration

File:

- `src/components/modeler/BpmnModeler.vue`

Current behavior:

- imports `ScopedTemplateGroupsModule`
- registers it in `additionalModules`

Assessment:

- module integration is already present

---

## Concrete plan for the upcoming PR

The next PR should implement a solution based on **option 3**.

### PR objective

Support grouping of scoped connector input fields in the properties panel for element templates in `cibseven-modeler`.

### Proposed implementation steps

1. Keep the implementation in a custom bpmn-js module/plugin inside the modeler codebase.
2. Add runtime diagnostics to inspect actual group structures during development.
3. Add null checks around template/group access.
4. Introduce a provider that targets connector input grouping more directly.
5. Reconstruct grouped input list groups from:
   - active template
   - template properties
   - template group definitions
6. Group relevant connector input properties by `property.group`.
7. Create multiple rendered input groups with labels taken from template `groups`.
8. Preserve a fallback/default group for ungrouped properties.
9. Ensure the implementation does not break existing non-grouped behavior.
10. Remove or minimize debug logging once verified.

---

## Open technical note for implementation

A likely challenge is reuse of upstream `InputProperties(...)`.

Because upstream `InputProperties(...)` requires:

- `element`
- `index`
- `property`
- `groups`

and reuses entries from an existing Camunda input group, the custom implementation may need to:

- either reuse that upstream function carefully,
- or recreate enough of the item-building logic itself.

This should be decided during PR implementation after verifying runtime group availability.

---

## If implementation must be redone later

If this work needs to be redone from scratch, start with the following assumptions:

1. The problem is **not primarily Vue integration**.
2. The current module is already registered correctly.
3. The main challenge is **properties-panel provider architecture**.
4. The desired grouping likely requires custom handling of `ElementTemplates__Input`.
5. Pure post-processing of already-generated items may fail because original grouping metadata is no longer preserved.
6. The correct strategy is to rebuild grouped connector input groups from original template properties before or while items are created.

---

## Summary

### Confirmed

- out-of-the-box support for grouping scoped connector inputs is not available
- the current branch already integrates a custom module correctly
- the current custom solution likely targets the wrong rendered group shape
- connector input grouping should be implemented through custom provider/module logic

### Agreed

- the user agrees to implement **option 3**
- null checks should be added
- debugging/diagnostics should be added

### Next action

Create a PR in `cibseven/cibseven-modeler` based on the above plan, implementing grouped connector input handling in a custom modeler module.
