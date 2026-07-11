import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/classes',
      name: 'classes',
      component: () => import('@/views/ClassesView.vue'),
      meta: { requiresAuth: true, requiresPermission: 'view_classes' }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UsersView.vue'),
      meta: { requiresAuth: true, requiresPermission: 'view_users' }
    },
    {
      path: '/teachers',
      name: 'teachers',
      component: () => import('@/views/TeachersView.vue'),
      meta: { requiresAuth: true, requiresPermission: 'view_users' }
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('@/views/RolesView.vue'),
      meta: { requiresAuth: true, requiresPermission: 'manage_roles_permissions' }
    },
    {
      path: '/subjects',
      name: 'subjects',
      component: () => import('@/views/SubjectsView.vue'),
      meta: { requiresAuth: true, requiresPermission: 'view_subjects' }
    },
    {
      path: '/students',
      name: 'students',
      component: () => import('@/views/StudentsView.vue'),
      meta: { requiresAuth: true, requiresPermission: 'view_students' }
    },
    {
      path: '/scores',
      name: 'scores',
      component: () => import('@/views/ScoresView.vue'),
      meta: { requiresAuth: true, requiresPermission: 'view_scores' }
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/views/ReportsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    // Fallback redirect
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
});

// Route Guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' });
  } else if (to.meta.guestOnly && authStore.isAuthenticated) {
    next({ name: 'dashboard' });
  } else if (to.meta.requiresPermission && !authStore.hasPermission(to.meta.requiresPermission as string)) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
});

export default router;
