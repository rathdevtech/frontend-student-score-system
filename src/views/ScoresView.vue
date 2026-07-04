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

const loadClasses = async () => {
  try {
    const res = await api.get('/classes');
    classes.value = res.data;
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
    studentScores.value = res.data;
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
  const q = Number(row.quiz) || 0;
  const a = Number(row.assignment) || 0;
  const m = Number(row.midterm) || 0;
  const f = Number(row.final) || 0;
  
  // Final Score = (Quiz × 20%) + (Assignment × 10%) + (Midterm × 30%) + (Final × 40%)
  const total = (q * 0.20) + (a * 0.10) + (m * 0.30) + (f * 0.40);
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
  const scoresPayload = studentScores.value.map(row => ({
    student_id: row.student_id,
    quiz: Number(row.quiz),
    assignment: Number(row.assignment),
    midterm: Number(row.midterm),
    final: Number(row.final)
  }));
  
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
      <div class="card-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0;">
        <h3 class="card-title">Gradebook Grid Sheet</h3>
        <button class="btn btn-primary btn-sm" @click="saveBulkScores" :disabled="saving || studentScores.length === 0">
          {{ saving ? 'Saving scores...' : '💾 Save Grades' }}
        </button>
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
              <th style="text-align: center; width: 110px;">Quiz (20%)</th>
              <th style="text-align: center; width: 110px;">Assignment (10%)</th>
              <th style="text-align: center; width: 110px;">Midterm (30%)</th>
              <th style="text-align: center; width: 110px;">Final (40%)</th>
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
              <td style="text-align: center;">
                <input
                  v-model.number="row.quiz"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  @input="calculateRow(row)"
                />
              </td>
              <td style="text-align: center;">
                <input
                  v-model.number="row.assignment"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  @input="calculateRow(row)"
                />
              </td>
              <td style="text-align: center;">
                <input
                  v-model.number="row.midterm"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  @input="calculateRow(row)"
                />
              </td>
              <td style="text-align: center;">
                <input
                  v-model.number="row.final"
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
