// store.js
import { configureStore, createSlice, createAsyncThunk, combineReducers, isRejectedWithValue } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// User Slice
const userInitialState = {
  userData: null,
  loading: false,
  error: null,
  preferences: {},
};

export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: userInitialState,
  reducers: {
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    clearUserData: (state) => {
      state.userData = null;
      state.preferences = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userData = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    token: null,
    refreshToken: null,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
    },
  },
});

// UI Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: 'light',
    sidebarOpen: false,
    activeModal: null,
    notifications: [],
    loading: false,
  },
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setActiveModal: (state, action) => {
      state.activeModal = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notif) => notif.id !== action.payload
      );
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

// Error Slice
const errorSlice = createSlice({
  name: 'error',
  initialState: {
    globalError: null,
    errors: {},
  },
  reducers: {
    setGlobalError: (state, action) => {
      state.globalError = action.payload;
    },
    clearGlobalError: (state) => {
      state.globalError = null;
    },
    setError: (state, action) => {
      state.errors[action.payload.key] = action.payload.message;
    },
    clearError: (state, action) => {
      delete state.errors[action.payload];
    },
    clearAllErrors: (state) => {
      state.errors = {};
      state.globalError = null;
    },
  },
});

// Combine all reducers
const rootReducer = combineReducers({
  user: userSlice.reducer,
  auth: authSlice.reducer,
  ui: uiSlice.reducer,
  error: errorSlice.reducer,
});

// Error Middleware
const errorMiddleware = (store) => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    store.dispatch(uiSlice.actions.addNotification({
      type: 'error',
      message: action.payload || 'An error occurred',
      duration: 5000,
    }));
  }
  return next(action);
};

// Redux Persist Configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth', 'user'], // Only persist these reducers
  blacklist: ['ui', 'error'], // Don't persist these reducers
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure Store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(errorMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

// Export actions
export const { updatePreferences, clearUserData } = userSlice.actions;
export const { setCredentials, logout } = authSlice.actions;
export const { 
  toggleTheme, 
  toggleSidebar, 
  setActiveModal, 
  addNotification, 
  removeNotification,
  setLoading 
} = uiSlice.actions;
export const {
  setGlobalError,
  clearGlobalError,
  setError,
  clearError,
  clearAllErrors
} = errorSlice.actions;

// Export selectors
export const selectUser = (state) => state.user;
export const selectAuth = (state) => state.auth;
export const selectUI = (state) => state.ui;
export const selectError = (state) => state.error;

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Custom hooks for typed dispatch and selector
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;

