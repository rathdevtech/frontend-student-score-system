<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const name = ref(authStore.user?.name || '');
const email = ref(authStore.user?.email || '');
const password = ref('');
const passwordConfirmation = ref('');
const avatarFile = ref<File | null>(null);
const avatarPreviewUrl = ref<string | null>(null);

const successMessage = ref('');
const errorMessage = ref('');
const updating = ref(false);

const getAvatarUrl = (path: string | null | undefined) => {
  if (!path) return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

const onAvatarChange = (e: any) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    avatarFile.value = files[0];
    avatarPreviewUrl.value = URL.createObjectURL(files[0]);
  }
};

const handleUpdateProfile = async () => {
  updating.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  const formData = new FormData();
  formData.append('name', name.value.trim());
  formData.append('email', email.value.trim());

  if (password.value) {
    if (password.value !== passwordConfirmation.value) {
      errorMessage.value = 'Passwords do not match.';
      updating.value = false;
      return;
    }
    formData.append('password', password.value);
    formData.append('password_confirmation', passwordConfirmation.value);
  }

  if (avatarFile.value) {
    formData.append('avatar', avatarFile.value);
  }

  try {
    const success = await authStore.updateProfile(formData);
    if (success) {
      successMessage.value = 'Profile updated successfully!';
      password.value = '';
      passwordConfirmation.value = '';
      avatarFile.value = null;
      avatarPreviewUrl.value = null;
    } else {
      errorMessage.value = authStore.error || 'Failed to update profile.';
    }
  } catch (err) {
    errorMessage.value = 'Error updating profile.';
  } finally {
    updating.value = false;
  }
};
</script>

<template>
  <div style="max-width: 600px; margin: 0 auto;">
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Manage Account Profile</h3>
      </div>

      <div v-if="successMessage" class="badge badge-success" style="width: 100%; padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px;">
        ✅ {{ successMessage }}
      </div>

      <div v-if="errorMessage" class="badge badge-danger" style="width: 100%; padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px;">
        ⚠️ {{ errorMessage }}
      </div>

      <form @submit.prevent="handleUpdateProfile">
        <!-- Profile Picture Section -->
        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 2rem; gap: 0.75rem;">
          <img
            :src="avatarPreviewUrl || getAvatarUrl(authStore.user?.avatar)"
            alt="Profile Avatar"
            style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color); box-shadow: var(--shadow-md);"
          />
          <span style="font-weight: 700; font-size: 1.1rem;">{{ authStore.user?.name }}</span>
          <span class="badge badge-info" style="font-size: 0.75rem;">{{ authStore.user?.role?.toUpperCase() }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input v-model="name" type="text" class="form-control" required />
        </div>

        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input v-model="email" type="email" class="form-control" required />
        </div>

        <div class="form-group">
          <label class="form-label">Update Profile Picture (Avatar)</label>
          <input type="file" @change="onAvatarChange" class="form-control" accept="image/*" />
        </div>

        <div style="border-top: 1px solid var(--border-color); margin: 2rem 0; padding-top: 1rem;">
          <h4 style="font-weight: 700; margin-bottom: 1rem; color: var(--text-muted);">Change Password (Optional)</h4>
          
          <div class="form-group">
            <label class="form-label">New Password</label>
            <input v-model="password" type="password" class="form-control" placeholder="Leave blank to keep current" />
          </div>

          <div class="form-group">
            <label class="form-label">Confirm New Password</label>
            <input v-model="passwordConfirmation" type="password" class="form-control" placeholder="Leave blank to keep current" />
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%;" :disabled="updating">
          {{ updating ? 'Updating profile...' : 'Save Profile Changes' }}
        </button>
      </form>
    </div>
  </div>
</template>
