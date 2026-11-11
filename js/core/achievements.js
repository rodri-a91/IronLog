// Logros: cálculos sobre el historial, definiciones y fecha de desbloqueo.
import {localISODate,parseLocalDate,weekKey} from './dates.js';
import {DEFAULT_LIBRARY,exKey} from './library.js';
import {bodyweightReps} from './sessions.js';

// ---- Achievements engine ----
// Los logros no se guardan: se calculan a partir del historial. Si se borra o edita una sesión, un logro
// puede volver a bloquearse. Cada check recibe las sesiones (en cualquier orden) y un contexto {libById}.

// Racha más larga de días consecutivos en todo el historial
function calcStreak(sessions){
  if(!sessions.length)return 0;
  const days=[...new Set(sessions.map(s=>new Date(s.date).toDateString()))].map(d=>new Date(d)).sort((a,b)=>b-a);
  let streak=1,max=1;
  for(let i=1;i<days.length;i++){
    // Math.round: en el cambio de hora un día dura 23 o 25 h
    const diff=Math.round((days[i-1]-days[i])/864e5);
    if(diff===1){streak++;max=Math.max(max,streak);}else streak=1;
  }
  return max;
}

// Racha más larga de semanas seguidas con al menos minDays días entrenados. Premia la constancia
// sin castigar los días de descanso (las rachas de días consecutivos sí lo hacen)
function calcWeekStreak(sessions,minDays=3){
  const days={};
  sessions.forEach(s=>{const k=weekKey(s.date);(days[k]=days[k]||new Set()).add(localISODate(new Date(s.date)));});
  const weeks=Object.keys(days).filter(k=>days[k].size>=minDays).sort();
  let streak=0,max=0,prev=null;
  weeks.forEach(k=>{
    const t=parseLocalDate(k);
    streak=prev&&Math.round((t-prev)/864e5)===7?streak+1:1;
    max=Math.max(max,streak);prev=t;
  });
  return max;
}

// Peso máximo en un ejercicio de la biblioteca por defecto. Se compara por libraryId (no por subcadena del nombre,
// que contaba p.ej. "Sentadilla búlgara" como sentadilla); sesiones sin libraryId se comparan por nombre exacto.
function maxWeightForExercise(sessions,libId){
  const defName=DEFAULT_LIBRARY.find(e=>e.id===libId)?.name;
  let max=0;
  sessions.forEach(s=>s.exercises.filter(e=>e.libraryId?e.libraryId===libId:e.name===defName).forEach(e=>{
    e.sets.forEach(set=>{const w=parseFloat(set.weight)||0;if(w>max)max=w;});
  }));
  return max;
}

// Máximo de un campo (reps, secs...) en una serie de un ejercicio
function maxSetValue(sessions,libId,field){
  let max=0;
  sessions.forEach(s=>s.exercises.forEach(e=>{
    if(e.libraryId!==libId)return;
    e.sets.forEach(set=>{const v=parseFloat(set[field])||0;if(v>max)max=v;});
  }));
  return max;
}

// ||0: sesiones de copias antiguas o editadas a mano pueden no traer los totales
function totalVolume(sessions){return sessions.reduce((t,s)=>t+(s.totalVolume||0),0);}

function totalSessions(sessions){return sessions.length;}

function totalCalories(sessions){return sessions.reduce((t,s)=>t+(s.calories||0),0);}

function totalCardioMin(sessions){return sessions.reduce((t,s)=>t+(s.totalCardioMin||0),0);}

function muscleGroupCount(sessions){
  const groups=new Set();
  sessions.forEach(s=>s.exercises.forEach(e=>{if(!e.isCardio)groups.add(e.muscle);}));
  return groups.size;
}

function uniqueExerciseCount(sessions){
  const names=new Set();
  sessions.forEach(s=>s.exercises.forEach(e=>names.add(exKey(e))));
  return names.size;
}

function maxSingleSessionVolume(sessions){
  return sessions.reduce((m,s)=>Math.max(m,s.totalVolume||0),0);
}

function maxSingleSessionCal(sessions){
  return sessions.reduce((m,s)=>Math.max(m,s.calories||0),0);
}

function daysActive(sessions){
  return new Set(sessions.map(s=>new Date(s.date).toDateString())).size;
}

function maxSessionBwReps(sessions){return sessions.reduce((m,s)=>Math.max(m,bodyweightReps(s.exercises)),0);}

function totalBwReps(sessions){return sessions.reduce((t,s)=>t+bodyweightReps(s.exercises),0);}

// La fecha de la sesión es la hora en que se guardó (al terminar)
function anySessionHour(sessions,test){return sessions.some(s=>test(new Date(s.date).getHours()));}

function legSessions(sessions){
  return sessions.filter(s=>s.exercises.some(e=>!e.isCardio&&(e.muscle==='Piernas'||e.muscle==='Glúteos'))).length;
}

// Progreso en variantes: para cada ejercicio con variantes, la posición de la primera que usaste
// y la más difícil a la que has llegado (según el orden actual de la biblioteca)
function variantLevels(sessions,ctx){
  const asc=[...sessions].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const lv={};
  asc.forEach(s=>s.exercises.forEach(e=>{
    const vs=ctx.libById[e.libraryId]?.variants;
    if(!e.variant||!vs||vs.length<2)return;
    const i=vs.indexOf(e.variant);
    if(i<0)return;
    if(!lv[e.libraryId])lv[e.libraryId]={first:i,max:i,last:vs.length-1};
    lv[e.libraryId].max=Math.max(lv[e.libraryId].max,i);
  }));
  return Object.values(lv);
}

const levelUp=(s,ctx)=>variantLevels(s,ctx).some(l=>l.max>l.first);

const mastery=(s,ctx)=>variantLevels(s,ctx).some(l=>l.max===l.last);

// Logros de sí/no: progreso 0 o 1
const flag=fn=>(s,ctx)=>({v:fn(s,ctx)?1:0,t:1});

const ACHIEVEMENTS=[
  // --- Constancia ---
  {id:'first',cat:'Constancia',icon:'🏁',name:'Primer paso',desc:'Completa tu primera sesión',color:'#378ADD',
   check:s=>totalSessions(s)>=1,prog:s=>({v:Math.min(totalSessions(s),1),t:1})},
  {id:'s5',cat:'Constancia',icon:'🔥',name:'En racha',desc:'5 sesiones completadas',color:'#E24B4A',
   check:s=>totalSessions(s)>=5,prog:s=>({v:Math.min(totalSessions(s),5),t:5})},
  {id:'s20',cat:'Constancia',icon:'💪',name:'Comprometido',desc:'20 sesiones completadas',color:'#E24B4A',
   check:s=>totalSessions(s)>=20,prog:s=>({v:Math.min(totalSessions(s),20),t:20})},
  {id:'s50',cat:'Constancia',icon:'🏆',name:'Veterano',desc:'50 sesiones completadas',color:'#BA7517',
   check:s=>totalSessions(s)>=50,prog:s=>({v:Math.min(totalSessions(s),50),t:50})},
  {id:'s100',cat:'Constancia',icon:'👑',name:'Centenario',desc:'100 sesiones completadas',color:'#BA7517',
   check:s=>totalSessions(s)>=100,prog:s=>({v:Math.min(totalSessions(s),100),t:100})},
  {id:'weeks4',cat:'Constancia',icon:'📅',name:'Mes sin fallar',desc:'4 semanas seguidas entrenando al menos 3 días',color:'#378ADD',
   check:s=>calcWeekStreak(s)>=4,prog:s=>({v:Math.min(calcWeekStreak(s),4),t:4})},
  {id:'weeks12',cat:'Constancia',icon:'🧱',name:'Disciplina de hierro',desc:'12 semanas seguidas entrenando al menos 3 días',color:'#BA7517',
   check:s=>calcWeekStreak(s)>=12,prog:s=>({v:Math.min(calcWeekStreak(s),12),t:12})},
  {id:'streak3',cat:'Constancia',icon:'📆',name:'3 días seguidos',desc:'Entrena 3 días consecutivos',color:'#E24B4A',
   check:s=>calcStreak(s)>=3,prog:s=>({v:Math.min(calcStreak(s),3),t:3})},
  {id:'streak7',cat:'Constancia',icon:'🗓️',name:'Siete de siete',desc:'7 días de entrenamiento consecutivos',color:'#E24B4A',
   check:s=>calcStreak(s)>=7,prog:s=>({v:Math.min(calcStreak(s),7),t:7})},
  {id:'days30',cat:'Constancia',icon:'🌟',name:'30 días activo',desc:'Entrena en 30 días distintos',color:'#BA7517',
   check:s=>daysActive(s)>=30,prog:s=>({v:Math.min(daysActive(s),30),t:30})},
  {id:'days100',cat:'Constancia',icon:'💯',name:'100 días activo',desc:'Entrena en 100 días distintos',color:'#BA7517',
   check:s=>daysActive(s)>=100,prog:s=>({v:Math.min(daysActive(s),100),t:100})},
  {id:'early',cat:'Constancia',icon:'🌅',name:'Madrugador',desc:'Termina una sesión antes de las 8:00',color:'#BA7517',
   check:s=>anySessionHour(s,h=>h>=4&&h<8),prog:flag(s=>anySessionHour(s,h=>h>=4&&h<8))},
  {id:'night',cat:'Constancia',icon:'🦉',name:'Búho',desc:'Termina una sesión entre las 22:00 y las 4:00',color:'#72243E',
   check:s=>anySessionHour(s,h=>h>=22||h<4),prog:flag(s=>anySessionHour(s,h=>h>=22||h<4))},

  // --- Fuerza ---
  {id:'vol1t',cat:'Fuerza',icon:'🏋️',name:'Primera tonelada',desc:'1.000 kg de volumen en una sesión',color:'#3B6D11',
   check:s=>maxSingleSessionVolume(s)>=1000,prog:s=>({v:Math.min(Math.round(maxSingleSessionVolume(s)),1000),t:1000})},
  {id:'vol5t',cat:'Fuerza',icon:'🦁',name:'Máquina',desc:'5.000 kg de volumen en una sesión',color:'#3B6D11',
   check:s=>maxSingleSessionVolume(s)>=5000,prog:s=>({v:Math.min(Math.round(maxSingleSessionVolume(s)),5000),t:5000})},
  {id:'totalvol100',cat:'Fuerza',icon:'📦',name:'100 toneladas',desc:'100.000 kg de volumen acumulado',color:'#3B6D11',
   check:s=>totalVolume(s)>=100000,prog:s=>({v:Math.min(Math.round(totalVolume(s)),100000),t:100000})},
  {id:'bench80',cat:'Fuerza',icon:'💥',name:'Press bestial',desc:'80 kg en press de banca',color:'#E24B4A',
   check:s=>maxWeightForExercise(s,'press-banca')>=80,
   prog:s=>({v:Math.min(Math.round(maxWeightForExercise(s,'press-banca')),80),t:80})},
  {id:'squat100',cat:'Fuerza',icon:'🦵',name:'Rey de la sentadilla',desc:'100 kg en sentadilla',color:'#3B6D11',
   check:s=>maxWeightForExercise(s,'sentadilla')>=100,
   prog:s=>({v:Math.min(Math.round(maxWeightForExercise(s,'sentadilla')),100),t:100})},
  {id:'deadlift100',cat:'Fuerza',icon:'⚡',name:'Peso muerto bestial',desc:'100 kg en peso muerto',color:'#BA7517',
   check:s=>maxWeightForExercise(s,'peso-muerto')>=100,
   prog:s=>({v:Math.min(Math.round(maxWeightForExercise(s,'peso-muerto')),100),t:100})},
  {id:'press60',cat:'Fuerza',icon:'🦅',name:'Piernas de acero',desc:'60 kg en prensa de piernas',color:'#3B6D11',
   check:s=>maxWeightForExercise(s,'prensa')>=60,
   prog:s=>({v:Math.min(Math.round(maxWeightForExercise(s,'prensa')),60),t:60})},

  // --- Calistenia ---
  {id:'bw100',cat:'Calistenia',icon:'🤸',name:'Centena',desc:'100 repeticiones de peso corporal en una sesión',color:'#185FA5',
   check:s=>maxSessionBwReps(s)>=100,prog:s=>({v:Math.min(maxSessionBwReps(s),100),t:100})},
  {id:'bw5000',cat:'Calistenia',icon:'🔁',name:'5.000 repeticiones',desc:'5.000 repeticiones de peso corporal acumuladas',color:'#185FA5',
   check:s=>totalBwReps(s)>=5000,prog:s=>({v:Math.min(totalBwReps(s),5000),t:5000})},
  {id:'push20',cat:'Calistenia',icon:'🙌',name:'Veinte seguidas',desc:'20 flexiones en una serie (cualquier variante)',color:'#E24B4A',
   check:s=>maxSetValue(s,'flexiones','reps')>=20,prog:s=>({v:Math.min(maxSetValue(s,'flexiones','reps'),20),t:20})},
  {id:'plank60',cat:'Calistenia',icon:'⏱️',name:'Minuto de acero',desc:'60 s de plancha en una serie',color:'#72243E',
   check:s=>maxSetValue(s,'plancha','secs')>=60,prog:s=>({v:Math.min(maxSetValue(s,'plancha','secs'),60),t:60})},
  {id:'plank120',cat:'Calistenia',icon:'🪨',name:'Roca',desc:'2 minutos de plancha en una serie',color:'#72243E',
   check:s=>maxSetValue(s,'plancha','secs')>=120,prog:s=>({v:Math.min(maxSetValue(s,'plancha','secs'),120),t:120})},
  {id:'levelup',cat:'Calistenia',icon:'📈',name:'Subes de nivel',desc:'Pasa a una variante más difícil en cualquier ejercicio',color:'#3B6D11',
   check:levelUp,prog:flag(levelUp)},
  {id:'mastery',cat:'Calistenia',icon:'🥋',name:'Maestría',desc:'Llega a la última variante de un ejercicio',color:'#BA7517',
   check:mastery,prog:flag(mastery)},

  // --- Quema ---
  {id:'cal500',cat:'Quema',icon:'🔆',name:'Horno',desc:'500 kcal en una sola sesión',color:'#BA7517',
   check:s=>maxSingleSessionCal(s)>=500,prog:s=>({v:Math.min(maxSingleSessionCal(s),500),t:500})},
  {id:'cal1000',cat:'Quema',icon:'☀️',name:'Incinerador',desc:'1.000 kcal en una sola sesión',color:'#BA7517',
   check:s=>maxSingleSessionCal(s)>=1000,prog:s=>({v:Math.min(maxSingleSessionCal(s),1000),t:1000})},
  {id:'totalcal10k',cat:'Quema',icon:'🌋',name:'10.000 kcal',desc:'10.000 kcal quemadas en total',color:'#BA7517',
   check:s=>totalCalories(s)>=10000,prog:s=>({v:Math.min(totalCalories(s),10000),t:10000})},
  {id:'cardio60',cat:'Quema',icon:'🏃',name:'Maratoniano',desc:'60 minutos de cardio en una sesión',color:'#185FA5',
   check:s=>s.some(x=>(x.totalCardioMin||0)>=60),prog:s=>({v:Math.min(s.reduce((m,x)=>Math.max(m,x.totalCardioMin||0),0),60),t:60})},

  // --- Variedad ---
  {id:'muscles5',cat:'Variedad',icon:'🧩',name:'Completo',desc:'Trabaja 5 grupos musculares distintos',color:'#72243E',
   check:s=>muscleGroupCount(s)>=5,prog:s=>({v:Math.min(muscleGroupCount(s),5),t:5})},
  {id:'muscles8',cat:'Variedad',icon:'🎯',name:'Atleta completo',desc:'Trabaja los 8 grupos musculares',color:'#72243E',
   check:s=>muscleGroupCount(s)>=8,prog:s=>({v:Math.min(muscleGroupCount(s),8),t:8})},
  {id:'exercises10',cat:'Variedad',icon:'📚',name:'Curioso',desc:'Prueba 10 ejercicios diferentes',color:'#72243E',
   check:s=>uniqueExerciseCount(s)>=10,prog:s=>({v:Math.min(uniqueExerciseCount(s),10),t:10})},
  {id:'exercises20',cat:'Variedad',icon:'🎨',name:'Enciclopedia',desc:'Prueba 20 ejercicios diferentes',color:'#72243E',
   check:s=>uniqueExerciseCount(s)>=20,prog:s=>({v:Math.min(uniqueExerciseCount(s),20),t:20})},
  {id:'legday10',cat:'Variedad',icon:'🍗',name:'Nunca me salto pierna',desc:'10 sesiones con ejercicios de pierna o glúteo',color:'#3B6D11',
   check:s=>legSessions(s)>=10,prog:s=>({v:Math.min(legSessions(s),10),t:10})},
];

function achContext(library){return {libById:Object.fromEntries(library.map(e=>[e.id,e]))};}

function unlockedIds(sessions,ctx){return new Set(ACHIEVEMENTS.filter(a=>a.check(sessions,ctx)).map(a=>a.id));}

// Fecha de la sesión con la que se consiguió un logro. Todos los logros son monótonos (una sesión más nunca
// los bloquea), así que basta una búsqueda binaria sobre el historial en orden cronológico.
function unlockDate(a,asc,ctx){
  let lo=1,hi=asc.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(a.check(asc.slice(0,mid),ctx))hi=mid;else lo=mid+1;}
  return asc[lo-1]?.date||null;
}

export {calcStreak,calcWeekStreak,maxWeightForExercise,maxSetValue,totalVolume,totalSessions,totalCalories,totalCardioMin,muscleGroupCount,uniqueExerciseCount,maxSingleSessionVolume,maxSingleSessionCal,daysActive,maxSessionBwReps,totalBwReps,anySessionHour,legSessions,variantLevels,levelUp,mastery,flag,ACHIEVEMENTS,achContext,unlockedIds,unlockDate};
