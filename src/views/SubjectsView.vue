<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const authStore = useAuthStore();
const uiStore = useUiStore();

const subjects = ref<any[]>([]);
const classes = ref<any[]>([]);
const teachers = ref<any[]>([]);
const loading = ref(true);
const showModal = ref(false);
const showAssignModal = ref(false);
const search = ref('');
const openDropdownId = ref<number | null>(null);
const selectedIds = ref<number[]>([]);
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

// Form fields for dynamic weights
const showWeightsModal = ref(false);
const editingComponentsSubjectId = ref<number | null>(null);
const scoreComponents = ref<any[]>([]);

const openWeightsModal = (s: any) => {
  editingComponentsSubjectId.value = s.id;
  if (s.score_components && s.score_components.length > 0) {
    scoreComponents.value = JSON.parse(JSON.stringify(s.score_components));
  } else {
    scoreComponents.value = [
      { key: 'quiz', label: 'Quiz', weight: 20 },
      { key: 'assignment', label: 'Assignment', weight: 10 },
      { key: 'midterm', label: 'Midterm', weight: 30 },
      { key: 'final', label: 'Final', weight: 40 }
    ];
  }
  showWeightsModal.value = true;
};

const addComponent = () => {
  const key = 'comp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  scoreComponents.value.push({
    key,
    label: '',
    weight: 0
  });
};

const removeComponent = (index: number) => {
  scoreComponents.value.splice(index, 1);
};

const weightsSum = computed(() => {
  return scoreComponents.value.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
});

const saveWeights = async () => {
  if (!editingComponentsSubjectId.value) return;
  if (weightsSum.value !== 100) return;
  if (scoreComponents.value.some(c => !c.label.trim())) {
    alert('Please fill out all component labels.');
    return;
  }

  try {
    await api.put(`/subjects/${editingComponentsSubjectId.value}`, {
      score_components: scoreComponents.value
    });
    showWeightsModal.value = false;
    await fetchSubjects();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to save score weights.');
  }
};


// Form fields for subjects assignment (lists of classes)
const assignSubjectId = ref<number | null>(null);
const classAssignments = ref<any[]>([]);

const fetchSubjects = async () => {
  try {
    const response = await api.get('/subjects');
    subjects.value = response.data;
    const maxPage = Math.ceil(filteredSubjects.value.length / itemsPerPage.value);
    if (currentPage.value > maxPage) {
      currentPage.value = Math.max(1, maxPage);
    }
  } catch (err) {
    console.error('Failed to fetch subjects list', err);
  }
};

const fetchClassesAndTeachers = async () => {
  try {
    const classRes = await api.get('/classes');
    // Only keep active classes
    classes.value = classRes.data.filter((c: any) => c.is_active !== false);

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
  document.addEventListener('click', () => { openDropdownId.value = null; });
});

// Search filter
const filteredSubjects = computed(() => {
  if (!search.value.trim()) return subjects.value;
  return subjects.value.filter(s =>
    s.name.toLowerCase().includes(search.value.toLowerCase())
  );
});

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(5);

watch([search, itemsPerPage], () => {
  currentPage.value = 1;
});

const totalPages = computed(() => Math.ceil(filteredSubjects.value.length / itemsPerPage.value));

const paginatedSubjects = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredSubjects.value.slice(start, end);
});

const isAllSelected = computed(() => {
  if (filteredSubjects.value.length === 0) return false;
  return filteredSubjects.value.every(s => selectedIds.value.includes(s.id));
});

const toggleSelectAll = (e: Event) => {
  if ((e.target as HTMLInputElement).checked) {
    selectedIds.value = filteredSubjects.value.map(s => s.id);
  } else {
    selectedIds.value = [];
  }
};

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

const downloadSubjectTemplate = () => {
  const headers = 'name\n';
  const rows = 'Mathematics\nScience\nEnglish Literature\n';
  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'subjects_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const triggerSubjectImport = () => {
  document.getElementById('subjectCsvFileInput')?.click();
};

const handleSubjectImport = async (e: any) => {
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
        await api.post('/subjects', { name });
        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`Row ${i + 1} (${name}): ${err.response?.data?.message || 'Failed'}`);
      }
    }

    loading.value = false;
    e.target.value = '';

    let msg = `Import finished.\nSuccessfully imported: ${successCount} subjects.`;
    if (failCount > 0) {
      msg += `\nFailed to import: ${failCount} subjects.\n\nErrors:\n` + errors.slice(0, 5).join('\n');
      if (errors.length > 5) msg += `\n...and ${errors.length - 5} more errors.`;
    }
    alert(msg);
    await fetchSubjects();
  };
  reader.readAsText(file);
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

const toggleSubjectStatus = async (s: any) => {
  try {
    await api.put(`/subjects/${s.id}`, { is_active: !s.is_active });
    await fetchSubjects();
  } catch (err) {
    alert('Failed to update subject status.');
  }
};

const bulkSetStatus = async (status: boolean) => {
  if (selectedIds.value.length === 0) return;

  loading.value = true;
  for (const id of selectedIds.value) {
    try {
      await api.put(`/subjects/${id}`, { is_active: status });
    } catch (err) {
      console.error(`Failed to update subject ${id}`, err);
    }
  }
  selectedIds.value = [];
  loading.value = false;
  await fetchSubjects();
};

const bulkDelete = async () => {
  if (selectedIds.value.length === 0) return;

  if (confirm(`Are you sure you want to delete the ${selectedIds.value.length} selected subjects? This will delete all student score records associated with them.`)) {
    loading.value = true;
    for (const id of selectedIds.value) {
      try {
        await api.delete(`/subjects/${id}`);
      } catch (err) {
        console.error(`Failed to delete subject ${id}`, err);
      }
    }
    selectedIds.value = [];
    loading.value = false;
    await fetchSubjects();
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
          <span class="metric-title">{{ uiStore.t('totalSubjectsLabel') }}</span>
          <span class="metric-value">{{ totalSubjectsCount }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon" style="background-color: var(--warning-light); color: var(--warning-color);">⚠️</div>
        <div class="metric-details">
          <span class="metric-title">{{ uiStore.t('unassignedSubjectsLabel') }}</span>
          <span class="metric-value">{{ unassignedSubjectsCount }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon" style="background-color: var(--success-light); color: var(--success-color);">👨‍🏫</div>
        <div class="metric-details">
          <span class="metric-title">{{ uiStore.t('teachingTutorsLabel') }}</span>
          <span class="metric-value">{{ activeTeachersCount }}</span>
        </div>
      </div>
    </div>

    <!-- Main Card -->
    <div class="card">
      <div class="card-header" style="flex-direction: row; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <h3 class="card-title" style="margin-right: auto;">{{ uiStore.t('curriculumSubjectsTitle') }}</h3>
        
        <!-- Search filter -->
        <input
          v-model="search"
          type="text"
          class="form-control"
          :placeholder="'🔍 ' + uiStore.t('searchSubjectPlaceholder')"
          style="max-width: 240px; font-size: 0.85rem; padding: 0.4rem 0.75rem;"
        />

        <div v-if="authStore.isAdmin" style="display: flex; gap: 0.5rem; align-items: center;">
          <!-- Template Download Link -->
          <button class="btn btn-secondary btn-sm" @click="downloadSubjectTemplate" title="Download CSV template">
            📄 {{ uiStore.t('template') }}
          </button>
          <!-- Import Button -->
          <button class="btn btn-secondary btn-sm" @click="triggerSubjectImport" title="Import subjects from CSV file">
            📥 {{ uiStore.t('importData') }}
          </button>
          <input type="file" id="subjectCsvFileInput" accept=".csv" @change="handleSubjectImport" style="display: none;" />

          <button class="btn btn-primary btn-sm" @click="openAddModal">
            ➕ {{ uiStore.t('createSubject') }}
          </button>
        </div>
      </div>

      <div v-if="authStore.isAdmin" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0 1rem 1rem; flex-wrap: wrap;">
        <label style="display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); cursor: pointer; margin: 0;">
          <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
          {{ uiStore.t('selectAllVisibleSubjects') }}
        </label>
      </div>

      <div v-if="authStore.isAdmin && selectedIds.length > 0" style="background: var(--primary-light); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px dashed var(--primary-color); display: flex; align-items: center; justify-content: space-between; margin: 0 1rem 1rem; gap: 1rem; flex-wrap: wrap;">
        <span style="font-weight: 600; font-size: 0.85rem; color: var(--primary-color);">
          Selected {{ selectedIds.length }} subject(s)
        </span>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-success btn-sm" @click="bulkSetStatus(true)" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">{{ uiStore.t('setActive') }}</button>
          <button class="btn btn-secondary btn-sm" @click="bulkSetStatus(false)" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">{{ uiStore.t('setInactive') }}</button>
          <button class="btn btn-danger btn-sm" @click="bulkDelete" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">{{ uiStore.t('deleteSelected') }}</button>
        </div>
      </div>

      <div v-if="filteredSubjects.length === 0" class="subject-empty">
        No subjects match your search.
      </div>
      <div v-else class="subjects-list">
        <div v-for="(s, index) in paginatedSubjects" :key="s.id" class="subject-row">
          <div class="subject-row-main">
            <div style="display: flex; align-items: flex-start; gap: 0.75rem; min-width: 0;">
              <input v-if="authStore.isAdmin" type="checkbox" :value="s.id" v-model="selectedIds" style="margin-top: 0.2rem;" @click.stop />
              <div class="subject-title-block">
                <div class="subject-id">#{{ s.id }}</div>
                <div class="subject-title-row">
                  <div class="subject-title">{{ s.name }}</div>
                  <span class="badge" :class="s.is_active !== false ? 'badge-success' : 'badge-secondary'" style="font-size: 0.65rem;">
                    {{ s.is_active !== false ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="authStore.isAdmin" class="action-stack">
              <!-- Assign button stays standalone -->
              <button class="btn btn-secondary btn-sm" @click="openAssignModal(s)" style="border-color: var(--primary-color); color: var(--primary-color);">
                🔗 {{ uiStore.t('assignToClass') }}
              </button>

              <!-- ⋮ Dropdown for Active/Edit/Delete -->
              <div class="dropdown-wrapper" @click.stop>
                <button
                  class="btn btn-icon btn-sm"
                  :class="openDropdownId === s.id ? 'btn-icon-active' : ''"
                  @click="openDropdownId = openDropdownId === s.id ? null : s.id"
                  :title="uiStore.t('moreActions')"
                >⋮</button>
                <div v-if="openDropdownId === s.id" class="dropdown-menu-custom" :class="{ 'dropdown-menu-up': index >= paginatedSubjects.length - 2 && index >= 2 }">
                  <button
                    class="dropdown-item"
                    :class="s.is_active !== false ? 'dropdown-item-success' : 'dropdown-item-muted'"
                    @click="toggleSubjectStatus(s); openDropdownId = null"
                  >
                    <span>{{ s.is_active !== false ? '✅' : '⚪' }}</span>
                    {{ s.is_active !== false ? 'Set Inactive' : 'Set Active' }}
                  </button>
                  <button
                    class="dropdown-item"
                    @click="openWeightsModal(s); openDropdownId = null"
                  >
                    <span>⚙️</span> {{ uiStore.t('scoreWeights') }}
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
                    @click="deleteSubject(s.id); openDropdownId = null"
                  >
                    <span>🗑️</span> {{ uiStore.t('delete') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="subject-row-meta" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
            <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.25rem;">
              <span class="subject-count" style="margin-right: 0.5rem;">
                {{ s.classes ? s.classes.filter((c: any) => c.is_active !== false).length : 0 }}
                class{{ s.classes && s.classes.filter((c: any) => c.is_active !== false).length === 1 ? '' : 'es' }}
              </span>

              <div class="subject-weights-display" style="font-size: 0.76rem; color: var(--text-muted); font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
                <span>⚙️ {{ uiStore.t('scoreWeightsLabel') }}:</span>
                <template v-if="s.score_components && s.score_components.length === 4">
                  <span v-for="(comp, i) in s.score_components" :key="comp.key">
                    {{ comp.label }} ({{ comp.weight }}%)<span v-if="Number(i) < 3"> · </span>
                  </span>
                </template>
                <template v-else>
                  <span>Quiz (20%) · Assignment (10%) · Midterm (30%) · Final (40%)</span>
                </template>
              </div>
            </div>

            <div v-if="s.classes && s.classes.filter((c: any) => c.is_active !== false).length > 0" class="class-badge-stack">
              <template v-if="!expandedSubjects.has(s.id) && s.classes.filter((c: any) => c.is_active !== false).length > 3">
                <div v-for="c in s.classes.filter((c: any) => c.is_active !== false).slice(0, 3)" :key="c.id" class="class-badge-item">
                  <span class="class-name">{{ c.name }}</span>
                  <span class="class-badge-meta">
                    <span v-if="c.assigned_teacher">{{ c.assigned_teacher.name }}</span>
                    <span v-else>No teacher</span>
                  </span>
                </div>
                <button type="button" class="class-toggle" @click="toggleExpand(s.id)">
                  + {{ s.classes.filter((c: any) => c.is_active !== false).length - 3 }} more
                </button>
              </template>
              <template v-else>
                <div v-for="c in s.classes.filter((c: any) => c.is_active !== false)" :key="c.id" class="class-badge-item">
                  <span class="class-name">{{ c.name }}</span>
                  <span class="class-badge-meta">
                    <span v-if="c.assigned_teacher">{{ c.assigned_teacher.name }}</span>
                    <span v-else>No teacher</span>
                  </span>
                </div>
                <button v-if="s.classes.filter((c: any) => c.is_active !== false).length > 3" type="button" class="class-toggle" @click="toggleExpand(s.id)">
                  {{ uiStore.t('showLess') }}
                </button>
              </template>
            </div>
            <div v-else class="subject-empty small">
              {{ uiStore.t('notAssignedYet') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div v-if="filteredSubjects.length > 0" class="pagination-container" style="margin-top: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div class="pagination-info">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredSubjects.length) }} of {{ filteredSubjects.length }} subjects
          </div>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Show:</span>
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

    <!-- Subject Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? uiStore.t('editSubject') : uiStore.t('createSubject') }}</h3>
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
          <h3 class="modal-title">{{ uiStore.t('assignSubjectToClassesTitle') }}</h3>
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
                <option value="">{{ uiStore.t('noTeacherAssigned') }}</option>
                <option v-for="t in teachers" :key="t.id" :value="t.id">
                  {{ t.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAssignModal = false">{{ uiStore.t('cancel') }}</button>
            <button type="submit" class="btn btn-primary">{{ uiStore.t('saveAssignments') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Subject Score Weights Modal -->
    <div v-if="showWeightsModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">Configure Score Weights</h3>
          <button class="modal-close" @click="showWeightsModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveWeights">
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            Assign weight percentage (%) to each grade category. The sum of all weights must equal exactly 100%.
          </p>

          <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.25rem;">
            <div v-for="(comp, idx) in scoreComponents" :key="comp.key" style="display: grid; grid-template-columns: 1fr 100px 40px; gap: 0.75rem; align-items: flex-end;">
              <div>
                <label v-if="idx === 0" class="form-label" style="margin-bottom: 0.25rem;">Component Label</label>
                <input v-model="comp.label" type="text" class="form-control" placeholder="e.g. Quiz" required style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" />
              </div>
              <div>
                <label v-if="idx === 0" class="form-label" style="margin-bottom: 0.25rem;">Weight (%)</label>
                <input v-model.number="comp.weight" type="number" min="0" max="100" class="form-control" placeholder="e.g. 25" required style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" />
              </div>
              <div>
                <button
                  type="button"
                  class="btn btn-icon btn-sm"
                  style="border-color: #fca5a5; color: #ef4444; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; height: 36px; width: 36px; padding: 0;"
                  @click="removeComponent(idx)"
                  :disabled="scoreComponents.length <= 1"
                  title="Remove Component"
                >🗑️</button>
              </div>
            </div>

            <button
              type="button"
              class="btn btn-secondary btn-sm"
              style="align-self: flex-start; margin-top: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; font-weight: 600;"
              @click="addComponent"
            >
              ➕ {{ uiStore.t('addComponent') }}
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8fafc; border-radius: var(--radius-sm); margin-bottom: 1.25rem; font-weight: 700; font-size: 0.9rem;">
            <span>Total Weights Sum:</span>
            <span :style="{ color: weightsSum === 100 ? 'var(--success-color)' : 'var(--danger-color)' }">
              {{ weightsSum }}%
            </span>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showWeightsModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="weightsSum !== 100">Save Weights</button>
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
