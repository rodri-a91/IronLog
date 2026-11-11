import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toppedTarget, progressionHint, personalRecords } from '../js/core/progression.js';
import { DEFAULT_LIBRARY } from '../js/core/library.js';
import { at, session, bw, timed, weight, target } from './helpers.js';

const libById = Object.fromEntries(DEFAULT_LIBRARY.map(e => [e.id, e]));
const T = target(4, 8, 15);
const flex = (reps, variant = 'Normales', t = T) => bw('flexiones', reps, { variant, target: t, name: 'Flexión' });
// sessions de más reciente a más antigua, como las guarda la app
const hist = (...exs) => exs.map((e, i) => session(at(2026, 11, 20 - i), [e]));

test('toppedTarget: todas las series del objetivo en el tope', () => {
  assert.ok(toppedTarget(flex([15, 15, 15, 15])));
  assert.equal(toppedTarget(flex([15, 15, 15, 14])), false);
  assert.equal(toppedTarget(flex([15, 15, 15])), false, 'faltan series');
  assert.equal(toppedTarget(bw('flexiones', [15, 15, 15, 15])), false, 'sin objetivo');
});

test('progressionHint: dos veces en el tope con la misma variante, toca subir a la siguiente', () => {
  const h = progressionHint('flexiones', hist(flex([15, 15, 15, 15]), flex([16, 15, 15, 15])), libById);
  assert.equal(h.kind, 'up');
  assert.equal(h.fromVariant, 'Normales');
  assert.equal(h.nextVariant, 'Bajada lenta de 4 s');
});

test('progressionHint: una sola vez en el tope es un aviso de "casi"', () => {
  assert.equal(progressionHint('flexiones', hist(flex([15, 15, 15, 15]), flex([12, 12, 11, 10])), libById).kind, 'near');
  assert.equal(progressionHint('flexiones', hist(flex([15, 15, 15, 15])), libById).kind, 'near');
});

test('progressionHint: sin aviso si la última vez no llegaste al tope', () => {
  assert.equal(progressionHint('flexiones', hist(flex([12, 12, 12, 12]), flex([15, 15, 15, 15])), libById), null);
});

test('progressionHint: el tope con otra variante no cuenta para subir', () => {
  const h = progressionHint('flexiones', hist(flex([15, 15, 15, 15]), flex([15, 15, 15, 15], 'Inclinadas (manos en una mesa)')), libById);
  assert.equal(h.kind, 'near');
});

test('progressionHint: en peso, sube el peso; en la última variante, añade serie o lastre', () => {
  const press = sets => weight('press-banca', sets, { target: target(3, 6, 8) });
  assert.match(progressionHint('press-banca', hist(press([[60, 8], [60, 8], [60, 8]]), press([[60, 8], [60, 8], [60, 8]])), libById).text, /sube el peso/);
  const last = flex([15, 15, 15, 15], 'Arqueras');
  const h = progressionHint('flexiones', hist(last, flex([15, 15, 15, 15], 'Arqueras')), libById);
  assert.equal(h.nextVariant, undefined);
  assert.match(h.text, /serie o lastre/);
});

test('progressionHint: usa el objetivo de cada sesión, no uno común', () => {
  const easy = target(3, 5, 8);
  const h = progressionHint('flexiones', hist(flex([8, 8, 8], 'Normales', easy), flex([8, 8, 8], 'Normales', easy)), libById);
  assert.equal(h.kind, 'up');
});

test('progressionHint por tiempo', () => {
  const pl = secs => timed('plancha', secs, { variant: 'Normal', target: target(3, 30, 45) });
  const h = progressionHint('plancha', hist(pl([45, 45, 50]), pl([45, 46, 45])), libById);
  assert.equal(h.nextVariant, 'Apretando al máximo');
});

test('personalRecords: récord de reps dentro de la misma variante', () => {
  const prev = [session(at(2026, 11, 1), [flex([15, 14])])];
  const [r] = personalRecords(session(at(2026, 11, 3), [flex([16, 12])]), prev);
  assert.equal(r.value, '16 reps');
  assert.equal(r.before, '15 reps');
  assert.equal(r.variant, 'Normales');
});

test('personalRecords: la primera vez, o con otra variante, no es récord', () => {
  assert.deepEqual(personalRecords(session(at(2026, 11, 3), [flex([20])]), []), []);
  const prev = [session(at(2026, 11, 1), [flex([15], 'Inclinadas (manos en una mesa)')])];
  assert.deepEqual(personalRecords(session(at(2026, 11, 3), [flex([10])]), prev), []);
});

test('personalRecords: en peso cuentan los kg de series con repeticiones', () => {
  const prev = [session(at(2026, 11, 1), [weight('press-banca', [[60, 8]])])];
  const sinReps = weight('press-banca', [[70, 0]]);
  sinReps.sets[0].reps = '';
  assert.deepEqual(personalRecords(session(at(2026, 11, 3), [sinReps]), prev), []);
  assert.equal(personalRecords(session(at(2026, 11, 3), [weight('press-banca', [[62.5, 5]])]), prev)[0].value, '62.5 kg');
});
