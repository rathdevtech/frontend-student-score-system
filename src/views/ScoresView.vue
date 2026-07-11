<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const authStore = useAuthStore();
const uiStore = useUiStore();

const classes = ref<any[]>([]);
const availableSubjects = ref<any[]>([]);

const selectedClassId = ref('');
const selectedSubjectId = ref('');

const studentScores = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const fetchError = ref('');
const successMessage = ref('');

const getDefaultComponents = () => [
  { key: 'quiz', label: 'Quiz', weight: 20 },
  { key: 'assignment', label: 'Assignment', weight: 10 },
  { key: 'midterm', label: 'Midterm', weight: 30 },
  { key: 'final', label: 'Final', weight: 40 }
];
const subjectComponents = ref<any[]>(getDefaultComponents());

const loadClasses = async () => {
  try {
    const res = await api.get('/classes');
    classes.value = res.data.filter((c: any) => c.is_active !== false);
  } catch (err) {
    console.error('Failed to load classes', err);
  }
};

onMounted(() => {
  loadClasses();
});

// Update subjects list when class changes
watch(selectedClassId, (newClassId) => {
  selectedSubjectId.value = '';
  studentScores.value = [];
  successMessage.value = '';
  
  if (newClassId) {
    const selectedClass = classes.value.find(c => c.id === Number(newClassId));
    availableSubjects.value = selectedClass ? selectedClass.subjects : [];
  } else {
    availableSubjects.value = [];
  }
});

// Query scores when both class & subject are selected
const fetchScores = async () => {
  if (!selectedClassId.value || !selectedSubjectId.value) return;
  
  loading.value = true;
  fetchError.value = '';
  successMessage.value = '';
  
  try {
    const res = await api.get('/scores', {
      params: {
        class_id: selectedClassId.value,
        subject_id: selectedSubjectId.value
      }
    });

    if (res.data && res.data.score_components) {
      subjectComponents.value = res.data.score_components;
      studentScores.value = res.data.scores;
    } else {
      subjectComponents.value = getDefaultComponents();
      studentScores.value = Array.isArray(res.data) ? res.data : [];
    }
  } catch (err: any) {
    fetchError.value = err.response?.data?.message || 'Failed to load scores for the selected configuration.';
  } finally {
    loading.value = false;
  }
};

watch([selectedClassId, selectedSubjectId], () => {
  if (selectedClassId.value && selectedSubjectId.value) {
    fetchScores();
  }
});

// Client-side formula for immediate calculation feedback
const calculateRow = (row: any) => {
  if (!row.components) row.components = {};
  
  let total = 0;
  subjectComponents.value.forEach(c => {
    const scoreVal = Number(row.components[c.key]) || 0;
    const weightFraction = (Number(c.weight) || 0) / 100;
    total += scoreVal * weightFraction;
  });

  row.total = Number(total.toFixed(2));
  
  // Grade Rules determination
  if (row.total >= 85) row.grade = 'A';
  else if (row.total >= 70) row.grade = 'B';
  else if (row.total >= 55) row.grade = 'C';
  else if (row.total >= 50) row.grade = 'D';
  else row.grade = 'F';
};

const saveBulkScores = async () => {
  if (studentScores.value.length === 0 || !selectedSubjectId.value) return;
  
  saving.value = true;
  successMessage.value = '';
  
  // Format data for api/scores/bulk
  const scoresPayload = studentScores.value.map(row => {
    const comps: any = {};
    subjectComponents.value.forEach(c => {
      comps[c.key] = Number(row.components[c.key]) || 0;
    });
    return {
      student_id: row.student_id,
      components: comps
    };
  });
  
  try {
    await api.post('/scores/bulk', {
      subject_id: Number(selectedSubjectId.value),
      scores: scoresPayload
    });
    successMessage.value = 'Grades updated and calculated successfully!';
    setTimeout(() => {
      successMessage.value = '';
    }, 2000);
    await fetchScores(); // Reload
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to save grades. Please verify score values are between 0 and 100.');
  } finally {
    saving.value = false;
  }
};

const downloadScoresTemplate = () => {
  if (studentScores.value.length === 0) return;

  const componentKeys = subjectComponents.value.map(c => c.key);
  const headers = ['student_id', 'student_name', ...componentKeys].join(',');

  const rows = studentScores.value.map(row => {
    const studentId = row.student_id;
    const studentName = row.student_name;
    const scoreVals = componentKeys.map(key => {
      const val = row.components && row.components[key] !== undefined ? row.components[key] : '';
      return val;
    });
    return [studentId, `"${studentName}"`, ...scoreVals].join(',');
  });

  const csvContent = headers + '\n' + rows.join('\n') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);

  const selectedClass = classes.value.find(c => c.id === Number(selectedClassId.value));
  const selectedSubject = availableSubjects.value.find(s => s.id === Number(selectedSubjectId.value));
  const filename = `${selectedClass?.name || 'class'}_${selectedSubject?.name || 'subject'}_grades.csv`.replace(/\s+/g, '_').toLowerCase();

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const triggerScoresImport = () => {
  document.getElementById('scoresCsvFileInput')?.click();
};

const handleScoresImport = (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event: any) => {
    const text = event.target.result;
    const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    if (lines.length <= 1) {
      alert('The CSV file is empty or missing data rows.');
      return;
    }

    const headers = lines[0].toLowerCase().split(',').map((h: string) => h.trim());
    const studentIdIdx = headers.indexOf('student_id');

    if (studentIdIdx === -1) {
      alert('Invalid template format. The CSV must contain a "student_id" header.');
      return;
    }

    const compIdxs: { [key: string]: number } = {};
    subjectComponents.value.forEach(c => {
      compIdxs[c.key] = headers.indexOf(c.key.toLowerCase());
    });

    let successCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < headers.length) continue;

      const studentId = Number(cols[studentIdIdx]);
      if (isNaN(studentId)) continue;

      const matchedRowIndex = studentScores.value.findIndex(row => row.student_id === studentId);
      if (matchedRowIndex === -1) continue;

      if (!studentScores.value[matchedRowIndex].components) {
        studentScores.value[matchedRowIndex].components = {};
      }

      subjectComponents.value.forEach(c => {
        const idx = compIdxs[c.key] ?? -1;
        if (idx !== -1 && cols[idx] !== undefined) {
          const rawScore = cols[idx];
          studentScores.value[matchedRowIndex].components[c.key] = rawScore === '' ? 0 : Number(rawScore);
        }
      });

      calculateRow(studentScores.value[matchedRowIndex]);
      successCount++;
    }

    e.target.value = '';
    alert(`Import finished.\nLoaded grades for ${successCount} students in the grid.\n\nPlease click "Save Grades" to save to the database.`);
  };
  reader.readAsText(file);
};
</script>

<template>
  <div class="gradebook-container">
    <!-- Combined Header + Selector Toolbar -->
    <div class="card toolbar-card no-print">
      <div class="toolbar-row">
        <div class="toolbar-title-group">
          <h2 class="page-title">{{ uiStore.t('gradebook') }}</h2>
        </div>
        <div class="toolbar-selectors">
          <div class="select-input-container">
            <span class="select-icon">🏫</span>
            <select v-model="selectedClassId" class="form-control premium-select">
              <option value="">{{ uiStore.t('selectClassPlaceholder') }}</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="select-input-container">
            <span class="select-icon">📚</span>
            <select v-model="selectedSubjectId" class="form-control premium-select" :disabled="!selectedClassId">
              <option value="">{{ uiStore.t('selectSubjectPlaceholder') }}</option>
              <option v-for="s in availableSubjects" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Notifications -->
    <transition name="fade">
      <div v-if="successMessage" class="custom-alert alert-success">
        <span class="alert-icon">✅</span>
        <div class="alert-content">{{ successMessage }}</div>
      </div>
    </transition>
    
    <transition name="fade">
      <div v-if="fetchError" class="custom-alert alert-danger">
        <span class="alert-icon">⚠️</span>
        <div class="alert-content">{{ fetchError }}</div>
      </div>
    </transition>

    <!-- Grade Book Grid -->
    <div v-if="selectedClassId && selectedSubjectId" class="card gradebook-card">
      <div class="gradebook-header">
        <div>
          <h3 class="card-title" style="margin: 0;">{{ uiStore.t('gradebookSheetTitle') }}</h3>
          <p class="card-subtitle" style="margin: 0.15rem 0 0 0;">{{ uiStore.t('gradebookIntro') }}</p>
        </div>
        <div class="header-actions no-print">
          <!-- Template Download Link -->
          <button class="btn btn-secondary btn-header" @click="downloadScoresTemplate" :disabled="studentScores.length === 0" :title="uiStore.t('downloadTemplate')">
            📄 {{ uiStore.t('template') }}
          </button>
          <!-- Import Button -->
          <button class="btn btn-secondary btn-header" @click="triggerScoresImport" :disabled="studentScores.length === 0" :title="uiStore.t('importData')">
            📥 {{ uiStore.t('importData') }}
          </button>
          <input type="file" id="scoresCsvFileInput" accept=".csv" @change="handleScoresImport" style="display: none;" />

          <button class="btn btn-primary btn-header" @click="saveBulkScores" :disabled="saving || studentScores.length === 0">
            {{ saving ? uiStore.t('saving') : '💾 ' + uiStore.t('saveGrades') }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-state" style="padding: 4rem 2rem;">
        <div class="spinner"></div>
        <p style="margin-top: 1rem;">{{ uiStore.t('fetchingGradebook') }}</p>
      </div>
      
      <div v-else-if="studentScores.length === 0" style="text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 1rem;">👨‍🎓</span>
        <p style="font-weight: 600; font-size: 0.95rem; margin: 0;">{{ uiStore.t('noStudentsInClass') }}</p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">{{ uiStore.t('addStudentsHint') }}</p>
      </div>

      <div v-else class="table-container">
        <table class="table score-table">
          <thead>
            <tr>
              <th style="min-width: 150px; text-align: left;">{{ uiStore.t('studentName') }}</th>
              <th style="min-width: 150px; text-align: left;">{{ uiStore.t('colNameKh') }}</th>
              <th style="width: 70px; text-align: left;">{{ uiStore.t('gender') }}</th>
              <th v-for="comp in subjectComponents" :key="comp.key" style="text-align: center; width: 90px;">
                {{ comp.label }}
                <div style="font-size: 0.7rem; opacity: 0.8; font-weight: 500; text-transform: none; margin-top: 0.1rem;">
                  ({{ comp.weight }}%)
                </div>
              </th>
              <th style="text-align: center; width: 90px;">{{ uiStore.t('totalScoreLabel') }}</th>
              <th style="text-align: center; width: 80px;">{{ uiStore.t('colGrade') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in studentScores"
              :key="row.student_id"
              :class="row.total >= 50 ? 'passing-row' : 'failing-row'"
            >
              <td style="font-weight: 600; color: var(--text-main);">{{ row.student_name }}</td>
              <td class="kh-text" style="color: var(--text-muted);">{{ row.student_name_kh || '—' }}</td>
              <td>{{ row.gender || 'N/A' }}</td>
              <td v-for="comp in subjectComponents" :key="comp.key" style="text-align: center;">
                <input
                  v-model.number="row.components[comp.key]"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  @input="calculateRow(row)"
                  class="score-input"
                />
              </td>
              <td class="total-column" :class="row.total < 50 ? 'fail-total' : ''" style="text-align: center;">
                {{ row.total }}%
              </td>
              <td class="grade-column" style="text-align: center;">
                <span class="badge" :class="row.total >= 50 ? 'badge-success' : 'badge-danger'" style="font-size: 0.85rem; padding: 0.3rem 0.65rem;">
                  {{ row.grade }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div v-else class="card empty-gradebook-state no-print">
      <div class="empty-state-icon">🏫</div>
      <h3>{{ uiStore.t('gradebookEmptyTitle') }}</h3>
      <p>{{ uiStore.t('gradebookEmptyText') }}</p>
    </div>
  </div>
</template>

<style scoped>
.gradebook-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Toolbar Card (merged header + selectors) */
.toolbar-card {
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.toolbar-title-group {
  flex-shrink: 0;
}

.page-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  font-family: var(--font-family);
  white-space: nowrap;
}

.toolbar-selectors {
  display: flex;
  gap: 0.75rem;
  flex: 1;
  flex-wrap: wrap;
}

.toolbar-selectors .select-input-container {
  flex: 1;
  min-width: 160px;
}

.select-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.select-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 1rem;
  pointer-events: none;
  color: var(--text-muted);
}

.premium-select {
  padding-left: 2.25rem !important;
  height: 38px;
}

/* Gradebook Card Sheet */
.gradebook-card {
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  padding: 0;
}

.gradebook-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 1rem;
}

.card-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn-header {
  height: 36px;
  padding: 0 1rem;
  font-weight: 700;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

/* Input Fields inside Table */
.score-table .score-input {
  width: 68px !important;
  height: 34px !important;
  border-radius: 8px !important;
  border: 1px solid var(--border-color) !important;
  background-color: #f8fafc !important;
  color: var(--text-main) !important;
  font-weight: 700 !important;
  text-align: center !important;
  outline: none !important;
  font-size: 0.9rem !important;
  padding: 0 !important;
  transition: all 0.15s ease !important;
}

.score-table .score-input:hover {
  border-color: #cbd5e1 !important;
  background-color: #f1f5f9 !important;
}

.score-table .score-input:focus {
  border-color: var(--primary-color) !important;
  background-color: #ffffff !important;
  box-shadow: 0 0 0 2px var(--primary-light) !important;
}

/* Hide number inputs spinner/arrows */
.score-table input[type="number"]::-webkit-outer-spin-button,
.score-table input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.score-table input[type="number"] {
  -moz-appearance: textfield;
}

.score-table th,
.score-table td {
  vertical-align: middle !important;
  padding: 0.75rem 1rem !important;
}

/* Table Row Highlights */
.passing-row:hover td {
  background-color: #f0fdf4 !important;
}

.failing-row:hover td {
  background-color: #fef2f2 !important;
}

.total-column {
  font-weight: 800;
  color: var(--primary-color);
  font-size: 1rem;
}

.total-column.fail-total {
  color: var(--danger-color);
}

.grade-column {
  vertical-align: middle;
}

/* Alert Boxes */
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

/* Empty State */
.empty-gradebook-state {
  text-align: center;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-state-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.empty-gradebook-state h3 {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 0.35rem 0;
}

.empty-gradebook-state p {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
  max-width: 300px;
  line-height: 1.5;
}

/* Spinner */
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--primary-light);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
