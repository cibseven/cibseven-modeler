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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { registerPlugin, getPlugin } from '../../plugins/pluginsConfig.js'

describe('pluginsConfig', () => {
    afterEach(() => {
        vi.resetModules()
    })

    describe('registerPlugin', () => {
        it('registers a component in a plugin slot', () => {
            const component = { name: 'TestComponent' }
            
            registerPlugin('test-slot', component)
            const slot = getPlugin('test-slot')
            
            expect(slot.value).toEqual(component)
        })

        it('overwrites existing component in slot', () => {
            const component1 = { name: 'Component1' }
            const component2 = { name: 'Component2' }
            
            registerPlugin('test-slot', component1)
            expect(getPlugin('test-slot').value).toEqual(component1)
            
            registerPlugin('test-slot', component2)
            expect(getPlugin('test-slot').value).toEqual(component2)
        })

        it('registers multiple components in different slots', () => {
            const comp1 = { name: 'Comp1' }
            const comp2 = { name: 'Comp2' }
            const comp3 = { name: 'Comp3' }
            
            registerPlugin('slot1', comp1)
            registerPlugin('slot2', comp2)
            registerPlugin('slot3', comp3)
            
            expect(getPlugin('slot1').value).toEqual(comp1)
            expect(getPlugin('slot2').value).toEqual(comp2)
            expect(getPlugin('slot3').value).toEqual(comp3)
        })

        it('handles null component registration', () => {
            registerPlugin('test-slot', null)
            
            expect(getPlugin('test-slot').value).toBeNull()
        })

        it('handles undefined component registration', () => {
            registerPlugin('test-slot', undefined)
            
            expect(getPlugin('test-slot').value).toBeUndefined()
        })

        it('registers complex component objects', () => {
            const complexComponent = {
                name: 'ComplexComponent',
                template: '<div>Test</div>',
                props: { title: String },
                methods: { doSomething: () => {} },
                computed: { computed: () => 'value' }
            }
            
            registerPlugin('complex-slot', complexComponent)
            
            expect(getPlugin('complex-slot').value).toEqual(complexComponent)
            expect(getPlugin('complex-slot').value.name).toBe('ComplexComponent')
            expect(getPlugin('complex-slot').value.template).toBe('<div>Test</div>')
        })
    })

    describe('getPlugin', () => {
        it('returns ref for registered slot', () => {
            const component = { name: 'TestComponent' }
            registerPlugin('test-slot', component)
            
            const ref = getPlugin('test-slot')
            
            expect(ref).toBeDefined()
            expect(ref.value).toEqual(component)
        })

        it('returns ref with null value for non-existent slot', () => {
            const ref = getPlugin('non-existent')
            
            expect(ref).toBeDefined()
            expect(ref.value).toBeNull()
        })

        it('creates slot on first access', () => {
            const ref1 = getPlugin('auto-create-slot')
            expect(ref1.value).toBeNull()
            
            registerPlugin('auto-create-slot', { name: 'Component' })
            const ref2 = getPlugin('auto-create-slot')
            
            expect(ref2.value.name).toBe('Component')
        })

        it('returns same ref for same slot name', () => {
            registerPlugin('persistent-slot', { name: 'Component' })
            
            const ref1 = getPlugin('persistent-slot')
            const ref2 = getPlugin('persistent-slot')
            
            expect(ref1).toBe(ref2)
        })

        it('handles multiple slots independently', () => {
            const comp1 = { name: 'Comp1' }
            const comp2 = { name: 'Comp2' }
            
            registerPlugin('slot-a', comp1)
            registerPlugin('slot-b', comp2)
            
            expect(getPlugin('slot-a').value).toEqual(comp1)
            expect(getPlugin('slot-b').value).toEqual(comp2)
            expect(getPlugin('slot-a').value).not.toEqual(getPlugin('slot-b').value)
        })
    })

    describe('slot management', () => {
        it('registers and retrieves with consistent naming', () => {
            const component = { name: 'NamedComponent' }
            const slotName = 'form-tools'
            
            registerPlugin(slotName, component)
            
            expect(getPlugin(slotName).value).toEqual(component)
        })

        it('supports various slot name formats', () => {
            const comp1 = { name: 'C1' }
            const comp2 = { name: 'C2' }
            const comp3 = { name: 'C3' }
            
            registerPlugin('simple', comp1)
            registerPlugin('dash-separated', comp2)
            registerPlugin('snake_case', comp3)
            
            expect(getPlugin('simple').value).toEqual(comp1)
            expect(getPlugin('dash-separated').value).toEqual(comp2)
            expect(getPlugin('snake_case').value).toEqual(comp3)
        })

        it('maintains separate registrations for similar slot names', () => {
            const comp1 = { name: 'Comp1' }
            const comp2 = { name: 'Comp2' }
            
            registerPlugin('my-slot', comp1)
            registerPlugin('my-slot-extended', comp2)
            
            expect(getPlugin('my-slot').value).toEqual(comp1)
            expect(getPlugin('my-slot-extended').value).toEqual(comp2)
            expect(getPlugin('my-slot').value).not.toEqual(getPlugin('my-slot-extended').value)
        })
    })

    describe('reactivity', () => {
        it('slot refs are reactive', () => {
            registerPlugin('reactive-slot', { name: 'Initial' })
            const ref = getPlugin('reactive-slot')
            
            expect(ref.value.name).toBe('Initial')
            
            registerPlugin('reactive-slot', { name: 'Updated' })
            
            expect(ref.value.name).toBe('Updated')
        })

        it('multiple refs to same slot reflect changes', () => {
            registerPlugin('shared-slot', { name: 'Version1' })
            
            const ref1 = getPlugin('shared-slot')
            const ref2 = getPlugin('shared-slot')
            
            expect(ref1.value.name).toBe('Version1')
            expect(ref2.value.name).toBe('Version1')
            
            registerPlugin('shared-slot', { name: 'Version2' })
            
            expect(ref1.value.name).toBe('Version2')
            expect(ref2.value.name).toBe('Version2')
        })
    })

    describe('edge cases', () => {
        it('handles empty string as slot name', () => {
            const component = { name: 'Component' }
            
            registerPlugin('', component)
            
            expect(getPlugin('').value).toEqual(component)
        })

        it('handles slot name with special characters', () => {
            const component = { name: 'Special' }
            
            registerPlugin('slot-@-special', component)
            
            expect(getPlugin('slot-@-special').value).toEqual(component)
        })

        it('handles numeric slot names', () => {
            const component = { name: 'NumericSlot' }
            
            registerPlugin('slot-123', component)
            
            expect(getPlugin('slot-123').value).toEqual(component)
        })

        it('registers same component instance in multiple slots', () => {
            const sharedComponent = { name: 'Shared' }
            
            registerPlugin('slot1', sharedComponent)
            registerPlugin('slot2', sharedComponent)
            
            expect(getPlugin('slot1').value).toBe(sharedComponent)
            expect(getPlugin('slot2').value).toBe(sharedComponent)
            expect(getPlugin('slot1').value === getPlugin('slot2').value).toBe(true)
        })

        it('handles rapid register/get cycles', () => {
            const components = [
                { name: 'C1' },
                { name: 'C2' },
                { name: 'C3' }
            ]
            
            for (let i = 0; i < 10; i++) {
                components.forEach((comp, idx) => {
                    registerPlugin(`slot-${idx}`, comp)
                    expect(getPlugin(`slot-${idx}`).value).toEqual(comp)
                })
            }
        })
    })
})
