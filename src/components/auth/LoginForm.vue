<script setup>
import { ref } from 'vue'

const emit = defineEmits([
  'login',
  'show-register'
])

const email = ref('')
const password = ref('')

const loading = ref(false)
const error = ref('')

function handleSubmit() {
  error.value = ''

  if (!email.value || !password.value) {
    error.value =
      'Introduce email y contraseña.'
    return
  }

  emit('login', {
    email: email.value,
    password: password.value
  })
}
</script>

<template>
  <form
    class="auth-form"
    @submit.prevent="handleSubmit"
  >

    <h2>
      Iniciar sesión
    </h2>

    <p class="auth-description">
      Accede a tus análisis y comparaciones.
    </p>

    <div class="form-group">

      <label>
        Email
      </label>

      <input
        v-model="email"
        type="email"
        autocomplete="email"
        placeholder="tu@email.com"
      />

    </div>

    <div class="form-group">

      <label>
        Contraseña
      </label>

      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        placeholder="Tu contraseña"
      />

    </div>

    <div
      v-if="error"
      class="auth-error"
    >
      {{ error }}
    </div>

    <button
      type="submit"
      class="auth-primary-button"
      :disabled="loading"
    >
      {{ loading
        ? 'Iniciando sesión...'
        : 'Iniciar sesión'
      }}
    </button>

    <div class="auth-switch">

      <span>
        ¿No tienes cuenta?
      </span>

      <button
        type="button"
        @click="emit('show-register')"
      >
        Crear cuenta
      </button>

    </div>

  </form>
</template>