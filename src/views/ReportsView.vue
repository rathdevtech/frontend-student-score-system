<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';

const uiStore = useUiStore();
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
  <div class="reports-container">
    <!-- Compact Toolbar Card -->
    <div class="card toolbar-card no-print">
      <!-- Row 1: Title + Tabs -->
      <div class="toolbar-top-row">
        <h2 class="page-title">{{ uiStore.t('reports') }}</h2>
        <div class="tabs-pills">
          <button class="tab-pill" :class="{ active: activeTab === 'class' }" @click="activeTab = 'class'">
            <span class="pill-icon">🏫</span> {{ uiStore.t('classRankingsTab') }}
          </button>
          <button class="tab-pill" :class="{ active: activeTab === 'student' }" @click="activeTab = 'student'">
            <span class="pill-icon">🎓</span> {{ uiStore.t('studentTranscriptsTab') }}
          </button>
        </div>
      </div>
      <!-- Row 2: Selectors -->
      <div class="toolbar-bottom-row">
        <div v-if="activeTab === 'class'" class="toolbar-selectors">
          <div class="select-input-container">
            <span class="select-icon">🏫</span>
            <select v-model="selectedClassId" class="form-control premium-select">
              <option value="">-- Choose Class --</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <div v-if="activeTab === 'student'" class="toolbar-selectors">
          <div class="select-input-container">
            <span class="select-icon">🏫</span>
            <select v-model="selectedStudentClassId" class="form-control premium-select">
              <option value="">-- Choose Class --</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="select-input-container">
            <span class="select-icon">👤</span>
            <select v-model="selectedStudentId" class="form-control premium-select" :disabled="!selectedStudentClassId">
              <option value="">{{ uiStore.t('selectStudentPlaceholder') }}</option>
              <option v-for="s in classStudents" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================= -->
    <!-- CLASS REPORT TAB                        -->
    <!-- ======================================= -->
    <div v-if="activeTab === 'class'" class="tab-content-wrapper">
      <!-- Loading State -->
      <div v-if="loadingClassReport" class="loading-state">
        <div class="spinner"></div>
        <p>Analyzing scores & compiling class rankings...</p>
      </div>

      <!-- Main Class Report Content -->
      <div v-else-if="classReportData" class="report-content-body">
        <!-- Stats Summary grid -->
        <div class="metrics-grid">
          <div class="metric-card shadow-card hover-glow">
            <div class="metric-icon bg-primary">👥</div>
            <div class="metric-details">
              <span class="metric-title">{{ uiStore.t('classRosterMetric') }}</span>
              <span class="metric-value">{{ classReportData.statistics.total_students }} students</span>
            </div>
          </div>
          <div class="metric-card shadow-card hover-glow">
            <div class="metric-icon bg-info">⚖️</div>
            <div class="metric-details">
              <span class="metric-title">{{ uiStore.t('classAverageMetric') }}</span>
              <span class="metric-value">{{ classReportData.statistics.class_average }}%</span>
            </div>
          </div>
          <div class="metric-card shadow-card hover-glow">
            <div class="metric-icon bg-success">✔️</div>
            <div class="metric-details">
              <span class="metric-title">{{ uiStore.t('passedMetric') }}</span>
              <span class="metric-value text-success">{{ classReportData.statistics.pass_count }} passed</span>
            </div>
          </div>
          <div class="metric-card shadow-card hover-glow">
            <div class="metric-icon bg-danger">❌</div>
            <div class="metric-details">
              <span class="metric-title">{{ uiStore.t('failedMetric') }}</span>
              <span class="metric-value text-danger">{{ classReportData.statistics.fail_count }} failed</span>
            </div>
          </div>
        </div>

        <!-- Rankings Table Card -->
        <div class="card roster-card">
          <div class="card-header roster-header">
            <div>
              <h3 class="card-title">{{ uiStore.t('classRankingsTitle') }}</h3>
              <p class="card-subtitle">{{ uiStore.t('classRankingsSubtitle') }}</p>
            </div>
            <button class="btn btn-secondary btn-sm no-print print-btn" @click="handlePrint">
              🖨️ {{ uiStore.t('printRankings') }}
            </button>
          </div>

          <div class="table-container">
            <table class="table roster-table">
              <thead>
                <tr>
                  <th style="width: 100px; text-align: center;">{{ uiStore.t('rankHeader') }}</th>
                  <th>{{ uiStore.t('studentNameHeader') }}</th>
                  <th>{{ uiStore.t('studentNameKhHeader') || 'Khmer Name' }}</th>
                  <th>{{ uiStore.t('genderHeader') }}</th>
                  <th style="text-align: center;">{{ uiStore.t('subjectsGradedHeader') }}</th>
                  <th style="text-align: center;">{{ uiStore.t('averageScoreHeader') }}</th>
                  <th style="text-align: center;">{{ uiStore.t('overallGradeHeader') }}</th>
                  <th style="text-align: center;">{{ uiStore.t('statusHeader') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in classReportData.rankings" :key="row.student_id" class="ranking-row">
                  <td style="text-align: center;">
                    <span v-if="row.rank === 1" class="rank-badge rank-1" title="1st Place">🥇 1st</span>
                    <span v-else-if="row.rank === 2" class="rank-badge rank-2" title="2nd Place">🥈 2nd</span>
                    <span v-else-if="row.rank === 3" class="rank-badge rank-3" title="3rd Place">🥉 3rd</span>
                    <span v-else class="rank-badge rank-general">#{{ row.rank }}</span>
                  </td>
                  <td style="font-weight: 700; color: var(--text-main);">{{ row.student_name }}</td>
                  <td class="kh-text" style="color: var(--text-muted);">{{ row.student_name_kh || '—' }}</td>
                  <td>{{ row.gender || 'N/A' }}</td>
                  <td style="text-align: center;">{{ row.subjects_graded }}</td>
                  <td style="text-align: center; font-weight: 800; color: var(--primary-color);">
                    {{ row.average_score }}%
                  </td>
                  <td style="text-align: center;">
                    <span class="badge" :class="row.average_score >= 50 ? 'badge-success' : 'badge-danger'">
                      {{ row.overall_grade }}
                    </span>
                  </td>
                  <td style="text-align: center;">
                    <span class="badge status-pill" :class="row.status === 'Pass' ? 'badge-success' : 'badge-danger'">
                      {{ row.status }}
                    </span>
                  </td>
                </tr>
                <tr v-if="classReportData.rankings.length === 0">
                  <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No students currently graded.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="card empty-report-state no-print">
        <div class="empty-state-icon">🏫</div>
        <h3>{{ uiStore.t('selectClassToBeginTitle') }}</h3>
        <p>{{ uiStore.t('selectClassToBeginText') }}</p>
      </div>
    </div>

    <!-- ======================================= -->
    <!-- STUDENT REPORT TAB                      -->
    <!-- ======================================= -->
    <div v-if="activeTab === 'student'" class="tab-content-wrapper">

      <!-- Loading State -->
      <div v-if="loadingTranscript" class="loading-state">
        <div class="spinner"></div>
        <p>Compiling student academic transcript...</p>
      </div>

      <!-- Main Transcript Content -->
      <div v-else-if="studentTranscriptData" class="transcript-page-wrapper">
        <div class="transcript-card card">
          <!-- Logo & Stamp Watermark -->
          <div class="watermark-pn">PNC</div>

          <!-- Transcript Header -->
          <div class="transcript-header-section">
            <div class="header-left-title">
              <div class="branding-group">
                <div style="width: 44px; height: 44px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center;">
                  <img src="/pn_logo.png" alt="PN Icon" style="height: 44px; width: auto; display: block;" />
                </div>
                <div style="display: flex; flex-direction: column; line-height: 1.15;">
                  <span style="font-size: 0.85rem; font-weight: 800; color: #1e293b; letter-spacing: 0.05em; font-family: var(--font-family);">PASSERELLES</span>
                  <span style="font-size: 0.7rem; font-weight: 700; color: var(--primary-color); letter-spacing: 0.08em; font-family: var(--font-family);">NUMÉRIQUES</span>
                </div>
              </div>
              <h2 class="academic-report-title">{{ uiStore.t('studentTranscriptTitle') }}</h2>
            </div>
            
            <button class="btn btn-primary no-print print-btn" @click="handlePrint">
              🖨️ {{ uiStore.t('printTranscript') }}
            </button>
          </div>

          <!-- Student Profile details Info Card -->
          <div class="student-profile-info-grid">
            <div class="student-meta-profile">
              <img
                :src="getPhotoUrl(studentTranscriptData.student.photo)"
                alt="Student Photo"
                class="student-transcript-avatar"
              />
              <div class="student-details-txt">
                <h3 class="student-title-name">{{ studentTranscriptData.student.name }}</h3>
                <h4 v-if="studentTranscriptData.student.name_kh" class="student-title-name-kh kh-text" style="font-size: 1.05rem; font-weight: 700; color: var(--text-muted); margin-top: 0.15rem; margin-bottom: 0.25rem;">{{ studentTranscriptData.student.name_kh }}</h4>
                <span class="student-id-label">{{ uiStore.t('idNumberLabel') }}: PNC-{{ studentTranscriptData.student.id }}</span>
              </div>
            </div>
            
            <div class="info-block">
              <span class="info-block-label">{{ uiStore.t('assignedClassLabel') }}</span>
              <span class="info-block-val">{{ studentTranscriptData.student.class_name }}</span>
            </div>
            <div class="info-block">
              <span class="info-block-label">{{ uiStore.t('classAdvisorLabel') }}</span>
              <span class="info-block-val">{{ studentTranscriptData.student.teacher_name }}</span>
            </div>
            <div class="info-block">
              <span class="info-block-label">{{ uiStore.t('gender') }}</span>
              <span class="info-block-val">{{ studentTranscriptData.student.gender || 'N/A' }}</span>
            </div>
          </div>

          <!-- Subject Scores Table -->
          <div class="table-container transcript-table-box">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 25%;">{{ uiStore.t('subjectHeader') }}</th>
                  <th style="text-align: left;">{{ uiStore.t('scoringBreakdownHeader') }}</th>
                  <th style="text-align: center; width: 15%;">{{ uiStore.t('totalScoreHeader') }}</th>
                  <th style="text-align: center; width: 12%;">{{ uiStore.t('gradeHeader') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in studentTranscriptData.scores" :key="s.subject_name" class="transcript-row">
                  <td class="transcript-subject-cell">
                    {{ s.subject_name }}
                  </td>
                  <td style="text-align: left; vertical-align: middle;">
                    <div v-if="s.components_breakdown && s.components_breakdown.length > 0" class="component-breakdown-tags">
                      <div
                        v-for="(comp, idx) in s.components_breakdown"
                        :key="idx"
                        class="comp-badge-pill"
                      >
                        <span class="comp-badge-label">{{ comp.label }}:</span>
                        <strong class="comp-badge-val">{{ comp.score }}</strong>
                        <span class="comp-badge-weight">({{ comp.weight }}%)</span>
                      </div>
                    </div>
                    <span v-else class="empty-components-label">{{ uiStore.t('noComponentDetails') }}</span>
                  </td>
                  <td class="transcript-total-score-cell">
                    {{ s.total }}%
                  </td>
                  <td style="text-align: center; vertical-align: middle;">
                    <span class="badge" :class="s.total >= 50 ? 'badge-success' : 'badge-danger'" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">
                      {{ s.grade }}
                    </span>
                  </td>
                </tr>
                <tr v-if="studentTranscriptData.scores.length === 0">
                  <td colspan="4" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    {{ uiStore.t('noStudentsGraded') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Summary and Rank Row -->
          <div class="transcript-summary-row">
            <div class="summary-score-card">
              <span class="summary-card-label">{{ uiStore.t('averageScoreLabel') }}</span>
              <span class="summary-card-val primary-color-text">{{ studentTranscriptData.summary.average_score }}%</span>
            </div>
            <div class="summary-score-card">
              <span class="summary-card-label">{{ uiStore.t('overallGradeLabel') }}</span>
              <span class="summary-card-val" :class="studentTranscriptData.summary.status === 'Pass' ? 'success-color-text' : 'danger-color-text'">
                {{ studentTranscriptData.summary.overall_grade }}
              </span>
            </div>
            <div class="summary-score-card">
              <span class="summary-card-label">{{ uiStore.t('classRankLabel') }}</span>
              <span class="summary-card-val warning-color-text">
                {{ studentTranscriptData.summary.class_rank }}
                <span class="class-rank-denominator">/ {{ studentTranscriptData.summary.class_size }}</span>
              </span>
            </div>
            <div class="summary-score-card">
              <span class="summary-card-label">{{ uiStore.t('academicStatusLabel') }}</span>
              <span class="summary-card-val" :class="studentTranscriptData.summary.status === 'Pass' ? 'success-color-text' : 'danger-color-text'">
                {{ studentTranscriptData.summary.status }}
              </span>
            </div>
          </div>

          <!-- Signature Footer Section -->
          <div class="transcript-signature-footer">
            <div class="signature-block">
              <p class="signature-date">Phnom Penh, {{ new Date().toLocaleDateString('en-GB') }}</p>
              <p class="signature-role">{{ uiStore.t('academicSupervisorLabel') }}</p>
              <div class="signature-line"></div>
            </div>
            <div class="signature-block">
              <p class="signature-date">&nbsp;</p>
              <p class="signature-role">{{ uiStore.t('signatureAdvisorLabel') }}</p>
              <div class="signature-line"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="card empty-report-state no-print">
        <div class="empty-state-icon">👨‍🎓</div>
        <h3>{{ uiStore.t('selectClassAndStudentTitle') }}</h3>
        <p>{{ uiStore.t('selectClassAndStudentText') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reports-container {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Compact Toolbar Card */
.toolbar-card {
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

/* Row 1: Title + Tab pills */
.toolbar-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  font-family: var(--font-family);
  white-space: nowrap;
}

/* Row 2: Selectors */
.toolbar-bottom-row {
  border-top: 1px solid var(--border-color);
  padding-top: 0.65rem;
}

.toolbar-selectors {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.toolbar-selectors .select-input-container {
  flex: 1;
  min-width: 180px;
  max-width: 320px;
}

/* Tab Pills Styling */
.tabs-pills {
  display: flex;
  gap: 0.5rem;
  background-color: var(--primary-light);
  padding: 0.35rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.tab-pill {
  border: none;
  background: transparent;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.tab-pill.active {
  background-color: #ffffff;
  color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.tab-pill:hover:not(.active) {
  color: var(--primary-color);
}

.pill-icon {
  font-size: 1.05rem;
}

/* Selector Card */
.selector-card {
  padding: 1.25rem 1.5rem;
  border-radius: var(--radius-md);
}

.select-wrapper-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0;
}

.select-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
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

.selectors-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 576px) {
  .selectors-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--primary-light);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  font-weight: 600;
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Metrics summary */
.metrics-grid {
  margin-bottom: 1.5rem;
}

.shadow-card {
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
}

.hover-glow:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
}

.bg-primary {
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.bg-info {
  background-color: var(--info-light);
  color: var(--info-color);
}

.bg-success {
  background-color: var(--success-light);
  color: var(--success-color);
}

.bg-danger {
  background-color: var(--danger-light);
  color: var(--danger-color);
}

/* Roster Card */
.roster-card {
  padding: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.roster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding: 1.25rem 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.print-btn {
  height: 36px;
  padding: 0 1rem;
  font-weight: 700;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

/* Rankings & Table elements */
.ranking-row {
  transition: background-color 0.15s ease;
}

.ranking-row:hover {
  background-color: var(--primary-light) !important;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 800;
}

.rank-badge.rank-1 {
  background-color: #fef3c7;
  color: #d97706;
  border: 1px solid #fde68a;
}

.rank-badge.rank-2 {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.rank-badge.rank-3 {
  background-color: #ffedd5;
  color: #ea580c;
  border: 1px solid #fed7aa;
}

.rank-badge.rank-general {
  background-color: #f8fafc;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.status-pill {
  font-size: 0.72rem;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-weight: 700;
}

/* Empty State */
.empty-report-state {
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

.empty-report-state h3 {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 0.35rem 0;
}

.empty-report-state p {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
  max-width: 320px;
  line-height: 1.5;
}

/* ======================================= */
/* ACADEMIC TRANSCRIPT LAYOUT              */
/* ======================================= */
.transcript-card {
  padding: 2.5rem !important;
  border: 1px solid var(--border-color);
  background-color: #ffffff;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

/* Watermark PN styling */
.watermark-pn {
  position: absolute;
  bottom: 10%;
  right: 5%;
  font-size: 14rem;
  font-weight: 950;
  color: rgba(99, 102, 241, 0.02);
  pointer-events: none;
  user-select: none;
  font-family: var(--font-family);
  z-index: 1;
}

.transcript-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.header-left-title {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.branding-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.branding-logo {
  height: 48px;
  width: auto;
}

.brand-school-title {
  font-size: 0.88rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  letter-spacing: 0.05em;
  font-family: var(--font-family);
}

.brand-sub-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  margin: 0.1rem 0 0 0;
  letter-spacing: 0.05em;
}

.academic-report-title {
  font-size: 1.45rem;
  font-weight: 900;
  color: var(--text-main);
  letter-spacing: -0.02em;
  margin: 0.5rem 0 0 0;
}

/* Student Profile grid in Transcript */
.student-profile-info-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 2rem;
  background-color: #f8fafc;
  padding: 1.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  z-index: 2;
  position: relative;
}

@media (max-width: 768px) {
  .student-profile-info-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .student-profile-info-grid {
    grid-template-columns: 1fr;
  }
}

.student-meta-profile {
  display: flex;
  gap: 1rem;
  align-items: center;
}

@media (max-width: 768px) {
  .student-meta-profile {
    grid-column: span 2;
  }
}
@media (max-width: 480px) {
  .student-meta-profile {
    grid-column: span 1;
  }
}

.student-transcript-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--primary-color);
  background-color: var(--primary-light);
  box-shadow: var(--shadow-sm);
}

.student-details-txt {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.student-title-name {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.student-id-label {
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.info-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.info-block-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.info-block-val {
  font-weight: 800;
  color: var(--text-main);
  font-size: 1rem;
}

/* Subject table transcript spacing */
.transcript-table-box {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin-bottom: 2.25rem;
  z-index: 2;
  position: relative;
}

.transcript-subject-cell {
  font-weight: 800;
  color: var(--text-main);
  vertical-align: middle !important;
  font-size: 0.95rem;
}

.transcript-total-score-cell {
  text-align: center;
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--primary-color);
  vertical-align: middle !important;
}

/* Component pills breakdown */
.component-breakdown-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.comp-badge-pill {
  background: #f8fafc;
  border: 1px solid var(--border-color);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.74rem;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.comp-badge-label {
  font-weight: 700;
  color: var(--text-muted);
}

.comp-badge-val {
  color: var(--text-main);
}

.comp-badge-weight {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.empty-components-label {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-style: italic;
}

/* Summary Cards Row */
.transcript-summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1.75rem;
  margin-bottom: 2.25rem;
  z-index: 2;
  position: relative;
}

@media (max-width: 768px) {
  .transcript-summary-row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .transcript-summary-row {
    grid-template-columns: 1fr;
  }
}

.summary-score-card {
  background-color: #f8fafc;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
}

.summary-card-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-card-val {
  font-size: 1.4rem;
  font-weight: 900;
}

.primary-color-text {
  color: var(--primary-color);
}

.success-color-text {
  color: #10b981;
}

.danger-color-text {
  color: var(--danger-color);
}

.warning-color-text {
  color: var(--warning-color);
}

.class-rank-denominator {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

/* Signatures section */
.transcript-signature-footer {
  display: flex;
  justify-content: space-between;
  gap: 3rem;
  margin-top: 2rem;
  padding: 0 1rem;
  z-index: 2;
  position: relative;
}

.signature-block {
  text-align: center;
  width: 200px;
}

.signature-date {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 3.5rem;
}

.signature-role {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.5rem;
}

.signature-line {
  border-bottom: 1.5px dashed #94a3b8;
  width: 100%;
}

/* PRINT MEDIA SPECIFIC OVERRIDES */
@media print {
  body {
    background-color: #ffffff !important;
    color: #000000 !important;
  }

  .reports-container {
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .transcript-card {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
  }

  .student-profile-info-grid {
    background-color: #ffffff !important;
    border: 1px solid #000000 !important;
    grid-template-columns: repeat(4, 1fr) !important;
  }

  .student-meta-profile {
    grid-column: span 1 !important;
  }

  .summary-score-card {
    background-color: #ffffff !important;
    border: 1px solid #000000 !important;
  }

  .comp-badge-pill {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
  }
}
</style>
