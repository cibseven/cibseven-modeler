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
import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Drag-to-resize (splitter) for a panel whose resize handle sits on its top or
 * left edge, so dragging toward the top/left enlarges it. Uses the delta model:
 * newSize = sizeWhenDragStarted + (pointerAtStart - pointerNow), clamped to [min, max].
 *
 * Centralizes the pointer listeners (with paired cleanup on unmount), the
 * resizing state, min/max clamping, and keyboard resize — so consumers only
 * provide how to read/write their own size and its bounds.
 *
 * @param {object}        opts
 * @param {'x'|'y'}       [opts.axis='x']       'x' = width (left handle), 'y' = height (top handle)
 * @param {() => number}  opts.getSize          current size in px
 * @param {(n:number) => void} opts.setSize     apply an already-clamped size
 * @param {() => number}  opts.min              lower bound in px
 * @param {() => number}  opts.max              upper bound in px
 * @param {() => boolean} [opts.disabled]       when true, resize is ignored (e.g. collapsed)
 * @param {number}        [opts.keyboardStep=16] px moved per arrow-key press
 * @returns {{ isResizing: import('vue').Ref<boolean>, onMouseDown: (e:MouseEvent)=>void, onKeydown: (e:KeyboardEvent)=>void }}
 */
export function useResizable({ axis = 'x', getSize, setSize, min, max, disabled = () => false, keyboardStep = 16 }) {
  const isResizing = ref(false)
  let startPos = 0
  let startSize = 0

  const clamp = n => Math.min(Math.max(n, min()), max())
  const pointer = e => (axis === 'x' ? e.clientX : e.clientY)

  const onMouseDown = e => {
    if (disabled()) return
    isResizing.value = true
    startPos = pointer(e)
    startSize = getSize()
    e.preventDefault()
  }

  const onMouseMove = e => {
    if (!isResizing.value || disabled()) return
    setSize(clamp(startSize + (startPos - pointer(e))))
  }

  const onMouseUp = () => {
    isResizing.value = false
  }

  const onKeydown = e => {
    if (disabled()) return
    // Handle sits on the top/left edge: ArrowUp/ArrowLeft grow, ArrowDown/ArrowRight shrink.
    const grow = axis === 'x' ? e.key === 'ArrowLeft' : e.key === 'ArrowUp'
    const shrink = axis === 'x' ? e.key === 'ArrowRight' : e.key === 'ArrowDown'
    if (!grow && !shrink) return
    setSize(clamp(getSize() + (grow ? keyboardStep : -keyboardStep)))
    e.preventDefault()
  }

  onMounted(() => {
    document.documentElement.addEventListener('mousemove', onMouseMove, true)
    document.documentElement.addEventListener('mouseup', onMouseUp, true)
  })

  onBeforeUnmount(() => {
    document.documentElement.removeEventListener('mousemove', onMouseMove, true)
    document.documentElement.removeEventListener('mouseup', onMouseUp, true)
  })

  return { isResizing, onMouseDown, onKeydown }
}
