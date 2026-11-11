// Pestaña Historial: detalle y edición de sesiones.
import {fmtDate,fmtDuration} from '../core/dates.js';
import {MUSCLE_COLORS,exMode} from '../core/library.js';
import {bodyweightReps,cleanExercises,exerciseHasData,newSessionExercise,sessionTotals,weightAt} from '../core/sessions.js';
import {ExercisePicker} from './common.js';
import {ExerciseBlock} from './exercise.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

// ---- History Tab ----
function SessionDetail({session,onDelete,onEdit}){
  return h('div',{className:'session-detail'},
    // Stats strip
    h('div',{className:'session-detail-stats'},
      session.durationSecs>0&&h('div',{className:'sds-item'},
        h('div',{className:'sds-val'},fmtDuration(session.durationSecs)),h('div',{className:'sds-label'},'Duración')
      ),
      session.calories>0&&h('div',{className:'sds-item'},
        h('div',{className:'sds-val'},session.calories),h('div',{className:'sds-label'},'kcal')
      ),
      session.totalVolume>0&&h('div',{className:'sds-item'},
        h('div',{className:'sds-val'},Math.round(session.totalVolume/1000*10)/10+'k'),h('div',{className:'sds-label'},'kg vol.')
      ),
      session.exercises.length>0&&h('div',{className:'sds-item'},
        h('div',{className:'sds-val'},session.exercises.length),h('div',{className:'sds-label'},session.exercises.length===1?'ejercicio':'ejercicios')
      ),
    ),
    // All exercises in original order
    h('div',{className:'session-detail-exercises'},
      session.exercises.map(ex=>h('div',{key:ex.id,className:'sde-row'},
        h('div',{className:'sde-header'},
          h('span',{className:'sde-name'},ex.name,ex.variant&&h('span',{style:{fontWeight:400,color:'var(--t2)'}},' · '+ex.variant)),
          h('span',{className:`tag ${MUSCLE_COLORS[ex.muscle]||'tb'}`},ex.muscle)
        ),
        exMode(ex)==='time'
          ? h('div',{className:'sde-sets'},
              ex.sets.map((s,i)=>{
                const secs=parseFloat(s.secs)||0;
                if(!secs)return null;
                return h('div',{key:s.id||i,className:'sde-set'},
                  h('span',{className:'sde-set-num'},'#'+(i+1)),
                  h('span',{className:'sde-set-weight'},secs+' s')
                );
              }).filter(Boolean)
            )
        : exMode(ex)==='bodyweight'
          ? h('div',{className:'sde-sets'},
              ex.sets.map((s,i)=>{
                const w=parseFloat(s.weight)||0, r=parseInt(s.reps)||0;
                if(!r)return null;
                return h('div',{key:s.id||i,className:'sde-set'},
                  h('span',{className:'sde-set-num'},'#'+(i+1)),
                  h('span',{className:'sde-set-weight'},r+' reps'),
                  w?h('span',{className:'sde-set-x'},'+'):null,
                  w?h('span',{className:'sde-set-reps'},w+' kg'):null,
                  w?h('span',{className:'sde-set-vol'},(w*r).toLocaleString('es-ES')+' kg'):null
                );
              }).filter(Boolean)
            )
        : ex.isCardio
          ? h('div',{className:'sde-sets'},
              ex.sets.map((s,i)=>{
                const d=parseFloat(s.duration)||0;
                const km=parseFloat(s.distance)||0;
                if(!d&&!km)return null;
                return h('div',{key:s.id||i,className:'sde-set'},
                  h('span',{className:'sde-set-num'},'#'+(i+1)),
                  h('span',{className:'sde-set-weight'},d?d+' min':'—'),
                  km>0?h('span',{className:'sde-set-x'},'·'):null,
                  km>0?h('span',{className:'sde-set-reps'},km+' km'):null,
                  d>0&&km>0?h('span',{className:'sde-set-vol'},(km/d*60).toFixed(1)+' km/h'):null
                );
              }).filter(Boolean)
            )
          : h('div',{className:'sde-sets'},
              ex.sets.map((s,i)=>{
                const w=parseFloat(s.weight)||0, r=parseInt(s.reps)||0;
                if(!w&&!r)return null;
                return h('div',{key:s.id||i,className:'sde-set'},
                  h('span',{className:'sde-set-num'},'#'+(i+1)),
                  h('span',{className:'sde-set-weight'},w?w+' kg':'—'),
                  h('span',{className:'sde-set-x'},'×'),
                  h('span',{className:'sde-set-reps'},r?r+' reps':'—'),
                  w&&r?h('span',{className:'sde-set-vol'},(w*r).toLocaleString('es-ES')+' kg'):null
                );
              }).filter(Boolean)
            )
      ))
    ),
    h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}},
      h('button',{className:'btn btns btnsm',onClick:onEdit},'Editar'),
      h('button',{className:'btnd',style:{height:34},onClick:()=>{
        if(confirm('¿Eliminar la sesión del '+fmtDate(session.date)+'? Esta acción no se puede deshacer.'))onDelete(session.id);
      }},'Eliminar sesión')
    )
  );
}

function SessionEditModal({session,library,weightLog,onSave,onClose}){
  const [exercises,setExercises]=useState(()=>session.exercises.map(e=>({...e,sets:e.sets.map(s=>({...s}))})));
  // Las calorías se recalculan con el peso corporal registrado en la fecha de la sesión
  const bw=weightAt(weightLog,session.date);
  const libById=useMemo(()=>Object.fromEntries(library.map(e=>[e.id,e])),[library]);

  function save(){
    const cleaned=cleanExercises(exercises);
    if(!cleaned.length){alert('La sesión no tiene ninguna serie con datos. Si quieres quitarla, usa "Eliminar sesión".');return;}
    const totals=sessionTotals(cleaned,bw);
    if(!bw)totals.calories=session.calories||0; // sin registro de peso no se puede recalcular: conservar el valor guardado
    onSave({...session,exercises:cleaned,...totals});
    onClose();
  }

  // Sin cierre al tocar el fondo: se perderían los cambios por accidente
  return h('div',{className:'overlay'},
    h('div',{className:'modal'},
      h('div',{className:'modal-handle'}),
      h('div',{className:'modaltitle',style:{marginBottom:4}},'Editar sesión'),
      h('div',{className:'psub'},fmtDate(session.date)),
      exercises.map((e,i)=>h(ExerciseBlock,{key:e.id,ex:e,bw,variants:libById[e.libraryId]?.variants||[],
        onChange:ex=>setExercises(prev=>prev.map((x,j)=>j===i?ex:x)),
        onRemove:()=>{
          if(exerciseHasData(e)&&!confirm('¿Eliminar "'+e.name+'" de esta sesión?'))return;
          setExercises(prev=>prev.filter((_,j)=>j!==i));
        }})),
      h('div',{style:{margin:'12px 0'}},
        h(ExercisePicker,{library,onSelect:libEx=>setExercises(prev=>[...prev,newSessionExercise(libEx)])})
      ),
      h('div',{style:{display:'flex',gap:8,marginTop:8}},
        h('button',{className:'btn btnp',style:{flex:1},onClick:save},'Guardar cambios'),
        h('button',{className:'btn btns',onClick:onClose},'Cancelar')
      )
    )
  );
}

function HistoryTab({sessions,library,routines=[],weightLog,onDelete,onUpdate}){
  const routineName=id=>routines.find(r=>r.id===id)?.name;
  const [openId,setOpenId]=useState(null);
  const [editing,setEditing]=useState(null);
  // El detalle solo se monta para las sesiones que se han abierto alguna vez (antes se pintaba el de todas)
  const [mounted,setMounted]=useState(()=>new Set());
  function toggle(id){
    if(openId===id){setOpenId(null);return;}
    if(!mounted.has(id)){
      // Montar el detalle cerrado y forzar un reflow para que la transición de apertura parta de ese estado
      ReactDOM.flushSync(()=>setMounted(prev=>new Set(prev).add(id)));
      void document.body.offsetHeight;
    }
    setOpenId(id);
  }

  return h('div',{className:'content'},
    editing&&h(SessionEditModal,{session:editing,library,weightLog,onSave:onUpdate,onClose:()=>setEditing(null)}),
    h('div',{className:'ptitle'},'HISTORIAL'),
    h('div',{className:'psub'},'Todas tus sesiones'),
    sessions.length===0
      ? h('div',{className:'card'},h('div',{className:'empty'},h('div',{className:'empty-icon'},'📋'),h('div',null,'No hay sesiones todavía')))
      : sessions.map(s=>{
          const isOpen=openId===s.id;
          const strEx=s.exercises.filter(e=>!e.isCardio);
          const cardioEx=s.exercises.filter(e=>e.isCardio);
          return h('div',{key:s.id,className:'hcard'+(isOpen?' hcard-open':'')},
            // Clickable header row
            h('div',{className:'hcard-header',onClick:()=>toggle(s.id)},
              h('div',{className:'hcard-left'},
                h('div',{className:'hcard-date'},fmtDate(s.date)),
                h('div',{className:'hcard-meta'},
                  strEx.length>0&&h('span',{className:'sbadge'},strEx.length+(strEx.length===1?' ejercicio':' ejercicios')),
                  s.totalVolume>0&&h('span',{className:'sbadge'},Math.round(s.totalVolume).toLocaleString('es-ES')+' kg'),
                  bodyweightReps(s.exercises)>0&&h('span',{className:'sbadge'},bodyweightReps(s.exercises)+' reps'),
                  routineName(s.routineId)&&h('span',{className:'sbadge'},routineName(s.routineId)),
                  s.durationSecs>0&&h('span',{className:'sbadge'},'⏱ '+fmtDuration(s.durationSecs)),
                  cardioEx.length>0&&h('span',{className:'sbadge'},'🏃 '+s.totalCardioMin+' min'+(s.totalCardioKm>0?' · '+(Math.round(s.totalCardioKm*10)/10)+' km':'')),
                  s.calories>0&&h('span',{className:'sbadge sbadge-cal'},'🔥 '+s.calories+' kcal')
                )
              ),
              h('div',{className:'hcard-chevron',style:{transform:isOpen?'rotate(180deg)':'rotate(0deg)'}},
                h('svg',{viewBox:'0 0 24 24',width:16,height:16,fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round'},
                  h('path',{d:'M6 9l6 6 6-6'})
                )
              )
            ),
            // Expandable detail — animated with grid-template-rows
            h('div',{className:'session-detail-wrap'},
              h('div',{className:'session-detail-wrap-inner'},
                mounted.has(s.id)&&h(SessionDetail,{session:s,onDelete,onEdit:()=>setEditing(s)})
              )
            )
          );
        })
  );
}

export {SessionDetail,SessionEditModal,HistoryTab};
