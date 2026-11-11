// Pestaña Ejercicios: biblioteca y rutinas.
import {MODE_LABELS,MUSCLES,MUSCLE_COLORS,exMode,parseVariants} from '../core/library.js';
import {validTarget} from '../core/routines.js';
import {ExercisePicker} from './common.js';
import {ModeAndVariantsFields,NewExerciseModal} from './exercise.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

// ---- Library Tab ----
// Editor de una rutina: nombre y ejercicios (ordenar, quitar, añadir)
// Objetivo editable como texto (los campos vacíos = sin objetivo)
const targetToForm=t=>t?{sets:String(t.sets),min:String(t.min),max:String(t.max)}:{sets:'',min:'',max:''};

function RoutineEditModal({routine,library,onSave,onDelete,onClose}){
  const [name,setName]=useState(routine.name);
  const [items,setItems]=useState(routine.items);
  const [targets,setTargets]=useState(()=>Object.fromEntries(routine.items.map(id=>[id,targetToForm(routine.targets?.[id])])));
  const setT=(id,f,v)=>setTargets(prev=>({...prev,[id]:{...(prev[id]||targetToForm()),[f]:v}}));
  const [askDelete,setAskDelete]=useState(false);
  const libById=useMemo(()=>Object.fromEntries(library.map(e=>[e.id,e])),[library]);
  function move(i,d){const n=[...items];[n[i],n[i+d]]=[n[i+d],n[i]];setItems(n);}
  function save(){
    if(!name.trim()){alert('Escribe un nombre');return;}
    // Los ejercicios borrados de la biblioteca se quitan al guardar
    const kept=items.filter(id=>libById[id]);
    const out={};
    for(const id of kept){
      const f=targets[id]||targetToForm();
      if(!f.sets&&!f.min&&!f.max)continue; // sin objetivo
      const t={sets:parseInt(f.sets),min:parseFloat(f.min),max:parseFloat(f.max||f.min)};
      if(!validTarget(t)){alert('Revisa el objetivo de "'+libById[id].name+'": series (1-20), mínimo y máximo, con el máximo mayor o igual que el mínimo.');return;}
      out[id]=t;
    }
    onSave({...routine,name:name.trim(),items:kept,targets:out});
    onClose();
  }
  // Sin cierre al tocar el fondo: se perderían los cambios por accidente
  return h('div',{className:'overlay'},
    h('div',{className:'modal'},
      h('div',{className:'modal-handle'}),
      h('div',{className:'modaltitle'},routine.isNew?'Nueva rutina':'Editar rutina'),
      h('div',{className:'fg'},h('label',null,'Nombre'),h('input',{value:name,onChange:e=>setName(e.target.value),placeholder:'Ej: Torso A'})),
      h('div',{className:'fg',style:{marginBottom:4}},h('label',null,'Ejercicios ('+items.length+')')),
      items.length===0&&h('div',{style:{fontSize:13,color:'var(--t2)',padding:'8px 0'}},'Todavía no hay ejercicios.'),
      items.map((id,i)=>{
        const lib=libById[id];
        const f=targets[id]||targetToForm();
        const unit=lib&&exMode(lib)==='time'?'s':'reps';
        const num=(field,label)=>h('input',{className:'series-input target-input',type:'number',inputMode:'numeric',min:1,
          value:f[field],placeholder:label,'aria-label':label+' de '+(lib?.name||''),onChange:e=>setT(id,field,e.target.value)});
        return h('div',{key:id,className:'routine-item routine-item-col'},
          h('div',{className:'routine-item-top'},
            h('span',{className:'routine-item-name'},lib?.name||h('em',{style:{color:'var(--t2)'}},'(ejercicio eliminado)')),
            h('button',{className:'icon-btn',disabled:i===0,onClick:()=>move(i,-1),'aria-label':'Subir'},'↑'),
            h('button',{className:'icon-btn',disabled:i===items.length-1,onClick:()=>move(i,1),'aria-label':'Bajar'},'↓'),
            h('button',{className:'icon-btn',onClick:()=>setItems(items.filter((_,j)=>j!==i)),'aria-label':'Quitar'},'×')
          ),
          lib&&!lib.isCardio&&h('div',{className:'routine-target'},
            h('span',null,'Objetivo'),
            num('sets','series'),h('span',null,'×'),num('min','mín'),h('span',null,'-'),num('max','máx'),h('span',null,unit)
          )
        );
      }),
      h('div',{style:{margin:'12px 0'}},
        h(ExercisePicker,{library,onSelect:ex=>{if(!items.includes(ex.id))setItems([...items,ex.id]);}})
      ),
      h('div',{style:{display:'flex',gap:8,marginTop:8}},
        h('button',{className:'btn btnp',style:{flex:1},onClick:save},'Guardar cambios'),
        h('button',{className:'btn btns',onClick:onClose},'Cancelar')
      ),
      onDelete&&h('div',{style:{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:8,marginTop:14}},
        askDelete
          ? h(React.Fragment,null,
              h('span',{style:{fontSize:13,color:'var(--t2)'}},'¿Eliminar la rutina?'),
              h('button',{className:'btnd',onClick:()=>{onDelete(routine.id);onClose();}},'Sí, eliminar'),
              h('button',{className:'btn btns btnsm',onClick:()=>setAskDelete(false)},'No')
            )
          : h('button',{className:'btnd',onClick:()=>setAskDelete(true)},'Eliminar rutina')
      )
    )
  );
}

function RoutinesSection({routines,library,onAdd,onUpdate,onRemove}){
  const [editing,setEditing]=useState(null);
  const libById=useMemo(()=>Object.fromEntries(library.map(e=>[e.id,e])),[library]);
  // Una rutina nueva no se añade hasta guardarla (cancelar no deja una vacía)
  function create(){setEditing({id:'r-'+Date.now(),name:'',items:[],isNew:true});}
  function save({isNew,...r}){isNew?onAdd(r):onUpdate(r);}
  return h('div',null,
    editing&&h(RoutineEditModal,{routine:editing,library,onSave:save,onClose:()=>setEditing(null),
      onDelete:editing.isNew?null:onRemove}),
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:12}},
      h('div',{style:{fontSize:13,color:'var(--t2)',lineHeight:1.5}},'Se cargan desde la pestaña Hoy. También puedes guardar una sesión como rutina.'),
      h('button',{className:'btn btnp btnsm',style:{flexShrink:0},onClick:create},'+ Nueva')
    ),
    h('div',{className:'card'},
      routines.length===0
        ? h('div',{className:'empty'},h('div',{className:'empty-icon'},'📋'),h('div',null,'No hay rutinas'))
        : routines.map(r=>{
            const names=r.items.map(id=>libById[id]?.name).filter(Boolean);
            return h('div',{key:r.id,className:'lib-ex-row'},
              h('div',{style:{flex:1,minWidth:0}},
                h('div',{className:'lib-ex-name'},r.name),
                h('div',{style:{fontSize:12,color:'var(--t2)',marginTop:3,lineHeight:1.45}},
                  names.length?names.join(' · '):'Sin ejercicios')
              ),
              h('button',{className:'btn btns btnsm',style:{flexShrink:0,marginLeft:10},onClick:()=>setEditing(r)},'Editar')
            );
          })
    )
  );
}

function LibraryTab({library,sessions,routines,onAdd,onRemove,onEdit,onAddRoutine,onUpdateRoutine,onRemoveRoutine}){
  const [view,setView]=useState('exercises');
  const [filter,setFilter]=useState('Todos');
  const [showModal,setShowModal]=useState(false);
  const [editingEx,setEditingEx]=useState(null); // {id, name, muscle, isCardio, mode, variantsText}
  const usageMap=useMemo(()=>{const m={};sessions.forEach(s=>s.exercises.forEach(e=>{if(e.libraryId)m[e.libraryId]=(m[e.libraryId]||0)+1;}));return m;},[sessions]);
  const filtered=filter==='Todos'?library:library.filter(e=>e.muscle===filter);
  // Un ejercicio con sesiones no puede cambiar de tipo de registro (fuerza/cardio, peso/peso corporal/tiempo):
  // su historial tiene series de otro tipo y mezclaría estadísticas y referencias
  const editOrig=editingEx&&library.find(e=>e.id===editingEx.id);
  const typeLocked=!!(editOrig&&usageMap[editOrig.id]);
  const muscleOptions=!typeLocked?MUSCLES:MUSCLES.filter(m=>(m==='Cardio')===!!editOrig.isCardio);

  function confirmRemove(ex){
    const inRoutines=routines.filter(r=>r.items.includes(ex.id)).map(r=>r.name);
    let msg='¿Eliminar "'+ex.name+'" de la biblioteca?';
    if(usageMap[ex.id])msg+=usageMap[ex.id]===1
      ?'\n\nLa sesión donde aparece lo conserva en el historial.'
      :'\n\nLas '+usageMap[ex.id]+' sesiones donde aparece lo conservan en el historial.';
    if(inRoutines.length)msg+='\n\nTambién se quitará de: '+inRoutines.join(', ')+'.';
    if(confirm(msg))onRemove(ex.id);
  }
  function startEdit(ex){
    setEditingEx({id:ex.id,name:ex.name,muscle:ex.muscle,isCardio:ex.isCardio,
      mode:ex.mode||'weight',variantsText:(ex.variants||[]).join('\n')});
  }
  function saveEdit(){
    if(!editingEx.name.trim()){alert('El nombre no puede estar vacío');return;}
    const {variantsText,...rest}=editingEx;
    const isCardio=rest.muscle==='Cardio';
    // Variantes vacías se guardan como [] (no undefined) para que la migración no restaure las de por defecto
    onEdit({...rest,name:rest.name.trim(),isCardio,mode:isCardio?undefined:rest.mode,
      variants:isCardio?undefined:parseVariants(variantsText)});
    setEditingEx(null);
  }

  return h('div',{className:'content'},
    showModal&&h(NewExerciseModal,{initialName:'',onSave:ex=>{onAdd(ex);setShowModal(false);},onClose:()=>setShowModal(false)}),

    // Edit modal
    editingEx&&h('div',{className:'overlay',onClick:e=>{if(e.target===e.currentTarget)setEditingEx(null)}},
      h('div',{className:'modal'},
        h('div',{className:'modal-handle'}),
        h('div',{className:'modaltitle'},'Editar ejercicio'),
        h('div',{style:{fontSize:12,color:'var(--t2)',background:'var(--bg2)',borderRadius:8,padding:'8px 12px',marginBottom:14,lineHeight:1.5}},
          '⚠ Las sesiones ya registradas conservan el nombre original en el historial, pero las estadísticas y la referencia de la sesión anterior siguen vinculadas a este ejercicio.'
        ),
        h('div',{className:'fg'},
          h('label',null,'Nombre'),
          h('input',{value:editingEx.name,onChange:e=>setEditingEx({...editingEx,name:e.target.value}),autoFocus:true})
        ),
        h('div',{className:'fg'},
          h('label',null,'Grupo muscular'),
          h('select',{value:editingEx.muscle,disabled:muscleOptions.length===1,onChange:e=>setEditingEx({...editingEx,muscle:e.target.value,isCardio:e.target.value==='Cardio'})},
            muscleOptions.map(m=>h('option',{key:m},m))
          ),
          typeLocked&&editOrig.isCardio&&h('div',{style:{fontSize:11,color:'var(--t2)',marginTop:2}},
            'Tiene sesiones registradas: no puede pasar a ser de fuerza.')
        ),
        editingEx.muscle!=='Cardio'&&h(ModeAndVariantsFields,{
          mode:editingEx.mode,onMode:m=>setEditingEx({...editingEx,mode:m}),
          variantsText:editingEx.variantsText,onVariants:t=>setEditingEx({...editingEx,variantsText:t}),
          modeLocked:typeLocked
        }),
        h('div',{style:{display:'flex',gap:8,marginTop:8}},
          h('button',{className:'btn btnp',style:{flex:1},onClick:saveEdit},'Guardar cambios'),
          h('button',{className:'btn btns',onClick:()=>setEditingEx(null)},'Cancelar')
        )
      )
    ),

    h('div',{className:'ptitle'},'BIBLIOTECA'),
    h('div',{className:'psub'},library.length+' ejercicios · '+routines.length+' rutina'+(routines.length===1?'':'s')),
    h('div',{className:'periodtabs'},
      [['exercises','Ejercicios'],['routines','Rutinas']].map(([id,label])=>
        h('button',{key:id,className:'pbtn'+(view===id?' active':''),onClick:()=>setView(id)},label))
    ),
    view==='routines'
      ? h(RoutinesSection,{routines,library,onAdd:onAddRoutine,onUpdate:onUpdateRoutine,onRemove:onRemoveRoutine})
      : h(React.Fragment,null,
          h('div',{style:{display:'flex',justifyContent:'flex-end',marginBottom:12}},
            h('button',{className:'btn btnp btnsm',onClick:()=>setShowModal(true)},'+ Nuevo ejercicio')
          ),
          h('div',{className:'lib-filter'},['Todos',...MUSCLES].map(m=>
            h('button',{key:m,className:'lib-filter-btn'+(filter===m?' active':''),onClick:()=>setFilter(m)},m)
          )),
          h('div',{className:'card'},
            filtered.length===0
              ? h('div',{className:'empty'},h('div',{className:'empty-icon'},'🔍'),h('div',null,'Sin ejercicios en este grupo'))
              : filtered.map(ex=>h('div',{key:ex.id,className:'lib-ex-row'},
                  h('div',{style:{flex:1,minWidth:0}},
                    h('div',{className:'lib-ex-name'},ex.name),
                    h('div',{style:{display:'flex',gap:6,marginTop:4,alignItems:'center',flexWrap:'wrap'}},
                      h('span',{className:`tag ${MUSCLE_COLORS[ex.muscle]||'tb'}`},ex.muscle),
                      !ex.isCardio&&ex.mode&&ex.mode!=='weight'&&h('span',{className:'sbadge',style:{padding:'2px 7px'}},MODE_LABELS[ex.mode]),
                      !ex.isCardio&&ex.variants?.length>0&&h('span',{style:{fontSize:11,color:'var(--t2)'}},ex.variants.length+' variantes'),
                      usageMap[ex.id]&&h('span',{style:{fontSize:11,color:'var(--t2)'}},
                        usageMap[ex.id]+' '+(usageMap[ex.id]===1?'vez':'veces'))
                    )
                  ),
                  h('div',{style:{display:'flex',gap:6,flexShrink:0}},
                    h('button',{className:'btn btns btnsm',onClick:()=>startEdit(ex)},'Editar'),
                    String(ex.id).startsWith('c-')&&h('button',{className:'btnd',onClick:()=>confirmRemove(ex)},'Eliminar')
                  )
                ))
          )
        )
  );
}

export {targetToForm,RoutineEditModal,RoutinesSection,LibraryTab};
