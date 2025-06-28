import { writable } from 'svelte/store';

export const session = writable(null);
export const loading = writable(true);
export const error = writable('');
export const notification = writable('');

// Timer stores
export const timerState = writable({
    minutes: 25,
    seconds: 0,
    isActive: false,
    isWork: true,
    cycles: 0,
    workTime: 25,
    shortBreak: 5,
    longBreak: 15,
    autoStart: false
});

// Utility functions
export function showNotification(message, duration = 3000) {
    notification.set(message);
    setTimeout(() => notification.set(''), duration);
}

export function showError(message, duration = 5000) {
    error.set(message);
    setTimeout(() => error.set(''), duration);
}