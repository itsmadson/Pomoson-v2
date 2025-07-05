import { writable } from 'svelte/store';

const defaultTheme = localStorage.getItem('pomoson-theme') || 'Pomoson';

export const theme = writable(defaultTheme);

theme.subscribe(value => {
    localStorage.setItem('pomoson-theme', value);
    document.documentElement.setAttribute('data-theme', value);
});
