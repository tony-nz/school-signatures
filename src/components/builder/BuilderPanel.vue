<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutBlockType, LayoutField, LayoutItemType, LayoutTextStyle } from '../../types'
import { useBuilderStore } from '../../stores/builder'
import { useSignatureStore } from '../../stores/signature'
import { FIELD_LABELS } from '../../templates/custom'
import { newField, STARTERS, type StarterId } from '../../templates/layouts'
import ColorChoice from './ColorChoice.vue'
import LayerLine from './LayerLine.vue'
import AvatarUpload from '../editor/AvatarUpload.vue'
import CTAEditor from '../editor/CTAEditor.vue'

const builder = useBuilderStore()
const sig = useSignatureStore()

const node = computed(() => builder.selected?.node)
// Text styling applies to fields, text and separators
const styled = computed(() => {
  const n = node.value
  return n && (n.type === 'field' || n.type === 'text' || n.type === 'separator') ? (n as LayoutTextStyle) : null
})

const FIELDS = Object.keys(FIELD_LABELS) as LayoutField[]

const ELEMENTS: { type: LayoutItemType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'separator', label: 'Separator' },
  { type: 'image', label: 'Image' },
  { type: 'socials', label: 'Socials' },
  { type: 'button', label: 'Button' },
]

const ROWS: { type: LayoutBlockType; label: string }[] = [
  { type: 'line', label: 'Row' },
  { type: 'columns', label: 'Columns' },
  { type: 'divider', label: 'Divider' },
  { type: 'spacer', label: 'Spacer' },
  { type: 'banner', label: 'Banner' },
  { type: 'disclaimer', label: 'Disclaimer' },
]

const SIZES = [
  { id: 'name', label: 'Large' },
  { id: 'base', label: 'Normal' },
  { id: 'meta', label: 'Small' },
  { id: 'small', label: 'Tiny' },
] as const

const TYPE_LABELS: Record<string, string> = {
  field: 'Field', text: 'Text', separator: 'Separator', image: 'Image', socials: 'Social icons', button: 'Button',
  line: 'Row', columns: 'Columns', spacer: 'Spacer', divider: 'Divider', banner: 'Banner', disclaimer: 'Disclaimer',
}

function addField(field: LayoutField) {
  builder.addItem(newField(field))
}

function startFrom(e: Event) {
  const select = e.target as HTMLSelectElement
  const id = select.value as StarterId
  select.value = ''
  if (id && confirm('Replace your current layout with this starter?')) builder.applyStarter(id)
}

function addColumn() {
  if (node.value?.type === 'columns' && node.value.columns.length < 3) node.value.columns.push([])
}

function removeColumn(i: number) {
  if (node.value?.type === 'columns' && node.value.columns.length > 1) node.value.columns.splice(i, 1)
}
</script>

<template>
  <div class="h-full flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-sm">

    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
      <span class="font-semibold text-slate-700 dark:text-slate-200">Builder</span>
      <select @change="startFrom" class="input !w-auto !py-1 text-xs">
        <option value="">Start from…</option>
        <option v-for="s in STARTERS" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <div class="flex-1 overflow-y-auto">

      <!-- Add -->
      <section class="panel-section">
        <h3 class="heading">Add to row</h3>
        <div class="flex flex-wrap gap-1">
          <button v-for="f in FIELDS" :key="f" @click="addField(f)" class="chip chip-field">+ {{ FIELD_LABELS[f] }}</button>
        </div>
        <div class="flex flex-wrap gap-1 mt-1.5">
          <button v-for="e in ELEMENTS" :key="e.type" @click="builder.addItem(e.type)" class="chip">+ {{ e.label }}</button>
        </div>
        <h3 class="heading mt-3">Add below</h3>
        <div class="flex flex-wrap gap-1">
          <button v-for="r in ROWS" :key="r.type" @click="builder.addBlock(r.type)" class="chip">+ {{ r.label }}</button>
        </div>
      </section>

      <!-- Selected element -->
      <section v-if="node" class="panel-section">
        <div class="flex items-center justify-between">
          <h3 class="heading !mb-0">{{ TYPE_LABELS[node.type] }}</h3>
          <div class="flex items-center gap-0.5">
            <button @click="builder.move(node.id, -1)" class="icon-btn" title="Move back">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" :d="builder.selected?.line ? 'M15 19l-7-7 7-7' : 'M5 15l7-7 7 7'"/></svg>
            </button>
            <button @click="builder.move(node.id, 1)" class="icon-btn" title="Move forward">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" :d="builder.selected?.line ? 'M9 5l7 7-7 7' : 'M19 9l-7 7-7-7'"/></svg>
            </button>
            <button @click="builder.duplicate(node.id)" class="icon-btn" title="Duplicate">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
            </button>
            <button @click="builder.remove(node.id)" class="icon-btn hover:!text-red-500" title="Delete">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>

        <!-- Field -->
        <template v-if="node.type === 'field'">
          <div class="grid grid-cols-2 gap-2">
            <label class="field">
              <span>Shows</span>
              <select v-model="node.field" class="input">
                <option v-for="f in FIELDS" :key="f" :value="f">{{ FIELD_LABELS[f] }}</option>
              </select>
            </label>
            <label class="field">
              <span>Label</span>
              <input v-model="node.label" type="text" placeholder="e.g. M:" class="input" />
            </label>
          </div>
          <div class="field">
            <span>Value</span>
            <input v-model="sig.data[node.field]" type="text" :placeholder="FIELD_LABELS[node.field]" class="input" />
          </div>
          <div v-if="node.label" class="field">
            <span>Label colour</span>
            <ColorChoice v-model="node.labelColor" fallback="accent" />
          </div>
          <label class="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input v-model="node.link" type="checkbox" class="rounded" /> Make it a link
          </label>
        </template>

        <!-- Text -->
        <template v-else-if="node.type === 'text'">
          <label class="field">
            <span>Text</span>
            <textarea v-model="node.text" rows="2" class="input resize-y" />
          </label>
          <label class="field">
            <span>Link (optional)</span>
            <input v-model="node.href" type="url" placeholder="https://…" class="input" />
          </label>
        </template>

        <!-- Separator -->
        <template v-else-if="node.type === 'separator'">
          <div class="field">
            <span>Character</span>
            <div class="flex gap-1">
              <button v-for="c in [' | ', ' • ', ' / ', ' – ', '   ']" :key="c" @click="node.text = c"
                class="chip !px-2.5" :class="{ 'chip-active': node.text === c }">{{ c.trim() || 'space' }}</button>
            </div>
          </div>
          <p class="hint">Separators hide automatically when the field next to them is empty.</p>
        </template>

        <!-- Image -->
        <template v-else-if="node.type === 'image'">
          <div class="field">
            <span>Image</span>
            <div class="flex gap-1">
              <button v-for="s in (['logo', 'avatar', 'url'] as const)" :key="s" @click="node.source = s"
                class="chip" :class="{ 'chip-active': node.source === s }">{{ { logo: 'Logo', avatar: 'Photo', url: 'Other' }[s] }}</button>
            </div>
          </div>
          <AvatarUpload v-if="node.source !== 'url'" :field="node.source" hide-label />
          <label v-else class="field">
            <span>Image URL</span>
            <input v-model="node.src" type="url" placeholder="https://…" class="input" />
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label class="field">
              <span>Width (px)</span>
              <input v-model.number="node.width" type="number" min="16" max="600" class="input" />
            </label>
            <label class="field">
              <span>Shape</span>
              <select v-model="node.shape" class="input">
                <option :value="undefined">Square</option>
                <option value="rounded">Rounded</option>
                <option value="circle">Circle</option>
              </select>
            </label>
          </div>
          <label class="field">
            <span>Link (optional)</span>
            <input v-model="node.href" type="url" placeholder="https://…" class="input" />
          </label>
        </template>

        <!-- Socials -->
        <template v-else-if="node.type === 'socials'">
          <div class="field">
            <span>Icon colour</span>
            <ColorChoice v-model="node.color" fallback="accent" />
          </div>
          <p class="hint">Uses the social links from the Socials section on the left.</p>
        </template>

        <!-- Button -->
        <template v-else-if="node.type === 'button'">
          <CTAEditor />
        </template>

        <!-- Row -->
        <template v-else-if="node.type === 'line'">
          <label class="field">
            <span>Space above (px)</span>
            <input v-model.number="node.padTop" type="number" min="0" max="80" class="input" />
          </label>
          <p class="hint">Use the “Add to row” buttons above to put elements in this row.</p>
        </template>

        <!-- Columns -->
        <template v-else-if="node.type === 'columns'">
          <div class="grid grid-cols-2 gap-2">
            <label class="field">
              <span>Space above (px)</span>
              <input v-model.number="node.padTop" type="number" min="0" max="80" class="input" />
            </label>
            <label class="field">
              <span>Gap (px)</span>
              <input v-model.number="node.gap" type="number" min="0" max="120" class="input" />
            </label>
          </div>
          <div class="flex flex-wrap gap-1">
            <button v-for="(_, i) in node.columns" :key="i" @click="builder.addLineToColumn(node.id, i)" class="chip">+ Row in column {{ i + 1 }}</button>
            <button v-if="node.columns.length < 3" @click="addColumn" class="chip">+ Column</button>
            <button v-for="(_, i) in node.columns.length > 1 ? node.columns : []" :key="'rm' + i" @click="removeColumn(i)" class="chip hover:!text-red-500">− Column {{ i + 1 }}</button>
          </div>
        </template>

        <!-- Spacer -->
        <label v-else-if="node.type === 'spacer'" class="field">
          <span>Height (px)</span>
          <input v-model.number="node.height" type="number" min="2" max="120" class="input" />
        </label>

        <!-- Divider -->
        <template v-else-if="node.type === 'divider'">
          <label class="field">
            <span>Space above (px)</span>
            <input v-model.number="node.padTop" type="number" min="0" max="80" class="input" />
          </label>
          <div class="field">
            <span>Colour</span>
            <ColorChoice v-model="node.color" fallback="accent" />
          </div>
        </template>

        <!-- Banner -->
        <template v-else-if="node.type === 'banner'">
          <AvatarUpload field="banner" hide-label />
          <div class="grid grid-cols-2 gap-2">
            <label class="field">
              <span>Width (px)</span>
              <input v-model.number="sig.data.bannerWidthPx" type="number" min="100" max="700" class="input" />
            </label>
            <label class="field">
              <span>Space above</span>
              <input v-model.number="node.padTop" type="number" min="0" max="80" class="input" />
            </label>
          </div>
          <label class="field">
            <span>Link (optional)</span>
            <input v-model="sig.data.bannerUrl" type="url" placeholder="https://…" class="input" />
          </label>
        </template>

        <!-- Disclaimer -->
        <template v-else-if="node.type === 'disclaimer'">
          <textarea v-model="sig.data.disclaimer" rows="4" class="input resize-y" />
          <p class="hint">COMPANY_NAME_HERE is replaced with the company name.</p>
        </template>

        <!-- Shared text styling -->
        <template v-if="styled">
          <div class="flex items-center gap-2">
            <select v-model="styled.size" class="input !w-auto">
              <option v-for="s in SIZES" :key="s.id" :value="s.id === 'base' ? undefined : s.id">{{ s.label }}</option>
            </select>
            <div class="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button @click="styled.bold = !styled.bold" class="fmt-btn font-bold" :class="{ 'fmt-on': styled.bold }">B</button>
              <button @click="styled.italic = !styled.italic" class="fmt-btn italic" :class="{ 'fmt-on': styled.italic }">I</button>
              <button @click="styled.underline = !styled.underline" class="fmt-btn underline" :class="{ 'fmt-on': styled.underline }">U</button>
            </div>
          </div>
          <div class="field">
            <span>Colour</span>
            <ColorChoice v-model="styled.color" fallback="body" />
          </div>
        </template>
      </section>

      <!-- Layers -->
      <section class="panel-section">
        <h3 class="heading">Layers <span class="font-normal normal-case text-slate-400">· drag to reorder</span></h3>
        <div class="flex flex-col gap-1">
          <template v-for="block in builder.layout.blocks" :key="block.id">
            <LayerLine v-if="block.type === 'line'" :line="block" />
            <div
              v-else
              draggable="true"
              @dragstart="$event.dataTransfer?.setData('text/plain', block.id)"
              @dragover.prevent
              @drop.stop="builder.moveTo($event.dataTransfer?.getData('text/plain') ?? '', block.id)"
              @click="builder.select(block.id)"
              class="rounded-md border px-1.5 py-1 cursor-pointer transition-colors"
              :class="builder.selectedId === block.id
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-300'"
            >
              <div class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{{ TYPE_LABELS[block.type] }}</div>
              <div v-if="block.type === 'columns'" class="grid gap-1 mt-1" :style="{ gridTemplateColumns: `repeat(${block.columns.length}, minmax(0, 1fr))` }">
                <div v-for="(col, i) in block.columns" :key="i" class="flex flex-col gap-1">
                  <LayerLine v-for="line in col" :key="line.id" :line="line" />
                  <button @click.stop="builder.addLineToColumn(block.id, i)" class="text-[11px] text-slate-400 hover:text-indigo-600 text-left">+ row</button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.panel-section {
  @apply flex flex-col gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800;
}
.heading {
  @apply text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5;
}
.chip {
  @apply px-2 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-600
    hover:border-indigo-300 hover:text-indigo-600 transition-colors
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300;
}
.chip-field {
  @apply border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300;
}
.chip-active {
  @apply border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300;
}
.icon-btn {
  @apply p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800;
}
.fmt-btn {
  @apply w-7 h-7 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800;
}
.fmt-on {
  @apply bg-indigo-600 text-white hover:bg-indigo-600;
}
.field {
  @apply flex flex-col gap-1;
}
.field > span {
  @apply text-xs font-medium text-slate-500 dark:text-slate-400;
}
.hint {
  @apply text-[11px] text-slate-400;
}
.input {
  @apply w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800
    placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600;
}
</style>
