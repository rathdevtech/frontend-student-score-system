<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const subjects = ref<any[]>([]);
const classes = ref<any[]>([]);
const teachers = ref<any[]>([]);
const loading = ref(true);
const showModal = ref(false);
const showAssignModal = ref(false);
const search = ref('');
// Track which subjects have expanded class lists
const expandedSubjects = ref<Set<number>>(new Set());

const toggleExpand = (subjectId: number) => {
  if (expandedSubjects.value.has(subjectId)) {
    expandedSubjects.value.delete(subjectId);
  } else {
    expandedSubjects.value.add(subjectId);
  }
};

// Form fields for subjects
const subjectName = ref('');
const isEditing = ref(false);
const editSubjectId = ref<number | null>(null);

// Form fields for subjects assignment (lists of classes)
const assignSubjectId = ref<number | null>(null);
const classAssignments = ref<any[]>([]);

const fetchSubjects = async () => {
  try {
    const response = await api.get('/subjects');
    subjects.value = response.data;
  } catch (err) {
    console.error('Failed to fetch subjects list', err);
  }
};

const fetchClassesAndTeachers = async () => {
  try {
    const classRes = await api.get('/classes');
    classes.value = classRes.data;

    if (authStore.isAdmin) {
      const userRes = await api.get('/users');
      teachers.value = userRes.data.filter((u: any) => u.role === 'teacher');
    }
  } catch (err) {
    console.error('Failed to load classes/teachers for assignment selection', err);
  }
};

onMounted(async () => {
  loading.value = true;
  await fetchSubjects();
  if (authStore.isAdmin) {
    await fetchClassesAndTeachers();
  }
  loading.value = false;
});

// Search filter
const filteredSubjects = computed(() => {
  if (!search.value.trim()) return subjects.value;
  return subjects.value.filter(s =>
    s.name.toLowerCase().includes(search.value.toLowerCase())
  );
});

// Stats computed properties
const totalSubjectsCount = computed(() => subjects.value.length);
const unassignedSubjectsCount = computed(() => 
  subjects.value.filter(s => !s.classes || s.classes.length === 0).length
);
const activeTeachersCount = computed(() => {
  const teacherIds = new Set<number>();
  subjects.value.forEach(s => {
    if (s.classes) {
      s.classes.forEach((c: any) => {
        if (c.assigned_teacher) {
          teacherIds.add(c.assigned_teacher.id);
        }
      });
    }
  });
  return teacherIds.size;
});

const openAddModal = () => {
  subjectName.value = '';
  isEditing.value = false;
  showModal.value = true;
};

const openEditModal = (s: any) => {
  subjectName.value = s.name;
  isEditing.value = true;
  editSubjectId.value = s.id;
  showModal.value = true;
};

const saveSubject = async () => {
  if (!subjectName.value.trim()) return;

  try {
    const payload = { name: subjectName.value.trim() };

    if (isEditing.value && editSubjectId.value) {
      await api.put(`/subjects/${editSubjectId.value}`, payload);
    } else {
      await api.post('/subjects', payload);
    }

    showModal.value = false;
    await fetchSubjects();
  } catch (err) {
    alert('Failed to save subject. Ensure the name is unique.');
  }
};

const deleteSubject = async (id: number) => {
  if (confirm('Are you sure you want to delete this subject? This will delete all student score records associated with it.')) {
    try {
      await api.delete(`/subjects/${id}`);
      await fetchSubjects();
    } catch (err) {
      alert('Failed to delete subject.');
    }
  }
};

// Assignment Logic
const openAssignModal = (s: any) => {
  assignSubjectId.value = s.id;
  
  // Symmetrically map all classes and their check state for this subject
  classAssignments.value = classes.value.map(cls => {
    const existing = s.classes.find((c: any) => c.id === cls.id);
    return {
      class_id: cls.id,
      class_name: cls.name,
      assigned: !!existing,
      teacher_id: existing?.pivot?.teacher_id || ''
    };
  });

  showAssignModal.value = true;
};

const saveAssignment = async () => {
  if (!assignSubjectId.value) return;

  try {
    const assignedList = classAssignments.value
      .filter(a => a.assigned)
      .map(a => ({
        class_id: a.class_id,
        teacher_id: a.teacher_id ? Number(a.teacher_id) : null
      }));

    await api.post(`/subjects/${assignSubjectId.value}/assign`, {
      assignments: assignedList
    });
    
    showAssignModal.value = false;
    await fetchSubjects();
  } catch (err) {
    alert('Failed to save class assignments.');
  }
};
</script>

<template>
  <div v-if="loading" style="text-align: center; padding: 2rem; font-weight: 600;">
    Loading curriculum subjects...
  </div>
  <div v-else>
    <!-- Curriculum Stats Roster -->
    <div class="metrics-grid" style="margin-bottom: 1.5rem;">
      <div class="metric-card">
        <div class="metric-icon" style="background-color: var(--primary-light); color: var(--primary-color);">📚</div>
        <div class="metric-details">
          <span class="metric-title">Total Subjects</span>
          <span class="metric-value">{{ totalSubjectsCount }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon" style="background-color: var(--warning-light); color: var(--warning-color);">⚠️</div>
        <div class="metric-details">
          <span class="metric-title">Unassigned Subjects</span>
          <span class="metric-value">{{ unassignedSubjectsCount }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon" style="background-color: var(--success-light); color: var(--success-color);">👨‍🏫</div>
        <div class="metric-details">
          <span class="metric-title">Teaching Tutors</span>
          <span class="metric-value">{{ activeTeachersCount }}</span>
        </div>
      </div>
    </div>

    <!-- Main Card -->
    <div class="card">
      <div class="card-header" style="flex-direction: row; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <h3 class="card-title" style="margin-right: auto;">Curriculum Subjects</h3>
        
        <!-- Search filter -->
        <input
          v-model="search"
          type="text"
          class="form-control"
          placeholder="🔍 Search subject..."
          style="max-width: 240px; font-size: 0.85rem; padding: 0.4rem 0.75rem;"
        />

        <button v-if="authStore.isAdmin" class="btn btn-primary btn-sm" @click="openAddModal">
          ➕ Add Subject
        </button>
      </div>

      <div v-if="filteredSubjects.length === 0" class="subject-empty">
        No subjects match your search.
      </div>
      <div v-else class="subjects-list">
        <div v-for="s in filteredSubjects" :key="s.id" class="subject-row">
          <div class="subject-row-main">
            <div class="subject-title-block">
              <div class="subject-id">#{{ s.id }}</div>
              <div class="subject-title">{{ s.name }}</div>
            </div>

            <div v-if="authStore.isAdmin" class="action-stack">
              <button class="btn btn-secondary btn-sm" @click="openAssignModal(s)" style="border-color: var(--primary-color); color: var(--primary-color);">
                🔗 Assign
              </button>
              <button class="btn btn-secondary btn-sm" @click="openEditModal(s)">
                ✏️ Edit
              </button>
              <button class="btn btn-danger btn-sm" @click="deleteSubject(s.id)">
                🗑️ Delete
              </button>
            </div>
          </div>

          <div class="subject-row-meta">
            <span class="subject-count">
              {{ s.classes && s.classes.length ? s.classes.length : 0 }} class{{ (s.classes && s.classes.length) === 1 ? '' : 'es' }}
            </span>

            <div v-if="s.classes && s.classes.length > 0" class="class-badge-stack">
              <template v-if="!expandedSubjects.has(s.id) && s.classes.length > 3">
                <div v-for="c in s.classes.slice(0, 3)" :key="c.id" class="class-badge-item">
                  <span class="class-name">{{ c.name }}</span>
                  <span class="class-badge-meta">
                    <span v-if="c.assigned_teacher">{{ c.assigned_teacher.name }}</span>
                    <span v-else>No teacher</span>
                  </span>
                </div>
                <button type="button" class="class-toggle" @click="toggleExpand(s.id)">
                  + {{ s.classes.length - 3 }} more
                </button>
              </template>
              <template v-else>
                <div v-for="c in s.classes" :key="c.id" class="class-badge-item">
                  <span class="class-name">{{ c.name }}</span>
                  <span class="class-badge-meta">
                    <span v-if="c.assigned_teacher">{{ c.assigned_teacher.name }}</span>
                    <span v-else>No teacher</span>
                  </span>
                </div>
                <button v-if="s.classes.length > 3" type="button" class="class-toggle" @click="toggleExpand(s.id)">
                  Show less
                </button>
              </template>
            </div>
            <div v-else class="subject-empty small">
              Not assigned yet
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Subject Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? 'Edit Subject' : 'Add Subject' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveSubject">
          <div class="form-group">
            <label class="form-label">Subject Name</label>
            <input v-model="subjectName" type="text" class="form-control" placeholder="e.g. Science" required />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Subject</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Assign subject to classes modal (Symmetrical Checklist format) -->
    <div v-if="showAssignModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 540px;">
        <div class="modal-header">
          <h3 class="modal-title">Assign Subject to Classes</h3>
          <button class="modal-close" @click="showAssignModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveAssignment">
          <div style="max-height: 320px; overflow-y: auto; margin-bottom: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem;">
            <div v-for="a in classAssignments" :key="a.class_id" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; gap: 1rem;">
              <!-- Checkbox & Class Name -->
              <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 0.9rem; cursor: pointer; margin: 0;">
                <input type="checkbox" v-model="a.assigned" style="width: 16px; height: 16px;" />
                {{ a.class_name }}
              </label>

              <!-- Teacher Dropdown -->
              <select v-model="a.teacher_id" :disabled="!a.assigned" class="form-control form-select" style="max-width: 200px; padding: 0.35rem 0.5rem; font-size: 0.8rem; margin: 0;">
                <option value="">-- No Teacher / Unassigned --</option>
                <option v-for="t in teachers" :key="t.id" :value="t.id">
                  {{ t.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAssignModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Assignments</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subjects-list {
  display: grid;
  gap: 0.6rem;
}

.subject-row {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.85rem 1rem;
  background: #fff;
}

.subject-row-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.45rem;
}

.subject-title-block {
  min-width: 0;
}

.subject-id {
  color: var(--primary-color);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.15rem;
}

.subject-title {
  font-weight: 700;
  color: var(--text-main);
  font-size: 0.95rem;
}

.subject-row-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.subject-count {
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.class-badge-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.class-badge-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: #f8fafc;
  font-size: 0.76rem;
}

.class-name {
  font-weight: 700;
  color: var(--text-main);
}

.class-badge-meta {
  color: var(--text-muted);
}

.class-toggle {
  border: none;
  background: transparent;
  color: var(--primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.class-toggle:hover {
  text-decoration: underline;
}

.action-stack {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem;
}

.subject-empty {
  padding: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

@media (max-width: 900px) {
  .subject-row-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-stack {
    justify-content: flex-start;
  }
}
</style>
