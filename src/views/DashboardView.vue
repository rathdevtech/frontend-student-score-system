<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';

const uiStore = useUiStore();
const authStore = useAuthStore();

const loading = ref(true);
const dashboardData = ref<any>(null);
const showWelcome = ref(localStorage.getItem('dashboard_welcome_hidden') !== 'true');

const hideWelcome = () => {
  showWelcome.value = false;
  localStorage.setItem('dashboard_welcome_hidden', 'true');
};

const restoreWelcome = () => {
  showWelcome.value = true;
  localStorage.removeItem('dashboard_welcome_hidden');
};

const fetchDashboard = async () => {
  try {
    const response = await api.get('/dashboard');
    dashboardData.value = response.data;
  } catch (err) {
    console.error('Failed to load dashboard statistics', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDashboard();
});
</script>

<template>
  <div v-if="loading" style="text-align: center; padding: 3rem; font-weight: 600;">
    {{ uiStore.t('dashboardLoading') }}
  </div>
  <div v-else-if="dashboardData">
    <!-- STUDENT DASHBOARD -->
    <div v-if="dashboardData.role === 'student'">
      <!-- Greeting Card -->
      <div v-if="showWelcome" class="card" style="background-color: var(--primary-light); border-left: 5px solid var(--primary-color); padding: 1.5rem; margin-bottom: 1.5rem; position: relative;">
        <button
          @click="hideWelcome"
          :title="uiStore.t('close')"
          style="position: absolute; top: 0.75rem; right: 0.75rem; background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--text-muted); line-height: 1; padding: 0.2rem 0.4rem; border-radius: 4px; transition: background 0.15s;"
          onmouseover="this.style.background='rgba(0,0,0,0.06)'" onmouseout="this.style.background='none'"
        >✕</button>
        <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--primary-color); margin-bottom: 0.25rem;">
          {{ uiStore.t('welcomeStudent') }}
        </h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; font-weight: 500;">
          {{ uiStore.t('welcomeStudentDesc') }}
        </p>
      </div>
      <div v-else style="margin-bottom: 1rem; text-align: right;">
        <button @click="restoreWelcome" style="background: none; border: none; color: var(--text-muted); font-size: 0.78rem; font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0;">{{ uiStore.t('showWelcomeBanner') }}</button>
      </div>

      <!-- Student Stats Grid -->
      <div class="metrics-grid" style="margin-bottom: 1.5rem;">
        <div class="metric-card">
          <div class="metric-icon" style="background-color: var(--primary-light); color: var(--primary-color);">⚖️</div>
          <div class="metric-details">
            <span class="metric-title">{{ uiStore.t('averageScoreLabel') || 'Average Score' }}</span>
            <span class="metric-value">{{ dashboardData.summary.average_score }}%</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background-color: rgba(2, 132, 199, 0.08); color: #0284c7;">🎖️</div>
          <div class="metric-details">
            <span class="metric-title">{{ uiStore.t('overallGradeLabel') || 'Overall Grade' }}</span>
            <span class="metric-value">{{ dashboardData.summary.overall_grade }}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background-color: var(--warning-light); color: var(--warning-color);">🏆</div>
          <div class="metric-details">
            <span class="metric-title">{{ uiStore.t('classRankLabel') || 'Class Rank' }}</span>
            <span class="metric-value">#{{ dashboardData.summary.class_rank }} / {{ dashboardData.summary.class_size }}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background-color: var(--success-light); color: var(--success-color);">📈</div>
          <div class="metric-details">
            <span class="metric-title">{{ uiStore.t('passingSubjectsCount') || 'Passing Subjects' }}</span>
            <span class="metric-value">{{ dashboardData.summary.passing_subjects }} / {{ dashboardData.summary.total_subjects }}</span>
          </div>
        </div>
      </div>

      <!-- Subject Performance List -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ uiStore.t('personalProgress') || 'Personal Subject Performance' }}</h3>
        </div>
        <div v-if="dashboardData.scores.length === 0" style="color: var(--text-muted); text-align: center; padding: 2rem; font-size: 0.9rem;">
          No subject scores graded yet.
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div v-for="s in dashboardData.scores" :key="s.subject_id" style="display: flex; flex-direction: column; gap: 0.35rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 700; align-items: center;">
              <span style="color: var(--text-main);">{{ s.subject_name }}</span>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="badge" :class="s.total >= 50 ? 'badge-success' : 'badge-danger'" style="font-size: 0.82rem; padding: 0.25rem 0.6rem;">
                  Grade: {{ s.grade }}
                </span>
                <span :style="{ color: s.total >= 50 ? 'var(--success-color)' : 'var(--danger-color)' }" style="font-weight: 800;">
                  {{ s.total }}%
                </span>
              </div>
            </div>
            <div style="width: 100%; height: 10px; background-color: var(--sidebar-border); border-radius: 5px; overflow: hidden;">
              <div
                :style="{ width: s.total + '%' }"
                :class="s.total >= 50 ? 'bg-success-bar' : 'bg-danger-bar'"
                style="height: 100%; border-radius: 5px; transition: width 0.8s ease;"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- GENERAL ADMIN/TEACHER DASHBOARD -->
    <div v-else>
      <!-- Greeting Card -->
      <div v-if="showWelcome" class="card" style="background-color: var(--primary-light); border-left: 5px solid var(--primary-color); padding: 1.5rem; margin-bottom: 1.5rem; position: relative;">
        <button
          @click="hideWelcome"
          :title="uiStore.t('close')"
          style="position: absolute; top: 0.75rem; right: 0.75rem; background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--text-muted); line-height: 1; padding: 0.2rem 0.4rem; border-radius: 4px; transition: background 0.15s;"
          onmouseover="this.style.background='rgba(0,0,0,0.06)'" onmouseout="this.style.background='none'"
        >✕</button>
        <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--primary-color); margin-bottom: 0.25rem;">
          {{ dashboardData.role === 'admin' ? uiStore.t('welcomeAdmin') : uiStore.t('welcomeTeacher') }}
        </h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; font-weight: 500;">
          {{ uiStore.t('welcomeDesc') }}
        </p>
      </div>
      <div v-else style="margin-bottom: 1rem; text-align: right;">
        <button @click="restoreWelcome" style="background: none; border: none; color: var(--text-muted); font-size: 0.78rem; font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0;">{{ uiStore.t('showWelcomeBanner') }}</button>
      </div>

      <!-- Stats Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon" style="background-color: var(--primary-light); color: var(--primary-color);">👨‍🎓</div>
          <div class="metric-details">
            <span class="metric-title">{{ uiStore.t('totalStudents') }}</span>
            <span class="metric-value">{{ dashboardData.summary.total_students }}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background-color: rgba(2, 132, 199, 0.08); color: #0284c7;">🏫</div>
          <div class="metric-details">
            <span class="metric-title">{{ uiStore.t('totalClasses') }}</span>
            <span class="metric-value">{{ dashboardData.summary.total_classes }}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background-color: var(--warning-light); color: var(--warning-color);">📚</div>
          <div class="metric-details">
            <span class="metric-title">{{ uiStore.t('totalSubjects') }}</span>
            <span class="metric-value">{{ dashboardData.summary.total_subjects }}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background-color: var(--success-light); color: var(--success-color);">📈</div>
          <div class="metric-details">
            <span class="metric-title">{{ uiStore.t('passingRate') }}</span>
            <span class="metric-value">{{ dashboardData.summary.pass_percentage }}%</span>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.25rem;">
        <!-- Class Performances -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">{{ uiStore.t('classPerformance') }}</h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div v-for="c in dashboardData.class_performance" :key="c.class_id" style="display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700;">
                <span>{{ c.class_name }} ({{ c.student_count }} {{ uiStore.t('students') }})</span>
                <span :style="{ color: c.average_score >= 50 ? 'var(--success-color)' : 'var(--danger-color)' }">
                  {{ c.average_score }}%
                </span>
              </div>
              <div style="width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
                <div
                  :style="{ width: c.average_score + '%' }"
                  style="height: 100%; background-color: var(--primary-color); border-radius: 4px; transition: width 0.8s ease;"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Performing Students -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">{{ uiStore.t('topPerformers') }}</h3>
          </div>
          <div v-if="dashboardData.top_students.length === 0" style="color: var(--text-muted); text-align: center; padding: 2rem; font-size: 0.9rem;">
            {{ uiStore.t('noScoresYet') }}
          </div>
          <div v-else style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div v-for="(s, index) in dashboardData.top_students" :key="s.student_id" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-weight: 800; font-size: 0.95rem; color: var(--primary-color); width: 24px;">#{{ Number(index) + 1 }}</span>
                <div style="display: flex; flex-direction: column;">
                  <span style="font-weight: 600; font-size: 0.9rem;">{{ s.student_name }}</span>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">{{ s.class_name }}</span>
                </div>
              </div>
              <span class="badge badge-success">{{ s.average_score }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-success-bar {
  background-color: var(--success-color);
}
.bg-danger-bar {
  background-color: var(--danger-color);
}
</style>
