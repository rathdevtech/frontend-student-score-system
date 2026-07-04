<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const getAvatarUrl = (path: string | null | undefined) => {
  if (!path) return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

const handleLogout = () => {
  authStore.logout();
};
</script>

<template>
  <!-- Full App Layout -->
  <div v-if="authStore.isAuthenticated" class="app-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo-section" style="background-color: #ffffff; border-bottom: 1px solid var(--sidebar-border); padding: 0.5rem 0.25rem 1.25rem 0.25rem; display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem;">
        <!-- Cropped Circle Icon from the Logo Image without border-radius clip clipping -->
        <div style="width: 44px; height: 44px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center;">
          <img src="/pn_logo.png" alt="PN Icon" style="height: 44px; width: auto; display: block;" />
        </div>
        <!-- High-quality typography branding -->
        <div style="display: flex; flex-direction: column; line-height: 1.15;">
          <span style="font-size: 0.85rem; font-weight: 800; color: #1e293b; letter-spacing: 0.05em; font-family: var(--font-family);">PASSERELLES</span>
          <span style="font-size: 0.7rem; font-weight: 700; color: var(--primary-color); letter-spacing: 0.08em; font-family: var(--font-family);">NUMÉRIQUES</span>
        </div>
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
      <header class="top-navbar" style="border-bottom: 1px solid var(--sidebar-border); padding: 0.85rem 1.75rem;">
        <!-- Left: Logo Area -->
        <div class="pn-logo-area" style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="background-color: var(--primary-light); color: var(--primary-color); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700;">
            📊
          </div>
          <span style="font-size: 1.15rem; font-weight: 800; color: #0f172a; letter-spacing: -0.015em; font-family: var(--font-family);">
            Student Score Management System
          </span>
        </div>

        <!-- Right: Profile Info & Logout Button -->
        <div style="display: flex; align-items: center; gap: 0.75rem; border-left: 1px solid var(--border-color); padding-left: 1rem; height: 36px;">
          <img
            :src="getAvatarUrl(authStore.user?.avatar)"
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
