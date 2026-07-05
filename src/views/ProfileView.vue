<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const name = ref(authStore.user?.name || '');
const nameKh = ref(authStore.user?.name_kh || '');
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
  formData.append('name_kh', nameKh.value.trim());
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
      setTimeout(() => {
        successMessage.value = '';
      }, 1000);
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
  <div class="profile-layout-container">
    <!-- Left Column: Avatar & Overview -->
    <div class="profile-overview-card">
      <div class="profile-avatar-wrapper">
        <img
          :src="avatarPreviewUrl || getAvatarUrl(authStore.user?.avatar)"
          alt="Profile Avatar"
          class="profile-avatar-big"
        />
        <label class="avatar-upload-overlay" title="Upload New Photo">
          <input type="file" @change="onAvatarChange" accept="image/*" class="avatar-file-input" />
          <span class="upload-icon">📷</span>
          <span class="upload-text">Change Photo</span>
        </label>
      </div>

      <h3 class="profile-overview-name">{{ authStore.user?.name }}</h3>
      <h4 v-if="authStore.user?.name_kh" class="profile-overview-name-kh kh-text" style="font-size: 1.05rem; font-weight: 700; color: var(--text-muted); margin-top: 0.15rem; margin-bottom: 0.5rem; text-align: center;">
        {{ authStore.user?.name_kh }}
      </h4>
      <span class="profile-overview-role-badge" :class="'badge-' + authStore.user?.role" style="margin-top: 0.25rem;">
        {{ authStore.user?.role?.toUpperCase() }}
      </span>

      <div class="profile-meta-info">
        <div class="meta-info-item">
          <span class="meta-label">Email</span>
          <span class="meta-value">{{ authStore.user?.email }}</span>
        </div>
        <div class="meta-info-item">
          <span class="meta-label">Status</span>
          <span class="meta-value status-active">● Active</span>
        </div>
      </div>
    </div>

    <!-- Right Column: Edit Form -->
    <div class="profile-settings-card card">
      <div class="card-header" style="border-bottom: 1px solid var(--sidebar-border); padding: 1.25rem 1.5rem;">
        <h3 class="card-title" style="margin: 0;">Account Settings</h3>
        <p class="card-subtitle">Manage your personal profile details and password security.</p>
      </div>

      <div class="card-body" style="padding: 1.5rem;">
        <!-- Alerts -->
        <transition name="fade">
          <div v-if="successMessage" class="custom-alert alert-success">
            <span class="alert-icon">✅</span>
            <div class="alert-content">{{ successMessage }}</div>
          </div>
        </transition>

        <transition name="fade">
          <div v-if="errorMessage" class="custom-alert alert-danger">
            <span class="alert-icon">⚠️</span>
            <div class="alert-content">{{ errorMessage }}</div>
          </div>
        </transition>

        <form @submit.prevent="handleUpdateProfile" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Account Details Section -->
          <div class="settings-section">
            <h4 class="section-title">Personal Details</h4>
            
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <div class="input-wrapper">
                  <span class="input-icon">👤</span>
                  <input v-model="name" type="text" class="form-control" required placeholder="Full Name" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">ឈ្មោះខ្មែរ (Khmer Name)</label>
                <div class="input-wrapper">
                  <span class="input-icon">👤</span>
                  <input v-model="nameKh" type="text" class="form-control" placeholder="ឈ្មោះខ្មែរ" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address</label>
                <div class="input-wrapper">
                  <span class="input-icon">✉️</span>
                  <input v-model="email" type="email" class="form-control" required placeholder="Email Address" />
                </div>
              </div>
            </div>
          </div>

          <!-- Security Section -->
          <div class="settings-section" style="margin-top: 0.5rem;">
            <h4 class="section-title">Security & Password</h4>
            
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">New Password</label>
                <div class="input-wrapper">
                  <span class="input-icon">🔒</span>
                  <input v-model="password" type="password" class="form-control" placeholder="Leave blank to keep current" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <div class="input-wrapper">
                  <span class="input-icon">🛡️</span>
                  <input v-model="passwordConfirmation" type="password" class="form-control" placeholder="Confirm new password" />
                </div>
              </div>
            </div>
          </div>

          <div class="settings-footer" style="margin-top: 1rem;">
            <button type="submit" class="btn btn-primary btn-save-profile" :disabled="updating">
              <span v-if="updating">Updating profile...</span>
              <span v-else>💾 Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-layout-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  align-items: start;
  max-width: 1000px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .profile-layout-container {
    grid-template-columns: 1fr;
  }
}

/* Left Card: Overview */
.profile-overview-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 2.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.profile-avatar-wrapper {
  position: relative;
  width: 124px;
  height: 124px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 1.25rem;
  border: 4px solid var(--primary-color);
  box-shadow: var(--shadow-md);
  background-color: var(--primary-light);
  cursor: pointer;
}

.profile-avatar-big {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.avatar-upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
}

.profile-avatar-wrapper:hover .avatar-upload-overlay {
  opacity: 1;
}

.profile-avatar-wrapper:hover .profile-avatar-big {
  transform: scale(1.05);
}

.avatar-file-input {
  display: none;
}

.upload-icon {
  font-size: 1.35rem;
  margin-bottom: 0.25rem;
  color: #ffffff;
}

.upload-text {
  font-size: 0.7rem;
  color: #f1f5f9;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.profile-overview-name {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 0.5rem 0;
  font-family: var(--font-family);
}

.profile-overview-role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 20px;
  letter-spacing: 0.05em;
  margin-bottom: 1.5rem;
}

.profile-overview-role-badge.badge-admin {
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.profile-overview-role-badge.badge-teacher {
  background-color: #ecfdf5;
  color: #10b981;
}

.profile-meta-info {
  width: 100%;
  border-top: 1px solid var(--border-color);
  padding-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.meta-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
}

.meta-label {
  color: var(--text-muted);
  font-weight: 600;
}

.meta-value {
  color: var(--text-main);
  font-weight: 700;
  word-break: break-all;
  text-align: right;
  padding-left: 0.5rem;
}

.status-active {
  color: #10b981;
  font-weight: 700;
}

/* Right Card: Settings */
.profile-settings-card {
  padding: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.card-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
  font-weight: 500;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 576px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.95rem;
  pointer-events: none;
  color: var(--text-muted);
}

.input-wrapper .form-control {
  padding-left: 2.25rem;
  height: 38px;
}

/* Custom Alert Layout */
.custom-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.4;
  border: 1px solid transparent;
}

.alert-success {
  background-color: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}

.alert-danger {
  background-color: #fef2f2;
  color: #991b1b;
  border-color: #fca5a5;
}

.alert-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  line-height: 1;
}

.btn-save-profile {
  width: 100%;
  height: 40px;
  font-size: 0.9rem;
  font-weight: 700;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
