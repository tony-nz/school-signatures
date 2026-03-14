<script setup lang="ts">
import { ref } from "vue";
import { useExport } from "../../composables/useExport";
import { useSignatureStore } from "../../stores/signature";
import { presets } from "../../presets";

const { copyForGmail, downloadMailSignature, downloadHtml, copyHtml } =
  useExport();
const store = useSignatureStore();

const feedback = ref<string | null>(null);
const showMacInstructions = ref(false);
const importError = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const selectedPresetId = ref("");

function applyPreset() {
  const preset = presets.find((p) => p.id === selectedPresetId.value);
  if (!preset) return;
  store.importSettings(preset.payload);
  feedback.value = `"${preset.name}" applied!`;
  setTimeout(() => (feedback.value = null), 2500);
}

async function handle(fn: () => void | Promise<void>, message: string) {
  await fn();
  feedback.value = message;
  setTimeout(() => (feedback.value = null), 2500);
}

function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      store.importSettings(ev.target!.result as string);
      feedback.value = "Settings imported!";
      setTimeout(() => (feedback.value = null), 2500);
    } catch {
      importError.value = "Invalid settings file.";
      setTimeout(() => (importError.value = null), 3000);
    } finally {
      if (fileInput.value) fileInput.value.value = "";
    }
  };
  reader.readAsText(file);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Row 1: title + settings actions top-right -->
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
        >Export</span
      >
      <div class="flex items-center gap-1">
        <transition name="fade">
          <span
            v-if="feedback"
            class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mr-1"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {{ feedback }}
          </span>
        </transition>
        <transition name="fade">
          <span v-if="importError" class="text-xs text-red-500 mr-1">{{
            importError
          }}</span>
        </transition>
        <!-- Settings icon buttons -->
        <div
          class="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 divide-x divide-slate-200 dark:divide-slate-700"
        >
          <button
            @click="handle(store.exportSettings, 'Exported!')"
            title="Export settings"
            class="icon-btn hover:text-violet-600 hover:bg-violet-50"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 16l-5-5 1.41-1.41L11 13.17V4h2v9.17l2.59-2.58L17 11l-5 5zM5 20h14v-2H5v2z"
              />
            </svg>
          </button>
          <button
            @click="fileInput?.click()"
            title="Import settings"
            class="icon-btn hover:text-violet-600 hover:bg-violet-50"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
            </svg>
          </button>
          <button
            @click="handle(store.resetToDemo, 'Reset!')"
            title="Reset to demo"
            class="icon-btn hover:text-rose-600 hover:bg-rose-50"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
              />
            </svg>
          </button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="onImportFile"
        />
      </div>
    </div>

    <!-- Row 2: export buttons + preset inline -->
    <div class="flex items-center gap-1.5 flex-wrap">
      <button
        @click="handle(copyForGmail, 'Copied for Gmail!')"
        class="export-btn hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
          />
        </svg>
        Gmail
      </button>
      <button
        @click="
          () => {
            downloadMailSignature();
            showMacInstructions = true;
            handle(() => {}, 'Downloaded!');
          }
        "
        class="export-btn hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z"
          />
        </svg>
        Mac Mail
      </button>
      <button
        @click="handle(copyHtml, 'HTML copied!')"
        class="export-btn hover:border-blue-700 hover:text-blue-700 hover:bg-blue-50"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M7.462 0H0v24h24V8.538L15.46 0H7.462zm8.077 1.5L22.5 9h-6.96V1.5zM1 23V1h13.5v9H23v13H1z"
          />
        </svg>
        Outlook
      </button>
      <button
        @click="handle(downloadHtml, 'HTML downloaded!')"
        class="export-btn hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 16l-5-5 1.41-1.41L11 13.17V4h2v9.17l2.59-2.58L17 11l-5 5zM5 20h14v-2H5v2z"
          />
        </svg>
        HTML
      </button>

      <!-- Divider pip -->
      <span class="text-slate-200 dark:text-slate-700 select-none">|</span>

      <!-- Preset inline -->
      <select
        v-model="selectedPresetId"
        class="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 transition"
      >
        <option value="" disabled>Preset…</option>
        <option v-for="p in presets" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select>
      <button
        @click="applyPreset"
        :disabled="!selectedPresetId"
        class="export-btn bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Apply
      </button>
    </div>

    <!-- Mac Mail Instructions Modal -->
    <Teleport to="body">
      <div
        v-if="showMacInstructions"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="showMacInstructions = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">
              Install in Mac Mail
            </h2>
            <button
              @click="showMacInstructions = false"
              class="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <ol class="flex flex-col gap-3 text-sm text-gray-700 list-none p-0">
            <li v-for="(step, i) in steps" :key="i" class="flex gap-3">
              <span
                class="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center"
                >{{ i + 1 }}</span
              >
              <span v-html="step"></span>
            </li>
          </ol>

          <p
            class="mt-4 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2"
          >
            <strong>Important:</strong> After saving, right-click the file → Get
            Info → check <strong>Locked</strong>. Otherwise Mail will overwrite
            it.
          </p>

          <button
            @click="showMacInstructions = false"
            class="mt-4 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
          >
            Got it
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
const steps = [
  "Open <strong>Mail</strong> → <strong>Settings</strong> → <strong>Signatures</strong> tab. Select your account and create a new blank signature (name it anything). Then <strong>quit Mail completely</strong>.",
  'In Finder, press <kbd class="bg-gray-100 px-1 py-0.5 rounded text-xs">⌘ Shift G</kbd> and go to: <code class="bg-gray-100 px-1 rounded text-xs">~/Library/Mail/V10/MailData/Signatures/</code><br/><span class="text-gray-500">(the version folder V10 may differ on your machine)</span>',
  'Find the <code class="bg-gray-100 px-1 rounded text-xs">.mailsignature</code> file that was just created (sort by Date Modified). Open it in <strong>TextEdit</strong>.',
  'Select <strong>all the text</strong> after the headers (from <code class="bg-gray-100 px-1 rounded text-xs">&lt;body&gt;</code> onward) and replace it with the contents of the downloaded <code class="bg-gray-100 px-1 rounded text-xs">.mailsignature</code> file\'s body section. Or simply replace the entire file with the downloaded one.',
  'Save the file (<kbd class="bg-gray-100 px-1 py-0.5 rounded text-xs">⌘S</kbd>), then right-click it → <strong>Get Info</strong> → check <strong>Locked</strong>.',
  "Reopen Mail. Your signature should appear in Settings → Signatures.",
];
</script>

<style scoped>
.export-btn {
  @apply flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium
    text-slate-600 bg-white transition-all cursor-pointer
    dark:border-slate-700 dark:text-slate-300 dark:bg-slate-800;
}

.icon-btn {
  @apply flex items-center justify-center w-7 h-7 text-slate-500 dark:text-slate-400 transition-all cursor-pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
