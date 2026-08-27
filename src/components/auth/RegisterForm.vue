<script setup>
import { ref } from 'vue'

const emit = defineEmits([
  'register',
  'show-login'
])

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const error = ref('')

function handleSubmit() {
  error.value = ''

  if (
    !name.value ||
    !email.value ||
    !password.value ||
    !confirmPassword.value
  ) {
    error.value =
      'Completa todos los campos.'
    return
  }

  if (
    password.value !==
    confirmPassword.value
  ) {
    error.value =
      'Las contraseñas no coinciden.'
    return
  }

  if (password.value.length < 8) {
    error.value =
      'La contraseña debe tener al menos 8 caracteres.'
    return
  }

  emit('register', {
    name: name.value,
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
      Crear cuenta
    </h2>

    <p class="auth-description">
      Guarda tus análisis y comparaciones.
    </p>

    <div class="form-group">

      <label>
        Nombre
      </label>

      <input
        v-model="name"
        type="text"
        autocomplete="name"
        placeholder="Tu nombre"
      />

    </div>

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
        autocomplete="new-password"
        placeholder="Mínimo 8 caracteres"
      />

    </div>

    <div class="form-group">

      <label>
        Confirmar contraseña
      </label>

      <input
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        placeholder="Repite tu contraseña"
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
    >
      Crear cuenta
    </button>

    <div class="auth-switch">

      <span>
        ¿Ya tienes cuenta?
      </span>

      <button
        type="button"
        @click="emit('show-login')"
      >
        Iniciar sesión
      </button>

    </div>

  </form>
</template>