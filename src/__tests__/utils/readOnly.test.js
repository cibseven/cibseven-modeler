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
import { describe, it, expect, vi } from 'vitest'
import { guardCommandStack, guardFieldEditing, readOnlyDraggingModule } from '../../utils/readOnly.js'

const stack = () => ({ execute: vi.fn(() => 'done'), canExecute: vi.fn(() => true) })

describe('guardCommandStack', () => {
  it('refuses every change while the model may only be looked at', () => {
    const commandStack = stack()
    const { execute, canExecute } = commandStack
    guardCommandStack(commandStack, () => true)

    expect(commandStack.execute('shape.create', {})).toBeUndefined()
    expect(commandStack.canExecute('shape.create', {})).toBe(false)
    expect(execute).not.toHaveBeenCalled()
    expect(canExecute).not.toHaveBeenCalled()
  })

  it('passes every change on while the model may be changed', () => {
    const commandStack = stack()
    const { execute } = commandStack
    guardCommandStack(commandStack, () => false)

    expect(commandStack.execute('shape.create', { id: 'a' })).toBe('done')
    expect(commandStack.canExecute('shape.create')).toBe(true)
    expect(execute).toHaveBeenCalledWith('shape.create', { id: 'a' })
  })

  /** The rights may arrive after the editor is open, so it asks on every command. */
  it('follows the rights as they change', () => {
    const commandStack = stack()
    let readOnly = false
    guardCommandStack(commandStack, () => readOnly)

    expect(commandStack.execute('x')).toBe('done')
    readOnly = true
    expect(commandStack.execute('x')).toBeUndefined()
  })

  it('guards a command stack once, and skips an editor without one', () => {
    const commandStack = stack()
    const { execute } = commandStack
    guardCommandStack(commandStack, () => false)
    guardCommandStack(commandStack, () => true)

    expect(commandStack.execute('x')).toBe('done')
    expect(execute).toHaveBeenCalledOnce()
    expect(() => guardCommandStack(null, () => true)).not.toThrow()
    expect(() => guardCommandStack({ attachTo: vi.fn() }, () => true)).not.toThrow()
  })
})

describe('readOnlyDraggingModule', () => {
  const eventBus = () => {
    const listeners = {}
    return {
      on: (event, fn) => { listeners[event] = fn },
      fire: (event, data) => listeners[event]?.(data)
    }
  }
  const start = (isReadOnly) => {
    const bus = eventBus()
    const { __init__, readOnlyDragging } = readOnlyDraggingModule(isReadOnly)
    const [kind, Type] = readOnlyDragging
    expect(__init__).toEqual(['readOnlyDragging'])
    expect(kind).toBe('type')
    expect(Type.$inject).toEqual(['eventBus'])
    new Type(bus)
    const drake = { cancel: vi.fn() }
    bus.fire('dragula.created', drake)
    return { bus, drake }
  }

  /** form-js takes the dragged field out of the page before the refused move, so it would vanish. */
  it('cancels a drag once it has started while the form may only be looked at', async () => {
    const { bus, drake } = start(() => true)

    bus.fire('drag.start', {})
    expect(drake.cancel).not.toHaveBeenCalled()
    await Promise.resolve()

    expect(drake.cancel).toHaveBeenCalledWith(true)
  })

  it('leaves a drag alone while the form may be changed, and follows the rights as they change', async () => {
    let readOnly = false
    const { bus, drake } = start(() => readOnly)

    bus.fire('drag.start', {})
    await Promise.resolve()
    expect(drake.cancel).not.toHaveBeenCalled()

    readOnly = true
    bus.fire('drag.start', {})
    await Promise.resolve()
    expect(drake.cancel).toHaveBeenCalledOnce()
  })

  it('does nothing once the drag instance is gone', async () => {
    const { bus, drake } = start(() => true)

    bus.fire('dragula.destroyed')
    bus.fire('drag.start', {})
    await Promise.resolve()

    expect(drake.cancel).not.toHaveBeenCalled()
  })
})

describe('guardFieldEditing', () => {
  // A properties panel entry with a text field, a select and a checkbox, and a search box outside it
  const panel = () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <div class="bio-properties-panel-entry">
        <input class="text" type="text"><select class="choice"><option>a</option></select><input class="box" type="checkbox">
      </div>
      <input class="outside" type="text">`
    document.body.appendChild(container)
    return container
  }
  const fire = (target, type, init = {}) => {
    const event = type === 'keydown'
      ? new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
      : new Event(type, { bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    return event.defaultPrevented
  }

  it('keeps the keyboard from changing a field while the model may only be looked at', () => {
    const container = panel()
    guardFieldEditing(container, () => true)

    expect(fire(container.querySelector('.text'), 'beforeinput')).toBe(true)
    expect(fire(container.querySelector('.choice'), 'keydown', { key: 'ArrowDown' })).toBe(true)
    expect(fire(container.querySelector('.choice'), 'keydown', { key: 'b' })).toBe(true)
    expect(fire(container.querySelector('.box'), 'keydown', { key: ' ' })).toBe(true)
    container.remove()
  })

  /** The values stay readable: focus can move on, and a text field reacts to keys that type nothing. */
  it('lets the keyboard move through the fields', () => {
    const container = panel()
    guardFieldEditing(container, () => true)

    expect(fire(container.querySelector('.choice'), 'keydown', { key: 'Tab' })).toBe(false)
    expect(fire(container.querySelector('.box'), 'keydown', { key: 'Escape' })).toBe(false)
    expect(fire(container.querySelector('.text'), 'keydown', { key: 'ArrowLeft' })).toBe(false)
    container.remove()
  })

  it('leaves alone what is outside the fields, and everything while the model may be changed', () => {
    const container = panel()
    let readOnly = true
    guardFieldEditing(container, () => readOnly)

    expect(fire(container.querySelector('.outside'), 'beforeinput')).toBe(false)
    readOnly = false
    expect(fire(container.querySelector('.text'), 'beforeinput')).toBe(false)
    expect(fire(container.querySelector('.choice'), 'keydown', { key: 'ArrowDown' })).toBe(false)
    container.remove()
  })

  it('stops guarding once removed', () => {
    const container = panel()
    const stop = guardFieldEditing(container, () => true)

    stop()

    expect(fire(container.querySelector('.text'), 'beforeinput')).toBe(false)
    container.remove()
  })

  it('does nothing without a container', () => {
    expect(() => guardFieldEditing(null, () => true)()).not.toThrow()
  })
})
