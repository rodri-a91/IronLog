import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcStreak, calcWeekStreak, maxSingleSessionVolume, totalVolume,
  ACHIEVEMENTS, achContext, unlockedIds, unlockDate,
} from '../js/core/achievements.js';
import { DEFAULT_LIBRARY } from '../js/core/library.js';
import { at, session, bw, timed, weight } from './helpers.js';

const ctx = achContext(DEFAULT_LIBRARY);
const day = (y, m, d, exs = [bw('flexiones', [10])]) => session(at(y, m, d), exs);

test('calcStreak: racha más larga de días consecutivos', () => {
  const s = [day(2026, 11, 2), day(2026, 11, 3), day(2026, 11, 4), day(2026, 11, 6), day(2026, 11, 7)];
  assert.equal(calcStreak(s), 3);
  assert.equal(calcStreak([]), 0);
});

test('calcStreak: dos sesiones el mismo día cuentan como un día', () => {
  assert.equal(calcStreak([session(at(2026, 11, 2, 9), []), session(at(2026, 11, 2, 20), []), day(2026, 11, 3)]), 2);
});

test('calcWeekStreak: semanas seguidas con 3 días, sin castigar los descansos', () => {
  // L-M-J de tres semanas seguidas (con descansos entre medias)
  const s = [];
  for (const monday of [2, 9, 16]) for (const off of [0, 1, 3]) s.push(day(2026, 11, monday + off));
  assert.equal(calcWeekStreak(s), 3);
});

test('calcWeekStreak: una semana con menos de 3 días corta la racha', () => {
  const s = [day(2026, 11, 2), day(2026, 11, 3), day(2026, 11, 5),   // semana 1: 3 días
             day(2026, 11, 9), day(2026, 11, 10),                     // semana 2: 2 días
             day(2026, 11, 16), day(2026, 11, 17), day(2026, 11, 18)]; // semana 3: 3 días
  assert.equal(calcWeekStreak(s), 1);
});

test('los totales de volumen no dan NaN si una sesión no trae totalVolume', () => {
  const s = [{ ...day(2026, 11, 2), totalVolume: undefined }, { ...day(2026, 11, 3), totalVolume: 500 }];
  assert.equal(totalVolume(s), 500);
  assert.equal(maxSingleSessionVolume(s), 500);
});

// Historial variado: rachas, calistenia, variantes, peso y horarios distintos
function richHistory() {
  const s = [];
  const variants = ['Inclinadas (manos en una mesa)', 'Normales', 'Bajada lenta de 4 s', 'Pies elevados en una silla', 'Arqueras'];
  let n = 0;
  for (let w = 0; w < 6; w++) {
    for (const off of [0, 1, 3]) {
      const d = 2 + w * 7 + off;
      const hour = n % 7 === 0 ? 7 : n % 5 === 0 ? 23 : 19;
      s.push(session(new Date(2026, 9, d, hour).toISOString(), [
        bw('flexiones', [8 + w * 3, 8 + w * 3], { variant: variants[Math.min(w, 4)], muscle: 'Pecho' }),
        bw('sentadilla-libre', [20, 20, 20], { muscle: 'Piernas' }),
        timed('plancha', [30 + w * 20]),
        weight('press-banca', [[40 + w * 10, 8], [40 + w * 10, 8]]),
      ], { totalVolume: (40 + w * 10) * 16, calories: 120 }));
      n++;
    }
  }
  return s;
}

test('todos los logros son monótonos: una sesión más nunca bloquea uno conseguido', () => {
  // unlockDate depende de esto (busca con búsqueda binaria la primera sesión que lo cumple)
  const asc = richHistory();
  let prev = new Set();
  for (let k = 1; k <= asc.length; k++) {
    const now = unlockedIds(asc.slice(0, k), ctx);
    for (const id of prev) assert.ok(now.has(id), `${id} se bloqueó al añadir la sesión ${k}`);
    prev = now;
  }
  assert.ok(prev.size >= 10, 'el historial de prueba desbloquea bastantes logros');
});

test('unlockDate devuelve la fecha de la primera sesión que cumple el logro', () => {
  const asc = richHistory();
  for (const a of ACHIEVEMENTS) {
    if (!a.check(asc, ctx)) continue;
    const date = unlockDate(a, asc, ctx);
    const k = asc.findIndex(s => s.date === date) + 1;
    assert.ok(a.check(asc.slice(0, k), ctx), `${a.id}: se cumple en esa sesión`);
    assert.equal(a.check(asc.slice(0, k - 1), ctx), false, `${a.id}: no se cumplía antes`);
  }
});

test('logros de calistenia', () => {
  const ids = unlockedIds(richHistory(), ctx);
  for (const id of ['push20', 'plank60', 'plank120', 'levelup', 'mastery', 'weeks4', 'early', 'night', 'legday10'])
    assert.ok(ids.has(id), id);
});

test('ningún logro tiene ids repetidos', () => {
  assert.equal(new Set(ACHIEVEMENTS.map(a => a.id)).size, ACHIEVEMENTS.length);
});
