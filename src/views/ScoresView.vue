<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

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
  <div>
    <!-- Selector Bar -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-end;">
        <div class="form-group" style="margin-bottom: 0; flex-grow: 1; min-width: 200px;">
          <label class="form-label">Select Class</label>
          <select v-model="selectedClassId" class="form-control form-select">
            <option value="">-- Choose Class --</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0; flex-grow: 1; min-width: 200px;">
          <label class="form-label">Select Subject</label>
          <select v-model="selectedSubjectId" class="form-control form-select" :disabled="!selectedClassId">
            <option value="">-- Choose Subject --</option>
            <option v-for="s in availableSubjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Alert Notifications -->
    <div v-if="successMessage" class="badge badge-success" style="width: 100%; padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px; font-size: 0.9rem;">
      ✅ {{ successMessage }}
    </div>
    
    <div v-if="fetchError" class="badge badge-danger" style="width: 100%; padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px; font-size: 0.9rem;">
      ⚠️ {{ fetchError }}
    </div>

    <!-- Grade Book Grid -->
    <div v-if="selectedClassId && selectedSubjectId" class="card" style="padding: 0; overflow: hidden;">
      <div class="card-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0; flex-wrap: wrap; gap: 1rem;">
        <h3 class="card-title" style="margin-right: auto; margin-bottom: 0;">Gradebook Grid Sheet</h3>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <!-- Template Download Link -->
          <button class="btn btn-secondary btn-sm" @click="downloadScoresTemplate" :disabled="studentScores.length === 0" title="Download CSV template with enrolled student list">
            📄 Template
          </button>
          <!-- Import Button -->
          <button class="btn btn-secondary btn-sm" @click="triggerScoresImport" :disabled="studentScores.length === 0" title="Import grades from CSV file">
            📥 Import
          </button>
          <input type="file" id="scoresCsvFileInput" accept=".csv" @change="handleScoresImport" style="display: none;" />

          <button class="btn btn-primary btn-sm" @click="saveBulkScores" :disabled="saving || studentScores.length === 0">
            {{ saving ? 'Saving scores...' : '💾 Save Grades' }}
          </button>
        </div>
      </div>

      <div v-if="loading" style="text-align: center; padding: 3rem; font-weight: 600;">
        Fetching class gradebook sheet...
      </div>
      
      <div v-else-if="studentScores.length === 0" style="text-align: center; padding: 3rem; color: var(--text-muted);">
        No students registered in this class. Add students under the Students tab.
      </div>

      <div v-else class="table-container" style="border: none; border-radius: 0;">
        <table class="table score-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Gender</th>
              <th v-for="comp in subjectComponents" :key="comp.key" style="text-align: center; width: 110px;">
                {{ comp.label }} ({{ comp.weight }}%)
              </th>
              <th style="text-align: center; width: 110px;">Total (100%)</th>
              <th style="text-align: center; width: 110px;">Grade</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in studentScores"
              :key="row.student_id"
              :class="row.total >= 50 ? 'passing-row' : 'failing-row'"
            >
              <td style="font-weight: 600;">{{ row.student_name }}</td>
              <td>{{ row.gender || 'N/A' }}</td>
              <td v-for="comp in subjectComponents" :key="comp.key" style="text-align: center;">
                <input
                  v-model.number="row.components[comp.key]"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  @input="calculateRow(row)"
                />
              </td>
              <td class="total-column" style="text-align: center; font-size: 1rem;">
                {{ row.total }}
              </td>
              <td class="grade-column" style="text-align: center; font-size: 1.1rem;">
                <span class="badge" :class="row.total >= 50 ? 'badge-success' : 'badge-danger'">
                  {{ row.grade }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div v-else class="card" style="text-align: center; padding: 4rem; color: var(--text-muted);">
      <span>🏫</span>
      <p style="margin-top: 1rem; font-weight: 600;">Select a class and a subject from the selector above to open the grading sheet.</p>
    </div>
  </div>
</template>
