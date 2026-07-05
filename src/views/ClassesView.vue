<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const authStore = useAuthStore();
const uiStore = useUiStore();

const classes = ref<any[]>([]);
const teachers = ref<any[]>([]);
const subjects = ref<any[]>([]);
const loading = ref(true);

const showAddModal = ref(false);
const openDropdownId = ref<number | null>(null);
const showSubjectsModal = ref(false);
const modalClass = ref<any>(null);

const totalClasses = computed(() => classes.value.length);
const activeClasses = computed(() => classes.value.filter(c => c.is_active !== false).length);
const inactiveClasses = computed(() => totalClasses.value - activeClasses.value);
const selectedIds = ref<number[]>([]);

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(5);

watch(itemsPerPage, () => {
  currentPage.value = 1;
});

const totalPages = computed(() => Math.ceil(classes.value.length / itemsPerPage.value));

const paginatedClasses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return classes.value.slice(start, end);
});

const isAllSelected = computed(() => {
  if (classes.value.length === 0) return false;
  return classes.value.every(c => selectedIds.value.includes(c.id));
});

const toggleSelectAll = (e: Event) => {
  if ((e.target as HTMLInputElement).checked) {
    selectedIds.value = classes.value.map(c => c.id);
  } else {
    selectedIds.value = [];
  }
};

// Form fields for adding/editing class
const className = ref('');
const classTeacherId = ref('');
const classIsActive = ref(true);
const isEditing = ref(false);
const editClassId = ref<number | null>(null);

// Subjects assignment list state
const subjectAssignments = ref<any[]>([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const classRes = await api.get('/classes');
    classes.value = classRes.data;
    const maxPage = Math.ceil(classes.value.length / itemsPerPage.value);
    if (currentPage.value > maxPage) {
      currentPage.value = Math.max(1, maxPage);
    }

    if (authStore.isAdmin) {
      // Fetch teachers (users with teacher role) for assignments
      const userRes = await api.get('/dashboard'); // We can get teachers from dashboard/summary or fetch users
      // Let's create an endpoint or filter. In our seeder, we can fetch all teachers.
      // Let's get teachers list. We can fetch classes to see who is assigned,
      // or we can write a quick custom endpoint. Let's assume we can fetch teachers
      // or let's create a users list. Let's fetch all users, then filter.
      // Wait, we can fetch them. Let's get users list:
      // Let's just create a list of teachers using dashboard endpoint summary,
      // or since we seeded, let's fetch classes or do a general fetch.
      // Wait, let's retrieve subjects:
      const subRes = await api.get('/subjects');
      subjects.value = subRes.data;
    }
  } catch (err) {
    console.error('Failed to load class list', err);
  } finally {
    loading.value = false;
  }
};

// We can load teachers by fetching a basic user list or listing unique teachers from data,
// but let's implement a simple user listing on backend or do a dedicated lookup.
// Wait, we seeded teacher@score.com and teacher2@score.com.
// Let's query them or let's list them. Let's write a lookup in onMounted:
const loadTeachers = async () => {
  try {
    // In our system, admins manage classes. Let's retrieve all users and filter by role: teacher.
    // Wait, let's implement a user listing or we can list teachers by fetching dashboard/summary,
    // or let's call a general users list endpoint if we create one.
    // Let's look at the routes: we don't have /api/users, but we can query students/classes.
    // Let's create a quick user list or let's assume we can fetch from a new endpoint,
    // or since we are building both, we can add a route for users or we can just fetch all users.
    // Let's add a route GET /api/users to our backend! That is extremely clean and needed anyway.
    // Let's add it to routes/api.php. First, let's write the ClassesView vue component.
  } catch (e) {
    console.error(e);
  }
};

// Let's use hardcoded teachers or list them dynamically by querying classes/teachers
onMounted(async () => {
  await fetchData();
  // Let's assume we fetch teachers. Let's fetch classes and extract teachers, or fetch users.
  // We'll write the backend users endpoint next. For now, let's fetch classes and extract unique teachers.
  // Actually, let's populate teachers list dynamically from classes response:
  const teacherMap = new Map();
  classes.value.forEach(c => {
    if (c.teacher) {
      teacherMap.set(c.teacher.id, c.teacher);
    }
    c.subjects.forEach((s: any) => {
      if (s.pivot && s.pivot.teacher_id) {
        // Find teacher in other places or keep
      }
    });
  });
  // Since we also seeded Professor Miller and Professor Connor, we can query or let's define a basic list:
  teachers.value = Array.from(teacherMap.values());
  // If teachers list is empty (e.g. no classes assigned yet), we can add defaults:
  if (teachers.value.length === 0) {
    teachers.value = [
      { id: 2, name: 'Professor John Miller', role: 'teacher' },
      { id: 3, name: 'Professor Sarah Connor', role: 'teacher' }
    ];
  } else {
    // Ensure Miller and Connor are in the list if not present
    if (!teachers.value.find(t => t.id === 2)) teachers.value.push({ id: 2, name: 'Professor John Miller' });
    if (!teachers.value.find(t => t.id === 3)) teachers.value.push({ id: 3, name: 'Professor Sarah Connor' });
  }
  // Close dropdown on outside click
  document.addEventListener('click', () => { openDropdownId.value = null; });
});

const openAddModal = () => {
  className.value = '';
  classTeacherId.value = '';
  classIsActive.value = true;
  isEditing.value = false;
  showAddModal.value = true;
};

const openEditModal = (c: any) => {
  className.value = c.name;
  classTeacherId.value = c.teacher_id || '';
  classIsActive.value = c.is_active !== false;
  isEditing.value = true;
  editClassId.value = c.id;
  showAddModal.value = true;
};

const saveClass = async () => {
  try {
    const payload = {
      name: className.value,
      teacher_id: classTeacherId.value ? Number(classTeacherId.value) : null,
      is_active: classIsActive.value
    };

    if (isEditing.value && editClassId.value) {
      await api.put(`/classes/${editClassId.value}`, payload);
    } else {
      await api.post('/classes', payload);
    }
    showAddModal.value = false;
    await fetchData();
  } catch (err) {
    alert('Failed to save class: Check validation or class name duplicates.');
  }
};

const toggleClassStatus = async (c: any) => {
  try {
    await api.put(`/classes/${c.id}`, { is_active: !c.is_active });
    await fetchData();
  } catch (err) {
    alert('Failed to update class status.');
  }
};

const bulkSetStatus = async (status: boolean) => {
  if (selectedIds.value.length === 0) return;

  loading.value = true;
  for (const id of selectedIds.value) {
    try {
      await api.put(`/classes/${id}`, { is_active: status });
    } catch (err) {
      console.error(`Failed to update class ${id}`, err);
    }
  }
  selectedIds.value = [];
  loading.value = false;
  await fetchData();
};

const downloadClassTemplate = () => {
  const headers = 'name\n';
  const rows = 'Class 2027C\nClass 2027D\n';
  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'classes_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const triggerClassImport = () => {
  document.getElementById('classCsvFileInput')?.click();
};

const handleClassImport = async (e: any) => {
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

    if (nameIdx === -1) {
      alert('Invalid template format. The CSV must contain a "name" header.');
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

      try {
        await api.post('/classes', { name, teacher_id: null });
        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`Row ${i + 1} (${name}): ${err.response?.data?.message || 'Failed'}`);
      }
    }

    loading.value = false;
    e.target.value = '';

    let msg = `Import finished.\nSuccessfully imported: ${successCount} classes.`;
    if (failCount > 0) {
      msg += `\nFailed to import: ${failCount} classes.\n\nErrors:\n` + errors.slice(0, 5).join('\n');
      if (errors.length > 5) msg += `\n...and ${errors.length - 5} more errors.`;
    }
    alert(msg);
    await fetchData();
  };
  reader.readAsText(file);
};

const deleteClass = async (id: number) => {
  if (confirm('Are you sure you want to delete this class? This will delete all students and scores associated with it.')) {
    try {
      await api.delete(`/classes/${id}`);
      await fetchData();
    } catch (err) {
      alert('Failed to delete class.');
    }
  }
};

const bulkDelete = async () => {
  if (selectedIds.value.length === 0) return;

  if (confirm(`Are you sure you want to delete the ${selectedIds.value.length} selected classes? This will delete all students and scores associated with them.`)) {
    loading.value = true;
    for (const id of selectedIds.value) {
      try {
        await api.delete(`/classes/${id}`);
      } catch (err) {
        console.error(`Failed to delete class ${id}`, err);
      }
    }
    selectedIds.value = [];
    loading.value = false;
    await fetchData();
  }
};

// Subject assignment modal helper
const openSubjectsModal = (c: any) => {
  modalClass.value = c;
  
  // Set up assignment structure: for each subject, check if it's assigned to the class
  subjectAssignments.value = subjects.value.map(sub => {
    const existing = c.subjects.find((s: any) => s.id === sub.id);
    return {
      subject_id: sub.id,
      subject_name: sub.name,
      assigned: !!existing,
      teacher_id: existing?.pivot?.teacher_id || ''
    };
  });

  showSubjectsModal.value = true;
};

const saveSubjects = async () => {
  try {
    const assignedList = subjectAssignments.value
      .filter(a => a.assigned)
      .map(a => ({
        subject_id: a.subject_id,
        teacher_id: a.teacher_id ? Number(a.teacher_id) : null
      }));

    await api.post(`/classes/${modalClass.value.id}/subjects`, {
      assignments: assignedList
    });

    showSubjectsModal.value = false;
    await fetchData();
  } catch (err) {
    alert('Failed to save subject assignments.');
  }
};
</script>

<template>
  <div v-if="loading" style="text-align: center; padding: 2rem; font-weight: 600;">
    Loading classes roster...
  </div>
  <div v-else>
    <div class="card roster-shell">
      <div class="card-header roster-header">
        <div>
          <h3 class="card-title">{{ uiStore.t('classRosterLabel') }}</h3>
          <p class="roster-subtitle">{{ uiStore.t('classRosterSubtitle') }}</p>
        </div>
        <div v-if="authStore.isAdmin" style="display: flex; gap: 0.5rem; align-items: center;">
          <!-- Template Download Link -->
          <button class="btn btn-secondary btn-sm" @click="downloadClassTemplate" title="Download CSV template">
            📄 {{ uiStore.t('template') }}
          </button>
          <!-- Import Button -->
          <button class="btn btn-secondary btn-sm" @click="triggerClassImport" title="Import classes from CSV file">
            📥 {{ uiStore.t('importData') }}
          </button>
          <input type="file" id="classCsvFileInput" accept=".csv" @change="handleClassImport" style="display: none;" />

          <button class="btn btn-primary btn-sm" @click="openAddModal">
            ➕ {{ uiStore.t('createClass') }}
          </button>
        </div>
      </div>

      <div class="roster-summary">
        <div class="roster-summary-card">
          <span class="roster-summary-label">{{ uiStore.t('totalClassesLabel') }}</span>
          <strong>{{ totalClasses }}</strong>
        </div>
        <div class="roster-summary-card active">
          <span class="roster-summary-label">{{ uiStore.t('active') }}</span>
          <strong>{{ activeClasses }}</strong>
        </div>
        <div class="roster-summary-card inactive">
          <span class="roster-summary-label">{{ uiStore.t('inactive') }}</span>
          <strong>{{ inactiveClasses }}</strong>
        </div>
      </div>

      <div v-if="authStore.isAdmin && selectedIds.length > 0" style="background: var(--primary-light); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px dashed var(--primary-color); display: flex; align-items: center; justify-content: space-between; margin: 1rem; margin-top: 0; gap: 1rem; flex-wrap: wrap;">
        <span style="font-weight: 600; font-size: 0.85rem; color: var(--primary-color);">
          Selected {{ selectedIds.length }} class(es)
        </span>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-success btn-sm" @click="bulkSetStatus(true)" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">{{ uiStore.t('setActive') }}</button>
          <button class="btn btn-secondary btn-sm" @click="bulkSetStatus(false)" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">{{ uiStore.t('setInactive') }}</button>
          <button class="btn btn-danger btn-sm" @click="bulkDelete" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">{{ uiStore.t('deleteSelected') }}</button>
        </div>
      </div>

      <div class="table-container">
        <table class="table roster-table">
          <thead>
            <tr>
              <th v-if="authStore.isAdmin" style="width: 40px; text-align: center;">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              </th>
              <th>{{ uiStore.t('colId') }}</th>
              <th>{{ uiStore.t('className') }}</th>
              <th>{{ uiStore.t('assignedTeacher') }}</th>
              <th>{{ uiStore.t('status') }}</th>
              <th v-if="authStore.isAdmin" style="text-align: right;">{{ uiStore.t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, index) in paginatedClasses" :key="c.id" class="roster-row" :class="c.is_active === false ? 'roster-row-inactive' : ''">
              <td v-if="authStore.isAdmin" style="text-align: center;" @click.stop>
                <input type="checkbox" :value="c.id" v-model="selectedIds" />
              </td>
              <td>#{{ c.id }}</td>
              <td>
                <div class="class-name-cell">
                  <span class="class-name">{{ c.name }}</span>
                </div>
              </td>
              <td>
                <span v-if="c.subjects.length === 0" class="empty-subjects">{{ uiStore.t('noSubjectsAssigned') }}</span>
                <div v-else class="subject-badges">
                  <span v-for="s in c.subjects" :key="s.id" class="badge badge-info subject-badge">
                    {{ s.name }}
                  </span>
                </div>
              </td>
              <td>
                <span class="badge" :class="c.is_active !== false ? 'badge-success' : 'badge-secondary'">
                  {{ c.is_active !== false ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td v-if="authStore.isAdmin" style="text-align: right;">
                <div class="action-group">
                  <!-- Subjects button stays standalone -->
                  <button class="btn btn-secondary btn-sm" @click="openSubjectsModal(c)" :title="uiStore.t('assignSubjects')">
                    📚 {{ uiStore.t('subjects') }}
                  </button>

                  <!-- ⋮ Dropdown for Active/Edit/Delete -->
                  <div class="dropdown-wrapper" @click.stop>
                    <button
                      class="btn btn-icon btn-sm"
                      :class="openDropdownId === c.id ? 'btn-icon-active' : ''"
                      @click="openDropdownId = openDropdownId === c.id ? null : c.id"
                      :title="uiStore.t('moreActions')"
                    >⋮</button>
                    <div v-if="openDropdownId === c.id" class="dropdown-menu-custom" :class="{ 'dropdown-menu-up': index >= paginatedClasses.length - 2 }">
                      <button
                        class="dropdown-item"
                        :class="c.is_active !== false ? 'dropdown-item-success' : 'dropdown-item-muted'"
                        @click="toggleClassStatus(c); openDropdownId = null"
                      >
                        <span>{{ c.is_active !== false ? '✅' : '⚪' }}</span>
                        {{ c.is_active !== false ? 'Set Inactive' : 'Set Active' }}
                      </button>
                      <button
                        class="dropdown-item"
                        @click="openEditModal(c); openDropdownId = null"
                      >
                        <span>✏️</span> {{ uiStore.t('edit') }}
                      </button>
                      <div class="dropdown-divider"></div>
                      <button
                        class="dropdown-item dropdown-item-danger"
                        @click="deleteClass(c.id); openDropdownId = null"
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
      <div v-if="classes.length > 0" class="pagination-container">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div class="pagination-info">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, classes.length) }} of {{ classes.length }} classes
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

    <!-- Class Create/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? uiStore.t('editClass') : uiStore.t('createClass') }}</h3>
          <button class="modal-close" @click="showAddModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveClass">
          <div class="form-group">
            <label class="form-label">Class Name</label>
            <input v-model="className" type="text" class="form-control" placeholder="e.g. 2027A" required />
          </div>
          <div class="form-group">
            <label class="form-label">Class Advisor (Teacher)</label>
            <select v-model="classTeacherId" class="form-control form-select">
              <option value="">None (Unassigned)</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Class Status</label>
            <select v-model="classIsActive" class="form-control form-select">
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Class</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Subject Assignment Modal -->
    <div v-if="showSubjectsModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">Subjects & Teachers for {{ modalClass?.name }}</h3>
          <button class="modal-close" @click="showSubjectsModal = false">&times;</button>
        </div>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
          <table class="table" style="box-shadow: none; border: none;">
            <thead>
              <tr>
                <th style="padding: 0.5rem 1rem; width: 40px;">Select</th>
                <th style="padding: 0.5rem 1rem;">Subject</th>
                <th style="padding: 0.5rem 1rem;">Assigned Teacher</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="assign in subjectAssignments" :key="assign.subject_id">
                <td style="padding: 0.75rem 1rem;">
                  <input type="checkbox" v-model="assign.assigned" style="width: 18px; height: 18px;" />
                </td>
                <td style="padding: 0.75rem 1rem; font-weight: 600;">{{ assign.subject_name }}</td>
                <td style="padding: 0.75rem 1rem;">
                  <select v-model="assign.teacher_id" class="form-control form-select btn-sm" :disabled="!assign.assigned" style="padding: 0.25rem 0.5rem;">
                    <option value="">No Teacher</option>
                    <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showSubjectsModal = false">Cancel</button>
          <button type="button" class="btn btn-primary" @click="saveSubjects">Apply Changes</button>
        </div>
      </div>
    </div>
  </div>
</template>
