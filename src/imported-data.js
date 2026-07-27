const ENVIRONMENT_IDS = [
  'r1-06-sala', 'r1-09-sala', 'r1-10-sala', 'r1-12-sala',
  'r2-05-sala', 'r2-08-sala', 'r2-09-sala', 'r2-17-sala',
  'c-10-sala', 'c-11-sala', 'c-18-sala', 'c-21-sala',
  'r2-16-informatica', 'c-14-informatica', 'c-17-informatica',
  'c-16-metrologia', 'r1-08-clp', 'c-09-automacao-hidraulica',
  'oficina-comandos-eletricos', 'oficina-instalacoes-eletricas',
  'c-09-hidropneumatica', 'r2-24-hidropneumatica', 'c-15-eletronica',
  'auditorio', 'biblioteca'
];

const TEACHERS = [
  'Geraldo Fernandes', 'Marco Valerio', 'Fernando', 'Walter',
  'Vinicius', 'Adriano', 'Roberto', 'Carla', 'Marcelo', 'Juliana'
];

const CLASSES = [
  'AR AUTOM26-T1', 'AR AUTOM26-T2', 'AR AUTOM26-T3',
  'CAI ELETRICISTA', 'TÉCNICO EM MECÂNICA', 'FORMAÇÃO CONTINUADA'
];

const UNITS = [
  'Fundamentos da Automação', 'Sistemas Automatizados',
  'Camada Digital na Automação', 'Projeto de Automação Industrial',
  'Instalações Elétricas', 'Programação Industrial'
];

const EVENTS = [
  ['2026-01-01', 'Feriado'], ['2026-01-02', 'Ponte de Feriado'],
  ['2026-02-16', 'Carnaval'], ['2026-02-17', 'Carnaval'],
  ['2026-02-18', 'Quarta-feira de Cinzas'], ['2026-02-28', 'Feriado Municipal'],
  ['2026-04-03', 'Feriado'], ['2026-04-20', 'Ponte de Feriado'],
  ['2026-04-21', 'Feriado'], ['2026-05-01', 'Feriado'],
  ['2026-06-04', 'Feriado'], ['2026-06-05', 'Ponte de Feriado'],
  ['2026-06-12', 'Feriado Municipal'], ['2026-07-09', 'Feriado Estadual'],
  ['2026-07-10', 'Ponte de Feriado'], ['2026-09-07', 'Feriado'],
  ['2026-10-12', 'Feriado'], ['2026-10-13', 'Feriado'],
  ['2026-11-02', 'Feriado'], ['2026-11-20', 'Feriado'],
  ['2026-12-24', 'Ponte de Feriado'], ['2026-12-25', 'Feriado'],
  ['2026-12-28', 'Ponte de Feriado'], ['2026-12-29', 'Ponte de Feriado'],
  ['2026-12-30', 'Ponte de Feriado'], ['2026-12-31', 'Ponte de Feriado']
];

const EVENT_DATES = new Set(EVENTS.map(([date]) => date));
const FULL_OCCUPANCY_ENVIRONMENTS = new Set(['r2-16-informatica', 'c-14-informatica']);
const SCHEDULE_MIGRATION_KEY = 'senai-agenda-recorrente-versao';
const SCHEDULE_MIGRATION_VERSION = '2026-jul-dez-v1';

function dateValue(month, day) {
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function forEachDate(startDate, endDate, callback) {
  const current = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);

  while (current <= end) {
    callback(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
}

function isBusinessDay(date) {
  const weekday = date.getUTCDay();
  const isoDate = formatIsoDate(date);
  return weekday >= 1 && weekday <= 5 && !EVENT_DATES.has(isoDate);
}

function makeReservation(
  id,
  date,
  environmentId,
  shift,
  period,
  teacher,
  className,
  curricularUnit,
  activity = 'Reserva importada para demonstração',
  notes = 'Base provisória para validação do sistema online.'
) {
  return {
    id,
    date,
    environmentId,
    shift,
    period,
    teacher,
    className,
    curricularUnit,
    activity,
    notes,
    source: 'demonstracao-2026',
    status: 'confirmada',
    createdAt: '2026-01-01T00:00:00.000Z'
  };
}

function addFullOccupancyReservations(reservations, nextId) {
  const shifts = ['manha', 'tarde', 'noite'];

  forEachDate('2026-07-01', '2026-08-31', (date) => {
    if (!isBusinessDay(date)) return;

    const isoDate = formatIsoDate(date);
    FULL_OCCUPANCY_ENVIRONMENTS.forEach((environmentId) => {
      shifts.forEach((shift) => {
        reservations.push(makeReservation(
          `imported-2026-full-${nextId.value++}`,
          isoDate,
          environmentId,
          shift,
          'completo',
          'Reserva institucional',
          'Lotação máxima',
          'Uso integral do ambiente',
          'Ocupação máxima do laboratório',
          'Reserva de demonstração para ocupação máxima em julho e agosto.'
        ));
      });
    });
  });
}

function addClpRecurringReservations(reservations, nextId) {
  forEachDate('2026-07-01', '2026-12-17', (date) => {
    if (!isBusinessDay(date)) return;

    const weekday = date.getUTCDay();
    const teacher = weekday === 1 || weekday === 3 ? 'Fernandes' : 'Francisco';

    reservations.push(makeReservation(
      `imported-2026-clp-${nextId.value++}`,
      formatIsoDate(date),
      'r1-08-clp',
      'tarde',
      'completo',
      teacher,
      'Reserva recorrente',
      'Laboratório de CLP e Redes',
      'Uso recorrente do laboratório',
      weekday === 1 || weekday === 3
        ? 'Segundas e quartas reservadas para Fernandes.'
        : 'Terças, quintas e sextas reservadas para Francisco.'
    ));
  });
}

function shouldSkipGenericReservation(environmentId, month) {
  if (FULL_OCCUPANCY_ENVIRONMENTS.has(environmentId) && (month === 7 || month === 8)) {
    return true;
  }

  return environmentId === 'r1-08-clp' && month >= 7;
}

function generateReservations() {
  const reservations = [
    makeReservation('imported-2026-real-1', '2026-01-06', 'r1-12-sala', 'noite', 'completo', 'Marco Valerio', 'Registro da planilha', 'SALAS R1'),
    makeReservation('imported-2026-real-2', '2026-01-08', 'r1-12-sala', 'noite', 'completo', 'FERNANDO TEC. MEC.', 'Registro da planilha', 'SALAS R1'),
    makeReservation('imported-2026-real-3', '2026-01-13', 'r1-12-sala', 'noite', 'completo', 'Marco Valerio', 'Registro da planilha', 'SALAS R1'),
    makeReservation('imported-2026-real-4', '2026-01-15', 'r1-12-sala', 'noite', 'completo', 'FERNANDO TEC. MEC.', 'Registro da planilha', 'SALAS R1')
  ];

  const nextId = { value: 5 };

  for (let month = 1; month <= 12; month += 1) {
    ENVIRONMENT_IDS.forEach((environmentId, environmentIndex) => {
      if (shouldSkipGenericReservation(environmentId, month)) return;

      for (let occurrence = 0; occurrence < 3; occurrence += 1) {
        const day = 1 + ((environmentIndex * 3 + month * 2 + occurrence * 8) % 27);
        const shift = ['manha', 'tarde', 'noite'][(environmentIndex + month + occurrence) % 3];
        const period = ['completo', 'antes', 'apos'][(environmentIndex + occurrence) % 3];
        const teacher = TEACHERS[(environmentIndex + month + occurrence) % TEACHERS.length];
        const className = CLASSES[(environmentIndex + month) % CLASSES.length];
        const curricularUnit = UNITS[(environmentIndex + occurrence) % UNITS.length];

        reservations.push(makeReservation(
          `imported-2026-demo-${nextId.value++}`,
          dateValue(month, day),
          environmentId,
          shift,
          period,
          teacher,
          className,
          curricularUnit
        ));
      }
    });
  }

  addFullOccupancyReservations(reservations, nextId);
  addClpRecurringReservations(reservations, nextId);

  return reservations;
}

function forceOneTimeScheduleRefresh() {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(SCHEDULE_MIGRATION_KEY) === SCHEDULE_MIGRATION_VERSION) return;

  localStorage.removeItem('senai-reservas-seed-version');
  localStorage.setItem(SCHEDULE_MIGRATION_KEY, SCHEDULE_MIGRATION_VERSION);
}

export async function loadImportedData() {
  forceOneTimeScheduleRefresh();

  return {
    reservations: generateReservations(),
    events: EVENTS.map(([date, name]) => ({ date, name }))
  };
}