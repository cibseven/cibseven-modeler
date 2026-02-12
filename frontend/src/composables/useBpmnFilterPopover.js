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
import { ref, onUnmounted } from 'vue'
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.js'

export function useBpmnFilterPopover(config) {
  const popoverInstance = ref(null)
  const isVisible = ref(false)
  let bpmnFilterList = ref([])
  let isFilterOn = ref(false)

  const togglePopover = (container, position, popoverButton) => {
    if (!popoverInstance.value) {
      popoverInstance.value = new bootstrap.Popover( popoverButton, {
        content: container.querySelector('[data-name="popover-content"]'),
        container: container,
        placement: position,
        trigger: 'click',
        html: true
      })

    }

    isVisible.value = !isVisible.value
    popoverInstance.value.toggle()
  }

  const handleBpmnFilter = (e, bpmnModeler, filter, popoverContent) => {
    //if it is checked it will add the type of task to the array , if not it will remove it if it exists
    e.target.checked
      ? bpmnFilterList.value.push(filter.type)
      : bpmnFilterList.value.splice(bpmnFilterList.value.indexOf(filter.type), 1)
    bpmnFilter(bpmnModeler, popoverContent)
  }

  const bpmnFilter = (bpmnModeler, popoverContent) => {
    let elementRegistry = bpmnModeler.get('elementRegistry')
    
    elementRegistry.forEach((element) => {
      let gfx = elementRegistry.getGraphics(element)
      const rect = gfx.querySelector('rect')
      if (bpmnFilterList.value.length === 0) {
        // if the array of the filter is empty it will remove all the style classes
        gfx.style.setProperty('opacity', '1', 'important') // removes the opacity if it exists
        rect.style.setProperty('stroke', 'black', 'important')
      } else if (bpmnFilterList.value.includes(element.type)) {
        // if the array constains the element type of the task it will add the style for that task that is in the object bpmnFilterStyles
        if (!rect) return
        gfx.style.setProperty('opacity', '1', 'important') // removes the opacity if it exists
        rect.style.setProperty(
          'stroke',
          getColorByType(element.type, config.modeler?.filterBpmn),
          'important'
        )
      } else if (element.type !== 'bpmn:Process' && element.type !== 'bpmn:Collaboration') {
        //it will add opacity for every element that is not contain in the bpmnFilterList array
        gfx.style.setProperty('opacity', config.modeler?.filterBpmnOpacity, 'important')
        rect.style.setProperty('stroke', 'black', 'important')
        gfx.style.setProperty('opacity', config.modeler?.filterBpmnOpacity, 'important')
      }
    })
    checkSwitches(popoverContent)
  }

  const checkSwitches = (popoverContent) => {
    // check if there is a filter on
    let anySwitchOn = false
    for (const checkbox of popoverContent) {
      if (checkbox.checked) {
        anySwitchOn = true // if there is a switch on
        break
      }
    }
    isFilterOn.value = anySwitchOn
  }
  const getColorByType = (type, bpmnFilter) => {
    const task = bpmnFilter.find(item => item.type === type)
    return task ? task.color : '#000' // returns the color if found, black if not found
  }

  onUnmounted(() => {
    if (popoverInstance.value) {
      popoverInstance.value.dispose()
    }
  })

  return {
    togglePopover,
    isVisible,
    //filter
    handleBpmnFilter,
    bpmnFilter,
    isFilterOn
  }
}
