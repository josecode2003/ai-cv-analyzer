<script setup>
import { ref } from 'vue'

import AnalyzingProgress from './AnalyzingProgress.vue'
import AppIcon from '@/components/icons/AppIcon.vue'
import { formatFileSize } from '@/utils/format'

const emit = defineEmits(['upload'])

const fileInput = ref(null)
const selectedFile = ref(null)
const errorMessage = ref('')
const uploadStatus = ref('idle')
const uploadMessage = ref('')
const isDragging = ref(false)

const MAX_FILE_SIZE = 5 * 1024 * 1024

/* =========================================================
   SELECCIONAR ARCHIVO
   ========================================================= */

function validateAndSetFile(file) {
  selectedFile.value = null
  errorMessage.value = ''
  uploadMessage.value = ''
  uploadStatus.value = 'idle'

  if (!file) {
    return
  }

  if (file.type !== 'application/pdf') {
    errorMessage.value = 'El archivo debe estar en formato PDF.'
    clearInput()
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value = 'El archivo no puede superar los 5 MB.'
    clearInput()
    return
  }

  selectedFile.value = file
}

function handleFileInput(event) {
  validateAndSetFile(event.target.files[0])
}

/* =========================================================
   ARRASTRAR Y SOLTAR
   ========================================================= */

function handleDrop(event) {
  isDragging.value = false
  validateAndSetFile(event.dataTransfer.files[0])
}

/* =========================================================
   ELIMINAR ARCHIVO
   ========================================================= */

function removeFile() {
  selectedFile.value = null
  errorMessage.value = ''
  uploadMessage.value = ''
  uploadStatus.value = 'idle'
  clearInput()
}

function clearInput() {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

/* =========================================================
   ANALIZAR CV
   ========================================================= */

function uploadSelectedCV() {
  if (!selectedFile.value) {
    errorMessage.value = 'Selecciona un CV antes de continuar.'
    return
  }

  uploadStatus.value = 'uploading'
  uploadMessage.value = ''
  errorMessage.value = ''

  emit('upload', selectedFile.value)
}

/* =========================================================
   ACTUALIZAR ESTADO DESDE EL PADRE
   ========================================================= */

function setUploadState({ status, message }) {
  uploadStatus.value = status
  uploadMessage.value = message || ''
}

defineExpose({ setUploadState })
</script>

<template>
  <div class="upload-card">
    <Transition name="uploader-fade" mode="out-in">
      <AnalyzingProgress v-if="uploadStatus === 'uploading'" key="analyzing" />

      <div v-else key="idle" class="upload-body">
        <label
          class="dropzone"
          :class="{
            'is-dragging': isDragging,
            'has-file': selectedFile
          }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,application/pdf"
            class="visually-hidden"
            aria-label="Seleccionar CV en formato PDF"
            @change="handleFileInput"
          />

          <AppIcon name="upload-cloud" class="dropzone-icon" />

          <strong>Arrastra tu CV aquí</strong>
          <span>o haz clic para seleccionar un archivo</span>
          <small>PDF · Máximo 5 MB</small>
        </label>

        <Transition name="file-pop">
          <div v-if="selectedFile" class="file-selected">
            <span class="file-icon"><AppIcon name="file-text" /></span>

            <div class="file-info">
              <strong>{{ selectedFile.name }}</strong>
              <span>{{ formatFileSize(selectedFile.size) }}</span>
            </div>

            <button
              type="button"
              class="btn-icon"
              aria-label="Eliminar archivo seleccionado"
              @click="removeFile"
            >
              <AppIcon name="x" />
            </button>
          </div>
        </Transition>

        <button
          v-if="selectedFile"
          class="btn btn-primary analyze-button"
          @click="uploadSelectedCV"
        >
          <AppIcon name="sparkles" />
          Analizar CV
        </button>

        <p
          v-if="uploadMessage"
          class="upload-message"
          :class="uploadStatus"
          role="status"
        >
          {{ uploadMessage }}
        </p>

        <p v-if="errorMessage" class="error-message" role="alert">
          {{ errorMessage }}
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.upload-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.upload-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  text-align: center;
  padding: var(--space-7) var(--space-5);
  border-radius: var(--radius-lg);
  border: 1.5px dashed var(--color-border-strong);
  background: var(--color-surface);
  cursor: pointer;
  transition:
    border-color var(--duration-base) var(--ease-out),
    background-color var(--duration-base) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .dropzone:hover {
    border-color: var(--accent-border);
    background: var(--accent-soft);
  }
}

.dropzone.is-dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
  transform: scale(1.01);
}

.dropzone.has-file {
  padding-block: var(--space-5);
}

.dropzone-icon {
  width: 34px;
  height: 34px;
  color: var(--accent-strong);
  margin-bottom: var(--space-2);
}

.dropzone strong {
  font-size: 1rem;
}

.dropzone span {
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.dropzone small {
  color: var(--color-text-tertiary);
  font-size: 0.78rem;
  margin-top: var(--space-1);
}

.file-selected {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.file-icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-strong);
  flex-shrink: 0;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}

.file-info strong {
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-info span {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

.analyze-button {
  width: 100%;
}

.upload-message {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
}

.upload-message.success {
  color: var(--color-success);
}

.upload-message.error {
  color: var(--color-danger);
}

.uploader-fade-enter-active,
.uploader-fade-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}

.uploader-fade-enter-from,
.uploader-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.file-pop-enter-active {
  transition:
    opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}

.file-pop-enter-from {
  opacity: 0;
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .uploader-fade-enter-from,
  .uploader-fade-leave-to,
  .file-pop-enter-from {
    transform: none;
  }

  .dropzone.is-dragging {
    transform: none;
  }
}
</style>
