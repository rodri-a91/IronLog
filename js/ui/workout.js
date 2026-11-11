// Pestaña Hoy: sesión en curso, borrador, cronómetro, descanso y rutinas.
import {ACHIEVEMENTS,achContext,unlockedIds} from '../core/achievements.js';
import {fmtDuration} from '../core/dates.js';
import {exKey,migrateExercise} from '../core/library.js';
import {personalRecords,progressionHint} from '../core/progression.js';
import {nextRoutine,validTarget} from '../core/routines.js';
import {calcSessionCals,cleanExercises,exerciseHasData,newSessionExercise,sessionTotals,setHasData} from '../core/sessions.js';
import {loadState,saveState} from '../storage.js';
import {ExercisePicker} from './common.js';
import {ExerciseBlock,NewExerciseModal} from './exercise.js';
import {ProfileBanner} from './profile.js';
import {SessionCompleteModal} from './summary.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

// ---- Rest timer ----
const REST_KEY='il_restSecs';

const REST_OPTIONS=[45,60,75,90,120,150,180];

// iOS solo deja sonar audio web si el AudioContext se crea o reanuda dentro de un toque del usuario:
// unlockAudio() se llama al pulsar ✓ y el pitido final reutiliza ese contexto
let audioCtx=null;

function unlockAudio(){
  try{
    if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC();}
    if(audioCtx.state==='suspended')audioCtx.resume();
  }catch(e){}
}

function playRestEndBeep(){
  try{
    if(!audioCtx)return;
    const t0=audioCtx.currentTime;
    [0,0.25,0.5].forEach((d,i)=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type='sine';o.frequency.value=i===2?1320:880;
      g.gain.setValueAtTime(0.0001,t0+d);
      g.gain.exponentialRampToValueAtTime(0.4,t0+d+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+d+0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0+d);o.stop(t0+d+0.2);
    });
  }catch(e){}
  try{navigator.vibrate?.([200,100,200]);}catch(e){} // Android; iOS lo ignora
}

// Cuenta atrás calculada con la hora de fin (no con un contador), así sigue siendo exacta aunque iOS
// congele los timers con la pantalla apagada. Se repinta solo este componente.
function RestTimer({endAt,total,onAdjust,onSkip,onDone}){
  const [now,setNow]=useState(Date.now());
  const finished=now>=endAt;
  const firedRef=useRef(false);
  useEffect(()=>{firedRef.current=false;setNow(Date.now());},[endAt]);
  useEffect(()=>{
    const tick=()=>setNow(Date.now());
    const id=setInterval(tick,250);
    document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(id);document.removeEventListener('visibilitychange',tick);};
  },[]);
  useEffect(()=>{
    if(!finished||firedRef.current)return;
    firedRef.current=true;
    // Si la app estaba en segundo plano cuando terminó, no pitar al volver mucho después
    if(document.visibilityState==='visible'&&Date.now()-endAt<5000)playRestEndBeep();
    const t=setTimeout(onDone,4000);
    return()=>clearTimeout(t);
  },[finished]);
  // Mantener la pantalla encendida durante el descanso, si el navegador lo permite
  useEffect(()=>{
    let lock=null,cancelled=false;
    const req=()=>{
      if(cancelled||document.visibilityState!=='visible'||!navigator.wakeLock)return;
      navigator.wakeLock.request('screen').then(l=>{if(cancelled)l.release();else lock=l;}).catch(()=>{});
    };
    req();
    document.addEventListener('visibilitychange',req); // el bloqueo se pierde al salir de la app
    return()=>{cancelled=true;document.removeEventListener('visibilitychange',req);lock?.release().catch(()=>{});};
  },[]);
  const left=Math.max(0,Math.ceil((endAt-now)/1000));
  const pct=total>0?Math.min(100,(left/total)*100):0;
  return h('div',{className:'rest-bar'+(finished?' finished':''),role:'timer','aria-live':finished?'assertive':'off'},
    h('div',{className:'rest-inner'},
      h('div',{className:'rest-time'},finished?'¡Ya!':fmtDuration(left)),
      h('div',{style:{flex:1,minWidth:0}},
        h('div',{className:'rest-label'},finished?'A por la siguiente serie':'Descanso'),
        h('div',{className:'rest-track'},h('div',{className:'rest-fill',style:{width:pct+'%'}}))
      ),
      !finished&&h('div',{className:'rest-btns'},
        h('button',{className:'btn btns btnsm',style:{padding:'0 10px'},onClick:()=>onAdjust(-15)},'−15'),
        h('button',{className:'btn btns btnsm',style:{padding:'0 10px'},onClick:()=>onAdjust(15)},'+15'),
        h('button',{className:'btn btnp btnsm',onClick:onSkip},'Saltar')
      ),
      finished&&h('button',{className:'btn btns btnsm',onClick:onSkip},'Cerrar')
    )
  );
}

const DRAFT_KEY='il_draft';

const INACTIVITY_MS=15*60*1000;

// Cronómetro aislado: solo este componente se repinta cada segundo, no toda la pestaña.
// Detecta la inactividad y avisa al padre con onAutoPause(momento en que se congela).
function WorkoutTimer({timerStart,lastActivity,pausedAt,onAutoPause}){
  // Si ya se superó la inactividad (p.ej. borrador recuperado horas después), mostrar el tiempo congelado
  const endAt=()=>pausedAt||Math.min(Date.now(),lastActivity+INACTIVITY_MS);
  const [elapsed,setElapsed]=useState(()=>Math.max(0,Math.floor((endAt()-timerStart)/1000)));
  useEffect(()=>{
    const tick=()=>{
      if(!pausedAt&&Date.now()-lastActivity>INACTIVITY_MS){onAutoPause(lastActivity+INACTIVITY_MS);return false;}
      setElapsed(Math.max(0,Math.floor((endAt()-timerStart)/1000)));
      return true;
    };
    if(!tick()||pausedAt)return;
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[timerStart,lastActivity,pausedAt]);

  return h('div',{className:'workout-timer',style:pausedAt?{borderColor:'#BA7517'}:{}},
    pausedAt
      ? h('div',{style:{width:8,height:8,borderRadius:'50%',background:'#BA7517',flexShrink:0}})
      : h('div',{className:'timer-dot'}),
    h('div',{className:'timer-display',style:pausedAt?{color:'#BA7517'}:{}},fmtDuration(elapsed)),
    h('div',{className:'timer-label'},pausedAt?'Pausado por inactividad':'Tiempo de sesión')
  );
}

// Nombre para guardar la sesión actual como rutina
function RoutineNameModal({initialName,onSave,onClose}){
  const [name,setName]=useState(initialName||'');
  function save(){if(!name.trim()){alert('Escribe un nombre');return;}onSave(name.trim());onClose();}
  return h('div',{className:'overlay',onClick:e=>{if(e.target===e.currentTarget)onClose();}},
    h('div',{className:'modal'},
      h('div',{className:'modal-handle'}),
      h('div',{className:'modaltitle'},'Guardar como rutina'),
      h('div',{className:'fg'},h('label',null,'Nombre'),h('input',{value:name,onChange:e=>setName(e.target.value),placeholder:'Ej: Torso A',autoFocus:true})),
      h('div',{className:'method-note',style:{marginTop:0,marginBottom:12}},'Se guardan los ejercicios en este orden, sin las series. Puedes editarla después en Ejercicios → Rutinas.'),
      h('div',{style:{display:'flex',gap:8}},
        h('button',{className:'btn btnp',style:{flex:1},onClick:save},'Guardar'),
        h('button',{className:'btn btns',onClick:onClose},'Cancelar')
      )
    )
  );
}

function WorkoutTab({sessions,library,routines,onSave,profile,weightLog,onGoToProfile,onAddToLibrary,onAddRoutine,onActiveSessionChange}){
  const [exercises,setExercises]=useState(()=>{
    // Restore draft on mount if one exists
    try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');return (d?.exercises||[]).map(migrateExercise);}catch{return[];}
  });
  const [timerStart,setTimerStart]=useState(()=>{
    try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');return d?.timerStart||null;}catch{return null;}
  });
  const [lastActivity,setLastActivity]=useState(()=>{
    try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');return d?.lastActivity||Date.now();}catch{return Date.now();}
  });
  // Última rutina cargada en esta sesión: se guarda con la sesión para saber cuál toca después
  const [routineId,setRoutineId]=useState(()=>{
    try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');return d?.routineId||null;}catch{return null;}
  });
  const [pausedAt,setPausedAt]=useState(()=>{
    try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');return d?.pausedAt||null;}catch{return null;}
  });
  const [showNewEx,setShowNewEx]=useState(false);
  const [newExName,setNewExName]=useState('');
  const [completedSession,setCompletedSession]=useState(null);
  const [showRoutineName,setShowRoutineName]=useState(false);
  const [newAchievements,setNewAchievements]=useState([]);
  const [records,setRecords]=useState([]);
  const [nextHints,setNextHints]=useState([]);
  // Descanso en curso: {endAt, total} o null. La duración por defecto se recuerda entre sesiones
  const [rest,setRest]=useState(null);
  const [restSecs,setRestSecs]=useState(()=>{const v=loadState(REST_KEY,90);return REST_OPTIONS.includes(v)?v:90;});
  function startRest(){unlockAudio();setRest({endAt:Date.now()+restSecs*1000,total:restSecs});}
  function adjustRest(d){setRest(r=>r&&{endAt:Math.max(Date.now(),r.endAt+d*1000),total:Math.max(1,r.total+d)});}
  function changeRestSecs(v){setRestSecs(v);saveState(REST_KEY,v);}
  const [draftBanner,setDraftBanner]=useState(()=>{
    try{
      const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
      if(d?.exercises?.length>0){
        const date=d.savedAt?new Date(d.savedAt).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}):null;
        return date;
      }
    }catch{}
    return null;
  });
  const bottomRef=useRef();
  const firstRender=useRef(true);
  const currentWeight=weightLog.length>0?weightLog[weightLog.length-1].weight:0;
  const estTotal=currentWeight>0?calcSessionCals(exercises,currentWeight):null;
  // Cada ejercicio tal como se hizo la última vez (series y variante; sessions va de más reciente a más antigua).
  // Memoizado: antes se recorría todo el historial por cada ejercicio en cada tick del cronómetro.
  const prevExMap=useMemo(()=>{
    const byKey={},byName={};
    sessions.forEach(s=>s.exercises.forEach(x=>{
      if(!(exKey(x) in byKey))byKey[exKey(x)]=x;
      if(!(x.name in byName))byName[x.name]=x;
    }));
    return {byKey,byName};
  },[sessions]);
  const prevExFor=e=>prevExMap.byKey[exKey(e)]||prevExMap.byName[e.name]||null;
  const libById=useMemo(()=>Object.fromEntries(library.map(e=>[e.id,e])),[library]);
  const nextR=useMemo(()=>nextRoutine(sessions,routines),[sessions,routines]);

  // Autosave draft whenever relevant state changes
  useEffect(()=>{
    if(exercises.length>0){
      saveState(DRAFT_KEY,{exercises,timerStart,lastActivity,pausedAt,routineId,savedAt:new Date().toISOString()});
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  },[exercises,timerStart,lastActivity,pausedAt,routineId]);

  // Notify App whether there's an active session
  useEffect(()=>{onActiveSessionChange&&onActiveSessionChange(exercises.length>0);},[exercises.length]);

  // Arranca el cronómetro al añadir el primer ejercicio (o varios de golpe con una rutina) y lo reinicia al vaciar
  useEffect(()=>{
    if(exercises.length>0&&!timerStart){
      const start=Date.now();
      setTimerStart(start);setLastActivity(start);setPausedAt(null);
    }
    if(exercises.length===0){
      setTimerStart(null);setPausedAt(null);setRoutineId(null);
    }
  },[exercises.length]);

  // Track activity & auto-resume on any change to exercises (skip first render)
  useEffect(()=>{
    if(firstRender.current){firstRender.current=false;return;}
    if(exercises.length===0)return;
    const now=Date.now();
    setLastActivity(now);
    setDraftBanner(null); // al retomar la sesión el borrador ya está recuperado
    // Si la pausa por inactividad no llegó a detectarse (iOS congela los timers en segundo plano),
    // se aplica ahora: la sesión se considera pausada desde lastActivity + 15 min
    const pauseStart=pausedAt||(timerStart&&now-lastActivity>INACTIVITY_MS?lastActivity+INACTIVITY_MS:null);
    if(pauseStart){
      // Reanudar: se desplaza el inicio lo que duró la pausa para que el tiempo siga donde estaba
      setTimerStart(ts=>ts+(now-pauseStart));
      setPausedAt(null);
    }
  },[exercises]);

  // Nuevo ejercicio de sesión con la variante de la última vez. Sin objetivo de rutina, usa el de la
  // última sesión en que el ejercicio tenía uno
  function lastTarget(libId){
    for(const s of sessions)for(const e of s.exercises)if(e.libraryId===libId&&e.target)return e.target;
    return null;
  }
  const fromLibrary=(libEx,target)=>newSessionExercise(libEx,prevExMap.byKey['id:'+libEx.id]?.variant,target||lastTarget(libEx.id));
  function selectFromLibrary(libEx){
    setDraftBanner(null);
    setExercises(prev=>[...prev,fromLibrary(libEx)]);
    // Scroll to bottom after render
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth',block:'end'}),80);
  }
  // Añade los ejercicios de la rutina que aún no estén en la sesión (no borra nada de lo que hay)
  function loadRoutine(r){
    setDraftBanner(null);
    setRoutineId(r.id);
    setExercises(prev=>{
      const have=new Set(prev.map(e=>e.libraryId));
      const add=r.items.map(id=>libById[id]).filter(x=>x&&!have.has(x.id)).map(x=>fromLibrary(x,r.targets?.[x.id]));
      return add.length?[...prev,...add]:prev;
    });
  }
  function saveAsRoutine(name){
    const items=[...new Set(exercises.map(e=>e.libraryId).filter(id=>id&&libById[id]))];
    if(!items.length){alert('Ningún ejercicio de la sesión está en la biblioteca.');return;}
    // Los objetivos de la sesión pasan a la rutina
    const targets=Object.fromEntries(exercises.filter(e=>items.includes(e.libraryId)&&validTarget(e.target)).map(e=>[e.libraryId,{...e.target}]));
    onAddRoutine({id:'r-'+Date.now(),name,items,targets});
  }
  function saveNewToLibrary(libEx){onAddToLibrary(libEx);selectFromLibrary(libEx);}
  function discardSession(){
    if(!confirm('¿Descartar la sesión actual? Se perderán todos los ejercicios y series.'))return;
    setExercises([]);setTimerStart(null);setPausedAt(null);setRest(null);
    setDraftBanner(null);
    localStorage.removeItem(DRAFT_KEY);
  }
  function save(){
    if(!exercises.length){alert('Añade al menos un ejercicio');return;}
    const cleaned=cleanExercises(exercises);
    if(!cleaned.length){alert('No hay ninguna serie con datos. Rellena al menos una serie antes de guardar.');return;}
    const dropped=exercises.length-cleaned.length;
    // Series empezadas pero incompletas (p. ej. kg sin repeticiones): se avisa en vez de perderlas en silencio
    const halfSets=exercises.reduce((t,e)=>t+e.sets.filter(s=>(s.weight||s.reps||s.secs||s.duration||s.distance)&&!setHasData(e,s)).length,0);
    const msg='¿Terminar y guardar la sesión?'
      +(dropped>0?'\n\nSe ignorará'+(dropped>1?'n ':' ')+dropped+' ejercicio'+(dropped>1?'s':'')+' sin datos.':'')
      +(halfSets>0?'\n\n'+(halfSets>1?halfSets+' series están incompletas (sin repeticiones) y no se guardarán.':'1 serie está incompleta (sin repeticiones) y no se guardará.'):'');
    if(!confirm(msg))return;
    // Sin contar el tiempo inactivo aunque la pausa aún no se haya detectado
    const realEnd=pausedAt||Math.min(Date.now(),lastActivity+INACTIVITY_MS);
    const durationSecs=timerStart?Math.floor((realEnd-timerStart)/1000):0;
    const session={id:Date.now(),date:new Date().toISOString(),exercises:cleaned,...sessionTotals(cleaned,currentWeight),durationSecs,
      ...(routineId?{routineId}:{})};
    onSave(session);
    setExercises([]);setTimerStart(null);setPausedAt(null);setRest(null);
    setDraftBanner(null);
    localStorage.removeItem(DRAFT_KEY);
    // Logros que desbloquea esta sesión: los que se cumplen ahora y no se cumplían antes
    const ctx=achContext(library);
    const before=unlockedIds(sessions,ctx),after=unlockedIds([session,...sessions],ctx);
    setNewAchievements(ACHIEVEMENTS.filter(a=>after.has(a.id)&&!before.has(a.id)));
    setRecords(personalRecords(session,sessions));
    // Lo que toca subir la próxima vez, contando ya con esta sesión
    const withThis=[session,...sessions];
    setNextHints(session.exercises.map(e=>({e,hint:e.target?progressionHint(e.libraryId,withThis,libById):null}))
      .filter(x=>x.hint?.kind==='up').map(x=>({id:x.e.id,name:x.e.name,text:x.hint.text})));
    setCompletedSession(session);
  }
  return h('div',{className:'content'},
    showNewEx&&h(NewExerciseModal,{initialName:newExName,onSave:saveNewToLibrary,onClose:()=>setShowNewEx(false)}),
    completedSession&&h(SessionCompleteModal,{session:completedSession,newAchievements,records,nextHints,onClose:()=>setCompletedSession(null)}),
    showRoutineName&&h(RoutineNameModal,{onSave:saveAsRoutine,onClose:()=>setShowRoutineName(false)}),
    h('div',{className:'ptitle'},'HOY'),
    h('div',{className:'psub'},new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})),
    h(ProfileBanner,{profile,weightLog,onGoToProfile}),
    // Draft recovery banner
    draftBanner&&exercises.length>0&&h('div',{className:'notice notice-info',style:{
      display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:0,marginBottom:12,
    }},
      h('span',null,'📋 Borrador recuperado del '+draftBanner),
      h('button',{onClick:discardSession,style:{
        background:'transparent',border:'none',color:'inherit',cursor:'pointer',
        fontFamily:'inherit',fontSize:12,fontWeight:600,padding:0,textDecoration:'underline',
      }},'Descartar')
    ),
    timerStart&&h(WorkoutTimer,{timerStart,lastActivity,pausedAt,onAutoPause:setPausedAt}),
    exercises.length>0&&estTotal!==null&&h('div',{className:'cal-preview'},
      h('div',null,h('div',{className:'kcal-num'},'🔥 '+estTotal+' kcal'),h('div',{className:'kcal-sub'},'estimadas esta sesión'),h('div',{className:'kcal-note'},'Se actualiza en tiempo real'))
    ),
    routines.length>0&&h('div',{className:'card'},
      h('div',{className:'cardtitle',style:{marginBottom:10}},
        h('span',null,'Rutinas'),
        exercises.length>0
          ?h('span',{style:{textTransform:'none',letterSpacing:0,fontWeight:400}},'se añaden a la sesión')
          :nextR&&h('span',{style:{textTransform:'none',letterSpacing:0,fontWeight:600,color:'var(--accent)'}},'Hoy toca '+nextR.name)
      ),
      h('div',{className:'routine-chips'},
        routines.map(r=>h('button',{key:r.id,className:'pbtn'+(nextR?.id===r.id?' next':''),onClick:()=>loadRoutine(r)},r.name))
      )
    ),
    h('div',{className:'card'},
      h('div',{className:'cardtitle',style:{marginBottom:10}},'Añadir ejercicio'),
      h(ExercisePicker,{library,onSelect:selectFromLibrary,onCreateNew:(n)=>{setNewExName(n);setShowNewEx(true);}})
    ),
    exercises.length>0&&h('div',{className:'card'},
      h('div',{className:'cardtitle'},
        h('span',null,'Esta sesión ('+(exercises.length)+')'),
        h('button',{className:'btn btns btnsm',onClick:()=>setShowRoutineName(true)},'Guardar como rutina')
      ),
      h('div',{className:'rest-setting',style:{marginBottom:12}},
        h('label',{htmlFor:'rest-secs'},'Descanso al marcar ✓'),
        h('select',{id:'rest-secs',value:restSecs,onChange:e=>changeRestSecs(Number(e.target.value))},
          REST_OPTIONS.map(v=>h('option',{key:v,value:v},v+' s')))
      ),
      exercises.map((e,i)=>h(ExerciseBlock,{key:e.id,ex:e,onChange:ex=>setExercises(prev=>prev.map((x,j)=>j===i?ex:x)),onRemove:()=>{
          // Solo pedimos confirmación si hay datos que perder
          if(exerciseHasData(e)&&!confirm('¿Eliminar "'+e.name+'" y todas sus series?'))return;
          setExercises(prev=>prev.filter((_,j)=>j!==i));
        },bw:currentWeight,variants:libById[e.libraryId]?.variants||[],prevEx:prevExFor(e),onSetDone:startRest,
        hint:e.target?progressionHint(e.libraryId,sessions,libById):null}))
    ),
    h('div',{style:{display:'flex',gap:10}},
      h('button',{className:'btn btnp',style:{flex:1},onClick:save},'Guardar sesión'),
      exercises.length>0&&h('button',{className:'btn btns',onClick:discardSession},'Descartar')
    ),
    rest&&h(RestTimer,{endAt:rest.endAt,total:rest.total,onAdjust:adjustRest,onSkip:()=>setRest(null),onDone:()=>setRest(null)}),
    // Hueco para que la barra de descanso no tape el final de la página
    rest&&h('div',{style:{height:72}}),
    h('div',{ref:bottomRef})
  );
}

export {REST_KEY,REST_OPTIONS,audioCtx,unlockAudio,playRestEndBeep,RestTimer,DRAFT_KEY,INACTIVITY_MS,WorkoutTimer,RoutineNameModal,WorkoutTab};
