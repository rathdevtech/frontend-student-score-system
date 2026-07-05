<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const authStore = useAuthStore();
const uiStore = useUiStore();

const students = ref<any[]>([]);
const classes = ref<any[]>([]);
const loading = ref(true);
const openDropdownId = ref<number | null>(null);

const searchQuery = ref('');
const selectedClassFilter = ref('');
const selectedIds = ref<number[]>([]);

const showModal = ref(false);

// Form fields
const studentName = ref('');
const studentNameKh = ref('');
const studentClassId = ref('');
const studentGender = ref('Male');
const studentPhotoFile = ref<File | null>(null);
const photoPreviewUrl = ref<string | null>(null);
const isEditing = ref(false);
const editStudentId = ref<number | null>(null);

// Student Detail view state
const showDetailsModal = ref(false);
const selectedStudentDetails = ref<any>(null);
const loadingDetails = ref(false);

const getPhotoUrl = (path: string | null) => {
  if (!path) return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

const getApiErrorMessage = (err: any, fallback: string) => {
  const data = err.response?.data;
  const firstError = data?.errors ? Object.values(data.errors).flat()[0] : null;
  return firstError || data?.message || fallback;
};

const viewStudentDetails = async (studentId: number) => {
  loadingDetails.value = true;
  showDetailsModal.value = true;
  selectedStudentDetails.value = null;
  try {
    const res = await api.get(`/reports/student/${studentId}`);
    selectedStudentDetails.value = res.data;
  } catch (err) {
    console.error('Failed to load student details', err);
    alert('Failed to load student profile.');
    showDetailsModal.value = false;
  } finally {
    loadingDetails.value = false;
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const classRes = await api.get('/classes');
    // Only keep active classes for selection
    classes.value = classRes.data.filter((c: any) => c.is_active !== false);

    const studentRes = await api.get('/students');
    students.value = studentRes.data;
    const maxPage = Math.ceil(filteredStudents.value.length / itemsPerPage.value);
    if (currentPage.value > maxPage) {
      currentPage.value = Math.max(1, maxPage);
    }
  } catch (err) {
    console.error('Failed to load students roster', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
  document.addEventListener('click', () => { openDropdownId.value = null; });
});

const toggleStudentStatus = async (s: any) => {
  try {
    await api.put(`/students/${s.id}`, {
      is_active: s.is_active !== false ? 0 : 1
    });
    await fetchData();
  } catch (err) {
    alert('Failed to update student status.');
  }
};

// Client side filtering for search & class dropdown
const filteredStudents = computed(() => {
  return students.value.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesClass = selectedClassFilter.value === '' || s.class_id === Number(selectedClassFilter.value);
    return matchesSearch && matchesClass;
  });
});

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(5);

watch([searchQuery, selectedClassFilter, itemsPerPage], () => {
  currentPage.value = 1;
});

const totalPages = computed(() => Math.ceil(filteredStudents.value.length / itemsPerPage.value));

const paginatedStudents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredStudents.value.slice(start, end);
});

const isAllSelected = computed(() => {
  if (filteredStudents.value.length === 0) return false;
  return filteredStudents.value.every(s => selectedIds.value.includes(s.id));
});

const toggleSelectAll = (e: Event) => {
  if ((e.target as HTMLInputElement).checked) {
    selectedIds.value = filteredStudents.value.map(s => s.id);
  } else {
    selectedIds.value = [];
  }
};

const onFileChange = (e: any) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    studentPhotoFile.value = files[0];
    photoPreviewUrl.value = URL.createObjectURL(files[0]);
  }
};

const openAddModal = () => {
  studentName.value = '';
  studentNameKh.value = '';
  studentClassId.value = classes.value[0]?.id || '';
  studentGender.value = 'Male';
  studentPhotoFile.value = null;
  photoPreviewUrl.value = null;
  isEditing.value = false;
  showModal.value = true;
};

const openEditModal = (s: any) => {
  studentName.value = s.name;
  studentNameKh.value = s.name_kh || '';
  studentClassId.value = s.class_id;
  studentGender.value = s.gender || 'Male';
  studentPhotoFile.value = null;
  photoPreviewUrl.value = s.photo ? getPhotoUrl(s.photo) : null;
  isEditing.value = true;
  editStudentId.value = s.id;
  showModal.value = true;
};

const saveStudent = async () => {
  if (!studentName.value.trim() || !studentClassId.value) return;

  try {
    if (isEditing.value && editStudentId.value) {
      if (studentPhotoFile.value) {
        const formData = new FormData();
        formData.append('name', studentName.value.trim());
        formData.append('name_kh', studentNameKh.value.trim());
        formData.append('class_id', studentClassId.value);
        formData.append('gender', studentGender.value);
        formData.append('photo', studentPhotoFile.value);
        
        await api.post(`/students/${editStudentId.value}/update`, formData);
      } else {
        await api.post(`/students/${editStudentId.value}/update`, {
          name: studentName.value.trim(),
          name_kh: studentNameKh.value.trim(),
          class_id: studentClassId.value,
          gender: studentGender.value
        });
      }
    } else {
      if (studentPhotoFile.value) {
        const formData = new FormData();
        formData.append('name', studentName.value.trim());
        formData.append('name_kh', studentNameKh.value.trim());
        formData.append('class_id', studentClassId.value);
        formData.append('gender', studentGender.value);
        formData.append('photo', studentPhotoFile.value);
        
        await api.post('/students', formData);
      } else {
        await api.post('/students', {
          name: studentName.value.trim(),
          name_kh: studentNameKh.value.trim(),
          class_id: studentClassId.value,
          gender: studentGender.value
        });
      }
    }

    showModal.value = false;
    await fetchData();
  } catch (err) {
    alert(getApiErrorMessage(err, 'Failed to save student record.'));
  }
};

const downloadStudentTemplate = () => {
  const headers = 'name,name_kh,gender,class_name\n';
  const rows = 'Student Name,ឈ្មោះសិស្ស,Male,Class 2027A\nAnother Student,ឈ្មោះសិស្សផ្សេងទៀត,Female,Class 2027B\n';
  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'students_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const triggerStudentImport = () => {
  document.getElementById('studentCsvFileInput')?.click();
};

const handleStudentImport = async (e: any) => {
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
    const genderIdx = headers.indexOf('gender');
    const classIdx = headers.indexOf('class_name');

    if (nameIdx === -1 || genderIdx === -1 || classIdx === -1) {
      alert('Invalid template format. The CSV must contain "name", "gender", and "class_name" headers.');
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
      const gender = cols[genderIdx];
      const classNameVal = cols[classIdx];

      const matchedClass = classes.value.find(c => c.name.toLowerCase() === classNameVal.toLowerCase());
      if (!matchedClass) {
        failCount++;
        errors.push(`Row ${i + 1} (${name}): Class name "${classNameVal}" not found or inactive.`);
        continue;
      }

      try {
        await api.post('/students', {
          name,
          name_kh,
          gender,
          class_id: matchedClass.id
        });
        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`Row ${i + 1} (${name}): ${err.response?.data?.message || 'Failed'}`);
      }
    }

    loading.value = false;
    e.target.value = '';

    let msg = `Import finished.\nSuccessfully imported: ${successCount} students.`;
    if (failCount > 0) {
      msg += `\nFailed to import: ${failCount} students.\n\nErrors:\n` + errors.slice(0, 5).join('\n');
      if (errors.length > 5) msg += `\n...and ${errors.length - 5} more errors.`;
    }
    alert(msg);
    await fetchData();
  };
  reader.readAsText(file);
};

const deleteStudent = async (id: number) => {
  if (confirm('Are you sure you want to remove this student? This will permanently delete their grades.')) {
    try {
      await api.delete(`/students/${id}`);
      await fetchData();
    } catch (err) {
      alert('Failed to delete student.');
    }
  }
};

const bulkSetStatus = async (status: boolean) => {
  if (selectedIds.value.length === 0) return;

  loading.value = true;
  for (const id of selectedIds.value) {
    try {
      await api.put(`/students/${id}`, { is_active: status ? 1 : 0 });
    } catch (err) {
      console.error(`Failed to update student ${id}`, err);
    }
  }
  selectedIds.value = [];
  loading.value = false;
  await fetchData();
};

const bulkDelete = async () => {
  if (selectedIds.value.length === 0) return;

  if (confirm(`Are you sure you want to remove the ${selectedIds.value.length} selected students? This will permanently delete their grades.`)) {
    loading.value = true;
    for (const id of selectedIds.value) {
      try {
        await api.delete(`/students/${id}`);
      } catch (err) {
        console.error(`Failed to delete student ${id}`, err);
      }
    }
    selectedIds.value = [];
    loading.value = false;
    await fetchData();
  }
};
</script>

<template>
  <div v-if="loading" style="text-align: center; padding: 2rem; font-weight: 600;">
    Loading student index...
  </div>
  <div v-else>
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap; gap: 1rem;">
        <h3 class="card-title" style="margin-bottom: 0;">{{ uiStore.t('studentRegistryTitle') }}</h3>
        <div style="display: flex; gap: 0.75rem; flex-grow: 1; justify-content: flex-end; min-width: 280px;">
          <input
            v-model="searchQuery"
            type="text"
            class="form-control"
            :placeholder="'🔍 ' + uiStore.t('searchStudentPlaceholder')"
            style="max-width: 240px; padding: 0.5rem 0.75rem;"
          />
          <select v-model="selectedClassFilter" class="form-control form-select" style="max-width: 180px; padding: 0.5rem 0.75rem;">
            <option value="">{{ uiStore.t('allClasses') }}</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <div v-if="authStore.isAdmin" style="display: flex; gap: 0.5rem; align-items: center;">
            <!-- Template Download Link -->
            <button class="btn btn-secondary btn-sm" @click="downloadStudentTemplate" title="Download CSV template">
              📄 {{ uiStore.t('template') }}
            </button>
            <!-- Import Button -->
            <button class="btn btn-secondary btn-sm" @click="triggerStudentImport" title="Import students from CSV file">
              📥 {{ uiStore.t('importData') }}
            </button>
            <input type="file" id="studentCsvFileInput" accept=".csv" @change="handleStudentImport" style="display: none;" />

            <button class="btn btn-primary btn-sm" @click="openAddModal">
              ➕ {{ uiStore.t('createStudent') }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="authStore.isAdmin && selectedIds.length > 0" style="background: var(--primary-light); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px dashed var(--primary-color); display: flex; align-items: center; justify-content: space-between; margin: 1rem; margin-top: 0; gap: 1rem; flex-wrap: wrap;">
        <span style="font-weight: 600; font-size: 0.85rem; color: var(--primary-color);">
          Selected {{ selectedIds.length }} student(s)
        </span>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-success btn-sm" @click="bulkSetStatus(true)" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">{{ uiStore.t('setActive') }}</button>
          <button class="btn btn-secondary btn-sm" @click="bulkSetStatus(false)" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">{{ uiStore.t('setInactive') }}</button>
          <button class="btn btn-danger btn-sm" @click="bulkDelete" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">{{ uiStore.t('deleteSelected') }}</button>
        </div>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th v-if="authStore.isAdmin" style="width: 40px; text-align: center;">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              </th>
              <th>{{ uiStore.t('colId') }}</th>
              <th>{{ uiStore.t('studentName') }}</th>
              <th>{{ uiStore.t('studentNameKh') }}</th>
              <th>{{ uiStore.t('classAssignment') }}</th>
              <th>{{ uiStore.t('gender') }}</th>
              <th>{{ uiStore.t('status') }}</th>
              <th v-if="authStore.isAdmin" style="text-align: right;">{{ uiStore.t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, index) in paginatedStudents" :key="s.id" :class="s.is_active === false ? 'row-inactive' : ''">
              <td v-if="authStore.isAdmin" style="text-align: center;" @click.stop>
                <input type="checkbox" :value="s.id" v-model="selectedIds" />
              </td>
              <td>{{ s.id }}</td>
              <td style="font-weight: 600;">
                <a href="#" @click.prevent="viewStudentDetails(s.id)" style="text-decoration: none; color: var(--primary-color);">
                  {{ s.name }}
                </a>
              </td>
              <td class="kh-text" style="color: var(--text-muted);">
                {{ s.name_kh || '—' }}
              </td>
              <td>
                <span class="badge badge-info">{{ s.class ? s.class.name : uiStore.t('noClassAssigned') }}</span>
              </td>
              <td>{{ s.gender || 'N/A' }}</td>
              <td>
                <span class="badge" :class="s.is_active !== false ? 'badge-success' : 'badge-secondary'">
                  {{ s.is_active !== false ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td v-if="authStore.isAdmin" style="text-align: right;">
                <div class="action-group">
                  <div class="dropdown-wrapper" @click.stop>
                    <button
                      class="btn btn-icon btn-sm"
                      :class="openDropdownId === s.id ? 'btn-icon-active' : ''"
                      @click="openDropdownId = openDropdownId === s.id ? null : s.id"
                      :title="uiStore.t('moreActions')"
                    >⋮</button>
                    <div v-if="openDropdownId === s.id" class="dropdown-menu-custom" :class="{ 'dropdown-menu-up': index >= paginatedStudents.length - 2 }">
                      <button
                        class="dropdown-item"
                        @click="viewStudentDetails(s.id); openDropdownId = null"
                      >
                        <span>👁️</span> {{ uiStore.t('viewDetails') }}
                      </button>
                      <button
                        class="dropdown-item"
                        :class="s.is_active !== false ? 'dropdown-item-success' : 'dropdown-item-muted'"
                        @click="toggleStudentStatus(s); openDropdownId = null"
                      >
                        <span>{{ s.is_active !== false ? '✅' : '⚪' }}</span>
                        {{ s.is_active !== false ? 'Set Inactive' : 'Set Active' }}
                      </button>
                      <button
                        class="dropdown-item"
                        @click="openEditModal(s); openDropdownId = null"
                      >
                        <span>✏️</span> {{ uiStore.t('edit') }}
                      </button>
                      <div class="dropdown-divider"></div>
                      <button
                        class="dropdown-item dropdown-item-danger"
                        @click="deleteStudent(s.id); openDropdownId = null"
                      >
                        <span>🗑️</span> {{ uiStore.t('delete') }}
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="filteredStudents.length === 0">
              <td :colspan="authStore.isAdmin ? 8 : 6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                {{ uiStore.t('noStudentsMatchSearch') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="filteredStudents.length > 0" class="pagination-container">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div class="pagination-info">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredStudents.length) }} of {{ filteredStudents.length }} students
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

    <!-- Student Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? uiStore.t('editStudent') : uiStore.t('createStudent') }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveStudent" enctype="multipart/form-data">
          <div class="form-group">
            <label class="form-label">Student Full Name</label>
            <input v-model="studentName" type="text" class="form-control" placeholder="e.g. John Doe" required />
          </div>

          <div class="form-group">
            <label class="form-label">ឈ្មោះសិស្ស (Student Khmer Name)</label>
            <input v-model="studentNameKh" type="text" class="form-control" placeholder="ឧ. ជន ដូច" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ uiStore.t('classAssignment') }}</label>
            <select v-model="studentClassId" class="form-control form-select" required>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Gender</label>
            <select v-model="studentGender" class="form-control form-select">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Profile Image (Photo)</label>
            <div v-if="photoPreviewUrl" style="margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.75rem; background: #f8fafc; border: 1px solid var(--border-color); padding: 0.5rem; border-radius: var(--radius-sm);">
              <img :src="photoPreviewUrl" alt="Preview" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--primary-color);" />
              <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">
                {{ studentPhotoFile ? 'New photo selected' : 'Current student photo' }}
              </span>
            </div>
            <input type="file" @change="onFileChange" class="form-control" accept="image/*" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Student</button>
          </div>
        </form>
      </div>
    </div>
    <!-- Student Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 800px; width: 95%;">
        <div class="modal-header">
          <h3 class="modal-title">👁️ Student Details & Academic Profile</h3>
          <button class="modal-close" @click="showDetailsModal = false">&times;</button>
        </div>

        <div v-if="loadingDetails" style="text-align: center; padding: 3rem; font-weight: 600;">
          Fetching student profile details...
        </div>

        <div v-else-if="selectedStudentDetails" style="padding: 0.5rem 0;">
          <!-- Header/Profile Card -->
          <div style="display: flex; gap: 1.5rem; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; align-items: center; flex-wrap: wrap; margin-bottom: 1.5rem;">
            <img
              :src="getPhotoUrl(selectedStudentDetails.student.photo)"
              alt="Student Photo"
              style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color);"
            />
            <div style="flex-grow: 1; min-width: 200px;">
              <h4 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">
                {{ selectedStudentDetails.student.name }}
              </h4>
              <h5 v-if="selectedStudentDetails.student.name_kh" class="kh-text" style="font-size: 1.1rem; font-weight: 700; color: var(--text-muted); margin-top: 0.15rem; margin-bottom: 0.5rem;">
                {{ selectedStudentDetails.student.name_kh }}
              </h5>
              <p style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem;">
                Student ID: <strong>#{{ selectedStudentDetails.student.id }}</strong>
              </p>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <span class="badge badge-info" style="font-size: 0.72rem; font-weight: 700;">
                  🏫 Class: {{ selectedStudentDetails.student.class_name }}
                </span>
                <span class="badge badge-success" style="font-size: 0.72rem; font-weight: 700;">
                  👤 Gender: {{ selectedStudentDetails.student.gender || 'N/A' }}
                </span>
                <span class="badge badge-secondary" style="font-size: 0.72rem; font-weight: 700;">
                  🧑‍🏫 Advisor: {{ selectedStudentDetails.student.teacher_name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Academic Performance Overview -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.85rem 1rem; border-radius: var(--radius-sm); text-align: center;">
              <div style="font-size: 0.78rem; font-weight: 700; color: #15803d; text-transform: uppercase;">Average Grade</div>
              <strong style="font-size: 1.45rem; color: #166534; display: block; margin-top: 0.2rem;">
                {{ selectedStudentDetails.summary.average_score }}%
              </strong>
            </div>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 0.85rem 1rem; border-radius: var(--radius-sm); text-align: center;">
              <div style="font-size: 0.78rem; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Overall Mark</div>
              <strong style="font-size: 1.45rem; color: #1e40af; display: block; margin-top: 0.2rem;">
                {{ selectedStudentDetails.summary.overall_grade }}
              </strong>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 0.85rem 1rem; border-radius: var(--radius-sm); text-align: center;">
              <div style="font-size: 0.78rem; font-weight: 700; color: #b45309; text-transform: uppercase;">Class Standing</div>
              <strong style="font-size: 1.45rem; color: #92400e; display: block; margin-top: 0.2rem;">
                #{{ selectedStudentDetails.summary.class_rank }} <span style="font-size: 0.85rem; font-weight: 500;">/ {{ selectedStudentDetails.summary.class_size }}</span>
              </strong>
            </div>
          </div>

          <!-- Subject Marks Breakdown -->
          <div class="card" style="padding: 0; border-radius: var(--radius-sm); border: 1px solid var(--border-color); overflow: hidden; margin-bottom: 1rem;">
            <div class="card-header" style="background: #f8fafc; border-bottom: 1px solid var(--border-color); padding: 0.75rem 1.25rem;">
              <h5 style="margin: 0; font-size: 0.9rem; font-weight: 800; color: var(--text-main);">📚 Subject Marks Breakdown</h5>
            </div>
            <div style="max-height: 240px; overflow-y: auto;">
              <table class="table" style="margin: 0;">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th style="text-align: center;">Total Score</th>
                    <th style="text-align: center;">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in selectedStudentDetails.scores" :key="s.subject_name">
                    <td style="font-weight: 700;">
                      <div>{{ s.subject_name }}</div>
                      <div v-if="s.components_breakdown && s.components_breakdown.length > 0" style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500; margin-top: 0.15rem;">
                        <span v-for="(comp, idx) in s.components_breakdown" :key="idx">
                          {{ comp.label }}: {{ comp.score }} ({{ comp.weight }}%)<span v-if="Number(idx) < s.components_breakdown.length - 1"> · </span>
                        </span>
                      </div>
                    </td>
                    <td style="text-align: center; font-weight: 700;">{{ s.total }}%</td>
                    <td style="text-align: center;">
                      <span class="badge" :class="s.total >= 50 ? 'badge-success' : 'badge-danger'">
                        {{ s.grade }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="selectedStudentDetails.scores.length === 0">
                    <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                      No graded subject scores found for this student.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="padding-top: 0.5rem;">
          <button type="button" class="btn btn-secondary" @click="showDetailsModal = false">Close Profile</button>
        </div>
      </div>
    </div>
  </div>
</template>
