import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINES, validTarget, sanitizeRoutines, nextRoutine } from '../js/core/routines.js';
import { at, session, target } from './helpers.js';

test('validTarget', () => {
  assert.ok(validTarget(target(4, 8, 15)));
  assert.ok(validTarget(target(3, 30, 30)), 'mínimo y máximo iguales vale');
  assert.equal(validTarget(target(3, 12, 10)), false, 'máximo menor que el mínimo');
  assert.equal(validTarget(target(0, 8, 15)), false);
  assert.equal(validTarget(target(2.5, 8, 15)), false, 'las series son enteras');
  assert.equal(validTarget(null), false);
});

test('sanitizeRoutines: sin datos guardados, las rutinas por defecto', () => {
  assert.equal(sanitizeRoutines(undefined), DEFAULT_ROUTINES);
});

test('sanitizeRoutines da objetivos a las rutinas por defecto guardadas antes de existir', () => {
  const [r] = sanitizeRoutines([{ id: 'r-torso-a', name: 'Torso A', items: ['flexiones', 'plancha'] }]);
  assert.deepEqual(r.targets.flexiones, target(4, 8, 15));
  assert.deepEqual(r.targets.plancha, target(3, 30, 45));
  assert.equal(Object.keys(r.targets).length, 2, 'solo de los ejercicios que siguen en la rutina');
});

test('sanitizeRoutines no toca las rutinas propias ni los objetivos ya editados', () => {
  const [mine, edited] = sanitizeRoutines([
    { id: 'r-mia', name: 'Mía', items: ['flexiones'] },
    { id: 'r-torso-a', name: 'Torso A', items: ['flexiones'], targets: { flexiones: target(5, 10, 20) } },
  ]);
  assert.deepEqual(mine.targets, {});
  assert.deepEqual(edited.targets.flexiones, target(5, 10, 20));
});

test('sanitizeRoutines descarta rutinas mal formadas y objetivos no válidos', () => {
  const list = sanitizeRoutines([
    null, { id: 1 }, { id: 2, name: 'Sin items' },
    { id: 'r', name: 'Buena', items: ['a', null, 'b'], targets: { a: target(3, 12, 10), b: target(3, 8, 12), x: target(3, 8, 12) } },
  ]);
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].items, ['a', 'b']);
  assert.deepEqual(Object.keys(list[0].targets), ['b']);
});

const routines = [{ id: 'A', name: 'A', items: [] }, { id: 'B', name: 'B', items: [] }, { id: 'C', name: 'C', items: [] }];

test('nextRoutine: la siguiente a la última hecha, y vuelve a empezar', () => {
  assert.equal(nextRoutine([session(at(2026, 11, 3), [], { routineId: 'A' })], routines).id, 'B');
  assert.equal(nextRoutine([session(at(2026, 11, 3), [], { routineId: 'C' })], routines).id, 'A');
});

test('nextRoutine usa la sesión más reciente por fecha, no por posición', () => {
  const s = [session(at(2026, 11, 1), [], { routineId: 'A' }), session(at(2026, 11, 5), [], { routineId: 'B' })];
  assert.equal(nextRoutine(s, routines).id, 'C');
});

test('nextRoutine ignora sesiones sin rutina o de rutinas borradas', () => {
  const s = [
    session(at(2026, 11, 5), []),
    session(at(2026, 11, 4), [], { routineId: 'borrada' }),
    session(at(2026, 11, 1), [], { routineId: 'B' }),
  ];
  assert.equal(nextRoutine(s, routines).id, 'C');
  assert.equal(nextRoutine([session(at(2026, 11, 5), [])], routines), null);
});
