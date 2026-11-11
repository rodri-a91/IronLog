import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setHasData, newSessionExercise, cleanExercises, sessionTotals, bodyweightReps } from '../js/core/sessions.js';
import { DEFAULT_BY_ID } from '../js/core/library.js';
import { bw, timed, weight, target } from './helpers.js';

test('setHasData en peso exige repeticiones (una serie solo con kg no cuenta)', () => {
  const e = { isCardio: false };
  assert.equal(setHasData(e, { weight: '60', reps: '' }), false);
  assert.equal(setHasData(e, { weight: '60', reps: '8' }), true);
  assert.equal(setHasData(e, { weight: '', reps: '8' }), true, 'sin lastre también vale');
});

test('setHasData en peso corporal exige repeticiones; el lastre solo no cuenta', () => {
  const e = { isCardio: false, mode: 'bodyweight' };
  assert.equal(setHasData(e, { weight: '5', reps: '' }), false);
  assert.equal(setHasData(e, { weight: '', reps: '12' }), true);
});

test('setHasData por tiempo y cardio', () => {
  assert.equal(setHasData({ isCardio: false, mode: 'time' }, { secs: '40' }), true);
  assert.equal(setHasData({ isCardio: false, mode: 'time' }, { secs: '0' }), false);
  assert.equal(setHasData({ isCardio: true }, { duration: '', distance: '3' }), true);
});

test('newSessionExercise usa la última variante si sigue existiendo', () => {
  const lib = DEFAULT_BY_ID['flexiones'];
  assert.equal(newSessionExercise(lib, 'Normales').variant, 'Normales');
  assert.equal(newSessionExercise(lib, 'Ya no existe').variant, lib.variants[0]);
});

test('newSessionExercise con objetivo crea todas sus series y copia el objetivo', () => {
  const t = target(4, 8, 15);
  const e = newSessionExercise(DEFAULT_BY_ID['flexiones'], undefined, t);
  assert.equal(e.sets.length, 4);
  assert.deepEqual(e.target, t);
  assert.notEqual(e.target, t, 'es una copia, no la misma referencia que la rutina');
  assert.equal(new Set(e.sets.map(s => s.id)).size, 4, 'ids de serie distintos');
});

test('newSessionExercise ignora objetivos no válidos y en cardio', () => {
  assert.equal(newSessionExercise(DEFAULT_BY_ID['flexiones'], undefined, target(0, 8, 15)).target, undefined);
  const c = newSessionExercise(DEFAULT_BY_ID['carrera'], undefined, target(3, 8, 15));
  assert.equal(c.target, undefined);
  assert.equal(c.sets.length, 1);
});

test('cleanExercises quita series vacías, ejercicios vacíos y la marca de serie hecha', () => {
  const e = bw('flexiones', [12, '']);
  e.sets[0].done = true;
  const [clean, ...rest] = cleanExercises([e, bw('fondos-silla', [''])]);
  assert.equal(rest.length, 0);
  assert.equal(clean.sets.length, 1);
  assert.equal('done' in clean.sets[0], false);
});

test('sessionTotals: el volumen en kg solo cuenta pesos reales y lastre', () => {
  const lastre = bw('flexiones', [10]);
  lastre.sets[0].weight = '5';
  const t = sessionTotals([weight('press-banca', [[60, 8]]), bw('flexiones', [15]), lastre, timed('plancha', [60])], 0);
  assert.equal(t.totalVolume, 60 * 8 + 5 * 10);
});

test('bodyweightReps suma solo los ejercicios de peso corporal', () => {
  assert.equal(bodyweightReps([bw('flexiones', [12, 10]), weight('press-banca', [[60, 8]]), timed('plancha', [30])]), 22);
});
