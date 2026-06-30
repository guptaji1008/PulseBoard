import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types';

const USER_KEY = 'tp_user';

interface AuthState {
  user: User | null;
}

function loadInitial(): AuthState {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return { user: raw ? (JSON.parse(raw) as User) : null };
  } catch {
    return { user: null };
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitial(),
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User }>) {
      state.user = action.payload.user;
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
    },
    logout(state) {
      state.user = null;
      localStorage.removeItem(USER_KEY);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
