<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import type { Language } from '@/stores/ui';

const authStore = useAuthStore();
const uiStore = useUiStore();

const langOpen = ref(false);

const languages: { code: Language; flagImg: string; label: string; sub: string }[] = [
  { code: 'en', flagImg: 'https://flagcdn.com/w40/us.png', label: 'English', sub: 'English' },
  { code: 'km', flagImg: 'https://flagcdn.com/w40/kh.png', label: 'ខ្មែរ',   sub: 'Khmer'   },
];

const currentLang = () => languages.find(l => l.code === uiStore.language)!;

function selectLang(code: Language) {
  uiStore.setLanguage(code);
  langOpen.value = false;
}

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
      <div class="logo-section" style="background-color: var(--card-bg); border-bottom: 1px solid var(--sidebar-border); padding: 0.5rem 0.25rem 1.25rem 0.25rem; display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem;">
        <div style="width: 44px; height: 44px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center;">
          <img src="/pn_logo.png" alt="PN Icon" style="height: 44px; width: auto; display: block;" />
        </div>
        <div style="display: flex; flex-direction: column; line-height: 1.15;">
          <span style="font-size: 0.85rem; font-weight: 800; color: var(--text-main); letter-spacing: 0.05em; font-family: var(--font-family);">PASSERELLES</span>
          <span style="font-size: 0.7rem; font-weight: 700; color: var(--primary-color); letter-spacing: 0.08em; font-family: var(--font-family);">NUMÉRIQUES</span>
        </div>
      </div>

      <nav class="menu-section">
        <RouterLink to="/" class="menu-link">
          <span>📊</span> {{ uiStore.t('dashboard') }}
        </RouterLink>
        <RouterLink v-if="authStore.isAdmin" to="/users" class="menu-link">
          <span>👥</span> {{ uiStore.t('users') }}
        </RouterLink>
        <RouterLink to="/classes" class="menu-link">
          <span>🏫</span> {{ uiStore.t('classes') }}
        </RouterLink>
        <RouterLink to="/subjects" class="menu-link">
          <span>📚</span> {{ uiStore.t('subjects') }}
        </RouterLink>
        <RouterLink to="/students" class="menu-link">
          <span>👨‍🎓</span> {{ uiStore.t('students') }}
        </RouterLink>
        <RouterLink to="/scores" class="menu-link">
          <span>📝</span> {{ uiStore.t('gradebook') }}
        </RouterLink>
        <RouterLink to="/reports" class="menu-link">
          <span>📄</span> {{ uiStore.t('reports') }}
        </RouterLink>
      </nav>
    </aside>

    <!-- Main Wrapper -->
    <div class="main-wrapper">
      <header class="top-navbar">
        <!-- Left: App Title -->
        <div class="navbar-left">
          <div class="navbar-brand-icon">📊</div>
          <span class="navbar-brand-title">{{ uiStore.t('appTitle') }}</span>
        </div>

        <!-- Right: Controls -->
        <div class="navbar-right">

          <!-- Language Dropdown -->
          <div class="lang-dropdown" :class="{ 'lang-dropdown--open': langOpen }">
            <button
              class="lang-trigger"
              @click="langOpen = !langOpen"
              :title="uiStore.t('language')"
            >
              <img :src="currentLang().flagImg" :alt="currentLang().sub" class="lang-flag-img" />
              <span class="lang-code">{{ currentLang().sub }}</span>
              <svg class="lang-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            <!-- Dropdown Panel -->
            <Transition name="lang-drop">
              <div v-if="langOpen" class="lang-panel">
                <div
                  v-for="lang in languages"
                  :key="lang.code"
                  class="lang-option"
                  :class="{ 'lang-option--active': uiStore.language === lang.code }"
                  @click="selectLang(lang.code)"
                >
                  <img :src="lang.flagImg" :alt="lang.sub" class="lang-option__flag-img" />
                  <span class="lang-option__info">
                    <span class="lang-option__name">{{ lang.label }}</span>
                    <span class="lang-option__sub">{{ lang.sub }}</span>
                  </span>
                  <svg v-if="uiStore.language === lang.code" class="lang-option__check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </Transition>

            <!-- Click-outside overlay -->
            <div v-if="langOpen" class="lang-backdrop" @click="langOpen = false"></div>
          </div>

          <!-- Night Mode Toggle -->
          <button
            class="ctrl-icon-btn theme-toggle"
            :class="{ 'theme-toggle--dark': uiStore.isDarkMode }"
            @click="uiStore.toggleDarkMode()"
            :title="uiStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <!-- Sun icon (shown in dark mode) -->
            <svg v-if="uiStore.isDarkMode" class="theme-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <!-- Moon icon (shown in light mode) -->
            <svg v-else class="theme-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>

          <!-- Divider -->
          <div class="navbar-divider"></div>

          <!-- Profile Chip -->
          <RouterLink to="/profile" class="profile-chip">
            <img
              :src="getAvatarUrl(authStore.user?.avatar)"
              alt="Avatar"
              class="profile-chip__avatar"
            />
            <div class="profile-chip__info">
              <span class="profile-chip__name">{{ authStore.user?.name }}</span>
              <span class="profile-chip__role">{{ authStore.user?.role }}</span>
            </div>
            <svg class="profile-chip__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </RouterLink>

          <!-- Logout Button -->
          <button class="logout-btn" @click="handleLogout" :title="uiStore.t('exit')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {{ uiStore.t('exit') }}
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

<style scoped>
/* ── Top Navbar Layout ── */
.top-navbar {
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--sidebar-border);
  padding: 0 1.75rem;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  gap: 1rem;
}

/* ── Brand (Left) ── */
.navbar-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}
.navbar-brand-icon {
  background-color: var(--primary-light);
  color: var(--primary-color);
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}
.navbar-brand-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Controls (Right) ── */
.navbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ── Vertical Divider ── */
.navbar-divider {
  width: 1px;
  height: 28px;
  background-color: var(--border-color);
  border-radius: 1px;
  margin: 0 0.15rem;
}

/* ── Language Dropdown ── */
.lang-dropdown {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.lang-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.34rem 0.7rem 0.34rem 0.5rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-color);
  background-color: var(--bg-color);
  color: var(--text-main);
  font-size: 0.78rem;
  font-weight: 700;
  font-family: var(--font-family);
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
  user-select: none;
  height: 36px;
}
.lang-trigger:hover,
.lang-dropdown--open .lang-trigger {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
  color: var(--primary-color);
}
.lang-flag-img {
  width: 22px;
  height: 15px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.12);
  flex-shrink: 0;
  display: block;
}
.lang-code {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.lang-chevron {
  color: var(--text-muted);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}
.lang-dropdown--open .lang-chevron {
  transform: rotate(180deg);
  color: var(--primary-color);
}

/* Dropdown Panel */
.lang-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1000;
  min-width: 160px;
  background-color: var(--card-bg);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 5px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.lang-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.14s ease;
}
.lang-option:hover {
  background-color: var(--primary-light);
}
.lang-option--active {
  background-color: var(--primary-light);
}
.lang-option__flag-img {
  width: 26px;
  height: 17px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.12);
  flex-shrink: 0;
  display: block;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.lang-option__info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  flex: 1;
  min-width: 0;
}
.lang-option__name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
}
.lang-option__sub {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}
.lang-option--active .lang-option__name {
  color: var(--primary-color);
}
.lang-option__check {
  color: var(--primary-color);
  flex-shrink: 0;
}

/* Click-outside backdrop */
.lang-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

/* Dropdown enter/leave animation */
.lang-drop-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.lang-drop-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.lang-drop-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
.lang-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

/* Dark mode: lang trigger */
html.dark .lang-trigger {
  background-color: var(--card-bg);
}
html.dark .lang-trigger:hover,
html.dark .lang-dropdown--open .lang-trigger {
  background-color: var(--primary-light);
}
html.dark .lang-panel {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* ── Dark Mode Toggle ── */
.ctrl-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid var(--border-color);
  background-color: var(--bg-color);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.ctrl-icon-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background-color: var(--primary-light);
  transform: rotate(15deg) scale(1.05);
}
.theme-toggle--dark {
  background-color: #1e3a5f;
  border-color: #3b82f6;
  color: #93c5fd;
}
.theme-toggle--dark:hover {
  background-color: #1d4ed8;
  border-color: #60a5fa;
  color: #ffffff;
  transform: rotate(-15deg) scale(1.05);
}
.theme-icon {
  transition: all 0.2s ease;
}

/* ── Profile Chip ── */
.profile-chip {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.3rem 0.65rem 0.3rem 0.3rem;
  border-radius: 12px;
  border: 1.5px solid var(--border-color);
  background-color: var(--bg-color);
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 200px;
}
.profile-chip:hover {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
  box-shadow: 0 2px 10px rgba(2, 132, 199, 0.12);
  transform: translateY(-1px);
}
.profile-chip__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--primary-color);
  flex-shrink: 0;
}
.profile-chip__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}
.profile-chip__name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 110px;
}
.profile-chip__role {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.profile-chip__chevron {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.profile-chip:hover .profile-chip__chevron {
  transform: translateY(2px);
  color: var(--primary-color);
}

/* ── Logout Button ── */
.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.38rem 0.75rem;
  border-radius: 10px;
  border: 1.5px solid #fecaca;
  background-color: #fff5f5;
  color: #dc2626;
  font-size: 0.78rem;
  font-weight: 700;
  font-family: var(--font-family);
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}
.logout-btn:hover {
  background-color: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
  transform: translateY(-1px);
}
.logout-btn svg {
  transition: transform 0.18s ease;
}
.logout-btn:hover svg {
  transform: translateX(2px);
}

/* Dark mode: logout adapts */
html.dark .logout-btn {
  background-color: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.35);
  color: #f87171;
}
html.dark .logout-btn:hover {
  background-color: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

/* Dark mode: profile chip adapts */
html.dark .profile-chip {
  background-color: var(--card-bg);
}
html.dark .ctrl-icon-btn {
  background-color: var(--card-bg);
}
html.dark .ctrl-group.lang-switcher {
  background-color: var(--card-bg);
}
</style>
