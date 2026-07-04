<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import api from '@/services/api';

const activeTab = ref('class'); // 'class' or 'student'

const classes = ref<any[]>([]);
const selectedClassId = ref('');
const selectedStudentClassId = ref('');
const selectedStudentId = ref('');

const classStudents = ref<any[]>([]);
const classReportData = ref<any>(null);
const studentTranscriptData = ref<any>(null);

const loadingClassReport = ref(false);
const loadingTranscript = ref(false);

const loadClasses = async () => {
  try {
    const res = await api.get('/classes');
    classes.value = res.data.filter((c: any) => c.is_active !== false);
  } catch (err) {
    console.error('Failed to load classes', err);
  }
};

const getPhotoUrl = (path: string | null) => {
  if (!path) return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

onMounted(() => {
  loadClasses();
});

// Class report watcher
watch(selectedClassId, async (newVal) => {
  classReportData.value = null;
  if (!newVal) return;
  
  loadingClassReport.value = true;
  try {
    const res = await api.get(`/reports/class/${newVal}`);
    classReportData.value = res.data;
  } catch (err) {
    console.error('Failed to fetch class report', err);
  } finally {
    loadingClassReport.value = false;
  }
});

// Student transcript class watcher
watch(selectedStudentClassId, async (newVal) => {
  selectedStudentId.value = '';
  classStudents.value = [];
  studentTranscriptData.value = null;
  
  if (!newVal) return;
  
  try {
    const res = await api.get(`/students`, {
      params: { class_id: newVal }
    });
    classStudents.value = res.data;
  } catch (err) {
    console.error('Failed to fetch students for class', err);
  }
});

// Student selection watcher
watch(selectedStudentId, async (newVal) => {
  studentTranscriptData.value = null;
  if (!newVal) return;
  
  loadingTranscript.value = true;
  try {
    const res = await api.get(`/reports/student/${newVal}`);
    studentTranscriptData.value = res.data;
  } catch (err) {
    console.error('Failed to fetch student transcript', err);
  } finally {
    loadingTranscript.value = false;
  }
});

const handlePrint = () => {
  window.print();
};
</script>

<template>
  <div>
    <!-- Tab Navigation -->
    <div class="card no-print" style="padding: 0.5rem; margin-bottom: 1.5rem; display: flex; gap: 0.5rem;">
      <button
        class="btn"
        :class="activeTab === 'class' ? 'btn-primary' : 'btn-secondary'"
        style="flex-grow: 1;"
        @click="activeTab = 'class'"
      >
        🏫 Class Performance Report
      </button>
      <button
        class="btn"
        :class="activeTab === 'student' ? 'btn-primary' : 'btn-secondary'"
        style="flex-grow: 1;"
        @click="activeTab = 'student'"
      >
        👨‍🎓 Individual Student Transcript
      </button>
    </div>

    <!-- --------------------------------------- -->
    <!-- CLASS REPORT TAB                        -->
    <!-- --------------------------------------- -->
    <div v-if="activeTab === 'class'">
      <!-- Class Selector -->
      <div class="card no-print" style="margin-bottom: 1.5rem;">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Select Class</label>
          <select v-model="selectedClassId" class="form-control form-select">
            <option value="">-- Choose Class --</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </div>

      <div v-if="loadingClassReport" style="text-align: center; padding: 3rem; font-weight: 600;">
        Generating class report analytics...
      </div>

      <div v-else-if="classReportData">
        <!-- Stats Summary cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon" style="background-color: var(--primary-light); color: var(--primary-color);">👨‍🎓</div>
            <div class="metric-details">
              <span class="metric-title">Total Class Students</span>
              <span class="metric-value">{{ classReportData.statistics.total_students }}</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="background-color: var(--info-light); color: var(--info-color);">⚖️</div>
            <div class="metric-details">
              <span class="metric-title">Class Average</span>
              <span class="metric-value">{{ classReportData.statistics.class_average }}%</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="background-color: var(--success-light); color: var(--success-color);">✔️</div>
            <div class="metric-details">
              <span class="metric-title">Passed (>= 50%)</span>
              <span class="metric-value">{{ classReportData.statistics.pass_count }}</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="background-color: var(--danger-light); color: var(--danger-color);">❌</div>
            <div class="metric-details">
              <span class="metric-title">Failed (&lt; 50%)</span>
              <span class="metric-value">{{ classReportData.statistics.fail_count }}</span>
            </div>
          </div>
        </div>

        <!-- Rankings Table -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Class Student Rankings</h3>
            <button class="btn btn-secondary btn-sm no-print" @click="handlePrint">
              🖨️ Print Report
            </button>
          </div>

          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 80px;">Rank</th>
                  <th>Student Name</th>
                  <th>Gender</th>
                  <th style="text-align: center;">Subjects Graded</th>
                  <th style="text-align: center;">Average Score</th>
                  <th style="text-align: center;">Overall Grade</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in classReportData.rankings" :key="row.student_id">
                  <td style="font-weight: 800; color: var(--primary-color);">#{{ row.rank }}</td>
                  <td style="font-weight: 600;">{{ row.student_name }}</td>
                  <td>{{ row.gender || 'N/A' }}</td>
                  <td style="text-align: center;">{{ row.subjects_graded }}</td>
                  <td style="text-align: center; font-weight: 700;">{{ row.average_score }}%</td>
                  <td style="text-align: center;">
                    <span class="badge" :class="row.average_score >= 50 ? 'badge-success' : 'badge-danger'">
                      {{ row.overall_grade }}
                    </span>
                  </td>
                  <td style="text-align: center;">
                    <span class="badge" :class="row.status === 'Pass' ? 'badge-success' : 'badge-danger'">
                      {{ row.status }}
                    </span>
                  </td>
                </tr>
                <tr v-if="classReportData.rankings.length === 0">
                  <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No students currently graded.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-else class="card" style="text-align: center; padding: 4rem; color: var(--text-muted);">
        <span>🏫</span>
        <p style="margin-top: 1rem; font-weight: 600;">Select a class from the dropdown above to view the performance rankings.</p>
      </div>
    </div>

    <!-- --------------------------------------- -->
    <!-- STUDENT REPORT TAB                      -->
    <!-- --------------------------------------- -->
    <div v-if="activeTab === 'student'">
      <!-- Student selectors -->
      <div class="card no-print" style="margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
          <div class="form-group" style="margin-bottom: 0; flex-grow: 1; min-width: 200px;">
            <label class="form-label">Select Class</label>
            <select v-model="selectedStudentClassId" class="form-control form-select">
              <option value="">-- Choose Class --</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0; flex-grow: 1; min-width: 200px;">
            <label class="form-label">Select Student</label>
            <select v-model="selectedStudentId" class="form-control form-select" :disabled="!selectedStudentClassId">
              <option value="">-- Choose Student --</option>
              <option v-for="s in classStudents" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loadingTranscript" style="text-align: center; padding: 3rem; font-weight: 600;">
        Generating report card transcript...
      </div>

      <div v-else-if="studentTranscriptData">
        <!-- Transcript Layout (Optimized for printing too!) -->
        <div class="card" style="padding: 2rem; border: 1px solid var(--border-color); background-color: #fff;">
          
          <!-- Header styling -->
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--primary-color); padding-bottom: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; gap: 1.5rem;">
            <div>
              <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">STUDENT ACADEMIC TRANSCRIPT</h2>
              <p style="color: var(--text-muted); font-size: 0.875rem; font-weight: 600;">Student Score Management System</p>
            </div>
            <div style="text-align: right;" class="no-print">
              <button class="btn btn-primary" @click="handlePrint">
                🖨️ Print Report Card
              </button>
            </div>
          </div>

          <!-- Student Meta Data -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; background-color: #f8fafc; padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="display: flex; gap: 1rem; align-items: center; grid-column: span 2;">
              <img
                :src="getPhotoUrl(studentTranscriptData.student.photo)"
                alt="Photo"
                style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color);"
              />
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">{{ studentTranscriptData.student.name }}</span>
                <span style="color: var(--text-muted); font-size: 0.875rem; font-weight: 600;">Student ID: {{ studentTranscriptData.student.id }}</span>
              </div>
            </div>
            <div>
              <p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Class Name</p>
              <p style="font-weight: 700; color: var(--text-main); font-size: 1.1rem;">{{ studentTranscriptData.student.class_name }}</p>
            </div>
            <div>
              <p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Class Advisor</p>
              <p style="font-weight: 700; color: var(--text-main); font-size: 1.1rem;">{{ studentTranscriptData.student.teacher_name }}</p>
            </div>
            <div>
              <p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Gender</p>
              <p style="font-weight: 700; color: var(--text-main); font-size: 1.1rem;">{{ studentTranscriptData.student.gender || 'N/A' }}</p>
            </div>
          </div>

          <!-- Subject Scores Table -->
          <div class="table-container" style="border-radius: var(--radius-sm); margin-bottom: 2rem;">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 25%;">Subject</th>
                  <th style="text-align: left;">Scoring Component Breakdown</th>
                  <th style="text-align: center; width: 15%;">Total Score</th>
                  <th style="text-align: center; width: 12%;">Grade</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in studentTranscriptData.scores" :key="s.subject_name">
                  <td style="font-weight: 700; color: var(--primary-color); vertical-align: middle;">
                    {{ s.subject_name }}
                  </td>
                  <td style="text-align: left; vertical-align: middle; padding: 0.75rem 1rem;">
                    <div v-if="s.components_breakdown && s.components_breakdown.length > 0" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                      <div
                        v-for="(comp, idx) in s.components_breakdown"
                        :key="idx"
                        style="background: #f1f5f9; border: 1px solid var(--border-color); padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.78rem;"
                      >
                        <span style="font-weight: 600; color: var(--text-muted);">{{ comp.label }}:</span>
                        <strong style="color: var(--text-main); margin-left: 0.25rem;">{{ comp.score }}</strong>
                        <span style="font-size: 0.7rem; color: var(--text-muted); margin-left: 0.15rem;">({{ comp.weight }}%)</span>
                      </div>
                    </div>
                    <span v-else style="color: var(--text-muted); font-size: 0.85rem;">No component details</span>
                  </td>
                  <td style="text-align: center; font-weight: 800; font-size: 1.05rem; color: var(--primary-color); vertical-align: middle;">
                    {{ s.total }}%
                  </td>
                  <td style="text-align: center; vertical-align: middle;">
                    <span class="badge" :class="s.total >= 50 ? 'badge-success' : 'badge-danger'" style="font-size: 0.85rem; padding: 0.3rem 0.6rem;">
                      {{ s.grade }}
                    </span>
                  </td>
                </tr>
                <tr v-if="studentTranscriptData.scores.length === 0">
                  <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No subject scores graded yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Summary and Rank -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; border-top: 2px solid var(--border-color); padding-top: 1.5rem;">
            <div style="background-color: #f8fafc; padding: 1.25rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); text-align: center;">
              <p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Average score</p>
              <p style="font-size: 1.5rem; font-weight: 800; color: var(--primary-color); margin-top: 0.25rem;">{{ studentTranscriptData.summary.average_score }}%</p>
            </div>
            <div style="background-color: #f8fafc; padding: 1.25rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); text-align: center;">
              <p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Overall Grade</p>
              <p style="font-size: 1.5rem; font-weight: 800; margin-top: 0.25rem;" :style="{ color: studentTranscriptData.summary.status === 'Pass' ? 'var(--success-color)' : 'var(--danger-color)' }">
                {{ studentTranscriptData.summary.overall_grade }}
              </p>
            </div>
            <div style="background-color: #f8fafc; padding: 1.25rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); text-align: center;">
              <p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Class Rank</p>
              <p style="font-size: 1.5rem; font-weight: 800; color: var(--warning-color); margin-top: 0.25rem;">
                {{ studentTranscriptData.summary.class_rank }} <span style="font-size: 0.875rem; font-weight: 500; color: var(--text-muted);">of {{ studentTranscriptData.summary.class_size }}</span>
              </p>
            </div>
            <div style="background-color: #f8fafc; padding: 1.25rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); text-align: center;">
              <p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Academic Status</p>
              <p style="font-size: 1.5rem; font-weight: 800; margin-top: 0.25rem;" :style="{ color: studentTranscriptData.summary.status === 'Pass' ? 'var(--success-color)' : 'var(--danger-color)' }">
                {{ studentTranscriptData.summary.status }}
              </p>
            </div>
          </div>

        </div>
      </div>

      <div v-else class="card no-print" style="text-align: center; padding: 4rem; color: var(--text-muted);">
        <span>👨‍🎓</span>
        <p style="margin-top: 1rem; font-weight: 600;">Select a class and a student from the dropdowns above to generate their report card.</p>
      </div>
    </div>
  </div>
</template>
