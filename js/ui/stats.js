// Pestaña Stats: calendario, gráficos y progresión.
import {fmtDuration,fmtShort,localISODate} from '../core/dates.js';
import {MUSCLE_COLORS,exKey,exMode} from '../core/library.js';
import {bodyweightReps} from '../core/sessions.js';
import {BarChart,LineChart} from './common.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

// ---- Training Calendar ----
function TrainingCalendar({sessions}){
  const now=new Date();
  const [viewYear,setViewYear]=useState(now.getFullYear());
  const [viewMonth,setViewMonth]=useState(now.getMonth()); // 0-based

  // Fechas locales "YYYY-MM-DD" con entrenamiento (incluye otros meses para las celdas de los bordes)
  const trainedDays=useMemo(()=>new Set(sessions.map(s=>localISODate(new Date(s.date)))),[sessions]);

  function prevMonth(){
    if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}
    else setViewMonth(m=>m-1);
  }
  function nextMonth(){
    const ny=viewMonth===11?viewYear+1:viewYear;
    const nm=viewMonth===11?0:viewMonth+1;
    // don't go past current month
    if(ny>now.getFullYear()||(ny===now.getFullYear()&&nm>now.getMonth()))return;
    setViewMonth(nm);setViewYear(ny);
  }

  const monthName=new Date(viewYear,viewMonth,1).toLocaleDateString('es-ES',{month:'long',year:'numeric'});
  const firstDow=(new Date(viewYear,viewMonth,1).getDay()+6)%7; // Mon=0
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const totalCells=Math.ceil((firstDow+daysInMonth)/7)*7;
  const isCurrentMonth=viewYear===now.getFullYear()&&viewMonth===now.getMonth();
  const todayISO=localISODate(now);

  const cells=[];
  let trainedCount=0;
  for(let i=0;i<totalCells;i++){
    // new Date desborda solo al mes anterior/siguiente para las celdas de los bordes
    const date=new Date(viewYear,viewMonth,i-firstDow+1);
    const iso=localISODate(date);
    const isCurrentMonthDay=date.getMonth()===viewMonth;
    const isTrained=trainedDays.has(iso);
    if(isTrained&&isCurrentMonthDay)trainedCount++;
    const cls=['cal-day',!isCurrentMonthDay?'other-month':'',isTrained?'trained':'',iso===todayISO?'today':''].filter(Boolean).join(' ');
    cells.push(h('div',{key:i,className:cls},date.getDate()));
  }

  const atMaxMonth=isCurrentMonth;

  return h('div',{className:'card'},
    h('div',{className:'cal-nav'},
      h('button',{className:'cal-nav-btn',onClick:prevMonth},'‹'),
      h('div',{style:{textAlign:'center'}},
        h('div',{className:'cal-month-label'},monthName.charAt(0).toUpperCase()+monthName.slice(1)),
        trainedCount>0&&h('div',{style:{fontSize:11,color:'var(--accent)',fontWeight:600,marginTop:2}},trainedCount+' día'+(trainedCount!==1?'s':'')+' entrenado'+(trainedCount!==1?'s':''))
      ),
      h('button',{className:'cal-nav-btn',onClick:nextMonth,style:{opacity:atMaxMonth?.3:1,cursor:atMaxMonth?'default':'pointer'}},'›')
    ),
    h('div',{className:'cal-grid'},
      ['L','M','X','J','V','S','D'].map(d=>h('div',{key:d,className:'cal-dow'},d)),
      ...cells
    ),
    h('div',{className:'cal-legend'},
      h('div',{className:'cal-legend-dot',style:{background:'var(--accent)'}}),
      h('span',null,'Día entrenado'),
      h('div',{className:'cal-legend-dot',style:{background:'transparent',boxShadow:'0 0 0 2px var(--accent2)'}}),
      h('span',null,'Hoy')
    )
  );
}

// ---- Stats Tab ----
// Tramos del gráfico, de más antiguo a más reciente. Se construyen con fechas de calendario locales
// (new Date(y,m,d+k)) para que el cambio de hora no desplace los límites.
function statsBuckets(period,now=new Date()){
  const y=now.getFullYear(),m=now.getMonth(),d=now.getDate();
  if(period==='week')return Array.from({length:7},(_,i)=>{
    const from=new Date(y,m,d-6+i);
    return {label:from.toLocaleDateString('es-ES',{weekday:'short'}),from,to:new Date(y,m,d-5+i)};
  });
  if(period==='month')return Array.from({length:4},(_,i)=>{
    const from=new Date(y,m,d-27+i*7);
    return {label:fmtShort(from),from,to:new Date(y,m,d-20+i*7)};
  });
  return Array.from({length:12},(_,i)=>{
    const from=new Date(y,m-11+i,1);
    return {label:from.toLocaleDateString('es-ES',{month:'short'}),from,to:new Date(y,m-10+i,1)};
  });
}

function StatsTab({sessions,library,day}){
  const [period,setPeriod]=useState('week');
  const [selEx,setSelEx]=useState('');
  const buckets=useMemo(()=>statsBuckets(period),[period,sessions,day]);
  const cutoff=buckets[0].from;
  const filtered=useMemo(()=>sessions.filter(s=>new Date(s.date)>=cutoff),[sessions,cutoff]);
  const totalVol=filtered.reduce((s,x)=>s+x.totalVolume,0);
  const totalCal=filtered.reduce((s,x)=>s+(x.calories||0),0);
  const totalCardio=filtered.reduce((s,x)=>s+(x.totalCardioMin||0),0);
  const totalKm=filtered.reduce((s,x)=>s+(x.totalCardioKm||0),0);
  const totalBwReps=filtered.reduce((s,x)=>s+bodyweightReps(x.exercises),0);
  const avgDurSecs=filtered.filter(s=>s.durationSecs>0).length>0
    ?Math.round(filtered.filter(s=>s.durationSecs>0).reduce((t,s)=>t+(s.durationSecs||0),0)/filtered.filter(s=>s.durationSecs>0).length)
    :0;

  // Memoizados para que los gráficos no se destruyan y recreen en cada render
  const {labels,volData,calData}=useMemo(()=>{
    const inB=b=>filtered.filter(s=>{const d=new Date(s.date);return d>=b.from&&d<b.to;});
    return {
      labels:buckets.map(b=>b.label),
      volData:buckets.map(b=>Math.round(inB(b).reduce((a,s)=>a+s.totalVolume,0))),
      calData:buckets.map(b=>inB(b).reduce((a,s)=>a+(s.calories||0),0)),
    };
  },[buckets,filtered]);

  // Ejercicios de fuerza agrupados por libraryId (sobrevive a renombrados); nombre y modo actuales de la biblioteca.
  // La progresión mide lo que importa en cada modo: kg máximos, reps máximas en una serie o segundos máximos.
  const {strengthEx,exList,maxW}=useMemo(()=>{
    const libById=Object.fromEntries(library.map(e=>[e.id,e]));
    const all={};
    sessions.forEach(s=>s.exercises.forEach(e=>{
      if(e.isCardio)return;
      const k=exKey(e);
      const lib=libById[e.libraryId];
      if(!all[k])all[k]={key:k,name:lib?.name||e.name,mode:lib?exMode(lib):exMode(e),max:0,cnt:0,muscle:e.muscle};
      if(exMode(e)==='weight'){
        const mw=Math.max(0,...e.sets.map(s=>parseFloat(s.weight)||0));
        if(mw>all[k].max)all[k].max=mw;
      }
      all[k].cnt++;
    }));
    const list=Object.values(all);
    // "Peso máximo" solo tiene sentido en los ejercicios con peso
    const top=list.filter(e=>e.mode==='weight'&&e.max>0).sort((a,b)=>b.cnt-a.cnt).slice(0,6);
    return {
      strengthEx:[...list].sort((a,b)=>a.name.localeCompare(b.name,'es')),
      exList:top,
      maxW:Math.max(...top.map(e=>e.max),1),
    };
  },[sessions,library]);
  // Una línea de progresión necesita al menos dos sesiones: solo se ofrecen esos ejercicios. Antes se
  // elegía el primero por orden alfabético y, si tenía una sola sesión, se ocultaba la tarjeta entera
  // (con el desplegable), así que no se podía elegir otro
  const chartable=strengthEx.filter(e=>e.cnt>=2);
  const selKey=chartable.some(e=>e.key===selEx)?selEx:(chartable[0]?.key||'');
  const selMode=strengthEx.find(e=>e.key===selKey)?.mode||'weight';
  const PROGRESS={
    weight:{title:'Progresión de peso',unit:'kg',field:'weight'},
    bodyweight:{title:'Progresión de repeticiones',unit:'reps',field:'reps'},
    time:{title:'Progresión de tiempo',unit:'s',field:'secs'},
  }[selMode];
  const exHistory=useMemo(()=>sessions.slice().reverse().filter(s=>s.exercises.some(e=>exKey(e)===selKey)).map(s=>{
    const ex=s.exercises.find(e=>exKey(e)===selKey);
    return {date:fmtShort(s.date),max:Math.max(0,...ex.sets.map(s=>parseFloat(s[PROGRESS.field])||0))};
  }),[sessions,selKey,PROGRESS.field]);
  const exLabels=useMemo(()=>exHistory.map(e=>e.date),[exHistory]);
  const exData=useMemo(()=>exHistory.map(e=>e.max),[exHistory]);

  return h('div',{className:'content'},
    h('div',{className:'ptitle'},'ESTADÍSTICAS'),
    h('div',{className:'psub'},'Evolución y rendimiento'),
    h('div',{className:'periodtabs'},['week','month','year'].map((p,i)=>h('button',{key:p,className:'pbtn'+(period===p?' active':''),onClick:()=>setPeriod(p)},['Semana','Mes','Año'][i]))),
    h('div',{className:'mgrid'},
      [
        {l:'Sesiones',v:filtered.length,u:''},
        {l:'Volumen',v:Math.round(totalVol).toLocaleString('es-ES'),u:'kg'},
        {l:'Calorías',v:totalCal.toLocaleString('es-ES'),u:'kcal'},
        {l:'Duración media',v:avgDurSecs>0?fmtDuration(avgDurSecs):'—',u:''},
        ...(totalBwReps>0?[{l:'Reps peso corporal',v:totalBwReps.toLocaleString('es-ES'),u:'reps'}]:[]),
        ...(totalKm>0?[{l:'Cardio',v:Math.round(totalKm*10)/10,u:'km'}]:[]),
        ...(totalKm>0?[{l:'Tiempo cardio',v:totalCardio,u:'min'}]:[]),
      ].map(m=>h('div',{key:m.l,className:'mcard'},h('div',{className:'mlabel'},m.l),h('div',{className:'mval'},m.v,m.u&&h('span',{className:'unit'},' '+m.u))))
    ),
    h(TrainingCalendar,{sessions}),
    h('div',{className:'card'},h('div',{className:'cardtitle'},'Volumen (kg)'),h(BarChart,{labels,data:volData,color:'#E24B4A'})),
    h('div',{className:'card'},h('div',{className:'cardtitle'},'Calorías (kcal)'),h(BarChart,{labels,data:calData,color:'#BA7517'})),
    exHistory.length>1&&h('div',{className:'card'},
      h('div',{className:'cardtitle'},
        h('span',null,PROGRESS.title),
        h('select',{value:selKey,onChange:e=>setSelEx(e.target.value),style:{height:26,fontSize:12,border:'0.5px solid var(--border2)',borderRadius:6,background:'var(--bg2)',color:'var(--t1)',fontFamily:'inherit',padding:'0 6px'}},
          chartable.map(e=>h('option',{key:e.key,value:e.key},e.name))
        )
      ),
      h(LineChart,{labels:exLabels,data:exData,color:'#E24B4A',unit:PROGRESS.unit})
    ),
    exList.length>0&&h('div',{className:'card'},
      h('div',{className:'cardtitle'},'Peso máximo por ejercicio'),
      exList.map(e=>h('div',{key:e.key,style:{marginBottom:14}},
        h('div',{className:'rowflex'},
          h('div',null,h('span',{style:{fontSize:13,fontWeight:600,color:'var(--t1)'}},e.name),' ',h('span',{className:`tag ${MUSCLE_COLORS[e.muscle]||'tb'}`},e.muscle)),
          h('span',{style:{fontSize:13,fontWeight:600,color:'var(--t1)'}},e.max+' kg')
        ),
        h('div',{className:'pbar'},h('div',{className:'pbarf',style:{width:Math.round((e.max/maxW)*100)+'%'}}))
      ))
    )
  );
}

export {TrainingCalendar,statsBuckets,StatsTab};
