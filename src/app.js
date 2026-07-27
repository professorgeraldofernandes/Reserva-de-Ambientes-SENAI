import { environments, institutionalEvents, months } from './data.js';
import { loadImportedData } from './imported-data.js';

const STORAGE_KEY = 'senai-reservas-v1';
const SEED_VERSION_KEY = 'senai-reservas-seed-version';
const SEED_VERSION = 'planilha-senai-2026-v3';
const currentYear = 2026;
const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const shiftOrder = { manha: 1, tarde: 2, noite: 3 };

let calendarEvents = [...institutionalEvents];

const state = {
  reservations: readStoredReservations(),
  installPrompt: null,
  importStatus: 'loading'
};

function readStoredReservations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function mergeCalendarEvents(defaultEvents, importedEvents) {
  const eventsByDate = new Map(defaultEvents.map((event) => [event.date, event]));
  importedEvents.forEach((event) => eventsByDate.set(event.date, event));
  return [...eventsByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function mergeImportedReservations(seedReservations) {
  const storedReservations = readStoredReservations();

  if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
    const manualReservations = storedReservations.filter(
      (reservation) => !String(reservation.id).startsWith('imported-2026-')
    );
    const mergedReservations = [...seedReservations, ...manualReservations];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedReservations));
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    return mergedReservations;
  }

  return storedReservations;
}

async function bootstrapImportedData() {
  try {
    const importedData = await loadImportedData();
    calendarEvents = mergeCalendarEvents(institutionalEvents, importedData.events);
    state.reservations = mergeImportedReservations(importedData.reservations);
    state.importStatus = 'ready';
  } catch (error) {
    console.error('Falha ao carregar os dados importados da planilha:', error);
    state.importStatus = 'error';
  } finally {
    renderAll();
  }
}

function saveReservations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reservations));
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}

function environmentName(id) {
  const environment = environments.find((item) => item.id === id);
  return environment ? `${environment.code} — ${environment.name}` : 'Ambiente não localizado';
}

function periodLabel(period) {
  return { completo: 'Turno completo', antes: 'Antes do intervalo', apos: 'Após o intervalo' }[period] ?? period;
}

function shiftLabel(shift) {
  return { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }[shift] ?? shift;
}

function shiftAbbreviation(shift) {
  return { manha: 'M', tarde: 'T', noite: 'N' }[shift] ?? '?';
}

function overlaps(a, b) {
  if (a === 'completo' || b === 'completo') return true;
  return a === b;
}

function findConflict(candidate) {
  return state.reservations.find((reservation) =>
    reservation.date === candidate.date &&
    reservation.environmentId === candidate.environmentId &&
    reservation.shift === candidate.shift &&
    overlaps(reservation.period, candidate.period)
  );
}

function populateSelects() {
  const monthOptions = months.map((month, index) => `<option value="${index + 1}">${month}</option>`).join('');
  document.querySelectorAll('#filterMonth, #printMonth').forEach((select) => {
    select.innerHTML = monthOptions;
    select.value = String(new Date().getMonth() + 1);
  });

  const environmentOptions = environments
    .map((environment) => `<option value="${environment.id}">${environment.code} — ${environment.name}</option>`)
    .join('');

  document.querySelector('#filterEnvironment').insertAdjacentHTML('beforeend', environmentOptions);
  document.querySelector('#printEnvironment').innerHTML = environmentOptions;
  document.querySelector('[name="environmentId"]').innerHTML = `<option value="">Selecione</option>${environmentOptions}`;
}

function renderDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const todayReservations = state.reservations.filter((item) => item.date === today);
  const occupied = new Set(todayReservations.map((item) => item.environmentId)).size;

  document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date());
  document.querySelector('#summaryCards').innerHTML = [
    ['Ambientes', environments.length],
    ['Reservas cadastradas', state.importStatus === 'loading' ? 'Carregando…' : state.reservations.length],
    ['Ocupados hoje', occupied],
    ['Disponíveis hoje', environments.length - occupied]
  ].map(([label, value]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong></article>`).join('');

  document.querySelector('#todayReservations').innerHTML = todayReservations.length
    ? reservationTable(todayReservations)
    : `<p class="empty-state">${state.importStatus === 'loading' ? 'Carregando reservas da planilha…' : 'Não há reservas cadastradas para hoje.'}</p>`;
}

function reservationTable(reservations, allowDelete = false) {
  const rows = [...reservations]
    .sort((a, b) => `${a.date}${a.shift}`.localeCompare(`${b.date}${b.shift}`))
    .map((item) => `<tr>
      <td>${formatDate(item.date)}</td>
      <td>${environmentName(item.environmentId)}</td>
      <td>${shiftLabel(item.shift)}<br><small>${periodLabel(item.period)}</small></td>
      <td><strong>${escapeHtml(item.teacher)}</strong><br><small>${escapeHtml(item.className)} — ${escapeHtml(item.curricularUnit)}</small></td>
      <td>${escapeHtml(item.activity || '—')}</td>
      ${allowDelete ? `<td><button class="icon-button danger" data-delete="${item.id}">Excluir</button></td>` : ''}
    </tr>`).join('');

  return `<table><thead><tr><th>Data</th><th>Ambiente</th><th>Período</th><th>Responsável</th><th>Atividade</th>${allowDelete ? '<th>Ação</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderReservations() {
  const month = Number(document.querySelector('#filterMonth').value);
  const environmentId = document.querySelector('#filterEnvironment').value;
  const shift = document.querySelector('#filterShift').value;

  const filtered = state.reservations.filter((item) => {
    const itemMonth = Number(item.date.slice(5, 7));
    return itemMonth === month && (!environmentId || item.environmentId === environmentId) && (!shift || item.shift === shift);
  });

  document.querySelector('#reservationsTable').innerHTML = filtered.length
    ? reservationTable(filtered, true)
    : `<p class="empty-state">${state.importStatus === 'loading' ? 'Carregando reservas da planilha…' : 'Nenhuma reserva encontrada para os filtros selecionados.'}</p>`;
}

function renderEnvironments() {
  document.querySelector('#environmentCards').innerHTML = environments.map((environment) => `
    <article class="environment-card">
      <div><span class="badge">${environment.category}</span><h3>${environment.code}</h3></div>
      <p>${environment.name}</p>
      <dl><div><dt>Bloco</dt><dd>${environment.block}</dd></div><div><dt>Capacidade</dt><dd>${environment.capacity} pessoas</dd></div>${environment.computers ? `<div><dt>Computadores</dt><dd>${environment.computers}</dd></div>` : ''}</dl>
    </article>
  `).join('');
}

function reservationMainText(reservation) {
  const activity = String(reservation.activity ?? '').trim();
  const genericActivity = activity.toLocaleLowerCase('pt-BR').includes('demonstração');

  if (activity && !genericActivity) return activity;
  return reservation.curricularUnit || reservation.className || 'Reserva confirmada';
}

function calendarResponsible(reservations) {
  const names = [...new Set(reservations.map((item) => String(item.teacher ?? '').trim()).filter(Boolean))];
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(' / ');
  return 'Múltiplos';
}

function calendarReservationBlock(reservation) {
  return `<div class="calendar-reservation calendar-${reservation.shift}">
    <span class="calendar-shift" title="${escapeHtml(shiftLabel(reservation.shift))}">${shiftAbbreviation(reservation.shift)}</span>
    <div class="calendar-reservation-text">
      <strong>${escapeHtml(reservationMainText(reservation))}</strong>
      <small>${escapeHtml(reservation.className || reservation.curricularUnit || '')} · ${escapeHtml(periodLabel(reservation.period))}</small>
    </div>
  </div>`;
}

function renderPrint() {
  const month = Number(document.querySelector('#printMonth').value);
  const environmentId = document.querySelector('#printEnvironment').value;
  const daysInMonth = new Date(Date.UTC(currentYear, month, 0)).getUTCDate();
  const firstWeekDay = new Date(Date.UTC(currentYear, month - 1, 1)).getUTCDay();

  document.querySelector('#printTitle').textContent = `${months[month - 1]} de ${currentYear} — ${environmentName(environmentId)}`;

  const weekDayHeader = weekDays
    .map((day) => `<div class="calendar-weekday">${day}</div>`)
    .join('');

  const cells = Array.from({ length: 42 }, (_, cellIndex) => {
    const day = cellIndex - firstWeekDay + 1;
    if (day < 1 || day > daysInMonth) {
      return '<div class="calendar-day calendar-outside" aria-hidden="true"></div>';
    }

    const date = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const event = calendarEvents.find((item) => item.date === date);
    const reservations = state.reservations
      .filter((item) => item.date === date && item.environmentId === environmentId)
      .sort((a, b) => (shiftOrder[a.shift] ?? 99) - (shiftOrder[b.shift] ?? 99));

    const isWeekend = cellIndex % 7 === 0 || cellIndex % 7 === 6;
    const isFullOccupancy = reservations.some((item) =>
      item.className === 'Lotação máxima' || String(item.activity).toLocaleLowerCase('pt-BR').includes('ocupação máxima')
    );
    const classes = [
      'calendar-day',
      isWeekend ? 'calendar-weekend' : '',
      event ? 'calendar-event-day' : '',
      reservations.length ? 'calendar-occupied' : '',
      isFullOccupancy ? 'calendar-full-occupancy' : ''
    ].filter(Boolean).join(' ');

    const responsible = calendarResponsible(reservations);
    const reservationBlocks = reservations.map(calendarReservationBlock).join('');

    return `<div class="${classes}" aria-label="Dia ${day}${responsible ? `, reservado por ${escapeHtml(responsible)}` : ''}">
      <div class="calendar-day-header">
        <span class="calendar-day-number">${day}</span>
        <span class="calendar-responsible" title="${escapeHtml(responsible)}">${escapeHtml(responsible)}</span>
      </div>
      ${event ? `<div class="calendar-event-label">${escapeHtml(event.name)}</div>` : ''}
      <div class="calendar-day-content">${reservationBlocks || '<span class="calendar-free">Livre</span>'}</div>
    </div>`;
  }).join('');

  document.querySelector('#printCalendar').innerHTML = `
    <div class="calendar-weekdays">${weekDayHeader}</div>
    <div class="calendar-grid">${cells}</div>
  `;
}

function handleReservationSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const reservation = Object.fromEntries(formData.entries());
  reservation.id = crypto.randomUUID();
  reservation.createdAt = new Date().toISOString();
  reservation.status = 'confirmada';

  const message = document.querySelector('#formMessage');
  const conflict = findConflict(reservation);
  if (conflict) {
    message.className = 'message error full';
    message.textContent = `Conflito: o ambiente já está reservado por ${conflict.teacher}, para ${conflict.className}, nesse período.`;
    return;
  }

  state.reservations.push(reservation);
  saveReservations();
  event.currentTarget.reset();
  message.className = 'message success full';
  message.textContent = 'Reserva cadastrada com sucesso.';
  renderAll();
}

function handleDelete(event) {
  const id = event.target.dataset.delete;
  if (!id || !confirm('Confirma a exclusão desta reserva?')) return;
  state.reservations = state.reservations.filter((item) => item.id !== id);
  saveReservations();
  renderAll();
}

function setupNavigation() {
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
    const targetView = document.querySelector(`#${tab.dataset.view}`);
    if (!targetView) return;

    document.querySelectorAll('.tab').forEach((element) => element.classList.remove('active'));
    document.querySelectorAll('.view').forEach((element) => element.classList.remove('active'));
    tab.classList.add('active');
    targetView.classList.add('active');
    if (tab.dataset.view === 'print') renderPrint();
  }));
}

function setupPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('Service Worker não registrado:', error);
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    const installButton = document.querySelector('#installButton');
    if (installButton) installButton.hidden = false;
  });

  const installButton = document.querySelector('#installButton');
  if (installButton) {
    installButton.addEventListener('click', async () => {
      await state.installPrompt?.prompt();
      state.installPrompt = null;
      installButton.hidden = true;
    });
  }
}

function renderAll() {
  renderDashboard();
  renderReservations();
  renderEnvironments();
  renderPrint();
}

populateSelects();
setupNavigation();
setupPwa();
renderAll();

const reservationForm = document.querySelector('#reservationForm');
if (reservationForm) reservationForm.addEventListener('submit', handleReservationSubmit);

document.querySelector('#reservationsTable')?.addEventListener('click', handleDelete);
document.querySelectorAll('#filterMonth, #filterEnvironment, #filterShift').forEach((element) => element.addEventListener('change', renderReservations));
document.querySelectorAll('#printMonth, #printEnvironment').forEach((element) => element.addEventListener('change', renderPrint));
document.querySelector('#printButton')?.addEventListener('click', () => window.print());

bootstrapImportedData();