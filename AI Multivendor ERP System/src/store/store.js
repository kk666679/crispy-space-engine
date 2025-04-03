import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';

// Load persisted state from localStorage
const loadState = () => {
    try {
        const serializedState = localStorage.getItem('reduxState');
        return serializedState ? JSON.parse(serializedState) : undefined;
    } catch (err) {
        console.error('Failed to load state:', err);
        return undefined;
    }
};

// Save state to localStorage
const saveState = (state) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem('reduxState', serializedState);
    } catch (err) {
        console.error('Failed to save state:', err);
    }
};

export const store = configureStore({
    reducer: {
        user: userReducer,
        // Add more reducers as needed
    },
    preloadedState: loadState(), // Load persisted state
});

// Subscribe to store updates and persist them
store.subscribe(() => {
    saveState(store.getState());
});

// Debugging: Log state changes
store.subscribe(() => console.log('Redux State Updated:', store.getState()));

export default store;
