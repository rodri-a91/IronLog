// Biblioteca de ejercicios por defecto, migraciones de datos antiguos, modos de registro y búsqueda.

// ---- Constants ----
const MUSCLES=['Pecho','Espalda','Piernas','Hombros','Bíceps','Tríceps','Core','Glúteos','Cardio'];

const MUSCLE_COLORS={Pecho:'tr',Espalda:'tb',Piernas:'tg',Hombros:'ta',Bíceps:'tb',Tríceps:'tr',Core:'tp',Glúteos:'tg',Cardio:'tb'};

const MUSCLE_MET={Pecho:4.0,Espalda:4.2,Piernas:5.0,Hombros:3.8,Bíceps:3.5,Tríceps:3.5,Core:3.8,Glúteos:4.5};

const DEFAULT_LIBRARY=[
  {id:'press-banca',name:'Press de banca',muscle:'Pecho',isCardio:false},
  {id:'press-inclinado',name:'Press inclinado',muscle:'Pecho',isCardio:false},
  {id:'aperturas',name:'Apertura con mancuernas',muscle:'Pecho',isCardio:false},
  {id:'fondos',name:'Fondo en paralelas',muscle:'Pecho',isCardio:false},
  {id:'jalones',name:'Jalón al pecho',muscle:'Espalda',isCardio:false},
  {id:'remo-barra',name:'Remo con barra',muscle:'Espalda',isCardio:false},
  {id:'dominadas',name:'Dominada',muscle:'Espalda',isCardio:false},
  {id:'remo-polea',name:'Remo en polea',muscle:'Espalda',isCardio:false},
  {id:'sentadilla',name:'Sentadilla',muscle:'Piernas',isCardio:false},
  {id:'prensa',name:'Prensa de piernas',muscle:'Piernas',isCardio:false},
  {id:'peso-muerto',name:'Peso muerto',muscle:'Piernas',isCardio:false},
  {id:'extension-cuad',name:'Extensión de cuádriceps',muscle:'Piernas',isCardio:false},
  {id:'curl-femoral',name:'Curl femoral',muscle:'Piernas',isCardio:false},
  {id:'press-militar',name:'Press militar',muscle:'Hombros',isCardio:false},
  {id:'elevaciones-lat',name:'Elevación lateral',muscle:'Hombros',isCardio:false},
  {id:'pajaro',name:'Pájaro con mancuernas',muscle:'Hombros',isCardio:false},
  {id:'curl-biceps',name:'Curl de bíceps',muscle:'Bíceps',isCardio:false},
  {id:'curl-martillo',name:'Curl martillo',muscle:'Bíceps',isCardio:false},
  {id:'press-frances',name:'Press francés',muscle:'Tríceps',isCardio:false},
  {id:'extension-triceps',name:'Extensión de tríceps en polea',muscle:'Tríceps',isCardio:false},
  {id:'crunch',name:'Crunch abdominal',muscle:'Core',isCardio:false},
  {id:'plancha',name:'Plancha',muscle:'Core',isCardio:false,mode:'time',
   variants:['Con rodillas apoyadas','Normal','Apretando al máximo','Levantando un brazo o una pierna']},
  {id:'hip-thrust',name:'Hip thrust',muscle:'Glúteos',isCardio:false},
  {id:'patada-gluteo',name:'Patada de glúteo',muscle:'Glúteos',isCardio:false},
  // Calistenia (peso corporal y por tiempo); las variantes van de más fácil a más difícil
  {id:'flexiones',name:'Flexión',muscle:'Pecho',isCardio:false,mode:'bodyweight',
   variants:['Inclinadas (manos en una mesa)','Normales','Bajada lenta de 4 s','Pies elevados en una silla','Arqueras']},
  {id:'flexiones-pica',name:'Flexión en pica',muscle:'Hombros',isCardio:false,mode:'bodyweight',
   variants:['Pies en el suelo','Pies en una silla','Pies en silla, cadera a 90°','Pino contra la pared, solo bajando']},
  {id:'flexiones-cerradas',name:'Flexión cerrada',muscle:'Tríceps',isCardio:false,mode:'bodyweight',
   variants:['Inclinadas en una mesa','Normales cerradas','Diamante','Cerradas con pies elevados']},
  {id:'fondos-silla',name:'Fondo en silla',muscle:'Tríceps',isCardio:false,mode:'bodyweight',
   variants:['Rodillas dobladas','Piernas estiradas','Pies en otra silla','Con pausa de 2 s abajo']},
  {id:'remo-mesa',name:'Remo invertido bajo mesa',muscle:'Espalda',isCardio:false,mode:'bodyweight',
   variants:['Rodillas dobladas','Piernas estiradas','Pausa de 2 s arriba','Pies elevados']},
  {id:'remo-toalla',name:'Remo con toalla en puerta',muscle:'Espalda',isCardio:false,mode:'bodyweight',
   variants:['Cuerpo bastante vertical','Más inclinado','Pausa de 2 s arriba','Con un brazo']},
  {id:'ytw',name:'Y-T-W tumbado',muscle:'Hombros',isCardio:false,mode:'bodyweight',
   variants:['Y-T-W','Con pausa de 3 s','Con botellas de agua','Añadiendo una I']},
  {id:'sentadilla-libre',name:'Sentadilla sin peso',muscle:'Piernas',isCardio:false,mode:'bodyweight',
   variants:['A una silla','Bajada de 3 s','Pausa de 3 s abajo','Sentadilla y media']},
  {id:'zancada-atras',name:'Zancada hacia atrás',muscle:'Piernas',isCardio:false,mode:'bodyweight',
   variants:['Apoyando una mano en la pared','Normal','Pausa de 2 s abajo','Pie delantero en un escalón']},
  {id:'bulgara',name:'Sentadilla búlgara',muscle:'Piernas',isCardio:false,mode:'bodyweight',
   variants:['Zancada estática','Búlgara','Bajada de 3 s y pausa','Con mochila cargada']},
  {id:'curl-toalla',name:'Curl femoral deslizante',muscle:'Piernas',isCardio:false,mode:'bodyweight',
   variants:['Solo la ida, despacio','Completo a dos piernas','Completo con bajada lenta','A una pierna']},
  {id:'gemelos',name:'Elevación de gemelos',muscle:'Piernas',isCardio:false,mode:'bodyweight',
   variants:['Dos piernas en el suelo','Dos piernas en escalón','Una pierna en escalón','Una pierna con pausa de 2 s']},
  {id:'puente-gluteo',name:'Puente de glúteo',muscle:'Glúteos',isCardio:false,mode:'bodyweight',
   variants:['Dos piernas','Una pierna','Una pierna con pausa de 3 s','Una pierna con la espalda en el sofá']},
  {id:'hip-thrust-sofa',name:'Hip thrust en sofá',muscle:'Glúteos',isCardio:false,mode:'bodyweight',
   variants:['Dos piernas','Pausa de 3 s arriba','Una pierna','Una pierna con pausa']},
  {id:'dead-bug',name:'Dead bug',muscle:'Core',isCardio:false,mode:'bodyweight',
   variants:['Solo piernas','Brazo y pierna contrarios','Pausa de 3 s estirado','Piernas casi rectas']},
  {id:'hollow',name:'Hollow hold',muscle:'Core',isCardio:false,mode:'time',
   variants:['Rodillas dobladas, brazos a los lados','Piernas estiradas, brazos a los lados','Brazos por encima de la cabeza','Balanceo (hollow rocks)']},
  {id:'plancha-lateral',name:'Plancha lateral',muscle:'Core',isCardio:false,mode:'time',
   variants:['Con rodillas apoyadas','Normal','Pierna de arriba levantada','Con subidas de cadera']},
  {id:'wall-sit',name:'Sentadilla isométrica en pared',muscle:'Piernas',isCardio:false,mode:'time',
   variants:['Más alto (ángulo abierto)','Muslos paralelos','Más peso en una pierna','A una pierna']},
  {id:'carrera',name:'Carrera',muscle:'Cardio',isCardio:true},
  {id:'bicicleta',name:'Bicicleta estática',muscle:'Cardio',isCardio:true},
  {id:'eliptica',name:'Elíptica',muscle:'Cardio',isCardio:true},
  {id:'remo-cardio',name:'Remo ergómetro',muscle:'Cardio',isCardio:true},
  {id:'cuerda',name:'Comba',muscle:'Cardio',isCardio:true},
];

// Nombres anteriores de los ejercicios por defecto, para migrar datos guardados con ellos
const LEGACY_NAMES={
  'press-banca':['Press banca'],
  'aperturas':['Aperturas con mancuernas'],
  'fondos':['Fondos en paralelas'],
  'jalones':['Jalones al pecho'],
  'dominadas':['Dominadas'],
  'elevaciones-lat':['Elevaciones laterales'],
  'extension-triceps':['Extensión tríceps polea'],
  'remo-cardio':['Remo (cardio)'],
  'cuerda':['Comba / Saltar a la cuerda'],
};

const DEFAULT_BY_ID=Object.fromEntries(DEFAULT_LIBRARY.map(e=>[e.id,e]));

// Nombre (antiguo o actual) de un ejercicio por defecto → id
const DEFAULT_ID_BY_NAME=Object.fromEntries([
  ...DEFAULT_LIBRARY.map(e=>[e.name,e.id]),
  ...Object.entries(LEGACY_NAMES).flatMap(([id,names])=>names.map(n=>[n,id])),
]);

// Actualiza el nombre de un ejercicio de sesión al estándar actual. Solo toca nombres que coinciden
// exactamente con uno por defecto (los renombrados por el usuario y los personalizados se respetan).
// Si no tiene libraryId pero el nombre es de uno por defecto, lo vincula. Idempotente.
function migrateExercise(e){
  if(e.libraryId){
    const def=DEFAULT_BY_ID[e.libraryId];
    return def&&LEGACY_NAMES[e.libraryId]?.includes(e.name)?{...e,name:def.name}:e;
  }
  const id=DEFAULT_ID_BY_NAME[e.name];
  return id?{...e,libraryId:id,name:DEFAULT_BY_ID[id].name}:e;
}

function migrateSessions(sessions){
  return sessions.map(s=>({...s,exercises:s.exercises.map(migrateExercise)}));
}

// Renombra a los nombres actuales y añade los ejercicios por defecto que falten: la biblioteca se guarda
// entera en el dispositivo y los por defecto no se pueden borrar, así que uno ausente es uno nuevo.
// A los por defecto guardados antes de existir modo y variantes se les añaden (sin pisar lo editado).
function migrateLibrary(library){
  const migrated=library.map(e=>{
    const def=DEFAULT_BY_ID[e.id];
    if(!def)return e;
    let r=LEGACY_NAMES[e.id]?.includes(e.name)?{...e,name:def.name}:e;
    if(def.mode&&!r.mode)r={...r,mode:def.mode};
    if(def.variants&&!r.variants)r={...r,variants:def.variants};
    return r;
  });
  const ids=new Set(migrated.map(e=>e.id));
  return [...migrated,...DEFAULT_LIBRARY.filter(e=>!ids.has(e.id))];
}

// Modo de registro: peso (kg × reps), peso corporal (reps + lastre opcional), tiempo (segundos) o cardio
const MODES=['weight','bodyweight','time'];

const MODE_LABELS={weight:'Peso',bodyweight:'Peso corporal',time:'Tiempo',cardio:'Cardio'};

function exMode(e){return e.isCardio?'cardio':(e.mode||'weight');}

// Identidad estable de un ejercicio: libraryId sobrevive a renombrados; el nombre es fallback para datos antiguos
function exKey(e){return e.libraryId?'id:'+e.libraryId:'name:'+e.name;}

// Texto para búsqueda: sin tildes ni mayúsculas
function normalizeText(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}

const SEARCH_STOPWORDS=new Set(['de','del','la','el','los','las','con','en','al','a','y']);

// Palabras de la consulta (orden indiferente), sin palabras vacías
function searchTokens(q){return normalizeText(q).split(/\s+/).filter(t=>t&&!SEARCH_STOPWORDS.has(t));}

// ---- Modo y variantes (formularios de crear y editar ejercicio) ----
// Una variante por línea, sin vacías ni repetidas
function parseVariants(text){return [...new Set(String(text).split('\n').map(s=>s.trim()).filter(Boolean))];}

export {MUSCLES,MUSCLE_COLORS,MUSCLE_MET,DEFAULT_LIBRARY,LEGACY_NAMES,DEFAULT_BY_ID,DEFAULT_ID_BY_NAME,migrateExercise,migrateSessions,migrateLibrary,MODES,MODE_LABELS,exMode,exKey,normalizeText,SEARCH_STOPWORDS,searchTokens,parseVariants};
