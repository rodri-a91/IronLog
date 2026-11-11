// Consejo de progresión ("sube de variante") y récords personales.
import {exKey,exMode} from './library.js';
import {setHasData} from './sessions.js';

// ---- Progresión y récords ----
// Campo que mide el objetivo: segundos en los de tiempo, repeticiones en el resto
const targetField=e=>exMode(e)==='time'?'secs':'reps';

// Todas las series del objetivo hechas y todas en el tope del rango
function toppedTarget(e){
  if(!e.target)return false;
  const f=targetField(e);
  const done=e.sets.filter(s=>setHasData(e,s));
  return done.length>=e.target.sets&&done.every(s=>(parseFloat(s[f])||0)>=e.target.max);
}

// Consejo de progresión según las dos últimas veces que se hizo el ejercicio con objetivo
// (sessions de más reciente a más antigua). kind: 'up' toca subir, 'near' una vez en el tope.
// fromVariant: la variante a la que se refiere (si hoy ya has cambiado de variante, no aplica).
function progressionHint(libraryId,sessions,libById){
  const hist=[];
  for(const s of sessions){
    for(const e of s.exercises)if(e.libraryId===libraryId&&e.target&&!e.isCardio){hist.push(e);break;}
    if(hist.length===2)break;
  }
  const [last,prev]=hist;
  if(!last||!toppedTarget(last))return null;
  const fromVariant=last.variant||'';
  if(!(prev&&(prev.variant||'')===fromVariant&&toppedTarget(prev)))
    return {kind:'near',fromVariant,text:'La última vez llegaste al tope del rango. Si hoy también, toca subir.'};
  const mode=exMode(last);
  if(mode==='weight')return {kind:'up',fromVariant,text:'Dos sesiones en el tope del rango: sube el peso.'};
  const vs=libById[libraryId]?.variants||[];
  const i=vs.indexOf(last.variant);
  if(i>=0&&i<vs.length-1)return {kind:'up',fromVariant,nextVariant:vs[i+1],text:'Dos sesiones en el tope del rango: pasa a «'+vs[i+1]+'».'};
  return {kind:'up',fromVariant,text:mode==='time'
    ?'Dos sesiones en el tope del rango: sube el tiempo del objetivo.'
    :'Dos sesiones en el tope del rango: añade una serie o lastre.'};
}

// Récords de una sesión frente a las anteriores. Peso: kg máximos en una serie. Peso corporal y tiempo:
// reps o segundos máximos en una serie dentro de la misma variante. La primera vez no cuenta como récord.
function personalRecords(session,prevSessions){
  const out=[];
  session.exercises.forEach(e=>{
    const mode=exMode(e);
    if(mode==='cardio')return;
    const key=exKey(e);
    const field=mode==='weight'?'weight':targetField(e);
    const sameVariant=x=>mode==='weight'||(x.variant||'')===(e.variant||'');
    const best=ex=>Math.max(0,...ex.sets.filter(s=>setHasData(ex,s)).map(s=>parseFloat(s[field])||0));
    let prevBest=0,seen=false;
    prevSessions.forEach(s=>s.exercises.forEach(x=>{
      if(exKey(x)!==key||exMode(x)!==mode||!sameVariant(x))return;
      seen=true;prevBest=Math.max(prevBest,best(x));
    }));
    const cur=best(e);
    if(seen&&prevBest>0&&cur>prevBest){
      const unit=mode==='weight'?' kg':mode==='time'?' s':' reps';
      out.push({id:e.id,name:e.name,variant:mode==='weight'?null:e.variant,value:cur+unit,before:prevBest+unit});
    }
  });
  return out;
}

export {targetField,toppedTarget,progressionHint,personalRecords};
