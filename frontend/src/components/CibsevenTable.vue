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
  <table class="table table-hover" :class="computedTableClass" :style="computedTableStyles" role="table" ref="table">
    <thead v-if="showHeaders" :class="theadClass" role="rowgroup">
      <tr class="d-flex" role="row">
        <th v-for="(field, index) in fields"
          :key="index"
          :class="[field.class, field.thClass, getSortClass(field)]"
          role="columnheader"
          :aria-sort="getAriaSort(field)"
          @click.stop="handleColumnClick(field)"
          :style="{
            ...resizable ? { width: columnWidths[index], position: 'relative' } : {},
            cursor: field.sortable !== false ? 'pointer' : 'default'
          }">

          <span v-if="field.sortable !== false" class="sort-icon">
            <span v-if="sortKey === (field.sortKey ?? field.key)">
              <i v-if="sortOrder === 1" class="mdi mdi-chevron-up"></i>
              <i v-else class="mdi mdi-chevron-down"></i>
            </span>
            <i v-else class="mdi mdi-unfold-more-horizontal"></i>
          </span>

          <span v-if="field.label">{{ $t(prefix + field.label) }}</span>

          <span
            v-if="resizable"
            :style="resizeHandleStyle"
            @mousedown.stop="startResize(index, $event)">
          </span>
        </th>
      </tr>
    </thead>
    <tbody role="rowgroup">
      <tr v-for="(item, index) in sortedItems" :key="index" class="d-flex" :class="getRowClass(item)"
        @mouseenter="$emit('mouseenter', item)"
        @mouseleave="$emit('mouseleave', item)"
        @click.stop="$emit('rowSelected', item)"
        role="row">
        <td v-for="(field, colIndex) in fields"
          :key="field.key"
          class="d-flex align-items-center"
          :class="[field.class, field.tdClass]"
          :style="resizable ? { width: columnWidths[colIndex] } : {}"
          role="cell">
          <slot :name="'cell(' + field.key +')'" :item="item" :value="item[field.key]" :index="index">
            {{ item[field.key] }}
          </slot>
        </td>
      </tr>
      <!-- EmptyState -->
      <tr v-if="$slots.emptyState && !hasContent">
        <td class="text-center align-middle py-2 user-select-none border-0" style="cursor: default;">
          <slot name="emptyState" />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  name: 'CibsevenTable',
  props: {
    /**
     * Items content. They require to possess a property that matches the `key` of the `fields` (header).
     */
    items: { type: Array, default: () => [] },
    /**
     * Column headers.
     */
    fields: { type: Array, default: () => [] },
    tbodyTrClass: { type: [String, Function], default: '' },
    prefix: { type: String, default: '' },
    theadClass: { type: String, default: '' },
    tableClass: { type: String, default: '' },
    resizable: { type: Boolean, default: false },
    /**
     * This styling property allows to apply a striped style to the table.
     * It is only applied if there is content in the table.
     * 
     * If there is no content, the `emptyState` slot can be displayed instead, if set.
     */
    striped : { type: Boolean, default: false },
    sortBy: { type: String, default: null },
    sortDesc: { type: Boolean, default: false },
    /**
     * This property allows to hide the column headers.
     * 
     * Since the headers are required for the items to be displayed, this property allows to 'hide' the headers
     * in case a list-like state is desired instead of a table-like one, while keeping the functionality intact.
     */
    showHeaders: { type: Boolean, default: true },
    clickableRows: { type: Boolean, default: true },
  },
  data() {
    return {
      sortKey: null,
      sortOrder: 1,
      columnWidths: [],
      skipClick: false
    }
  },
  computed: {
    computedTableStyles() {
      return { tableLayout: 'fixed', width: '100%' }
    },
    computedTableClass() {
      return [
        this.striped && this.hasContent ? 'table-striped' : '', // Remove 'table-striped' if no content to properly display the empty state
        this.tableClass
      ].filter(Boolean).join(' ')
    },
    sortedItems() {
      if (!this.sortKey) return this.items
      return [...this.items].sort((a, b) => {
        if (a[this.sortKey] < b[this.sortKey]) return -1 * this.sortOrder
        if (a[this.sortKey] > b[this.sortKey]) return 1 * this.sortOrder
        return 0
      })
    },
    resizeHandleStyle() {
      return {
        position: 'absolute',
        top: '0',
        right: '0',
        width: '5px',
        height: '100%',
        cursor: 'col-resize',
        zIndex: '10',
        background: 'transparent'
      }
    },
    hasContent() {
      return this.items && Array.isArray(this.items) && this.items.length > 0
    }
  },
  watch: {
    sortBy: {
      handler(newVal) {
        this.sortKey = newVal || null
      },
      immediate: true
    },
    sortDesc: {
      handler(newVal) {
        this.sortOrder = newVal ? -1 : 1
      },
      immediate: true
    }
  },
  methods: {
    handleColumnClick(field) {
      if (this.skipClick) {
        this.skipClick = false
        return
      }
      if (!this.resizing) {
        this.sortColumn(field)
      }
    },
    sortColumn(field) {
      if ((!field.sortKey && !field.key) || field.sortable === false) return

      if (this.sortKey === (field.sortKey ?? field.key)) {
        this.sortOrder *= -1
      } else {
        this.sortKey = field.sortKey ?? field.key
        this.sortOrder = 1
      }
    },
    getSortClass(field) {
      if (field.sortable === false) return ''
      if ((field.sortKey ?? field.key) === this.sortKey) {
        return this.sortOrder === 1 ? 'sorting-asc active' : 'sorting-desc active'
      }
      return 'sortable'
    },
    getAriaSort(field) {
      if ((field.sortKey ?? field.key) === this.sortKey) {
        return this.$t(`bcomponents.${this.sortOrder === 1 ? 'ariaSortAsc' : 'ariaSortDes'}`)
      }
      return this.$t('bcomponents.ariaSortNone')
    },
    getRowClass(item) {
      return [... typeof this.tbodyTrClass === 'function' ? this.tbodyTrClass(item) : this.tbodyTrClass,
        this.clickableRows ? 'cursor-pointer' : '',
      ]
    },
    startResize(index, event) {
      if (!this.resizable) return

      const startX = event.clientX
      const startWidth = parseFloat(this.columnWidths[index])
      const adjacentIndex = index === this.columnWidths.length - 1 ? index - 1 : index + 1
      const adjacentStartWidth = parseFloat(this.columnWidths[adjacentIndex])
      const minWidth = 75
      this.resizing = true

      const onMouseMove = (e) => {
        const deltaWidth = e.clientX - startX

        const newWidth = startWidth + deltaWidth
        const newAdjacentWidth = adjacentStartWidth - deltaWidth

        if (newWidth < minWidth || newAdjacentWidth < minWidth) return

        this.columnWidths[index] = `${newWidth}px`
        this.columnWidths[adjacentIndex] = `${newAdjacentWidth}px`
      }

      const onMouseUp = () => {
        this.resizing = false
        this.skipClick = true
        setTimeout(() => {
          this.skipClick = false
        }, 0)

        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    restartColumnWidths: function() {
      if (this.resizable && this.$refs.table) {
        const ths = this.$refs.table.querySelectorAll('th')
        if (ths) {
          ths.forEach(th => {
            th.style.removeProperty('width')
          })
        }
        this.columnWidths = Array.from(ths).map(th => `${th.offsetWidth}px`)
      }
    }
  },
  mounted() {
    if (this.resizable) {
      this.$nextTick(() => {
        const ths = this.$refs.table.querySelectorAll('th');
        this.columnWidths = Array.from(ths).map(th => `${th.offsetWidth}px`)
      })
    }
    window.addEventListener("resize", this.restartColumnWidths)
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.restartColumnWidths)
  }
}
</script>
