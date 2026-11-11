import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup, repairWeightLog, sanitizeProfile } from '../js/core/backup.js';
import { localISODate, weekKey, parseLocalDate } from '../js/core/dates.js';

const valid = () => ({
  sessions: [{ id: 1, date: '2026-11-01T10:00:00Z', exercises: [{ name: 'Flexión', sets: [] }] }],
  library: [{ id: 'flexiones', name: 'Flexión', muscle: 'Pecho' }],
});

test('validateBackup acepta una copia mínima válida, con o sin rutinas', () => {
  assert.doesNotThrow(() => validateBackup(valid()));
  assert.doesNotThrow(() => validateBackup({ ...valid(), routines: [] }));
});

test('validateBackup rechaza copias mal formadas', () => {
  assert.throws(() => validateBackup(null), /no contiene un objeto/);
  assert.throws(() => validateBackup({ ...valid(), sessions: undefined }), /sesiones/);
  assert.throws(() => validateBackup({ ...valid(), sessions: [{ date: 'mal', exercises: [] }] }), /fecha/);
  assert.throws(() => validateBackup({ ...valid(), library: [{ id: 1 }] }), /biblioteca/);
  assert.throws(() => validateBackup({ ...valid(), routines: {} }), /rutinas/);
});

test('sanitizeProfile solo conserva el nombre', () => {
  assert.deepEqual(sanitizeProfile({ name: 'Rodri', sex: 'Hombre', dob: '1991-05-01' }), { name: 'Rodri' });
  assert.deepEqual(sanitizeProfile(null), { name: '' });
  assert.deepEqual(sanitizeProfile({ name: 42 }), { name: '' });
});

test('repairWeightLog arregla fechas no válidas con el id y ordena', () => {
  const id = new Date(2026, 10, 3, 12).getTime();
  const log = repairWeightLog([{ id: 2, date: '2026-11-05', weight: 76 }, { id, date: 'custom', weight: 75 }]);
  assert.deepEqual(log.map(e => e.date), ['2026-11-03', '2026-11-05']);
});

test('localISODate da el día local, no el UTC', () => {
  assert.equal(localISODate(new Date(2026, 10, 12, 0, 30)), '2026-11-12');
  assert.equal(localISODate(new Date(2026, 10, 12, 23, 59)), '2026-11-12');
});

test('weekKey devuelve el lunes de la semana', () => {
  assert.equal(weekKey(new Date(2026, 10, 12)), '2026-11-09'); // jueves
  assert.equal(weekKey(new Date(2026, 10, 15)), '2026-11-09'); // domingo
  assert.equal(weekKey(new Date(2026, 10, 16)), '2026-11-16'); // lunes
});

test('parseLocalDate interpreta "YYYY-MM-DD" como medianoche local', () => {
  const d = parseLocalDate('2026-11-12');
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 10, 12, 0]);
});
