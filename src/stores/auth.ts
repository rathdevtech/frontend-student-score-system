import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';

export interface User {
  id: number;
  name: string;
  name_kh?: string | null;
  email: string;
  role: 'admin' | 'teacher';
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(
    localStorage.getItem('auth_user')
      ? JSON.parse(localStorage.getItem('auth_user')!)
      : null
  );
  
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isTeacher = computed(() => user.value?.role === 'teacher');

  const login = async (credentials: any) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/login', credentials);
      const data = response.data;
      
      token.value = data.token;
      user.value = data.user;
      
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed. Please check credentials.';
      return false;
    } finally {
      loading.value = false;
    }
  };

  const register = async (userData: any) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/register', userData);
      // If registering as a different user or from admin, don't login automatically
      // But if self-registering, we can set state:
      const data = response.data;
      
      // For this system, admins manage users, so we don't automatically log in the registered user
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    loading.value = true;
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout error on server', err);
    } finally {
      token.value = null;
      user.value = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get('/user');
      user.value = response.data;
      localStorage.setItem('auth_user', JSON.stringify(response.data));
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const updateProfile = async (formData: FormData) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/user/profile', formData, {
        headers: {},
      });
      user.value = response.data.user;
      localStorage.setItem('auth_user', JSON.stringify(response.data.user));
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update profile.';
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isTeacher,
    login,
    register,
    logout,
    fetchProfile,
    updateProfile,
  };
});
