// Utilidades para construir datos de prueba con el mismo formato que guarda la app.

let nextId = 1;
const id = () => nextId++;

// Fecha ISO a partir de una fecha local (mes 1-12), como la que guarda la app al terminar una sesión
export function at(y, m, d, hour = 19, min = 0) {
  return new Date(y, m - 1, d, hour, min).toISOString();
}

export function session(date, exercises, extra = {}) {
  return { id: id(), date, exercises, totalVolume: 0, totalCardioMin: 0, totalCardioKm: 0, calories: 0, ...extra };
}

// Ejercicio de peso corporal: reps = [12, 10, ...]
export function bw(libraryId, reps, { variant, target, name = libraryId, muscle = 'Pecho' } = {}) {
  return {
    id: id(), libraryId, name, muscle, isCardio: false, mode: 'bodyweight',
    ...(variant ? { variant } : {}), ...(target ? { target } : {}),
    sets: reps.map(r => ({ id: id(), reps: String(r), weight: '' })),
  };
}

// Ejercicio por tiempo: secs = [30, 45, ...]
export function timed(libraryId, secs, { variant, target, name = libraryId, muscle = 'Core' } = {}) {
  return {
    id: id(), libraryId, name, muscle, isCardio: false, mode: 'time',
    ...(variant ? { variant } : {}), ...(target ? { target } : {}),
    sets: secs.map(s => ({ id: id(), secs: String(s) })),
  };
}

// Ejercicio de peso: sets = [[kg, reps], ...]
export function weight(libraryId, sets, { target, name = libraryId, muscle = 'Pecho' } = {}) {
  return {
    id: id(), libraryId, name, muscle, isCardio: false,
    ...(target ? { target } : {}),
    sets: sets.map(([kg, reps]) => ({ id: id(), weight: String(kg), reps: String(reps) })),
  };
}

export const target = (sets, min, max) => ({ sets, min, max });
