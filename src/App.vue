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
          <span>
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </span>
          {{ uiStore.t('dashboard') }}
        </RouterLink>
        <RouterLink v-if="authStore.hasPermission('view_classes')" to="/classes" class="menu-link">
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
            </svg>
          </span>
          {{ uiStore.t('classes') }}
        </RouterLink>
        <RouterLink v-if="authStore.hasPermission('view_subjects')" to="/subjects" class="menu-link">
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          {{ uiStore.t('subjects') }}
        </RouterLink>
        <RouterLink v-if="authStore.hasPermission('view_students')" to="/students" class="menu-link">
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          {{ uiStore.t('students') }}
        </RouterLink>
        <RouterLink v-if="authStore.hasPermission('view_users')" to="/teachers" class="menu-link">
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 9l-3.5-2L16 9l3.5 2z" />
              <path d="M19.5 11v3" />
            </svg>
          </span>
          {{ uiStore.t('teachers') }}
        </RouterLink>
        <RouterLink v-if="authStore.hasPermission('view_scores')" to="/scores" class="menu-link">
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
            </svg>
          </span>
          {{ uiStore.t('gradebook') }}
        </RouterLink>
        <RouterLink to="/reports" class="menu-link">
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </span>
          {{ uiStore.t('reports') }}
        </RouterLink>

        <!-- Settings Section Header -->
        <div v-if="authStore.hasPermission('view_users') || authStore.hasPermission('manage_roles_permissions')" class="menu-group-header">
          {{ uiStore.t('settings') }}
        </div>

        <RouterLink v-if="authStore.hasPermission('view_users')" to="/users" class="menu-link">
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          {{ uiStore.t('users') }}
        </RouterLink>
        <RouterLink v-if="authStore.hasPermission('manage_roles_permissions')" to="/roles" class="menu-link">
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </span>
          {{ uiStore.t('rolesAndPermissions') || 'Roles & Permissions' }}
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
  padding: 0 1.5rem;
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  gap: 0.75rem;
}

/* ── Brand (Left) ── */
.navbar-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}
.navbar-brand-icon {
  background-color: var(--primary-light);
  color: var(--primary-color);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
}
.navbar-brand-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Controls (Right) ── */
.navbar-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

/* ── Vertical Divider ── */
.navbar-divider {
  width: 1px;
  height: 24px;
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
  gap: 5px;
  padding: 0.3rem 0.65rem 0.3rem 0.5rem;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-color);
  color: var(--text-main);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-family);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  user-select: none;
  height: 32px;
}
.lang-trigger:hover,
.lang-dropdown--open .lang-trigger {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
  color: var(--primary-color);
}
.lang-flag-img {
  width: 20px;
  height: 13px;
  object-fit: cover;
  border-radius: 2px;
  border: 1px solid rgba(0,0,0,0.12);
  flex-shrink: 0;
  display: block;
}
.lang-code {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.lang-chevron {
  color: var(--text-muted);
  transition: transform 0.18s ease;
  flex-shrink: 0;
}
.lang-dropdown--open .lang-chevron {
  transform: rotate(180deg);
  color: var(--primary-color);
}

/* Dropdown Panel */
.lang-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 1000;
  min-width: 145px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.lang-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.45rem 0.55rem;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.12s ease;
}
.lang-option:hover { background-color: var(--primary-light); }
.lang-option--active { background-color: var(--primary-light); }
.lang-option__flag-img {
  width: 22px;
  height: 14px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.12);
  flex-shrink: 0;
  display: block;
}
.lang-option__info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  flex: 1;
  min-width: 0;
}
.lang-option__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-main);
}
.lang-option__sub {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--text-muted);
}
.lang-option--active .lang-option__name { color: var(--primary-color); }
.lang-option__check { color: var(--primary-color); flex-shrink: 0; }

/* Click-outside backdrop */
.lang-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

/* Dropdown animation */
.lang-drop-enter-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.lang-drop-leave-active { transition: opacity 0.08s ease, transform 0.08s ease; }
.lang-drop-enter-from { opacity: 0; transform: translateY(-5px) scale(0.97); }
.lang-drop-leave-to  { opacity: 0; transform: translateY(-3px) scale(0.97); }

/* Dark mode lang */
html.dark .lang-trigger { background-color: var(--card-bg); }
html.dark .lang-trigger:hover,
html.dark .lang-dropdown--open .lang-trigger { background-color: var(--primary-light); }
html.dark .lang-panel { box-shadow: 0 8px 24px rgba(0,0,0,0.4); }

/* ── Dark Mode Toggle ── */
.ctrl-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-color);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  flex-shrink: 0;
}
.ctrl-icon-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background-color: var(--primary-light);
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
}
.theme-icon { transition: all 0.18s ease; }

/* ── Profile Chip ── */
.profile-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.6rem 0.25rem 0.25rem;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-color);
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: all 0.18s ease;
  max-width: 190px;
}
.profile-chip:hover {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
}
.profile-chip__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--primary-color);
  flex-shrink: 0;
}
.profile-chip__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.profile-chip__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 105px;
}
.profile-chip__role {
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.profile-chip__chevron {
  color: var(--text-muted);
  flex-shrink: 0;
}

/* ── Logout Button ── */
.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.32rem 0.7rem;
  border-radius: 7px;
  border: 1px solid #fecaca;
  background-color: #fff5f5;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-family);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  height: 32px;
}
.logout-btn:hover {
  background-color: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
}
.logout-btn svg { transition: transform 0.15s ease; }
.logout-btn:hover svg { transform: translateX(2px); }

/* Dark mode: logout */
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

/* Dark mode: chips */
html.dark .profile-chip { background-color: var(--card-bg); }
html.dark .ctrl-icon-btn { background-color: var(--card-bg); }
</style>
