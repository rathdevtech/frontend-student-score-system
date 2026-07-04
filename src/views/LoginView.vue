<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('teacher@score.com');
const password = ref('password');
const errorMessage = ref('');

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter email and password.';
    return;
  }
  errorMessage.value = '';
  const success = await authStore.login({
    email: email.value,
    password: password.value
  });
  if (success) {
    router.push({ name: 'dashboard' });
  } else {
    errorMessage.value = authStore.error || 'Invalid credentials.';
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">🎓</div>
        <h2 class="auth-title">Welcome Back</h2>
        <p class="auth-subtitle">Sign in to manage student academic performance</p>
      </div>

      <div v-if="errorMessage" class="badge badge-danger" style="width: 100%; padding: 0.75rem; margin-bottom: 1.5rem; border-radius: 8px; font-size: 0.875rem;">
        ⚠️ {{ errorMessage }}
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="email">Email Address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-control"
            placeholder="teacher@score.com"
            required
          />
        </div>

        <div class="form-group" style="margin-bottom: 1.75rem;">
          <label class="form-label" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-control"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.875rem;" :disabled="authStore.loading">
          {{ authStore.loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div style="margin-top: 1.5rem; text-align: center; border-top: 1px solid var(--border-color); padding-top: 1rem;">
        <p style="font-size: 0.75rem; color: var(--text-muted);">
          Demo accounts:<br>
          Admin: <strong>admin@score.com</strong> (password: password)<br>
          Teacher: <strong>teacher@score.com</strong> (password: password)
        </p>
      </div>
    </div>
  </div>
</template>
