<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';

interface Permission {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: Permission[];
}

const uiStore = useUiStore();

const roles = ref<Role[]>([]);
const permissionsList = ref<Permission[]>([]);
const loading = ref(true);

const showModal = ref(false);
const isEditing = ref(false);
const roleId = ref<number | null>(null);
const roleName = ref('');
const roleDescription = ref('');
const selectedPermissions = ref<string[]>([]);
const resources = [
  { key: 'users', label: 'Users' },
  { key: 'classes', label: 'Classes' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'students', label: 'Students' },
  { key: 'scores', label: 'Scores' },
];

const actions = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' }
];

const customPermissions = computed(() => {
  const customSlugs = ['view_own_student_info', 'manage_roles_permissions'];
  return permissionsList.value.filter(p => customSlugs.includes(p.slug));
});

const getPermissionSlug = (resource: string, action: string) => {
  return `${action}_${resource}`;
};

const hasPermissionInDb = (resource: string, action: string) => {
  const slug = getPermissionSlug(resource, action);
  return permissionsList.value.some(p => p.slug === slug);
};

const isPermissionSelected = (resource: string, action: string) => {
  const slug = getPermissionSlug(resource, action);
  return selectedPermissions.value.includes(slug);
};

const togglePermission = (resource: string, action: string) => {
  const slug = getPermissionSlug(resource, action);
  if (selectedPermissions.value.includes(slug)) {
    selectedPermissions.value = selectedPermissions.value.filter(s => s !== slug);
  } else {
    selectedPermissions.value.push(slug);
  }
};

const isAllPermissionsSelected = computed(() => {
  if (permissionsList.value.length === 0) return false;
  return permissionsList.value.every(p => selectedPermissions.value.includes(p.slug));
});

const toggleSelectAllPermissions = () => {
  if (isAllPermissionsSelected.value) {
    selectedPermissions.value = [];
  } else {
    selectedPermissions.value = permissionsList.value.map(p => p.slug);
  }
};

const loadRolesAndPermissions = async () => {
  loading.value = true;
  try {
    const rolesRes = await api.get('/roles');
    roles.value = rolesRes.data;

    const permissionsRes = await api.get('/permissions');
    permissionsList.value = permissionsRes.data;
  } catch (err) {
    console.error('Failed to load roles and permissions', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadRolesAndPermissions();
});

const openCreateModal = () => {
  isEditing.value = false;
  roleId.value = null;
  roleName.value = '';
  roleDescription.value = '';
  selectedPermissions.value = [];
  showModal.value = true;
};

const openEditModal = (role: Role) => {
  isEditing.value = true;
  roleId.value = role.id;
  roleName.value = role.name;
  roleDescription.value = role.description || '';
  selectedPermissions.value = role.permissions.map(p => p.slug);
  showModal.value = true;
};

const deleteRole = async (role: Role) => {
  if (role.is_system) {
    alert('System roles cannot be deleted.');
    return;
  }
  if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
    return;
  }

  try {
    await api.delete(`/roles/${role.id}`);
    await loadRolesAndPermissions();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to delete role.');
  }
};

const saveRole = async () => {
  try {
    const payload = {
      name: roleName.value,
      description: roleDescription.value,
      permissions: selectedPermissions.value
    };

    if (isEditing.value && roleId.value !== null) {
      await api.put(`/roles/${roleId.value}`, payload);
    } else {
      await api.post('/roles', payload);
    }

    showModal.value = false;
    await loadRolesAndPermissions();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to save role. Make sure the role name is unique.');
  }
};
</script>

<template>
  <div class="roles-container">
    <div class="card toolbar-card no-print">
      <div class="toolbar-top-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div>
          <h2 class="page-title">{{ uiStore.t('rolesAndPermissions') }}</h2>
          <p style="color: var(--text-muted); font-size: 0.88rem; font-weight: 500; margin-top: 0.25rem;">
            {{ uiStore.t('rolesAndPermissionsDesc') }}
          </p>
        </div>
        <button class="btn btn-primary" @click="openCreateModal" style="display: flex; align-items: center; gap: 0.5rem;">
          <span>🔑</span> {{ uiStore.t('create') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" style="text-align: center; padding: 3rem; font-weight: 600; color: var(--text-muted);">
      {{ uiStore.t('loading') }}
    </div>

    <!-- Roles List Card -->
    <div v-else class="card roster-card" style="margin-top: 1.5rem;">
      <div class="table-container">
        <table class="table roster-table">
          <thead>
            <tr>
              <th style="width: 150px;">{{ uiStore.t('colName') }}</th>
              <th>Description</th>
              <th style="width: 120px; text-align: center;">Type</th>
              <th>Permissions</th>
              <th style="width: 130px; text-align: right;">{{ uiStore.t('colActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="role in roles" :key="role.id">
              <td style="font-weight: 700; color: var(--text-main); vertical-align: middle;">
                <span class="badge badge-info" style="font-size: 0.85rem; padding: 0.3rem 0.65rem;">
                  {{ role.name.toUpperCase() }}
                </span>
              </td>
              <td style="vertical-align: middle; color: var(--text-muted); font-size: 0.9rem;">
                {{ role.description || '—' }}
              </td>
              <td style="text-align: center; vertical-align: middle;">
                <span class="badge" :class="role.is_system ? 'badge-primary' : 'badge-secondary'">
                  {{ role.is_system ? 'System' : 'Custom' }}
                </span>
              </td>
              <td style="vertical-align: middle;">
                <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                  <span
                    v-for="p in role.permissions"
                    :key="p.id"
                    class="badge badge-success"
                    style="font-size: 0.72rem; padding: 0.15rem 0.4rem;"
                    :title="p.description || p.name"
                  >
                    {{ p.slug }}
                  </span>
                  <span v-if="role.permissions.length === 0" style="color: var(--text-muted); font-size: 0.85rem;">
                    None
                  </span>
                </div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                  <button class="btn btn-secondary btn-sm" @click="openEditModal(role)">
                    ✏️
                  </button>
                  <button
                    class="btn btn-danger btn-sm"
                    :disabled="role.is_system"
                    @click="deleteRole(role)"
                    style="opacity: role.is_system ? 0.4 : 1;"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit/Add Modal Overlay -->
    <div v-if="showModal" class="modal-overlay" style="z-index: 1050;">
      <div class="modal-content" style="max-width: 580px; width: 90%;">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ isEditing ? 'Edit Role' : 'Create Role' }}
          </h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveRole">
          <div class="form-group">
            <label class="form-label">Role Name</label>
            <input
              v-model="roleName"
              type="text"
              class="form-control"
              placeholder="e.g. registrar"
              required
              :disabled="isEditing && roles.find(r => r.id === roleId)?.is_system"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <input
              v-model="roleDescription"
              type="text"
              class="form-control"
              placeholder="e.g. Manages school files"
            />
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; width: 100%;">
              <label class="form-label" style="margin-bottom: 0;">Assign Access Permissions Matrix</label>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
                  ({{ selectedPermissions.length }} selected)
                </span>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  @click="toggleSelectAllPermissions"
                  style="padding: 0.25rem 0.5rem; font-size: 0.72rem; line-height: 1.2;"
                >
                  {{ isAllPermissionsSelected ? 'Deselect All' : 'Select All' }}
                </button>
              </div>
            </div>

            <!-- Permission Matrix Table -->
            <div class="matrix-container" style="border: 1px solid var(--sidebar-border); border-radius: 8px; overflow: hidden; margin-bottom: 1rem; background-color: var(--card-bg);">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
                <thead>
                  <tr style="background-color: var(--bg-color); border-bottom: 1px solid var(--sidebar-border);">
                    <th style="padding: 0.55rem 0.75rem; font-weight: 700; color: var(--text-main);">Module / Resource</th>
                    <th v-for="act in actions" :key="act.key" style="padding: 0.55rem 0.5rem; text-align: center; font-weight: 700; color: var(--text-main);">
                      {{ act.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="res in resources" :key="res.key" style="border-bottom: 1px solid var(--sidebar-border);" onmouseover="this.style.backgroundColor='var(--primary-light)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="padding: 0.55rem 0.75rem; font-weight: 700; color: var(--text-main); text-transform: capitalize;">{{ res.label }}</td>
                    <td v-for="act in actions" :key="act.key" style="padding: 0.55rem 0.5rem; text-align: center;">
                      <input
                        v-if="hasPermissionInDb(res.key, act.key)"
                        type="checkbox"
                        :checked="isPermissionSelected(res.key, act.key)"
                        @change="togglePermission(res.key, act.key)"
                        style="cursor: pointer; width: 14px; height: 14px; margin: 0 auto; display: block;"
                        :title="`Grant ${act.label} access for ${res.label}`"
                      />
                      <span v-else style="color: var(--text-muted); font-size: 0.72rem;">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Custom / System permissions list -->
            <div v-if="customPermissions.length > 0" style="display: flex; flex-direction: column; gap: 0.45rem; padding: 0.65rem 0.75rem; border: 1px solid var(--sidebar-border); border-radius: 8px; background-color: var(--bg-color);">
              <h4 style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.15rem; letter-spacing: 0.04em;">Special / System Controls</h4>
              <div
                v-for="perm in customPermissions"
                :key="perm.id"
                style="display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer; padding: 0.25rem; border-radius: 4px; transition: background 0.15s;"
                onmouseover="this.style.backgroundColor='var(--card-bg)'"
                onmouseout="this.style.backgroundColor='transparent'"
                @click="selectedPermissions.includes(perm.slug) ? selectedPermissions = selectedPermissions.filter(s => s !== perm.slug) : selectedPermissions.push(perm.slug)"
              >
                <input
                  type="checkbox"
                  :checked="selectedPermissions.includes(perm.slug)"
                  style="margin-top: 0.2rem; pointer-events: none; width: 14px; height: 14px;"
                />
                <div style="display: flex; flex-direction: column; line-height: 1.25;">
                  <span style="font-weight: 700; font-size: 0.8rem; color: var(--text-main);">{{ perm.name }}</span>
                  <span style="font-size: 0.7rem; color: var(--text-muted);">{{ perm.description }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--sidebar-border);">
            <button type="button" class="btn btn-secondary" @click="showModal = false">
              {{ uiStore.t('cancel') }}
            </button>
            <button type="submit" class="btn btn-primary">
              {{ uiStore.t('save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}
.modal-content {
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  border: 1px solid var(--sidebar-border);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--sidebar-border);
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
}
.modal-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
}
.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted);
}
.form-group {
  margin-bottom: 1rem;
}
.form-label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-main);
  margin-bottom: 0.35rem;
  display: inline-block;
}
.form-control {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--sidebar-border);
  background-color: var(--card-bg);
  color: var(--text-main);
  outline: none;
}
.form-control:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}
</style>
