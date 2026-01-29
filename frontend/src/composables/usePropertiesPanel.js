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
import { ref } from "vue"
export default function usePropertiesPanel(props, emit, containerModeler, resizableDiv, propertiesPanelComponent, propertyPanel) {
    let parentWidth = ref(700)
    let parentHeight = ref(700)
    let container = ref(containerModeler)
    let resizablePanel = ref(resizableDiv)
    let canvasWidth = ref(0)
    let isVisiblePropertyPanel = ref(true)
    const updateParentHeight = () => {
        if (props.isActiveTab) {
            parentHeight.value = container.value?.parentNode.clientHeight
        }
    }

    const updateParentWidth = () => {
        if (props.isActiveTab) {
            parentWidth.value = container.value?.clientWidth
            if (resizablePanel.value) emit('resizeTabNav', resizablePanel.value._changeWidth())
        }
    }
    const togglePropertiesPanel = value => {        
        isVisiblePropertyPanel.value = value
        if (!value) {
            propertiesPanelComponent.value.detach()
            resizableDiv.value._resetPropertiesPanelWidth()
            return
        }
        propertiesPanelComponent.value.attachTo(propertyPanel.value)
        resizableDiv.value._restorePropertiesPanelWidth()
    }
    const changeWidth = value => {
        canvasWidth.value = value
    }

return {
    updateParentHeight,
    updateParentWidth,
    changeWidth,
    canvasWidth,
    parentWidth,
    parentHeight,
    isVisiblePropertyPanel,
    togglePropertiesPanel
}
}
