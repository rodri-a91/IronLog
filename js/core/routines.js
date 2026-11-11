// Rutinas por defecto, objetivos (series × rango) y rutina que toca.

// Rutinas: plantillas de ejercicios (por libraryId) que se cargan de golpe en la sesión.
// targets: objetivo por ejercicio {sets, min, max} (repeticiones, o segundos en los de tiempo). Va en la
// rutina y no en el ejercicio porque el mismo ejercicio puede tener objetivos distintos según el día.
const tgt=(sets,min,max)=>({sets,min,max});

const DEFAULT_ROUTINES=[
  {id:'r-torso-a',name:'Torso A',items:['flexiones','flexiones-pica','fondos-silla','remo-mesa','plancha'],
   targets:{'flexiones':tgt(4,8,15),'flexiones-pica':tgt(3,6,10),'fondos-silla':tgt(3,8,12),'remo-mesa':tgt(3,6,12),'plancha':tgt(3,30,45)}},
  {id:'r-pierna-a',name:'Pierna A',items:['sentadilla-libre','zancada-atras','puente-gluteo','gemelos','dead-bug'],
   targets:{'sentadilla-libre':tgt(4,15,20),'zancada-atras':tgt(3,8,12),'puente-gluteo':tgt(3,10,12),'gemelos':tgt(3,12,15),'dead-bug':tgt(3,6,10)}},
  {id:'r-torso-b',name:'Torso B',items:['remo-toalla','flexiones-cerradas','flexiones-pica','ytw','hollow'],
   targets:{'remo-toalla':tgt(4,8,12),'flexiones-cerradas':tgt(3,6,12),'flexiones-pica':tgt(3,6,10),'ytw':tgt(3,6,10),'hollow':tgt(3,20,30)}},
  {id:'r-pierna-b',name:'Pierna B',items:['bulgara','curl-toalla','hip-thrust-sofa','wall-sit','plancha-lateral'],
   targets:{'bulgara':tgt(3,8,12),'curl-toalla':tgt(3,8,12),'hip-thrust-sofa':tgt(3,12,20),'wall-sit':tgt(3,40,60),'plancha-lateral':tgt(3,20,30)}},
];

const DEFAULT_ROUTINE_BY_ID=Object.fromEntries(DEFAULT_ROUTINES.map(r=>[r.id,r]));

function validTarget(t){
  return !!t&&Number.isInteger(t.sets)&&t.sets>=1&&t.sets<=20&&Number.isFinite(t.min)&&t.min>=1&&Number.isFinite(t.max)&&t.max>=t.min;
}

// Descarta rutinas mal formadas (p. ej. de una copia editada a mano). Las rutinas por defecto guardadas
// antes de existir los objetivos reciben los de por defecto (sin pisar los que ya se hayan editado).
function sanitizeRoutines(list){
  if(!Array.isArray(list))return DEFAULT_ROUTINES;
  return list.filter(r=>r&&r.id!=null&&typeof r.name==='string'&&Array.isArray(r.items))
    .map(r=>{
      const items=r.items.filter(x=>x!=null);
      const src=r.targets&&typeof r.targets==='object'?r.targets:(DEFAULT_ROUTINE_BY_ID[r.id]?.targets||{});
      const targets=Object.fromEntries(Object.entries(src).filter(([id,t])=>items.includes(id)&&validTarget(t)));
      return {...r,items,targets};
    });
}

// Rutina que toca: la siguiente (en el orden de la lista) a la de la sesión más reciente que se cargó
// desde una rutina que aún existe. Sin historial de rutinas, ninguna.
function nextRoutine(sessions,routines){
  let latest=null;
  for(const s of sessions){
    if(!s.routineId||!routines.some(r=>r.id===s.routineId))continue;
    if(!latest||new Date(s.date)>new Date(latest.date))latest=s;
  }
  if(!latest)return null;
  const i=routines.findIndex(r=>r.id===latest.routineId);
  return routines[(i+1)%routines.length];
}

function fmtTarget(t,mode){return t.sets+' × '+t.min+(t.max!==t.min?'-'+t.max:'')+(mode==='time'?' s':' reps');}

export {tgt,DEFAULT_ROUTINES,DEFAULT_ROUTINE_BY_ID,validTarget,sanitizeRoutines,nextRoutine,fmtTarget};
