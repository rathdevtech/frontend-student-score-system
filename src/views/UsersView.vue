<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const users = ref<any[]>([]);
const loading = ref(true);
const showModal = ref(false);

// Form fields
const userName = ref('');
const userEmail = ref('');
const userRole = ref('teacher');
const userPassword = ref('');
const isEditing = ref(false);
const editUserId = ref<number | null>(null);

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await api.get('/users');
    users.value = res.data;
  } catch (err) {
    console.error('Failed to fetch users list', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchUsers();
});

const openAddModal = () => {
  userName.value = '';
  userEmail.value = '';
  userRole.value = 'teacher';
  userPassword.value = '';
  isEditing.value = false;
  showModal.value = true;
};

const openEditModal = (u: any) => {
  userName.value = u.name;
  userEmail.value = u.email;
  userRole.value = u.role;
  userPassword.value = ''; // Keep blank to not change
  isEditing.value = true;
  editUserId.value = u.id;
  showModal.value = true;
};

const saveUser = async () => {
  if (!userName.value.trim() || !userEmail.value.trim() || (!isEditing.value && !userPassword.value)) return;

  const payload: any = {
    name: userName.value.trim(),
    email: userEmail.value.trim(),
    role: userRole.value
  };

  if (userPassword.value) {
    payload.password = userPassword.value;
  }

  try {
    if (isEditing.value && editUserId.value) {
      await api.put(`/users/${editUserId.value}`, payload);
    } else {
      await api.post('/users', payload);
    }
    showModal.value = false;
    await fetchUsers();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to save user.');
  }
};

const deleteUser = async (id: number) => {
  if (id === authStore.user?.id) {
    alert('You cannot delete your own active administrator account.');
    return;
  }

  if (confirm('Are you sure you want to delete this user?')) {
    try {
      await api.delete(`/users/${id}`);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  }
};
</script>

<template>
  <div v-if="loading" style="text-align: center; padding: 2rem; font-weight: 600;">
    Loading system users...
  </div>
  <div v-else>
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">User Management (Admins & Teachers)</h3>
        <button class="btn btn-primary btn-sm" @click="openAddModal">
          ➕ Create User
        </button>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th style="text-align: right; width: 180px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.id }}</td>
              <td style="font-weight: 600;">{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>
                <span class="badge" :class="u.role === 'admin' ? 'badge-info' : 'badge-success'">
                  {{ u.role.toUpperCase() }}
                </span>
              </td>
              <td style="text-align: right;">
                <div style="display: inline-flex; gap: 0.5rem;">
                  <button class="btn btn-secondary btn-sm" @click="openEditModal(u)">
                    ✏️ Edit
                  </button>
                  <button
                    class="btn btn-danger btn-sm"
                    :disabled="u.id === authStore.user?.id"
                    @click="deleteUser(u.id)"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- User Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? 'Edit User' : 'Create User' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input v-model="userName" type="text" class="form-control" placeholder="e.g. Sarah Connor" required />
          </div>

          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input v-model="userEmail" type="email" class="form-control" placeholder="e.g. sarah@score.com" required />
          </div>

          <div class="form-group">
            <label class="form-label">System Role</label>
            <select v-model="userRole" class="form-control form-select" required>
              <option value="teacher">Teacher</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">{{ isEditing ? 'New Password (Optional)' : 'Password' }}</label>
            <input
              v-model="userPassword"
              type="password"
              class="form-control"
              placeholder="Min 6 characters"
              :required="!isEditing"
            />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Save User</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
