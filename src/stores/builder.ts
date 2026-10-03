import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SignatureLayout, LayoutBlock, LayoutBlockType, LayoutItem, LayoutItemType, LayoutLine, LayoutTextStyle } from '../types'
import { useSignatureStore } from './signature'
import { newBlock, newItem, newLine, starterLayout, uid, type StarterId } from '../templates/layouts'

type Node = LayoutBlock | LayoutItem

// Where a node sits: the array holding it and its index there
export interface Location {
  node: Node
  list: Node[]
  index: number
  line?: LayoutLine // for items: the row they're in
  inColumn: boolean // for rows: whether they sit inside a columns block
}

export const useBuilderStore = defineStore('builder', () => {
  const sig = useSignatureStore()
  const selectedId = ref<string | null>(null)

  // The signature store makes sure Custom always has a layout to edit
  const layout = computed<SignatureLayout>(() => sig.data.layout ?? { blocks: [] })

  function find(id: string | null): Location | null {
    if (!id) return null
    const search = (lines: LayoutBlock[], inColumn: boolean): Location | null => {
      for (let i = 0; i < lines.length; i++) {
        const block = lines[i]
        if (block.id === id) return { node: block, list: lines, index: i, inColumn }
        if (block.type === 'line') {
          const j = block.items.findIndex(it => it.id === id)
          if (j >= 0) return { node: block.items[j], list: block.items, index: j, line: block, inColumn }
        }
        if (block.type === 'columns') {
          for (const col of block.columns) {
            const hit = search(col, true)
            if (hit) return hit
          }
        }
      }
      return null
    }
    return search(layout.value.blocks, false)
  }

  const selected = computed(() => find(selectedId.value))

  function select(id: string | null) {
    selectedId.value = id
  }

  // ─── Adding ────────────────────────────────────────────────────────────────

  // Adds a row-level block below the selected top-level block, or at the end
  function addBlock(type: LayoutBlockType) {
    const block = newBlock(type)
    const loc = selected.value
    const blocks = layout.value.blocks
    const top = loc && !loc.inColumn ? (loc.line ?? loc.node) : null
    const at = top ? blocks.findIndex(b => b.id === top.id) + 1 : blocks.length
    blocks.splice(at || blocks.length, 0, block)
    select(block.type === 'columns' ? block.columns[0][0].id : block.id)
  }

  // Adds an element to the selected row (or the row of the selected element),
  // creating a new row when nothing suitable is selected
  function addItem(typeOrItem: LayoutItemType | LayoutItem) {
    const item = typeof typeOrItem === 'string' ? newItem(typeOrItem) : typeOrItem
    const loc = selected.value
    // New text sits at the same size as the element it's added next to
    const next = loc?.node as { size?: LayoutTextStyle['size'] } | undefined
    if ((item.type === 'text' || item.type === 'separator' || item.type === 'field') && !item.size && next?.size) item.size = next.size
    if (loc?.line) {
      loc.line.items.splice(loc.index + 1, 0, item)
    } else if (loc?.node.type === 'line') {
      loc.node.items.push(item)
    } else {
      const line = newLine([item], 6)
      layout.value.blocks.push(line)
    }
    select(item.id)
  }

  function addLineToColumn(columnsId: string, col: number) {
    const loc = find(columnsId)
    if (loc?.node.type !== 'columns') return
    const line = newLine([], 6)
    loc.node.columns[col].push(line)
    select(line.id)
  }

  // ─── Moving / removing ─────────────────────────────────────────────────────

  function move(id: string, delta: -1 | 1) {
    const loc = find(id)
    if (!loc) return
    const to = loc.index + delta
    if (to < 0 || to >= loc.list.length) return
    const [node] = loc.list.splice(loc.index, 1)
    loc.list.splice(to, 0, node)
  }

  // Drag and drop: elements go before another element or onto the end of a row;
  // rows go before another row (a columns block can't go inside a column)
  function moveTo(dragId: string, targetId: string) {
    if (dragId === targetId) return
    const src = find(dragId)
    const dst = find(targetId)
    if (!src || !dst) return
    const srcIsItem = !!src.line
    const dstIsItem = !!dst.line

    if (srcIsItem) {
      if (!dstIsItem && dst.node.type !== 'line') return
      src.list.splice(src.index, 1)
      if (dstIsItem) {
        const dstLoc = find(targetId)!
        dstLoc.list.splice(dstLoc.index, 0, src.node)
      } else {
        (dst.node as LayoutLine).items.push(src.node as LayoutItem)
      }
      return
    }

    // Row-level: drop before the target row (or the row holding the target element)
    const targetRow = dst.line ?? dst.node
    if (targetRow.id === dragId) return
    if (src.node.type === 'columns' && find(targetRow.id)?.inColumn) return
    if (src.node.type === 'columns' && JSON.stringify(src.node).includes(`"${targetRow.id}"`)) return
    src.list.splice(src.index, 1)
    const rowLoc = find(targetRow.id)!
    rowLoc.list.splice(rowLoc.index, 0, src.node)
  }

  function remove(id: string) {
    const loc = find(id)
    if (!loc) return
    loc.list.splice(loc.index, 1)
    // Keep at least one row so there's always somewhere to add elements
    if (!layout.value.blocks.length) layout.value.blocks.push(newLine([], 0))
    select(loc.line?.id ?? null)
  }

  function duplicate(id: string) {
    const loc = find(id)
    if (!loc) return
    const copy = JSON.parse(JSON.stringify(loc.node), (key, value) => key === 'id' ? uid() : value)
    loc.list.splice(loc.index + 1, 0, copy)
    select(copy.id)
  }

  function applyStarter(id: StarterId) {
    sig.data.layout = starterLayout(id)
    select(null)
  }

  return { selectedId, selected, layout, find, select, addBlock, addItem, addLineToColumn, move, moveTo, remove, duplicate, applyStarter }
})

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useBuilderStore, import.meta.hot))
