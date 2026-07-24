import './decompression-polyfill.js';

const MIGRATION_KEY = 'senai-reservas-import-fix-v2';

if (localStorage.getItem(MIGRATION_KEY) !== 'ok') {
  localStorage.removeItem('senai-reservas-seed-version');
  localStorage.setItem(MIGRATION_KEY, 'ok');
}

await import('./app.js');
