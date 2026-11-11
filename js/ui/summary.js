// Resumen al terminar la sesión: logros, récords, consejos y mapa muscular.
import {CARDIO_MIN_PER_SET,LOAD_LEVELS,exerciseLoad,loadLevel,regionLoads} from '../core/body.js';
import {fmtDuration} from '../core/dates.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

// Silueta continua de media figura (cuello → brazo → mano → axila → cadera → pierna → pie),
// común a las dos vistas; los músculos se dibujan encima.
const BODY_OUTLINE='M60 31 L54 31 L54 38 Q46 42 37 44 Q26 45 22 54 Q19 62 19 74 Q16 86 16 98 Q13 110 12 122 Q10 132 11 138 Q8 146 11 152 Q15 155 18 150 Q20 144 19 138 Q24 124 27 110 Q30 100 30 94 Q33 86 34 76 Q36 92 37 106 Q37 118 39 128 Q32 144 32 166 Q33 188 37 204 Q34 222 36 240 Q37 248 36 252 Q32 257 37 258 L55 258 Q57 254 54 249 Q56 230 54 213 Q56 207 55 201 Q59 180 59.5 150 L60 142 Z';

// Formas de media figura (lado izquierdo de la imagen); se reflejan para el otro lado.
// [zona | null (silueta), etiqueta SVG, atributos]. viewBox 0 0 120 260, eje de simetría x=60.
const BODY_SHAPES={
  front:{
    center:[
      [null,'ellipse',{cx:60,cy:19,rx:11,ry:14}],
      [null,'path',{d:'M54 31 L66 31 L66 42 L54 42 Z'}],
    ],
    half:[
      ['traps','path',{d:'M55 36 L55 46 L43 47 Q50 43 55 36 Z'}],
      ['chest','path',{d:'M58.5 49 L44 49 Q37 53 35 62 Q35 73 41 79 Q50 83 58.5 81 Z'}],
      ['deltS','path',{d:'M31 47 Q24 50 22 58 Q21 65 23 72 L27 72 Q26 62 32 51 Z'}],
      ['deltF','path',{d:'M43 48 Q36 45 32 48 Q27 58 28 72 L33 72 Q35 61 43 53 Z'}],
      ['biceps','path',{d:'M23 75 Q19 85 19 96 Q21 102 26 101 Q31 92 32 76 Z'}],
      ['forearms','path',{d:'M19 104 Q14 116 13 131 Q15 136 19 136 Q24 121 28 104 Z'}],
      ['abs','rect',{x:50.5,y:84,width:8,height:10,rx:2}],
      ['abs','rect',{x:50.5,y:96,width:8,height:10,rx:2}],
      ['abs','rect',{x:50.5,y:108,width:8,height:10,rx:2}],
      ['abs','rect',{x:51.5,y:120,width:7,height:14,rx:2}],
      ['obliques','path',{d:'M48 84 Q41 82 38 89 Q37 105 40 119 Q44 126 48.5 129 Z'}],
      [null,'path',{d:'M40 122 Q44 132 52 138 L58.5 140 L58.5 137 Q51 133 48.5 129 Q44 126 40 122 Z'}],
      ['quads','path',{d:'M39 133 Q32 152 33 176 Q34 192 39 201 L45 200 Q44 174 50 145 Q45 139 39 133 Z'}],
      ['quads','path',{d:'M51 147 Q46 172 47 200 L55 202 Q58.5 180 58.5 150 Z'}],
      [null,'ellipse',{cx:46,cy:207,rx:7,ry:4.5}],
      ['calves','path',{d:'M39 213 Q34 227 37 244 L43 246 Q44 228 44.5 213 Z'}],
      ['calves','path',{d:'M46.5 213 Q48 228 47 246 L53 246 Q56 228 52 213 Z'}],
    ],
  },
  back:{
    center:[
      [null,'ellipse',{cx:60,cy:19,rx:11,ry:14}],
      [null,'path',{d:'M54 31 L66 31 L66 38 L54 38 Z'}],
    ],
    half:[
      ['traps','path',{d:'M59.5 35 L55 36 Q50 43 41 47 Q49 52 54 60 L59.5 76 Z'}],
      ['upperback','path',{d:'M42 52 Q36 57 36 66 Q41 74 50 76 L53.5 64 Q50 56 42 52 Z'}],
      ['lats','path',{d:'M35 71 Q34 86 38 100 Q44 111 52 116 L56 98 L54.5 80 Q46 79 35 71 Z'}],
      ['lowerback','path',{d:'M55.5 84 L59.5 80 L59.5 126 L52 126 Q54 112 55.5 84 Z'}],
      ['deltS','path',{d:'M31 47 Q24 50 22 58 Q21 65 23 72 L27 72 Q26 62 32 51 Z'}],
      ['deltB','path',{d:'M42 48 Q36 45 32 48 Q27 58 28 72 L33 72 Q35 61 41 52 Z'}],
      ['triceps','path',{d:'M23 75 Q19 85 19 96 Q21 102 26 101 Q31 92 32 76 Z'}],
      ['forearms','path',{d:'M19 104 Q14 116 13 131 Q15 136 19 136 Q24 121 28 104 Z'}],
      ['glutes','path',{d:'M59.5 129 Q48 126 40 132 Q35 143 38 155 Q46 163 59.5 159 Z'}],
      ['hamstrings','path',{d:'M38 159 Q33 177 36 200 L45 202 Q45 181 50 162 Q44 162 38 159 Z'}],
      ['hamstrings','path',{d:'M52 163 Q47 181 47.5 202 L56 202 Q58.5 183 58.5 162 Z'}],
      [null,'ellipse',{cx:46,cy:207,rx:7,ry:4.5}],
      ['calves','path',{d:'M38.5 212 Q33 224 36 237 Q40 241 45 237 Q46 223 45 212 Z'}],
      ['calves','path',{d:'M47 212 Q46 225 48 239 Q53 241 55 235 Q57 223 53 212 Z'}],
    ],
  },
};

function BodyFigure({side,loads,label}){
  const shapes=BODY_SHAPES[side];
  const shape=([region,tag,attrs],i)=>h(tag,{key:i,...attrs,className:region?'bm-l'+loadLevel(loads[region]):'bm-sil'});
  return h('div',{className:'sc-map-side'},
    h('svg',{viewBox:'0 0 120 260',width:132,height:286,className:'bm',role:'img','aria-label':'Músculos trabajados, vista '+label.toLowerCase()},
      h('path',{className:'bm-sil bm-outline',d:BODY_OUTLINE}),
      h('path',{className:'bm-sil bm-outline',d:BODY_OUTLINE,transform:'translate(120,0) scale(-1,1)'}),
      shapes.center.map(shape),
      h('g',null,shapes.half.map(shape)),
      h('g',{transform:'translate(120,0) scale(-1,1)'},shapes.half.map(shape))
    ),
    h('div',{className:'sc-map-side-label'},label)
  );
}

function BodyMap({exercises}){
  const loads=useMemo(()=>regionLoads(exercises),[exercises]);
  return h('div',null,
    h('div',{className:'sc-map-wrap'},
      h(BodyFigure,{side:'front',loads,label:'Frontal'}),
      h(BodyFigure,{side:'back',loads,label:'Posterior'})
    ),
    h('div',{className:'bm-scale'},
      h('span',{className:'bm-scale-title'},'Series'),
      LOAD_LEVELS.map((l,i)=>h('span',{key:l.label,className:'bm-scale-item'},
        h('span',{className:'bm-scale-swatch bm-l'+(i+1)}),l.label))
    ),
    h('div',{className:'bm-note'},'Los músculos secundarios cuentan media serie; el cardio, 1 serie cada '+CARDIO_MIN_PER_SET+' min.')
  );
}

// ---- Session Complete Modal ----
const CONGRATS=[
  '¡Gran entrenamiento!','¡Lo has dado todo!','¡Sesión completada!',
  '¡Máximo esfuerzo!','¡Otro día, otro PR!'
];

const MUSCLE_PALETTE={
  Pecho:'#E24B4A',Espalda:'#378ADD',Piernas:'#3B6D11',
  Hombros:'#BA7517',Bíceps:'#378ADD',Tríceps:'#E24B4A',
  Core:'#72243E',Glúteos:'#3B6D11',Cardio:'#185FA5'
};

// newAchievements: logros que se han desbloqueado con esta sesión; records: récords personales;
// nextHints: ejercicios en los que toca subir la próxima vez
function SessionCompleteModal({session,newAchievements=[],records=[],nextHints=[],onClose}){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVisible(true),30);return()=>clearTimeout(t);},[]);

  // Reparto por grupo muscular en series (antes en kg, que inflaba los ejercicios pesados)
  const groupLoad={};
  session.exercises.forEach(ex=>{
    const group=ex.isCardio?'Cardio':ex.muscle;
    groupLoad[group]=(groupLoad[group]||0)+exerciseLoad(ex);
  });
  const totalLoad=Object.values(groupLoad).reduce((a,b)=>a+b,0)||1;
  const musclePct=Object.entries(groupLoad)
    .map(([m,v])=>({muscle:m,pct:Math.round(v/totalLoad*100)}))
    .sort((a,b)=>b.pct-a.pct);

  const totalSets=session.exercises.filter(e=>!e.isCardio).reduce((t,e)=>t+e.sets.length,0);
  const totalCardioMin=session.exercises.filter(e=>e.isCardio).reduce((t,e)=>t+e.sets.reduce((s,set)=>s+(parseFloat(set.duration)||0),0),0);
  const durationSecs=session.durationSecs||0;
  const [greeting]=useState(()=>CONGRATS[Math.floor(Math.random()*CONGRATS.length)]);
  const timeStr=new Date(session.date).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});

  if(!visible)return null;
  return h('div',{className:'sc-overlay',onClick:e=>{if(e.target===e.currentTarget)onClose()}},
    h('div',{className:'sc-sheet'},
      h('div',{className:'sc-header'},
        h('span',{className:'sc-emoji'},'💪'),
        h('div',{className:'sc-title'},greeting),
        h('div',{className:'sc-subtitle'},new Date(session.date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})+' · '+timeStr)
      ),
      h('div',{className:'sc-body'},
        h('div',{className:'sc-stats-row'},
          h('div',{className:'sc-stat highlight'},
            h('div',{className:'sc-stat-val'},session.calories||0),
            h('div',{className:'sc-stat-unit'},'kcal'),
            h('div',{className:'sc-stat-label'},'Calorías')
          ),
          durationSecs>0
            ? h('div',{className:'sc-stat'},
                h('div',{className:'sc-stat-val'},fmtDuration(durationSecs)),
                h('div',{className:'sc-stat-unit'},'duración'),
                h('div',{className:'sc-stat-label'},'Tiempo')
              )
            : h('div',{className:'sc-stat'},
                h('div',{className:'sc-stat-val'},session.exercises.length),
                h('div',{className:'sc-stat-unit'},'ejercicios'),
                h('div',{className:'sc-stat-label'},'Realizados')
              ),
          totalSets>0
            ? h('div',{className:'sc-stat'},
                h('div',{className:'sc-stat-val'},totalSets),
                h('div',{className:'sc-stat-unit'},'series'),
                h('div',{className:'sc-stat-label'},'Completadas')
              )
            : session.totalCardioKm>0
              ? h('div',{className:'sc-stat'},
                  h('div',{className:'sc-stat-val'},Math.round(session.totalCardioKm*10)/10),
                  h('div',{className:'sc-stat-unit'},'km recorridos'),
                  h('div',{className:'sc-stat-label'},'Distancia')
                )
              : h('div',{className:'sc-stat'},
                  h('div',{className:'sc-stat-val'},totalCardioMin),
                  h('div',{className:'sc-stat-unit'},'minutos'),
                  h('div',{className:'sc-stat-label'},'Cardio')
                )
        ),
        session.totalVolume>0&&h('div',{style:{textAlign:'center',fontSize:13,color:'var(--t2)',marginBottom:20,marginTop:-6}},
          session.exercises.length+' ejercicios · ',h('strong',{style:{color:'var(--t1)'}},Math.round(session.totalVolume).toLocaleString('es-ES')+' kg vol.')
        ),

        // Body map
        newAchievements.length>0&&h('div',{className:'sc-ach'},
          h('div',{className:'sc-ach-title'},newAchievements.length===1?'🏅 Logro desbloqueado':'🏅 '+newAchievements.length+' logros desbloqueados'),
          newAchievements.map(a=>h('div',{key:a.id,className:'sc-ach-row'},
            h('span',{className:'sc-ach-icon'},a.icon),
            h('div',null,h('div',{className:'sc-ach-name'},a.name),h('div',{className:'sc-ach-desc'},a.desc))
          ))
        ),
        records.length>0&&h('div',{className:'sc-ach sc-rec'},
          h('div',{className:'sc-ach-title'},records.length===1?'🏆 Nuevo récord':'🏆 '+records.length+' récords nuevos'),
          records.map(r=>h('div',{key:r.id,className:'sc-ach-row'},
            h('div',{style:{flex:1,minWidth:0}},
              h('div',{className:'sc-ach-name'},r.name),
              r.variant&&h('div',{className:'sc-ach-desc'},r.variant)
            ),
            h('div',{style:{textAlign:'right',flexShrink:0}},
              h('div',{className:'sc-ach-name'},r.value),
              h('div',{className:'sc-ach-desc'},'antes '+r.before)
            )
          ))
        ),
        nextHints.length>0&&h('div',{className:'sc-ach sc-next'},
          h('div',{className:'sc-ach-title'},'⬆ La próxima vez'),
          nextHints.map(x=>h('div',{key:x.id,className:'sc-ach-row',style:{display:'block'}},
            h('div',{className:'sc-ach-name'},x.name),
            h('div',{className:'sc-ach-desc'},x.text)
          ))
        ),
        h('div',{className:'sc-map-title'},'Músculos trabajados'),
        h(BodyMap,{exercises:session.exercises}),

        // Legend bars
        h('div',{className:'sc-muscle-legend'},
          musclePct.filter(m=>m.pct>0).map(({muscle,pct})=>
            h('div',{key:muscle,className:'sc-legend-row'},
              h('div',{className:'sc-legend-dot',style:{background:MUSCLE_PALETTE[muscle]||'var(--accent)'}}),
              h('div',{className:'sc-legend-name'},muscle),
              h('div',{className:'sc-legend-bar-wrap'},
                h('div',{className:'sc-legend-bar',style:{width:pct+'%',background:MUSCLE_PALETTE[muscle]||'var(--accent)'}})
              ),
              h('div',{className:'sc-legend-pct'},pct+'%')
            )
          )
        ),

        h('button',{className:'btn btnp',style:{width:'100%',height:50,fontSize:15},onClick:onClose},'Cerrar')
      )
    )
  );
}

export {BODY_OUTLINE,BODY_SHAPES,BodyFigure,BodyMap,CONGRATS,MUSCLE_PALETTE,SessionCompleteModal};
