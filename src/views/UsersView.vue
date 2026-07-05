<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const authStore = useAuthStore();
const uiStore = useUiStore();

const users = ref<any[]>([]);
const loading = ref(true);
const showModal = ref(false);
const openDropdownId = ref<number | null>(null);

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(5);

watch(itemsPerPage, () => {
  currentPage.value = 1;
});

const totalPages = computed(() => Math.ceil(users.value.length / itemsPerPage.value));

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return users.value.slice(start, end);
});

// Form fields
const userName = ref('');
const userNameKh = ref('');
const userEmail = ref('');
const userRole = ref('teacher');
const userPassword = ref('');
const isEditing = ref(false);
const editUserId = ref<number | null>(null);

// Avatar & Profile Detail state
const userAvatarFile = ref<File | null>(null);
const avatarPreviewUrl = ref<string | null>(null);
const showDetailsModal = ref(false);
const selectedUserDetails = ref<any>(null);

const getAvatarUrl = (path: string | null) => {
  if (!path) return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

const viewUserDetails = (u: any) => {
  selectedUserDetails.value = u;
  showDetailsModal.value = true;
};

const getApiErrorMessage = (err: any, fallback: string) => {
  const data = err.response?.data;
  console.error('User save failed:', data || err);
  const firstError = data?.errors ? Object.values(data.errors).flat()[0] : null;
  return firstError || data?.message || fallback;
};

// Batch actions state
const selectedIds = ref<number[]>([]);

const isAllSelected = computed(() => {
  if (users.value.length === 0) return false;
  return users.value.every(u => selectedIds.value.includes(u.id));
});

const toggleSelectAll = (e: any) => {
  if (e.target.checked) {
    selectedIds.value = users.value.map(u => u.id);
  } else {
    selectedIds.value = [];
  }
};

const bulkSetStatus = async (status: boolean) => {
  if (selectedIds.value.length === 0) return;
  
  loading.value = true;
  for (const id of selectedIds.value) {
    try {
      await api.put(`/users/${id}`, { is_active: status });
    } catch (err) {
      console.error(`Failed to toggle status for user ${id}`, err);
    }
  }
  selectedIds.value = [];
  loading.value = false;
  await fetchUsers();
};

const bulkDelete = async () => {
  if (selectedIds.value.length === 0) return;
  
  const toDelete = selectedIds.value.filter(id => id !== authStore.user?.id);
  if (toDelete.length === 0) {
    alert('You cannot delete your own active administrator account.');
    return;
  }

  if (confirm(`Are you sure you want to delete the ${toDelete.length} selected users?`)) {
    loading.value = true;
    for (const id of toDelete) {
      try {
        await api.delete(`/users/${id}`);
      } catch (err) {
        console.error(`Failed to delete user ${id}`, err);
      }
    }
    selectedIds.value = [];
    loading.value = false;
    await fetchUsers();
  }
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await api.get('/users');
    users.value = res.data;
    const maxPage = Math.ceil(users.value.length / itemsPerPage.value);
    if (currentPage.value > maxPage) {
      currentPage.value = Math.max(1, maxPage);
    }
  } catch (err) {
    console.error('Failed to fetch users list', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchUsers();
  document.addEventListener('click', () => { openDropdownId.value = null; });
});

const toggleUserStatus = async (u: any) => {
  try {
    await api.put(`/users/${u.id}`, { is_active: !u.is_active });
    await fetchUsers();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to update user status.');
  }
};

const onFileChange = (e: any) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    userAvatarFile.value = files[0];
    avatarPreviewUrl.value = URL.createObjectURL(files[0]);
  }
};

const openAddModal = () => {
  userName.value = '';
  userNameKh.value = '';
  userEmail.value = '';
  userRole.value = 'teacher';
  userPassword.value = '';
  userAvatarFile.value = null;
  avatarPreviewUrl.value = null;
  isEditing.value = false;
  showModal.value = true;
};

const openEditModal = (u: any) => {
  userName.value = u.name;
  userNameKh.value = u.name_kh || '';
  userEmail.value = u.email;
  userRole.value = u.role;
  userPassword.value = ''; // Keep blank to not change
  userAvatarFile.value = null;
  avatarPreviewUrl.value = u.avatar ? getAvatarUrl(u.avatar) : null;
  isEditing.value = true;
  editUserId.value = u.id;
  showModal.value = true;
};

const saveUser = async () => {
  if (!userName.value.trim() || !userEmail.value.trim() || (!isEditing.value && !userPassword.value)) return;

  try {
    const editingCurrentUser = isEditing.value && editUserId.value === authStore.user?.id;

    if (isEditing.value && editUserId.value) {
      if (userAvatarFile.value) {
        const formData = new FormData();
        formData.append('name', userName.value.trim());
        formData.append('name_kh', userNameKh.value.trim());
        formData.append('email', userEmail.value.trim());
        if (['admin', 'teacher'].includes(userRole.value)) {
          formData.append('role', userRole.value);
        }
        formData.append('avatar', userAvatarFile.value);
        if (userPassword.value) {
          formData.append('password', userPassword.value);
        }
        await api.post(`/users/${editUserId.value}/update`, formData);
      } else {
        const payload: any = {
          name: userName.value.trim(),
          name_kh: userNameKh.value.trim(),
          email: userEmail.value.trim(),
          role: userRole.value
        };
        if (userPassword.value) {
          payload.password = userPassword.value;
        }
        await api.post(`/users/${editUserId.value}/update`, payload);
      }
    } else {
      if (userAvatarFile.value) {
        const formData = new FormData();
        formData.append('name', userName.value.trim());
        formData.append('name_kh', userNameKh.value.trim());
        formData.append('email', userEmail.value.trim());
        formData.append('role', userRole.value);
        formData.append('password', userPassword.value);
        formData.append('avatar', userAvatarFile.value);
        await api.post('/users', formData);
      } else {
        const payload = {
          name: userName.value.trim(),
          name_kh: userNameKh.value.trim(),
          email: userEmail.value.trim(),
          role: userRole.value,
          password: userPassword.value
        };
        await api.post('/users', payload);
      }
    }
    showModal.value = false;
    await fetchUsers();
    if (editingCurrentUser) {
      await authStore.fetchProfile();
    }
  } catch (err: any) {
    alert(getApiErrorMessage(err, 'Failed to save user.'));
  }
};

const downloadUserTemplate = () => {
  const headers = 'name,name_kh,email,role,password\n';
  const rows = 'Teacher Name,ឈ្មោះគ្រូបង្រៀន,teacher@example.com,teacher,password123\nAdmin Name,ឈ្មោះអ្នកគ្រប់គ្រង,admin@example.com,admin,password456\n';
  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'users_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const triggerUserImport = () => {
  document.getElementById('userCsvFileInput')?.click();
};

const handleUserImport = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event: any) => {
    const text = event.target.result;
    const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    if (lines.length <= 1) {
      alert('The CSV file is empty or missing data rows.');
      return;
    }

    const headers = lines[0].toLowerCase().split(',').map((h: string) => h.trim());
    const nameIdx = headers.indexOf('name');
    const nameKhIdx = headers.indexOf('name_kh');
    const emailIdx = headers.indexOf('email');
    const roleIdx = headers.indexOf('role');
    const pwdIdx = headers.indexOf('password');

    if (nameIdx === -1 || emailIdx === -1 || roleIdx === -1 || pwdIdx === -1) {
      alert('Invalid template format. The CSV must contain "name", "email", "role", and "password" headers.');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let errors: string[] = [];

    loading.value = true;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c: string) => c.trim());
      if (cols.length < headers.length) continue;

      const name = cols[nameIdx];
      const name_kh = nameKhIdx !== -1 ? cols[nameKhIdx] : '';
      const email = cols[emailIdx];
      const role = cols[roleIdx];
      const password = cols[pwdIdx];

      try {
        await api.post('/users', { name, name_kh, email, role, password });
        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`Row ${i + 1} (${name}): ${err.response?.data?.message || 'Failed'}`);
      }
    }

    loading.value = false;
    e.target.value = '';

    let msg = `Import finished.\nSuccessfully imported: ${successCount} users.`;
    if (failCount > 0) {
      msg += `\nFailed to import: ${failCount} users.\n\nErrors:\n` + errors.slice(0, 5).join('\n');
      if (errors.length > 5) msg += `\n...and ${errors.length - 5} more errors.`;
    }
    alert(msg);
    await fetchUsers();
  };
  reader.readAsText(file);
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
    {{ uiStore.t('usersLoading') }}
  </div>
  <div v-else>
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap; gap: 1rem;">
        <h3 class="card-title" style="margin-bottom: 0;">{{ uiStore.t('userManagement') }}</h3>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button class="btn btn-secondary btn-sm" @click="downloadUserTemplate" :title="uiStore.t('template')">
            📄 {{ uiStore.t('template') }}
          </button>
          <!-- Import Button -->
          <button class="btn btn-secondary btn-sm" @click="triggerUserImport" :title="uiStore.t('import')">
            📥 {{ uiStore.t('import') }}
          </button>
          <input type="file" id="userCsvFileInput" accept=".csv" @change="handleUserImport" style="display: none;" />

          <button class="btn btn-primary btn-sm" @click="openAddModal">
            ➕ {{ uiStore.t('createUser') }}
          </button>
        </div>
      </div>

        <!-- Batch Actions Bar -->
        <div v-if="selectedIds.length > 0" style="background: var(--primary-light); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px dashed var(--primary-color); display: flex; align-items: center; justify-content: space-between; margin: 1rem; margin-top: 0; gap: 1rem;">
          <span style="font-weight: 600; font-size: 0.85rem; color: var(--primary-color);">
            {{ uiStore.t('selected') }}: {{ selectedIds.length }}
          </span>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-success btn-sm" @click="bulkSetStatus(true)" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">✅ {{ uiStore.t('setActive') }}</button>
            <button class="btn btn-secondary btn-sm" @click="bulkSetStatus(false)" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">⚪ {{ uiStore.t('setInactive') }}</button>
            <button class="btn btn-danger btn-sm" @click="bulkDelete" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">🗑️ {{ uiStore.t('deleteSelected') }}</button>
          </div>
        </div>

        <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              </th>
              <th>{{ uiStore.t('colId') }}</th>
              <th>{{ uiStore.t('colName') }}</th>
              <th>{{ uiStore.t('colNameKh') }}</th>
              <th>{{ uiStore.t('colEmail') }}</th>
              <th>{{ uiStore.t('colRole') }}</th>
              <th>{{ uiStore.t('colStatus') }}</th>
              <th style="text-align: right;">{{ uiStore.t('colActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, index) in paginatedUsers" :key="u.id" :class="u.is_active === false ? 'row-inactive' : ''">
              <td style="text-align: center;" @click.stop>
                <input type="checkbox" :value="u.id" v-model="selectedIds" />
              </td>
              <td>{{ u.id }}</td>
              <td style="font-weight: 600;">
                <a href="#" @click.prevent="viewUserDetails(u)" style="text-decoration: none; color: var(--primary-color);">
                  {{ u.name }}
                </a>
              </td>
              <td class="kh-text" style="color: var(--text-muted);">
                {{ u.name_kh || '—' }}
              </td>
              <td>{{ u.email }}</td>
              <td>
                <span class="badge" :class="u.role === 'admin' ? 'badge-info' : 'badge-success'">
                  {{ u.role.toUpperCase() }}
                </span>
              </td>
              <td>
                <span class="badge" :class="u.is_active !== false ? 'badge-success' : 'badge-secondary'">
                  {{ u.is_active !== false ? uiStore.t('active') : uiStore.t('inactive') }}
                </span>
              </td>
              <td style="text-align: right;">
                <div class="action-group">
                  <div class="dropdown-wrapper" @click.stop>
                    <button
                      class="btn btn-icon btn-sm"
                      :class="openDropdownId === u.id ? 'btn-icon-active' : ''"
                      @click="openDropdownId = openDropdownId === u.id ? null : u.id"
                      :title="uiStore.t('moreActions')"
                    >⋮</button>
                    <div v-if="openDropdownId === u.id" class="dropdown-menu-custom" :class="{ 'dropdown-menu-up': index >= paginatedUsers.length - 2 }">
                      <button class="dropdown-item" @click="viewUserDetails(u); openDropdownId = null">
                        <span>👁️</span> {{ uiStore.t('viewProfile') }}
                      </button>
                      <button
                        class="dropdown-item"
                        :class="u.is_active !== false ? 'dropdown-item-success' : 'dropdown-item-muted'"
                        :disabled="u.id === authStore.user?.id"
                        @click="toggleUserStatus(u); openDropdownId = null"
                      >
                        <span>{{ u.is_active !== false ? '✅' : '⚪' }}</span>
                        {{ u.is_active !== false ? uiStore.t('setInactive') : uiStore.t('setActive') }}
                      </button>
                      <button class="dropdown-item" @click="openEditModal(u); openDropdownId = null">
                        <span>✏️</span> {{ uiStore.t('edit') }}
                      </button>
                      <div class="dropdown-divider"></div>
                      <button
                        class="dropdown-item dropdown-item-danger"
                        :disabled="u.id === authStore.user?.id"
                        @click="deleteUser(u.id); openDropdownId = null"
                      >
                        <span>🗑️</span> {{ uiStore.t('delete') }}
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="users.length > 0" class="pagination-container">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div class="pagination-info">
            {{ uiStore.t('showing') }} {{ (currentPage - 1) * itemsPerPage + 1 }} {{ uiStore.t('to') }} {{ Math.min(currentPage * itemsPerPage, users.length) }} {{ uiStore.t('of') }} {{ users.length }} {{ uiStore.t('users') }}
          </div>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">{{ uiStore.t('show') }}:</span>
            <select v-model="itemsPerPage" class="pagination-select">
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </div>
        </div>
        <div v-if="totalPages > 1" class="pagination-controls">
          <button
            class="pagination-btn"
            :disabled="currentPage === 1"
            @click="currentPage--"
            title="Previous Page"
          >
            ◀
          </button>
          <button
            v-for="page in totalPages"
            :key="page"
            class="pagination-btn"
            :class="{ active: currentPage === page }"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
          <button
            class="pagination-btn"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
            title="Next Page"
          >
            ▶
          </button>
        </div>
      </div>
    </div>

    <!-- User Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? uiStore.t('editUser') : uiStore.t('createUser') }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label class="form-label">{{ uiStore.t('fullName') }}</label>
            <input v-model="userName" type="text" class="form-control" placeholder="e.g. Sarah Connor" required />
          </div>

          <div class="form-group">
            <label class="form-label">ឈ្មោះប្រើប្រាស់ខ្មែរ (Khmer Name)</label>
            <input v-model="userNameKh" type="text" class="form-control" placeholder="ឧ. សម ឆាយ" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ uiStore.t('emailAddress') }}</label>
            <input v-model="userEmail" type="email" class="form-control" placeholder="e.g. sarah@score.com" required />
          </div>

          <div class="form-group">
            <label class="form-label">{{ uiStore.t('systemRole') }}</label>
            <select v-model="userRole" class="form-control form-select" required>
              <option value="teacher">{{ uiStore.t('teacher') }}</option>
              <option value="admin">{{ uiStore.t('administrator') }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">{{ isEditing ? uiStore.t('newPassword') : uiStore.t('password') }}</label>
            <input
              v-model="userPassword"
              type="password"
              class="form-control"
              placeholder="Min 6 characters"
              :required="!isEditing"
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{ uiStore.t('profileImage') }}</label>
            <div v-if="avatarPreviewUrl" style="margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.75rem; background: #f8fafc; border: 1px solid var(--border-color); padding: 0.5rem; border-radius: var(--radius-sm);">
              <img :src="avatarPreviewUrl" alt="Preview" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--primary-color);" />
              <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">
                {{ userAvatarFile ? 'New avatar selected' : 'Current profile photo' }}
              </span>
            </div>
            <input type="file" @change="onFileChange" class="form-control" accept="image/*" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">{{ uiStore.t('cancel') }}</button>
            <button type="submit" class="btn btn-primary">{{ uiStore.t('saveUser') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- User Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 500px; width: 90%;">
        <div class="modal-header">
          <h3 class="modal-title">👁️ {{ uiStore.t('userDetailProfile') }}</h3>
          <button class="modal-close" @click="showDetailsModal = false">&times;</button>
        </div>

        <div v-if="selectedUserDetails" style="padding: 1rem 0; text-align: center;">
          <img
            :src="getAvatarUrl(selectedUserDetails.avatar)"
            alt="Avatar"
            style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color); margin-bottom: 1rem;"
          />
          <h4 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">
            {{ selectedUserDetails.name }}
          </h4>
          <h5 v-if="selectedUserDetails.name_kh" class="kh-text" style="font-size: 1.15rem; font-weight: 700; color: var(--text-muted); margin-top: 0.15rem; margin-bottom: 0.75rem;">
            {{ selectedUserDetails.name_kh }}
          </h5>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
            {{ selectedUserDetails.email }}
          </p>

          <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem;">
            <span class="badge" :class="selectedUserDetails.role === 'admin' ? 'badge-info' : 'badge-success'" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;">
              {{ uiStore.t('colRole') }}: {{ selectedUserDetails.role.toUpperCase() }}
            </span>
            <span class="badge" :class="selectedUserDetails.is_active !== false ? 'badge-success' : 'badge-secondary'" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;">
              {{ uiStore.t('status') }}: {{ selectedUserDetails.is_active !== false ? uiStore.t('active') : uiStore.t('inactive') }}
            </span>
          </div>
        </div>

        <div class="modal-footer" style="justify-content: center; padding-top: 0.5rem;">
          <button type="button" class="btn btn-secondary" @click="showDetailsModal = false" style="width: 100%;">{{ uiStore.t('closeProfile') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
