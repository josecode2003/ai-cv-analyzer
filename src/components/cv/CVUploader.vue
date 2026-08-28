<script setup>
import { ref } from 'vue'

const emit = defineEmits([
  'upload'
])

const fileInput = ref(null)

const selectedFile = ref(null)

const errorMessage = ref('')

const uploadStatus = ref('idle')

const uploadMessage = ref('')

const MAX_FILE_SIZE = 5 * 1024 * 1024


/* =========================================================
   SELECCIONAR ARCHIVO
   ========================================================= */

function handleFile(event) {
  const file = event.target.files[0]

  selectedFile.value = null

  errorMessage.value = ''

  uploadMessage.value = ''

  uploadStatus.value = 'idle'

  if (!file) {
    return
  }

  if (file.type !== 'application/pdf') {
    errorMessage.value =
      'El archivo debe estar en formato PDF.'

    clearInput()

    return
  }

  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value =
      'El archivo no puede superar los 5 MB.'

    clearInput()

    return
  }

  selectedFile.value = file
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


/* =========================================================
   LIMPIAR INPUT
   ========================================================= */

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
    errorMessage.value =
      'Selecciona un CV antes de continuar.'

    return
  }

  uploadStatus.value = 'uploading'

  uploadMessage.value = ''

  errorMessage.value = ''

  emit(
    'upload',
    selectedFile.value
  )
}


/* =========================================================
   ACTUALIZAR ESTADO DESDE APP.VUE
   ========================================================= */

function setUploadState({
  status,
  message
}) {
  uploadStatus.value = status

  uploadMessage.value =
    message || ''
}


/* =========================================================
   FORMATEAR TAMAÑO
   ========================================================= */

function formatFileSize(size) {
  return (
    size /
    1024 /
    1024
  ).toFixed(2)
}


/* =========================================================
   EXPONER MÉTODOS AL COMPONENTE PADRE
   ========================================================= */

defineExpose({
  setUploadState
})
</script>

<template>

  <div class="upload-card">

```
<div class="upload-icon">
  📄
</div>


<h2>
  Sube tu CV
</h2>


<p>
  Selecciona tu currículum en formato PDF
</p>


<label class="upload-button">

  Seleccionar CV

  <input
    ref="fileInput"
    type="file"
    accept=".pdf,application/pdf"
    @change="handleFile"
    hidden
  />

</label>


<button
  v-if="selectedFile"
  class="analyze-button"
  :disabled="
    uploadStatus === 'uploading'
  "
  @click="uploadSelectedCV"
>

  {{
    uploadStatus === 'uploading'
      ? 'Analizando CV...'
      : 'Analizar CV'
  }}

</button>


<div
  v-if="uploadMessage"
  class="upload-message"
  :class="uploadStatus"
>
  {{ uploadMessage }}
</div>


<div
  v-if="errorMessage"
  class="error-message"
>
  {{ errorMessage }}
</div>


<small>
  PDF · Máximo 5 MB
</small>


<div
  v-if="selectedFile"
  class="file-selected"
>

  <div class="file-info">

    <span class="file-icon">
      📄
    </span>

    <div>

      <strong>
        {{ selectedFile.name }}
      </strong>

      <span>
        {{
          formatFileSize(
            selectedFile.size
          )
        }}
        MB
      </span>

    </div>

  </div>


  <button
    type="button"
    class="remove-button"
    @click="removeFile"
  >
    Eliminar
  </button>

</div>
```

  </div>

</template>
