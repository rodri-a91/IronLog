// Fechas: formatos y conversión entre fechas locales "YYYY-MM-DD" e ISO.

// ---- Helpers ----
function today(){return new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}

function fmtDate(d){return new Date(d).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}

function fmtShort(d){return new Date(d).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}

// Fecha local "YYYY-MM-DD" (toISOString() da el día UTC, que entre 00:00 y 02:00 en España es ayer)
function localISODate(d=new Date()){return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}

// Interpreta "YYYY-MM-DD" como medianoche local, no UTC
function parseLocalDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+'T00:00'):new Date(s);}

function isValidDate(s){return !isNaN(parseLocalDate(s).getTime());}

// Lunes (fecha local "YYYY-MM-DD") de la semana de una fecha
function weekKey(date){
  const d=new Date(date);
  return localISODate(new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7)));
}

// ---- Workout Tab ----
function fmtDuration(secs){
  const h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60), s=secs%60;
  if(h>0)return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export {today,fmtDate,fmtShort,localISODate,parseLocalDate,isValidDate,weekKey,fmtDuration};
