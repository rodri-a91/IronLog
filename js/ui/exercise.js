// Formularios de ejercicio (modo y variantes) y bloque de series de la sesión.
import {MODES,MODE_LABELS,MUSCLES,MUSCLE_COLORS,exMode,parseVariants} from '../core/library.js';
import {fmtTarget} from '../core/routines.js';
import {emptySet,estimateCardioCals,estimateStrengthCals} from '../core/sessions.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

const MODE_HELP={
  weight:'Series de peso (kg) × repeticiones.',
  bodyweight:'Repeticiones con tu peso. El lastre (kg) es opcional y es lo único que suma al volumen.',
  time:'Segundos aguantados, para isométricos como la plancha.',
};

function ModeAndVariantsFields({mode,onMode,variantsText,onVariants,modeLocked}){
  return h('div',null,
    h('div',{className:'fg'},
      h('label',null,'Registro'),
      h('select',{value:mode,disabled:modeLocked,onChange:e=>onMode(e.target.value)},
        MODES.map(m=>h('option',{key:m,value:m},MODE_LABELS[m]))),
      h('div',{style:{fontSize:11,color:'var(--t2)',marginTop:2}},
        modeLocked?'Tiene sesiones registradas: no se puede cambiar el tipo de registro.':MODE_HELP[mode])
    ),
    h('div',{className:'fg'},
      h('label',null,'Variantes (opcional, una por línea, de fácil a difícil)'),
      h('textarea',{className:'variants-input',rows:4,value:variantsText,onChange:e=>onVariants(e.target.value),
        placeholder:'Inclinadas\nNormales\nPies elevados'})
    )
  );
}

// ---- New Exercise Modal ----
function NewExerciseModal({initialName,onSave,onClose}){
  const [name,setName]=useState(initialName||'');
  const [muscle,setMuscle]=useState('Pecho');
  const [mode,setMode]=useState('weight');
  const [variantsText,setVariantsText]=useState('');
  function save(){
    if(!name.trim()){alert('Escribe el nombre');return;}
    const isCardio=muscle==='Cardio';
    const variants=parseVariants(variantsText);
    onSave({id:'c-'+Date.now(),name:name.trim(),muscle,isCardio,
      ...(!isCardio&&mode!=='weight'?{mode}:{}),
      ...(!isCardio&&variants.length?{variants}:{})});
    onClose();
  }
  return h('div',{className:'overlay',onTouchEnd:e=>{if(e.target===e.currentTarget)onClose();},onClick:e=>{if(e.target===e.currentTarget)onClose();}},
    h('div',{className:'modal'},
      h('div',{className:'modal-handle'}),
      h('div',{className:'modaltitle'},'Nuevo ejercicio'),
      h('div',{className:'fg'},h('label',null,'Nombre'),h('input',{value:name,onChange:e=>setName(e.target.value),placeholder:'Ej: Remo con mancuerna'})),
      h('div',{className:'fg'},h('label',null,'Grupo muscular'),h('select',{value:muscle,onChange:e=>setMuscle(e.target.value)},MUSCLES.map(m=>h('option',{key:m},m)))),
      muscle==='Cardio'&&h('p',{style:{fontSize:12,color:'var(--t2)',marginBottom:10}},'Se registrará con duración en minutos.'),
      muscle!=='Cardio'&&h(ModeAndVariantsFields,{mode,onMode:setMode,variantsText,onVariants:setVariantsText}),
      h('div',{style:{display:'flex',gap:8,marginTop:8}},
        h('button',{className:'btn btnp',style:{flex:1},onClick:save},'Guardar'),
        h('button',{className:'btn btns',onClick:onClose},'Cancelar')
      )
    )
  );
}

// ---- Exercise Block ----
const COL_LABEL={fontSize:10,color:'var(--t2)',textTransform:'uppercase',fontWeight:600,textAlign:'center'};

const PREV_LABEL={textAlign:'center',fontSize:10,color:'var(--t2)',fontStyle:'italic',opacity:.7};

// variants: las de la biblioteca; prevEx: el mismo ejercicio en la última sesión que se hizo
// onSetDone: si se pasa (solo en la sesión en curso), cada serie lleva un botón ✓ que inicia el descanso
// hint: consejo de progresión (solo en la sesión en curso)
function ExerciseBlock({ex,onChange,onRemove,bw,variants=[],prevEx=null,onSetDone,hint=null}){
  const mode=exMode(ex);
  const isCardio=mode==='cardio';
  const prevSets=prevEx?.sets||[];
  const estCal=bw>0?(isCardio?estimateCardioCals(ex,bw):estimateStrengthCals(ex,bw)):null;
  function updSet(i,f,v){const ns=[...ex.sets];ns[i]={...ns[i],[f]:v};onChange({...ex,sets:ns});}
  function addSet(){
    const l=ex.sets[ex.sets.length-1]||{};
    const s=emptySet(mode);
    if(mode==='weight'||mode==='bodyweight'){s.reps=l.reps||'';s.weight=l.weight||'';}
    if(mode==='time')s.secs=l.secs||'';
    onChange({...ex,sets:[...ex.sets,s]});
  }
  function remSet(i){if(ex.sets.length===1)return;onChange({...ex,sets:ex.sets.filter((_,j)=>j!==i)});}
  // Si la variante guardada ya no está en la biblioteca (renombrada o borrada), se conserva como opción
  const variantOptions=ex.variant&&!variants.includes(ex.variant)?[...variants,ex.variant]:variants;
  const hasPrev=!isCardio&&prevSets.length>0;
  const rmv=i=>ex.sets.length>1?h('button',{className:'rmv-btn',onClick:()=>remSet(i)},'×'):h('span',null);
  const num=i=>h('div',{className:'series-num'},'#'+(i+1));
  const withCheck=!!onSetDone&&!isCardio;
  const ck=withCheck?' chk':'';
  const blank=()=>withCheck&&h('div',null);
  function toggleDone(i){
    const done=!ex.sets[i].done;
    updSet(i,'done',done);
    if(done)onSetDone();
  }
  const doneBtn=i=>withCheck&&h('button',{className:'done-btn'+(ex.sets[i].done?' on':''),onClick:()=>toggleDone(i),
    'aria-label':ex.sets[i].done?'Desmarcar serie':'Serie hecha: empezar descanso','aria-pressed':!!ex.sets[i].done},'✓');
  const input=(i,field,placeholder,decimal)=>h('input',{className:'series-input',type:'number',
    inputMode:decimal?'decimal':'numeric',min:0,step:decimal?.5:1,placeholder,
    value:ex.sets[i][field]??'',onChange:e=>updSet(i,field,e.target.value)});

  let body;
  if(isCardio){
    body=h('div',null,
      h('div',{className:'series-header cardio'},
        h('div',{className:'series-num'},'#'),
        h('div',{style:COL_LABEL},'Duración (min)'),
        h('div',{style:COL_LABEL},'Distancia (km)'),
        h('div',null)
      ),
      ex.sets.map((s,i)=>h('div',{key:s.id,className:'series-row cardio'},
        num(i),
        h('input',{className:'series-input',type:'number',inputMode:'decimal',min:0,step:.1,
          placeholder:prevSets[i]?.duration||'30',
          value:s.duration,onChange:e=>updSet(i,'duration',e.target.value)}),
        h('input',{className:'series-input',type:'number',inputMode:'decimal',min:0,step:.1,
          placeholder:prevSets[i]?.distance||'km',
          value:s.distance||'',onChange:e=>updSet(i,'distance',e.target.value)}),
        rmv(i)
      )),
      h('button',{className:'add-set-btn',onClick:addSet},'+ Añadir intervalo')
    );
  }else if(mode==='time'){
    body=h('div',null,
      h('div',{className:'series-header time'+ck},
        h('div',{className:'series-num'},'#'),
        h('div',{style:COL_LABEL},'Segundos'),
        blank(),
        h('div',null)
      ),
      hasPrev&&h('div',{className:'prev-row time'+ck},h('div',null),h('div',{style:PREV_LABEL},'anterior'),blank(),h('div',null)),
      ex.sets.map((s,i)=>h('div',{key:s.id,className:'series-row time'+ck+(s.done?' done':'')},
        num(i),
        // El valor de la sesión anterior se muestra como placeholder
        input(i,'secs',prevSets[i]?.secs?String(prevSets[i].secs):'seg',false),
        doneBtn(i),
        rmv(i)
      )),
      h('button',{className:'add-set-btn',onClick:addSet},'+ Añadir serie')
    );
  }else{
    // Peso: kg | reps. Peso corporal: reps | lastre (lo principal primero)
    const bwMode=mode==='bodyweight';
    const cols=bwMode?[['reps','Reps',false],['weight','Lastre (kg)',true]]:[['weight','Peso (kg)',true],['reps','Reps',false]];
    const prevPh=(i,field)=>{
      const v=prevSets[i]?.[field];
      if(v)return String(v);
      return field==='reps'?'reps':bwMode?'0':'kg';
    };
    body=h('div',null,
      h('div',{className:'series-header strength'+ck},
        h('div',{className:'series-num'},'#'),
        cols.map(([f,label])=>h('div',{key:f,style:COL_LABEL},label)),
        blank(),
        h('div',null)
      ),
      hasPrev&&h('div',{className:'prev-row strength'+ck},
        h('div',null),h('div',{style:PREV_LABEL},'anterior'),h('div',{style:PREV_LABEL},'anterior'),blank(),h('div',null)
      ),
      ex.sets.map((s,i)=>h('div',{key:s.id,className:'series-row strength'+ck+(s.done?' done':'')},
        num(i),
        cols.map(([f,,decimal])=>h(React.Fragment,{key:f},input(i,f,prevPh(i,f),decimal))),
        doneBtn(i),
        rmv(i)
      )),
      h('button',{className:'add-set-btn',onClick:addSet},'+ Añadir serie')
    );
  }

  return h('div',{className:'exblock'},
    h('div',{className:'exblock-header'},
      h('div',null,
        h('div',null,h('span',{className:'exblock-name'},ex.name),' ',h('span',{className:`tag ${MUSCLE_COLORS[ex.muscle]||'tb'}`},ex.muscle)),
        estCal!==null&&h('div',{style:{fontSize:11,color:'#BA7517',marginTop:3,fontWeight:500}},'≈ '+estCal+' kcal')
      ),
      h('button',{className:'btnd',onClick:onRemove},'Eliminar')
    ),
    variantOptions.length>0&&h('div',{className:'variant-row'},
      h('span',{className:'variant-label'},'Variante'),
      h('select',{className:'variant-select',value:ex.variant||'',onChange:e=>onChange({...ex,variant:e.target.value||undefined})},
        !ex.variant&&h('option',{value:''},'—'),
        variantOptions.map((v,i)=>h('option',{key:v,value:v},(variants.includes(v)?(variants.indexOf(v)+1)+'. ':'')+v))
      )
    ),
    prevEx?.variant&&prevEx.variant!==ex.variant&&h('div',{className:'variant-prev'},'La última vez: '+prevEx.variant),
    ex.target&&!isCardio&&h('div',{className:'target-row'},
      h('span',{className:'variant-label'},'Objetivo'),
      h('span',{className:'target-chip'},fmtTarget(ex.target,mode))
    ),
    // El consejo se refiere a la variante de la última vez: si hoy ya has cambiado, no se muestra
    hint&&(ex.variant||'')===hint.fromVariant&&h('div',{className:'hint '+hint.kind},
      h('span',null,(hint.kind==='up'?'⬆ ':'')+hint.text),
      hint.nextVariant&&variants.includes(hint.nextVariant)&&h('button',{className:'btn btns btnsm',onClick:()=>onChange({...ex,variant:hint.nextVariant})},'Cambiar')
    ),
    body
  );
}

export {MODE_HELP,ModeAndVariantsFields,NewExerciseModal,COL_LABEL,PREV_LABEL,ExerciseBlock};
