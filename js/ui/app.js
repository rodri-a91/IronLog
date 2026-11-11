// Raíz de la app: estado global, navegación y manejo de errores.
import {repairWeightLog,sanitizeProfile} from '../core/backup.js';
import {parseLocalDate,today} from '../core/dates.js';
import {DEFAULT_LIBRARY,migrateLibrary,migrateSessions} from '../core/library.js';
import {DEFAULT_ROUTINES,sanitizeRoutines} from '../core/routines.js';
import {loadState,saveState} from '../storage.js';
import {BackupTab,downloadBackup} from './backup.js';
import {Icons,useCurrentDay} from './common.js';
import {HistoryTab} from './history.js';
import {LibraryTab} from './library.js';
import {ProfileTab} from './profile.js';
import {StatsTab} from './stats.js';
import {WorkoutTab} from './workout.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

// ---- App Root ----
function App(){
  // Al cambiar de día se repinta todo (fecha superior, "HOY", calendario, estadísticas)
  const day=useCurrentDay();
  const [tab,setTab]=useState('workout');
  const [sessions,setSessions]=useState(()=>migrateSessions(loadState('il_sessions',[])));
  const [library,setLibrary]=useState(()=>migrateLibrary(loadState('il_library',DEFAULT_LIBRARY)));
  const [profile,setProfile]=useState(()=>sanitizeProfile(loadState('il_profile',{})));
  const [weightLog,setWeightLog]=useState(()=>repairWeightLog(loadState('il_weightlog',[])));
  // Sin clave guardada (primera vez con rutinas) se cargan las de calistenia por defecto
  const [routines,setRoutines]=useState(()=>sanitizeRoutines(loadState('il_routines',DEFAULT_ROUTINES)));
  const [hasActiveSession,setHasActiveSession]=useState(false);
  const [lastBackup,setLastBackup]=useState(()=>loadState('il_lastBackup',null));

  // Pide al navegador que no borre los datos automáticamente (Safari puede hacerlo tras 7 días sin uso)
  useEffect(()=>{try{navigator.storage?.persist?.();}catch(e){}},[]);

  useEffect(()=>saveState('il_sessions',sessions),[sessions]);
  useEffect(()=>saveState('il_library',library),[library]);
  useEffect(()=>saveState('il_profile',profile),[profile]);
  useEffect(()=>saveState('il_weightlog',weightLog),[weightLog]);
  useEffect(()=>saveState('il_routines',routines),[routines]);

  function addSession(s){setSessions(prev=>[s,...prev]);}
  function deleteSession(id){setSessions(prev=>prev.filter(s=>s.id!==id));}
  function updateSession(updated){setSessions(prev=>prev.map(s=>s.id===updated.id?updated:s));}
  function addToLibrary(ex){setLibrary(prev=>[...prev,ex]);}
  // Al borrar un ejercicio se quita también de las rutinas (las sesiones guardadas lo conservan)
  function removeFromLibrary(id){
    setLibrary(prev=>prev.filter(e=>e.id!==id));
    setRoutines(prev=>prev.map(r=>r.items.includes(id)?{...r,items:r.items.filter(x=>x!==id)}:r));
  }
  function addRoutine(r){setRoutines(prev=>[...prev,r]);}
  function updateRoutine(r){setRoutines(prev=>prev.map(x=>x.id===r.id?r:x));}
  function removeRoutine(id){setRoutines(prev=>prev.filter(x=>x.id!==id));}
  function editLibrary(updated){setLibrary(prev=>prev.map(e=>e.id===updated.id?{...e,...updated}:e));}
  function addWeight(entry){setWeightLog(prev=>[...prev,entry].sort((a,b)=>parseLocalDate(a.date)-parseLocalDate(b.date)));}
  function markExported(){const now=Date.now();setLastBackup(now);saveState('il_lastBackup',now);}
  const BACKUP_REMINDER_DAYS=7;
  const backupAgeDays=lastBackup?Math.floor((Date.now()-lastBackup)/864e5):null;
  const needsBackup=sessions.length>0&&(backupAgeDays===null||backupAgeDays>=BACKUP_REMINDER_DAYS);
  function removeWeight(id){setWeightLog(prev=>prev.filter(e=>e.id!==id));}
  function restoreBackup(data){
    setSessions(migrateSessions(data.sessions));
    setLibrary(migrateLibrary(data.library));
    // Las copias anteriores a las rutinas no las traen: se conservan las actuales
    if(data.routines)setRoutines(sanitizeRoutines(data.routines));
    if(data.profile)setProfile(sanitizeProfile(data.profile));
    if(data.weightLog)setWeightLog(repairWeightLog(data.weightLog));
  }

  const TABS=[
    {id:'workout', label:'Hoy',       Icon:Icons.workout},
    {id:'library', label:'Ejercicios',Icon:Icons.library},
    {id:'history', label:'Historial', Icon:Icons.history},
    {id:'stats',   label:'Stats',     Icon:Icons.stats},
    {id:'profile', label:'Perfil',    Icon:()=>h('svg',{viewBox:'0 0 24 24'},h('circle',{cx:12,cy:8,r:4}),h('path',{d:'M4 20c0-4 3.6-7 8-7s8 3 8 7'}))},
  ];
  // La copia de seguridad no está en el menú: se abre desde Perfil, que sigue marcado mientras tanto
  const navActive=id=>tab===id||(id==='profile'&&tab==='backup');

  return h('div',{className:'app'},
    h('div',{className:'topbar'},
      h('div',{className:'logo'},
        // Mancuerna en SVG, a juego con icon-180.png
        h('svg',{className:'logo-mark',viewBox:'0 0 36 20','aria-hidden':'true'},
          h('rect',{className:'bar',x:9,y:8.5,width:18,height:3,rx:1}),
          h('rect',{className:'plate',x:1,y:3,width:5,height:14,rx:1.5}),
          h('rect',{className:'plate',x:7,y:5,width:3,height:10,rx:1}),
          h('rect',{className:'plate',x:26,y:5,width:3,height:10,rx:1}),
          h('rect',{className:'plate',x:30,y:3,width:5,height:14,rx:1.5})
        ),
        h('div',null,'IRON',h('span',null,'LOG'))
      ),
      h('div',{className:'datebadge'},today())
    ),
    h('div',{className:'nav'},
      TABS.map(t=>h('div',{key:t.id,className:'navbtn-wrap'},
        h('button',{className:'navbtn'+(navActive(t.id)?' active':''),onClick:()=>setTab(t.id),style:{width:'100%'}},
          h(t.Icon),h('span',null,t.label)
        ),
        t.id==='workout'&&hasActiveSession&&tab!=='workout'&&h('div',{className:'navbtn-dot'})
      ))
    ),
    needsBackup&&tab==='workout'&&h('div',{style:{padding:'12px 16px 0'}},
      h('div',{className:'profile-bar',style:{marginBottom:0}},
        h('span',null,'💾 ',backupAgeDays===null?'Aún no has hecho ninguna copia de seguridad':'Última copia hace '+backupAgeDays+' días'),
        h('button',{className:'btn btns btnsm',onClick:()=>setTab('backup')},'Hacer copia')
      )
    ),
    // All tabs stay mounted — only active one is visible.
    h('div',{style:{display:tab==='workout'?'block':'none'}},
      h(WorkoutTab,{sessions,library,routines,onAddRoutine:addRoutine,onSave:addSession,profile,weightLog,onGoToProfile:()=>setTab('profile'),onAddToLibrary:addToLibrary,onActiveSessionChange:setHasActiveSession})),
    h('div',{style:{display:tab==='library'?'block':'none'}},
      h(LibraryTab,{library,sessions,routines,onAdd:addToLibrary,onRemove:removeFromLibrary,onEdit:editLibrary,
        onAddRoutine:addRoutine,onUpdateRoutine:updateRoutine,onRemoveRoutine:removeRoutine})),
    h('div',{style:{display:tab==='history'?'block':'none'}},
      h(HistoryTab,{sessions,library,routines,weightLog,onDelete:deleteSession,onUpdate:updateSession})),
    h('div',{style:{display:tab==='stats'?'block':'none'}},
      h(StatsTab,{sessions,library,day})),
    h('div',{style:{display:tab==='profile'?'block':'none'}},
      h(ProfileTab,{profile,onChange:setProfile,weightLog,onAddWeight:addWeight,onRemoveWeight:removeWeight,sessions,library,
        backupAgeDays,needsBackup,onOpenBackup:()=>{setTab('backup');window.scrollTo(0,0);}})),
    h('div',{style:{display:tab==='backup'?'block':'none'}},
      h(BackupTab,{sessions,library,profile,weightLog,routines,onRestore:restoreBackup,onExported:markExported,
        onBack:()=>{setTab('profile');window.scrollTo(0,0);}}))
  );
}

// Si algo falla al renderizar, en vez de pantalla en blanco se muestra un aviso con opción de rescatar los datos
class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error(error,info);}
  render(){
    if(!this.state.error)return this.props.children;
    const rescue=()=>downloadBackup({
      sessions:loadState('il_sessions',[]),library:loadState('il_library',[]),
      profile:loadState('il_profile',{}),weightLog:loadState('il_weightlog',[]),routines:loadState('il_routines',[]),
    });
    return h('div',{className:'content'},
      h('div',{className:'card'},
        h('div',{className:'ptitle',style:{fontSize:20}},'Algo ha fallado'),
        h('p',{style:{fontSize:13,color:'var(--t2)',lineHeight:1.6,margin:'8px 0 16px'}},
          'Tus datos siguen guardados en el dispositivo. Descarga una copia antes de nada y después prueba a recargar.'),
        h('pre',{style:{fontSize:11,color:'var(--t2)',whiteSpace:'pre-wrap',marginBottom:16}},String(this.state.error?.message||this.state.error)),
        h('div',{style:{display:'flex',gap:8}},
          h('button',{className:'btn btnp',style:{flex:1},onClick:rescue},'⬇ Descargar datos'),
          h('button',{className:'btn btns',onClick:()=>location.reload()},'Recargar')
        )
      )
    );
  }
}

export {App,ErrorBoundary};
