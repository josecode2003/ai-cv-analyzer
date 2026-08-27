<script setup>
import { ref } from 'vue'

const emit = defineEmits([
  'upload'
])

const selectedFile = ref(null)

const errorMessage = ref('')

const uploadStatus = ref('idle')

const uploadMessage = ref('')

const MAX_FILE_SIZE =
  5 * 1024 * 1024


function handleFile(event) {

  const file =
    event.target.files[0]

  selectedFile.value =
    null

  errorMessage.value =
    ''

  uploadMessage.value =
    ''

  uploadStatus.value =
    'idle'

  if (!file) {
    return
  }

  if (
    file.type !==
    'application/pdf'
  ) {

    errorMessage.value =
      'El archivo debe estar en formato PDF.'

    return

  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {

    errorMessage.value =
      'El archivo no puede superar los 5 MB.'

    return

  }

  selectedFile.value =
    file

}


function removeFile() {

  selectedFile.value =
    null

  errorMessage.value =
    ''

  uploadMessage.value =
    ''

  uploadStatus.value =
    'idle'

}


function uploadSelectedCV() {

  if (!selectedFile.value) {

    errorMessage.value =
      'Selecciona un CV antes de continuar.'

    return

  }

  uploadStatus.value =
    'uploading'

  uploadMessage.value =
    ''

  errorMessage.value =
    ''

  emit(
    'upload',
    selectedFile.value
  )

}


function setUploadState({
  status,
  message
}) {

  uploadStatus.value =
    status

  uploadMessage.value =
    message || ''

}


function formatFileSize(size) {

  return (
    size /
    1024 /
    1024
  ).toFixed(2)

}


defineExpose({
  setUploadState
})
</script>


<template>

  <div class="upload-card">

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
        class="remove-button"
        @click="removeFile"
      >
        Eliminar
      </button>

    </div>

  </div>

</template>