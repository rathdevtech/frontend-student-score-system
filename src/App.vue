<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const handleLogout = () => {
  authStore.logout();
};
</script>

<template>
  <!-- Full App Layout -->
  <div v-if="authStore.isAuthenticated" class="app-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo-section">
        <span class="logo-icon">PN</span>
        <span>Score Roster</span>
      </div>

      <nav class="menu-section">
        <RouterLink to="/" class="menu-link">
          <span>📊</span> Dashboard
        </RouterLink>
        <RouterLink v-if="authStore.isAdmin" to="/users" class="menu-link">
          <span>👥</span> Users
        </RouterLink>
        <RouterLink to="/classes" class="menu-link">
          <span>🏫</span> Classes
        </RouterLink>
        <RouterLink to="/subjects" class="menu-link">
          <span>📚</span> Subjects
        </RouterLink>
        <RouterLink to="/students" class="menu-link">
          <span>👨‍🎓</span> Students
        </RouterLink>
        <RouterLink to="/scores" class="menu-link">
          <span>📝</span> Gradebook
        </RouterLink>
        <RouterLink to="/reports" class="menu-link">
          <span>📄</span> Reports
        </RouterLink>

      </nav>
    </aside>

    <!-- Main Wrapper -->
    <div class="main-wrapper">
      <header class="top-navbar">
        <!-- Left: Logo Area -->
        <div class="pn-logo-area">
          <span style="font-size: 1.75rem;">🎓</span>
          <div>
            <div class="pn-logo-title">Passerelles Numériques</div>
            <div class="pn-logo-subtitle">Cambodia Academic Board</div>
          </div>
        </div>

        <!-- Right: Profile Info & Logout Button -->
        <div style="display: flex; align-items: center; gap: 0.75rem; border-left: 1px solid var(--border-color); padding-left: 1rem; height: 36px;">
          <img
            :src="authStore.user?.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'"
            alt="Avatar"
            class="user-avatar"
            style="width: 32px; height: 32px;"
          />
          <div class="user-info">
            <span class="user-name" style="font-size: 0.8rem; font-weight: 700;">{{ authStore.user?.name }}</span>
            <span class="user-role" style="font-size: 0.7rem; font-weight: 600;">{{ authStore.user?.role }}</span>
          </div>
          <button @click="handleLogout" class="btn" style="padding: 0.35rem 0.6rem; font-size: 0.8rem; border-color: #fee2e2; background-color: #fef2f2; color: #ef4444; font-weight: 700; cursor: pointer;" title="Logout">
            🚪 Exit
          </button>
        </div>
      </header>

      <!-- Main Body -->
      <main class="content-body" style="padding: 1.5rem;">
        <RouterView />
      </main>

      <!-- School Footer -->
      <footer class="school-footer">
        <div>
          © 2026 <strong>Passerelles Numériques Cambodia</strong>. All rights reserved.
        </div>
        <div class="school-footer-contact">
          BP 511, St. 371, PhumTropeangChhuk, Phnom Penh | info@passerellesnumeriques.org | +855 (023) 99 55 00
        </div>
      </footer>
    </div>
  </div>

  <!-- Guest Screens (Login etc.) -->
  <div v-else>
    <RouterView />
  </div>
</template>
