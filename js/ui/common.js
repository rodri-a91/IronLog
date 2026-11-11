// Hooks y componentes compartidos: fecha actual, tema, gráficos, buscador de ejercicios e iconos.
import {localISODate} from '../core/dates.js';
import {MUSCLE_COLORS,normalizeText,searchTokens} from '../core/library.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

// Fecha local actual que se actualiza a medianoche y al volver a la app (iOS congela los timers en segundo plano)
function useCurrentDay(){
  const [day,setDay]=useState(()=>localISODate());
  useEffect(()=>{
    const check=()=>setDay(localISODate());
    let t;
    const schedule=()=>{
      const n=new Date();
      const next=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1);
      t=setTimeout(()=>{check();schedule();},next-n+1000);
    };
    schedule();
    document.addEventListener('visibilitychange',check);
    return()=>{clearTimeout(t);document.removeEventListener('visibilitychange',check);};
  },[]);
  return day;
}

// ---- Charts ----
// Sigue el tema del sistema en vivo para que los gráficos se repinten al cambiar a modo oscuro/claro
function useDarkMode(){
  const [dark,setDark]=useState(()=>matchMedia('(prefers-color-scheme:dark)').matches);
  useEffect(()=>{
    const mq=matchMedia('(prefers-color-scheme:dark)');
    const onChange=e=>setDark(e.matches);
    mq.addEventListener('change',onChange);
    return()=>mq.removeEventListener('change',onChange);
  },[]);
  return dark;
}

function BarChart({labels,data,color}){
  const ref=useRef(),cr=useRef();
  const dk=useDarkMode();
  useEffect(()=>{
    if(!ref.current)return;
    if(cr.current)cr.current.destroy();
    const gc=dk?'rgba(255,255,255,.07)':'rgba(0,0,0,.06)',tc=dk?'#777':'#888';
    cr.current=new Chart(ref.current,{
      type:'bar',
      data:{labels,datasets:[{data,backgroundColor:color||'#E24B4A',borderRadius:5}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{grid:{color:gc},ticks:{color:tc,font:{size:10}}},
                y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:v=>v>=1000?(v/1000).toFixed(1)+'k':v}}}}
    });
    return()=>{if(cr.current)cr.current.destroy()};
  },[labels,data,color,dk]);
  return h('div',{className:'chartw'},h('canvas',{ref}));
}

function LineChart({labels,data,color,unit}){
  const ref=useRef(),cr=useRef();
  const dk=useDarkMode();
  useEffect(()=>{
    if(!ref.current)return;
    if(cr.current)cr.current.destroy();
    const gc=dk?'rgba(255,255,255,.07)':'rgba(0,0,0,.06)',tc=dk?'#777':'#888';
    cr.current=new Chart(ref.current,{
      type:'line',
      data:{labels,datasets:[{data,borderColor:color||'#378ADD',backgroundColor:(color||'#378ADD')+'25',fill:true,tension:.35,pointBackgroundColor:color||'#378ADD',pointRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{grid:{color:gc},ticks:{color:tc,font:{size:10}}},
                // Reps y segundos son enteros: sin marcas como "14.5 reps"
                y:{grid:{color:gc},ticks:{color:tc,font:{size:10},...(unit?{callback:v=>v+' '+unit}:{}),...(unit==='reps'||unit==='s'?{precision:0}:{})}}}}
    });
    return()=>{if(cr.current)cr.current.destroy()};
  },[labels,data,color,unit,dk]);
  return h('div',{className:'chartw'},h('canvas',{ref}));
}

// ---- Exercise Picker ----
function ExercisePicker({library,onSelect,onCreateNew}){
  const [query,setQuery]=useState('');
  const [open,setOpen]=useState(false);
  const ref=useRef();
  useEffect(()=>{
    function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}
    document.addEventListener('touchstart',h);document.addEventListener('mousedown',h);
    return()=>{document.removeEventListener('touchstart',h);document.removeEventListener('mousedown',h)};
  },[]);
  const haystacks=useMemo(()=>library.map(e=>normalizeText(e.name+' '+e.muscle)),[library]);
  const filtered=useMemo(()=>{
    const tokens=searchTokens(query);
    if(!tokens.length)return library;
    return library.filter((_,i)=>tokens.every(t=>haystacks[i].includes(t)));
  },[library,haystacks,query]);
  const grouped=useMemo(()=>{
    const g={};filtered.forEach(e=>{if(!g[e.muscle])g[e.muscle]=[];g[e.muscle].push(e);});return g;
  },[filtered]);
  function select(ex){setQuery('');setOpen(false);onSelect(ex);}
  return h('div',{className:'picker-wrap',ref},
    h('input',{className:'picker-search',placeholder:'Buscar ejercicio...',value:query,
      onFocus:()=>setOpen(true),onChange:e=>{setQuery(e.target.value);setOpen(true);}}),
    open&&h('div',{className:'picker-dropdown'},
      Object.entries(grouped).map(([muscle,exs])=>h('div',{key:muscle},
        h('div',{className:'picker-group-label'},muscle),
        // onClick (no onTouchEnd): el navegador no lo dispara si el gesto fue un scroll de la lista
        exs.map(ex=>h('div',{key:ex.id,className:'picker-option',onClick:()=>select(ex)},
          h('span',null,ex.name),
          h('span',{className:`tag ${MUSCLE_COLORS[ex.muscle]||'tb'}`},ex.muscle)
        ))
      )),
      onCreateNew&&h('div',{className:'picker-new-row',onClick:()=>{setOpen(false);onCreateNew(query);}},
        h('span',{style:{fontSize:18,lineHeight:1}},'+'),
        h('span',null,query?`Crear "${query}"...`:'Añadir ejercicio nuevo')
      )
    )
  );
}

// ---- NAV ICONS (SVG inline) ----
const Icons={
  workout:()=>h('svg',{viewBox:'0 0 24 24'},h('path',{d:'M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3'})),
  library:()=>h('svg',{viewBox:'0 0 24 24'},h('path',{d:'M4 19V5a2 2 0 012-2h12a2 2 0 012 2v14M9 3v16M4 7h5M4 11h5M4 15h5'})),
  history:()=>h('svg',{viewBox:'0 0 24 24'},h('circle',{cx:12,cy:12,r:9}),h('path',{d:'M12 7v5l3 3'})),
  stats:()=>h('svg',{viewBox:'0 0 24 24'},h('path',{d:'M3 3v18h18'}),h('path',{d:'M7 16l4-4 4 4 5-5'})),
};

export {useCurrentDay,useDarkMode,BarChart,LineChart,ExercisePicker,Icons};
