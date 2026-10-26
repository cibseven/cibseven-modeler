/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Every change of a bpmn-js, dmn-js or form-js editor goes through its command stack: the canvas,
 * the properties panel, a table cell, a form field. While isReadOnly() holds, the stack refuses
 * them all, so nothing changes, nothing is marked as unsaved and nothing is autosaved. It is asked
 * on every command, so the editor follows the rights as they arrive or change.
 */
export const guardCommandStack = (commandStack, isReadOnly) => {
  if (typeof commandStack?.execute !== 'function' || typeof commandStack.canExecute !== 'function') return
  if (commandStack.__readOnlyGuard) return
  const execute = commandStack.execute.bind(commandStack)
  const canExecute = commandStack.canExecute.bind(commandStack)
  commandStack.execute = (...args) => isReadOnly() ? undefined : execute(...args)
  commandStack.canExecute = (...args) => isReadOnly() ? false : canExecute(...args)
  commandStack.__readOnlyGuard = true
}

/**
 * form-js module that stops dragging a field or row while isReadOnly() holds. The command stack
 * refuses the move, but form-js takes the dragged element out of the page before it asks, so the
 * field would vanish until the form is opened again. The drag is cancelled once dragging has set
 * it up: cancelling from inside its own start event leaves it half done.
 */
export const readOnlyDraggingModule = isReadOnly => {
  function ReadOnlyDragging(eventBus) {
    let drake = null
    eventBus.on('dragula.created', event => { drake = event })
    eventBus.on('dragula.destroyed', () => { drake = null })
    eventBus.on('drag.start', () => {
      if (!isReadOnly()) return
      queueMicrotask(() => { drake?.cancel(true) })
    })
  }
  ReadOnlyDragging.$inject = ['eventBus']
  return { __init__: ['readOnlyDragging'], readOnlyDragging: ['type', ReadOnlyDragging] }
}
