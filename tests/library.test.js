import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIBRARY, migrateLibrary, migrateExercise, migrateSessions, exMode } from '../js/core/library.js';

test('migrateLibrary añade los ejercicios por defecto que faltan', () => {
  const lib = migrateLibrary([{ id: 'c-1', name: 'Mío', muscle: 'Pecho', isCardio: false }]);
  assert.equal(lib.length, DEFAULT_LIBRARY.length + 1);
  assert.ok(lib.some(e => e.id === 'flexiones'));
  assert.equal(lib[0].id, 'c-1', 'los propios se conservan delante');
});

test('migrateLibrary da modo y variantes a un ejercicio por defecto guardado antes de existir', () => {
  const [plancha] = migrateLibrary([{ id: 'plancha', name: 'Plancha', muscle: 'Core', isCardio: false }]);
  assert.equal(plancha.mode, 'time');
  assert.ok(plancha.variants.length > 1);
});

test('migrateLibrary no pisa variantes editadas, aunque estén vacías', () => {
  const [flex] = migrateLibrary([{ id: 'flexiones', name: 'Flexión', muscle: 'Pecho', isCardio: false, mode: 'bodyweight', variants: [] }]);
  assert.deepEqual(flex.variants, []);
});

test('migrateLibrary renombra los nombres antiguos de los por defecto', () => {
  const [ex] = migrateLibrary([{ id: 'press-banca', name: 'Press banca', muscle: 'Pecho', isCardio: false }]);
  assert.equal(ex.name, 'Press de banca');
});

test('migrateExercise vincula por nombre las sesiones sin libraryId', () => {
  const e = migrateExercise({ id: 1, name: 'Dominadas', muscle: 'Espalda', sets: [] });
  assert.equal(e.libraryId, 'dominadas');
  assert.equal(e.name, 'Dominada');
});

test('migrateExercise respeta los nombres personalizados', () => {
  const e = { id: 1, libraryId: 'dominadas', name: 'Dominada supina', muscle: 'Espalda', sets: [] };
  assert.equal(migrateExercise(e), e);
});

test('migrateSessions migra todos los ejercicios de todas las sesiones', () => {
  const [s] = migrateSessions([{ id: 1, date: '2026-11-01T10:00:00Z', exercises: [{ id: 2, name: 'Press banca', sets: [] }] }]);
  assert.equal(s.exercises[0].libraryId, 'press-banca');
});

test('exMode: cardio manda sobre el modo, y sin modo es peso', () => {
  assert.equal(exMode({ isCardio: true, mode: 'time' }), 'cardio');
  assert.equal(exMode({ isCardio: false }), 'weight');
  assert.equal(exMode({ isCardio: false, mode: 'bodyweight' }), 'bodyweight');
});
