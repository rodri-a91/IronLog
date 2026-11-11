// Músculos de cada ejercicio y carga (series) por zona del cuerpo para el mapa muscular.
import {setHasData} from './sessions.js';

// ---- Body Map ----
// Zonas del dibujo: chest, deltF (hombro frontal), deltS (lateral), deltB (posterior), traps, upperback
// (romboides/infraespinoso), lats, lowerback, biceps, triceps, forearms, abs, obliques, glutes, quads,
// hamstrings, calves.
// Músculos principales (p) y secundarios (s) de cada ejercicio por defecto
const EXERCISE_REGIONS={
  'press-banca':      {p:['chest'],s:['deltF','triceps']},
  'press-inclinado':  {p:['chest','deltF'],s:['triceps']},
  'aperturas':        {p:['chest'],s:['deltF']},
  'fondos':           {p:['chest','triceps'],s:['deltF']},
  'jalones':          {p:['lats'],s:['biceps','upperback','deltB']},
  'remo-barra':       {p:['lats','upperback'],s:['biceps','deltB','lowerback']},
  'dominadas':        {p:['lats'],s:['biceps','upperback','deltB']},
  'remo-polea':       {p:['lats','upperback'],s:['biceps','deltB']},
  'sentadilla':       {p:['quads','glutes'],s:['hamstrings','lowerback']},
  'prensa':           {p:['quads','glutes'],s:['hamstrings']},
  'peso-muerto':      {p:['hamstrings','glutes','lowerback'],s:['quads','traps','forearms']},
  'extension-cuad':   {p:['quads'],s:[]},
  'curl-femoral':     {p:['hamstrings'],s:['calves']},
  'press-militar':    {p:['deltF','deltS'],s:['triceps','traps']},
  'elevaciones-lat':  {p:['deltS'],s:['traps']},
  'pajaro':           {p:['deltB'],s:['upperback']},
  'curl-biceps':      {p:['biceps'],s:['forearms']},
  'curl-martillo':    {p:['biceps','forearms'],s:[]},
  'press-frances':    {p:['triceps'],s:[]},
  'extension-triceps':{p:['triceps'],s:[]},
  'crunch':           {p:['abs'],s:['obliques']},
  'plancha':          {p:['abs'],s:['obliques','lowerback']},
  'hip-thrust':       {p:['glutes'],s:['hamstrings']},
  'patada-gluteo':    {p:['glutes'],s:['hamstrings']},
  'carrera':          {p:['quads','hamstrings','calves'],s:['glutes']},
  'bicicleta':        {p:['quads'],s:['hamstrings','glutes','calves']},
  'eliptica':         {p:['quads','glutes'],s:['hamstrings','calves']},
  'remo-cardio':      {p:['lats','quads'],s:['upperback','biceps','hamstrings','glutes']},
  'cuerda':           {p:['calves'],s:['quads','deltS']},
  // Calistenia
  'flexiones':        {p:['chest','triceps'],s:['deltF','abs']},
  'flexiones-pica':   {p:['deltF','deltS'],s:['triceps','traps']},
  'flexiones-cerradas':{p:['triceps','chest'],s:['deltF']},
  'fondos-silla':     {p:['triceps'],s:['chest','deltF']},
  'remo-mesa':        {p:['lats','upperback'],s:['biceps','deltB']},
  'remo-toalla':      {p:['lats','upperback'],s:['biceps','deltB','forearms']},
  'ytw':              {p:['upperback','deltB'],s:['traps']},
  'sentadilla-libre': {p:['quads','glutes'],s:['hamstrings']},
  'zancada-atras':    {p:['quads','glutes'],s:['hamstrings','calves']},
  'bulgara':          {p:['quads','glutes'],s:['hamstrings']},
  'curl-toalla':      {p:['hamstrings'],s:['glutes','calves']},
  'gemelos':          {p:['calves'],s:[]},
  'puente-gluteo':    {p:['glutes'],s:['hamstrings']},
  'hip-thrust-sofa':  {p:['glutes'],s:['hamstrings']},
  'dead-bug':         {p:['abs'],s:['obliques']},
  'hollow':           {p:['abs'],s:['obliques']},
  'plancha-lateral':  {p:['obliques'],s:['abs','glutes']},
  'wall-sit':         {p:['quads'],s:['glutes']},
};

// Ejercicios personalizados: según su grupo muscular
const GROUP_REGIONS={
  Pecho:{p:['chest'],s:['deltF','triceps']},
  Espalda:{p:['lats','upperback'],s:['biceps','deltB']},
  Piernas:{p:['quads','hamstrings'],s:['glutes','calves']},
  Hombros:{p:['deltF','deltS'],s:['deltB','traps']},
  'Bíceps':{p:['biceps'],s:['forearms']},
  'Tríceps':{p:['triceps'],s:[]},
  Core:{p:['abs'],s:['obliques']},
  'Glúteos':{p:['glutes'],s:['hamstrings']},
  Cardio:{p:['quads','calves'],s:['hamstrings','glutes']},
};

const CARDIO_MIN_PER_SET=10; // 10 min de cardio cuentan como 1 serie

const SECONDARY_FACTOR=0.5;

// Series equivalentes de un ejercicio
function exerciseLoad(ex){
  if(ex.isCardio)return ex.sets.reduce((t,s)=>t+(parseFloat(s.duration)||0),0)/CARDIO_MIN_PER_SET;
  return ex.sets.filter(s=>setHasData(ex,s)).length;
}

// Series por zona del cuerpo; los músculos secundarios suman media serie
function regionLoads(exercises){
  const loads={};
  exercises.forEach(ex=>{
    const load=exerciseLoad(ex);
    if(!load)return;
    const {p,s}=EXERCISE_REGIONS[ex.libraryId]||GROUP_REGIONS[ex.muscle]||{p:[],s:[]};
    p.forEach(k=>loads[k]=(loads[k]||0)+load);
    s.forEach(k=>loads[k]=(loads[k]||0)+load*SECONDARY_FACTOR);
  });
  return loads;
}

// Escala absoluta (no relativa a la sesión): una sesión ligera no aparece "al máximo"
const LOAD_LEVELS=[{max:2.5,label:'1–2'},{max:4.5,label:'3–4'},{max:7.5,label:'5–7'},{max:Infinity,label:'8+'}];

function loadLevel(v){return v>0?LOAD_LEVELS.findIndex(l=>v<l.max)+1:0;}

export {EXERCISE_REGIONS,GROUP_REGIONS,CARDIO_MIN_PER_SET,SECONDARY_FACTOR,exerciseLoad,regionLoads,LOAD_LEVELS,loadLevel};
