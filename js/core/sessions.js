// Series y sesiones: qué cuenta como serie, ejercicios nuevos, totales y calorías.
import {parseLocalDate} from './dates.js';
import {MUSCLE_MET,exMode} from './library.js';
import {validTarget} from './routines.js';

// ---- Calorie estimation (MET-based, Ainsworth et al. 2011) ----
function estimateStrengthCals(exercise,bw){
  if(!bw||bw<=0)return 0;
  const met=MUSCLE_MET[exercise.muscle]||4.0;
  const timed=exMode(exercise)==='time';
  return Math.round(exercise.sets.reduce((t,s)=>{
    // Isométricos: el tiempo aguantado más el descanso de la serie
    if(timed){const secs=parseFloat(s.secs)||0;return secs?t+met*0.9*bw*(secs+90)/3600:t;}
    const reps=parseInt(s.reps)||0;if(!reps)return t;
    const hrs=(reps*3+90)/3600;
    const im=reps<=5?1.25:reps<=10?1.05:reps<=15?0.9:0.75;
    const lf=1+((parseFloat(s.weight)||0)/(bw*3))*0.15;
    return t+met*im*lf*bw*hrs;
  },0));
}

// MET por actividad (Compendium of Physical Activities, intensidad moderada); 7.0 para cardio personalizado
const CARDIO_MET={carrera:9.8,bicicleta:6.8,eliptica:5.0,'remo-cardio':7.0,cuerda:11.8};

function cardioSetMET(exercise,s){
  const min=parseFloat(s.duration)||0, km=parseFloat(s.distance)||0;
  // Carrera con distancia: ecuaciones metabólicas del ACSM según la velocidad (caminar por debajo de 6.5 km/h)
  if(exercise.libraryId==='carrera'&&min>0&&km>0){
    const mPerMin=km*1000/min, kmh=km/(min/60);
    const vo2=(kmh>=6.5?0.2:0.1)*mPerMin+3.5;
    return vo2/3.5;
  }
  return CARDIO_MET[exercise.libraryId]||7.0;
}

function estimateCardioCals(exercise,bw){
  if(!bw||bw<=0)return 0;
  return Math.round(exercise.sets.reduce((t,s)=>t+cardioSetMET(exercise,s)*bw*((parseFloat(s.duration)||0)/60),0));
}

function calcSessionCals(exercises,bw){
  return exercises.reduce((t,e)=>t+(e.isCardio?estimateCardioCals(e,bw):estimateStrengthCals(e,bw)),0);
}

// ---- Session helpers ----
function setHasData(e,s){
  const mode=exMode(e);
  if(mode==='cardio')return parseFloat(s.duration)>0||parseFloat(s.distance)>0;
  if(mode==='time')return parseFloat(s.secs)>0;
  // En peso corporal el lastre solo no es una serie: hacen falta repeticiones
  if(mode==='bodyweight')return parseInt(s.reps)>0;
  // Peso: hacen falta repeticiones (con 0 kg vale, p. ej. dominadas sin lastre). Una serie solo con kg
  // no es una serie: es fácil dejar las reps vacías creyendo que el valor gris de la vez anterior cuenta
  return parseInt(s.reps)>0;
}

function emptySet(mode,id=Date.now()){
  if(mode==='cardio')return {id,duration:'',distance:''};
  if(mode==='time')return {id,secs:''};
  return {id,reps:'',weight:''};
}

// variant: la última usada en ese ejercicio, si sigue existiendo; si no, la primera.
// target: el objetivo se copia en la sesión, así el historial no cambia si luego se edita la rutina;
// con objetivo se crean ya todas sus series
function newSessionExercise(libEx,lastVariant,target){
  const variants=libEx.isCardio?[]:(libEx.variants||[]);
  const variant=variants.includes(lastVariant)?lastVariant:variants[0];
  const t=!libEx.isCardio&&validTarget(target)?{...target}:null;
  const base=Date.now();
  return {id:base+Math.random(),libraryId:libEx.id,name:libEx.name,muscle:libEx.muscle,isCardio:libEx.isCardio,
    ...(!libEx.isCardio&&libEx.mode&&libEx.mode!=='weight'?{mode:libEx.mode}:{}),
    ...(variant?{variant}:{}),
    ...(t?{target:t}:{}),
    sets:Array.from({length:t?t.sets:1},(_,i)=>emptySet(exMode(libEx),base+i))};
}

function exerciseHasData(e){return e.sets.some(s=>s.weight||s.reps||s.duration||s.distance||s.secs);}

// Repeticiones totales en ejercicios de peso corporal (no suman al volumen en kg salvo el lastre)
function bodyweightReps(exercises){
  return exercises.filter(e=>exMode(e)==='bodyweight').reduce((t,e)=>t+e.sets.reduce((a,s)=>a+(parseInt(s.reps)||0),0),0);
}

// Quita series vacías y ejercicios que se quedan sin series
function cleanExercises(exercises){
  // La marca de serie hecha (done) solo sirve durante la sesión: no se guarda
  return exercises.map(e=>({...e,sets:e.sets.filter(s=>setHasData(e,s)).map(({done,...s})=>s)})).filter(e=>e.sets.length>0);
}

function sumSets(exercises,cardio,fn){
  return exercises.filter(e=>!!e.isCardio===cardio).reduce((t,e)=>t+e.sets.reduce((a,s)=>a+fn(s),0),0);
}

function sessionTotals(exercises,bw){
  return {
    totalVolume:sumSets(exercises,false,s=>(parseFloat(s.weight)||0)*(parseInt(s.reps)||0)),
    totalCardioMin:sumSets(exercises,true,s=>parseFloat(s.duration)||0),
    totalCardioKm:sumSets(exercises,true,s=>parseFloat(s.distance)||0),
    calories:bw>0?calcSessionCals(exercises,bw):0,
  };
}

// Peso corporal registrado en una fecha (último registro anterior o igual); si no hay, el más antiguo
function weightAt(weightLog,date){
  if(!weightLog.length)return 0;
  const t=new Date(date);
  let w=weightLog[0].weight;
  weightLog.forEach(e=>{if(parseLocalDate(e.date)<=t)w=e.weight;});
  return w;
}

export {estimateStrengthCals,CARDIO_MET,cardioSetMET,estimateCardioCals,calcSessionCals,setHasData,emptySet,newSessionExercise,exerciseHasData,bodyweightReps,cleanExercises,sumSets,sessionTotals,weightAt};
