<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const students = ref<any[]>([]);
const classes = ref<any[]>([]);
const loading = ref(true);

const searchQuery = ref('');
const selectedClassFilter = ref('');

const showModal = ref(false);

// Form fields
const studentName = ref('');
const studentClassId = ref('');
const studentGender = ref('Male');
const studentPhotoFile = ref<File | null>(null);
const isEditing = ref(false);
const editStudentId = ref<number | null>(null);

const fetchData = async () => {
  loading.value = true;
  try {
    const classRes = await api.get('/classes');
    classes.value = classRes.data;

    const studentRes = await api.get('/students');
    students.value = studentRes.data;
  } catch (err) {
    console.error('Failed to load students roster', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

// Client side filtering for search & class dropdown
const filteredStudents = computed(() => {
  return students.value.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesClass = selectedClassFilter.value === '' || s.class_id === Number(selectedClassFilter.value);
    return matchesSearch && matchesClass;
  });
});

const onFileChange = (e: any) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    studentPhotoFile.value = files[0];
  }
};

const openAddModal = () => {
  studentName.value = '';
  studentClassId.value = classes.value[0]?.id || '';
  studentGender.value = 'Male';
  studentPhotoFile.value = null;
  isEditing.value = false;
  showModal.value = true;
};

const openEditModal = (s: any) => {
  studentName.value = s.name;
  studentClassId.value = s.class_id;
  studentGender.value = s.gender || 'Male';
  studentPhotoFile.value = null;
  isEditing.value = true;
  editStudentId.value = s.id;
  showModal.value = true;
};

const saveStudent = async () => {
  if (!studentName.value.trim() || !studentClassId.value) return;

  const formData = new FormData();
  formData.append('name', studentName.value.trim());
  formData.append('class_id', studentClassId.value);
  formData.append('gender', studentGender.value);
  
  if (studentPhotoFile.value) {
    formData.append('photo', studentPhotoFile.value);
  }

  try {
    if (isEditing.value && editStudentId.value) {
      // In Laravel, PUT requests with file uploads do not parse correctly via multipart/form-data.
      // So we use POST with _method=PUT parameter or use POST endpoint directly.
      // Let's attach _method=PUT to mock the PUT request
      formData.append('_method', 'PUT');
      await api.post(`/students/${editStudentId.value}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      await api.post('/students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }

    showModal.value = false;
    await fetchData();
  } catch (err) {
    alert('Failed to save student record.');
  }
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
</script>

<template>
  <div v-if="loading" style="text-align: center; padding: 2rem; font-weight: 600;">
    Loading student index...
  </div>
  <div v-else>
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap; gap: 1rem;">
        <h3 class="card-title" style="margin-bottom: 0;">Students Registry</h3>
        <div style="display: flex; gap: 0.75rem; flex-grow: 1; justify-content: flex-end; min-width: 280px;">
          <input
            v-model="searchQuery"
            type="text"
            class="form-control"
            placeholder="🔍 Search student name..."
            style="max-width: 240px; padding: 0.5rem 0.75rem;"
          />
          <select v-model="selectedClassFilter" class="form-control form-select" style="max-width: 180px; padding: 0.5rem 0.75rem;">
            <option value="">All Classes</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <button v-if="authStore.isAdmin" class="btn btn-primary btn-sm" @click="openAddModal">
            ➕ Add Student
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>ID</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Gender</th>
              <th v-if="authStore.isAdmin" style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredStudents" :key="s.id">
              <td>
                <img
                  :src="s.photo || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'"
                  alt="Student Photo"
                  style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);"
                />
              </td>
              <td>{{ s.id }}</td>
              <td style="font-weight: 600;">{{ s.name }}</td>
              <td>
                <span class="badge badge-info">{{ s.class ? s.class.name : 'N/A' }}</span>
              </td>
              <td>{{ s.gender || 'N/A' }}</td>
              <td v-if="authStore.isAdmin" style="text-align: right;">
                <div style="display: inline-flex; gap: 0.5rem;">
                  <button class="btn btn-secondary btn-sm" @click="openEditModal(s)">
                    ✏️ Edit
                  </button>
                  <button class="btn btn-danger btn-sm" @click="deleteStudent(s.id)">
                    🗑️ Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredStudents.length === 0">
              <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                No students match your query.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Student Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? 'Edit Student' : 'Add Student' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveStudent" enctype="multipart/form-data">
          <div class="form-group">
            <label class="form-label">Student Full Name</label>
            <input v-model="studentName" type="text" class="form-control" placeholder="e.g. John Doe" required />
          </div>

          <div class="form-group">
            <label class="form-label">Assigned Class</label>
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
            <input type="file" @change="onFileChange" class="form-control" accept="image/*" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Student</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
