// Pestaña Perfil: peso corporal, logros y acceso a la copia de seguridad.
import {ACHIEVEMENTS,achContext,unlockDate} from '../core/achievements.js';
import {sanitizeProfile} from '../core/backup.js';
import {fmtShort,isValidDate,localISODate,parseLocalDate} from '../core/dates.js';
import {LineChart} from './common.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

function AchievementsSection({sessions,library}){
  // Cada logro recorre todo el historial: recalcular solo cuando cambian las sesiones o la biblioteca
  const evaluated=useMemo(()=>{
    const ctx=achContext(library);
    const asc=[...sessions].sort((a,b)=>new Date(a.date)-new Date(b.date));
    return ACHIEVEMENTS.map(a=>{
      const unlocked=a.check(sessions,ctx);
      return {...a,unlocked,progress:a.prog(sessions,ctx),date:unlocked?unlockDate(a,asc,ctx):null};
    });
  },[sessions,library]);
  const unlocked=evaluated.filter(a=>a.unlocked).length;
  const cats=[...new Set(ACHIEVEMENTS.map(a=>a.cat))];

  return h('div',null,
    h('div',{className:'ach-summary'},
      h('div',{className:'ach-summary-num'},unlocked+'/'+ACHIEVEMENTS.length),
      h('div',null,
        h('div',{style:{fontSize:14,fontWeight:700,color:'var(--t1)'}},unlocked===0?'Sin logros todavía':unlocked===ACHIEVEMENTS.length?'¡Todos los logros!':'Logros desbloqueados'),
        h('div',{className:'ach-summary-text'},'Sigue entrenando para desbloquear más')
      )
    ),
    cats.map(cat=>{
      const catAchs=evaluated.filter(a=>a.cat===cat);
      const catDone=catAchs.filter(a=>a.unlocked).length;
      return h('div',{key:cat},
        h('div',{className:'ach-cat-label'},cat+' · '+catDone+'/'+catAchs.length),
        h('div',{className:'ach-grid'},
          catAchs.map(a=>{
            const pct=a.progress.t>0?Math.round((a.progress.v/a.progress.t)*100):0;
            return h('div',{key:a.id,className:'ach-card '+(a.unlocked?'unlocked':'locked'),
              style:a.unlocked?{'--ach-color':a.color}:{}},
              h('span',{className:'ach-icon'},a.icon),
              h('div',{className:'ach-name'},a.name),
              h('div',{className:'ach-desc'},a.desc),
              // Los de sí/no (t=1) no llevan barra: un 0/1 no aporta nada
              !a.unlocked&&a.progress.t>1&&h('div',null,
                h('div',{className:'ach-prog-wrap'},
                  h('div',{className:'ach-prog',style:{width:pct+'%',background:a.color}})
                ),
                h('div',{className:'ach-prog-label'},a.progress.v.toLocaleString('es-ES')+' / '+a.progress.t.toLocaleString('es-ES'))
              ),
              a.unlocked&&a.date&&h('div',{className:'ach-date'},
                'Conseguido el '+new Date(a.date).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})),
              a.unlocked&&h('div',{className:'ach-badge'},'✅')
            );
          })
        )
      );
    })
  );
}

// ---- Profile Banner (compact, shown in WorkoutTab) ----
function ProfileBanner({profile,weightLog,onGoToProfile}){
  const currentWeight=weightLog.length>0?weightLog[weightLog.length-1].weight:0;
  if(!currentWeight)return h('div',{className:'profile-bar'},
    h('span',{style:{color:'var(--accent)',fontWeight:500}},'⚠ Añade tu peso en Perfil para estimar calorías'),
    h('button',{className:'btn btns btnsm',onClick:onGoToProfile},'Ir a Perfil')
  );
  return h('div',{className:'profile-bar'},
    h('span',null,'Peso actual: ',h('strong',{style:{color:'var(--t1)'}},currentWeight+' kg')),
    h('button',{className:'btn btns btnsm',onClick:onGoToProfile},'Perfil')
  );
}

// ---- Helpers for profile ----
// Sin nombre devuelve '' para que el avatar muestre el icono genérico
function getInitials(name){
  if(!name||!name.trim())return '';
  return name.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2);
}

// ---- Profile Tab ----
function ProfileTab({profile,onChange,weightLog,onAddWeight,onRemoveWeight,sessions,library,backupAgeDays,needsBackup,onOpenBackup}){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(profile);
  const [newWeight,setNewWeight]=useState('');
  const [newWeightDate,setNewWeightDate]=useState(()=>localISODate());
  const todayISO=localISODate();
  // Si cambia el día con la fecha en "hoy", seguir en hoy (no dejarla en ayer)
  const prevToday=useRef(todayISO);
  useEffect(()=>{
    if(newWeightDate===prevToday.current)setNewWeightDate(todayISO);
    prevToday.current=todayISO;
  },[todayISO]);

  const currentWeight=weightLog.length>0?weightLog[weightLog.length-1].weight:null;
  const sortedLog=useMemo(()=>[...weightLog].sort((a,b)=>parseLocalDate(a.date)-parseLocalDate(b.date)),[weightLog]);
  const chartLabels=useMemo(()=>sortedLog.map(e=>fmtShort(parseLocalDate(e.date))),[sortedLog]);
  const chartData=useMemo(()=>sortedLog.map(e=>e.weight),[sortedLog]);

  function saveProfile(){
    onChange(sanitizeProfile({name:(draft.name||'').trim()}));setEditing(false);
  }
  function addWeight(){
    const w=parseFloat(newWeight);
    if(!w||w<20||w>300){alert('Introduce un peso válido');return;}
    if(!isValidDate(newWeightDate)||newWeightDate>todayISO){alert('Introduce una fecha válida');return;}
    onAddWeight({id:Date.now(),date:newWeightDate,weight:w});
    setNewWeight('');
    setNewWeightDate(todayISO);
  }

  const initials=getInitials(profile.name);

  return h('div',{className:'content'},
    // Hero card
    h('div',{className:'profile-hero'},
      h('div',{className:'avatar-circle'},initials||h('svg',{viewBox:'0 0 24 24',width:28,height:28,fill:'none',stroke:'#fff',strokeWidth:2,strokeLinecap:'round'},h('circle',{cx:12,cy:8,r:4}),h('path',{d:'M4 20c0-4 3.6-7 8-7s8 3 8 7'}))),
      h('div',{className:'profile-hero-info'},
        h('div',{className:'profile-hero-name'},profile.name||'Mi perfil'),
        h('div',{className:'profile-hero-meta'},
          currentWeight?currentWeight+' kg':'Añade tu peso para estimar calorías'
        )
      ),
      h('div',{className:'profile-hero-edit'},
        h('button',{className:'btn btns btnsm',onClick:()=>{
          if(editing){setEditing(false);return;}
          setDraft(profile);setEditing(true);
        }},editing?'Cancelar':'Editar')
      )
    ),

    // Edit form
    editing&&h('div',{className:'card'},
      h('div',{className:'cardtitle'},'Editar perfil'),
      h('div',{className:'fg'},h('label',null,'Nombre'),h('input',{value:draft.name||'',onChange:e=>setDraft({...draft,name:e.target.value}),placeholder:'Tu nombre'})),
      h('button',{className:'btn btnp',style:{width:'100%',marginTop:8},onClick:saveProfile},'Guardar perfil')
    ),

    // Weight log
    h('div',{className:'card'},
      h('div',{className:'cardtitle'},
        h('span',null,'Registro de peso'),
        currentWeight&&h('div',{className:'current-weight-badge'},h('span',{className:'w-num'},currentWeight),h('span',{className:'w-unit'},'kg'))
      ),
      h('div',{style:{display:'flex',gap:8,alignItems:'flex-end',marginBottom:4}},
        h('div',{className:'fg',style:{flex:'1 1 90px',marginBottom:0}},
          h('label',null,'Peso (kg)'),
          h('input',{type:'number',inputMode:'decimal',min:20,max:300,step:.1,placeholder:'75.5',value:newWeight,onChange:e=>setNewWeight(e.target.value)})
        ),
        h('div',{className:'fg',style:{flex:'1 1 90px',marginBottom:0}},
          h('label',{style:{display:'flex',alignItems:'center',justifyContent:'space-between'}},
            h('span',null,'Fecha'),
            newWeightDate!==todayISO&&h('button',{
              onClick:()=>setNewWeightDate(todayISO),
              style:{fontSize:10,color:'var(--accent2)',background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:600,padding:0}
            },'hoy')
          ),
          h('input',{type:'date',value:newWeightDate,onChange:e=>setNewWeightDate(e.target.value||todayISO),max:todayISO,style:{fontSize:14}})
        )
      ),
      h('button',{className:'btn btnp',style:{width:'100%',marginTop:6},onClick:addWeight},'+ Añadir registro')
    ),

    // Weight chart
    sortedLog.length>=2&&h('div',{className:'card'},
      h('div',{className:'cardtitle'},'Evolución del peso'),
      h(LineChart,{labels:chartLabels,data:chartData,color:'#378ADD',unit:'kg'})
    ),

    // Weight history list
    sortedLog.length>0&&h('div',{className:'card'},
      h('div',{className:'cardtitle'},'Historial de peso'),
      [...sortedLog].reverse().map(e=>h('div',{key:e.id,className:'weight-log-row'},
        h('div',null,
          h('div',{className:'weight-log-date'},parseLocalDate(e.date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})),
        ),
        h('div',{style:{display:'flex',alignItems:'center',gap:10}},
          h('div',{className:'weight-log-val'},e.weight,h('span',null,' kg')),
          h('button',{className:'btnd',onClick:()=>onRemoveWeight(e.id)},'✕')
        )
      ))
    ),

    sortedLog.length===0&&h('div',{className:'card'},
      h('div',{className:'empty'},h('div',{className:'empty-icon'},'⚖️'),h('div',null,'Añade tu primer registro de peso'))
    ),

    // Copia de seguridad (antes era una pestaña del menú)
    h('button',{className:'card settings-row',onClick:onOpenBackup},
      h('span',{className:'settings-row-icon'},'💾'),
      h('span',{style:{flex:1,minWidth:0}},
        h('span',{className:'settings-row-title'},'Copia de seguridad'),
        h('span',{className:'settings-row-sub',style:needsBackup?{color:'var(--accent)'}:{}},
          backupAgeDays===null?'Aún no has hecho ninguna copia'
          :backupAgeDays===0?'Última copia: hoy'
          :'Última copia hace '+backupAgeDays+(backupAgeDays===1?' día':' días'))
      ),
      h('span',{className:'settings-row-chevron','aria-hidden':'true'},'›')
    ),

    // Achievements
    h('div',{className:'card'},
      h('div',{className:'cardtitle'},'🏅 Logros'),
      h(AchievementsSection,{sessions,library})
    )
  );
}

export {AchievementsSection,ProfileBanner,getInitials,ProfileTab};
