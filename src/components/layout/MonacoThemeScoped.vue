<!--
  Copyright CIB software GmbH and/or licensed to CIB software GmbH
  under one or more contributor license agreements. See the NOTICE file
  distributed with this work for additional information regarding copyright
  ownership. CIB software licenses this file to you under the Apache License,
  Version 2.0; you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
-->
<template>
  <div :class="`MonacoThemeScope-theme-${overrideTheme}`" class="h-100" ref="containerRef">
    <slot></slot>
  </div>
</template>

<script setup>
//components that solve the monaco editors sharing the same styles
import { ref, onMounted } from 'vue'
import { IStandaloneThemeService } from 'monaco-editor/esm/vs/editor/standalone/common/standaloneTheme'
import { StandaloneServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices'
import { Registry } from 'monaco-editor/esm/vs/platform/registry/common/platform.js'
import { asCssVariableName, Extensions } from 'monaco-editor/esm/vs/platform/theme/common/colorRegistry'
const getColorVariables = theme => {
  const colorRegistry = Registry.as(Extensions.ColorContribution)
  const allThemes = StandaloneServices.get(IStandaloneThemeService)._knownThemes
  const customTheme = allThemes.get(theme)

  return colorRegistry
    .getColors()
    .map(item => {
      const color = customTheme?.getColor(item.id, true)
      if (color) {
        return {
          key: asCssVariableName(item.id),
          value: color.toString(),
        }
      }
    })
    .filter(Boolean)
}

const { overrideTheme } = defineProps({
  overrideTheme: {
    type: String,
    required: true
  }
})

const containerRef = ref(null)

onMounted(() => {
  const styleEleId = `MonacoThemeScope-theme-${overrideTheme}`
  let styleEle = document.getElementById(styleEleId)

  if (!styleEle) {
    styleEle = document.createElement('style')
    styleEle.id = styleEleId
    document.head.appendChild(styleEle)
  }

  const mergedColors = {}
  const colors1 = getColorVariables('vs')
  const colors2 = getColorVariables(overrideTheme)

  // verify if the results of getColorVariables are valid
  if (colors1 && Array.isArray(colors1)) {
    colors1.forEach(({ key, value }) => {
      mergedColors[key] = value
    })
  }

  if (colors2 && Array.isArray(colors2)) {
    colors2.forEach(({ key, value }) => {
      mergedColors[key] = value
    })

    styleEle.innerHTML = `
    .MonacoThemeScope-theme-${overrideTheme} .monaco-editor {
      ${Object.entries(mergedColors)
        .map(([key, value]) => `${key}: ${value}`)
        .join(';\n')}
    }
  `
  }
})
</script>
