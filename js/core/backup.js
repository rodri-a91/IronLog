// Validación y saneado de copias de seguridad, perfil y registro de peso.
import {isValidDate,localISODate,parseLocalDate} from './dates.js';

// El perfil solo guarda el nombre: el sexo y la fecha de nacimiento de versiones anteriores
// no se usaban en ningún cálculo y se descartan al cargar o importar
function sanitizeProfile(p){return {name:typeof p?.name==='string'?p.name:''};}

// Comprueba la estructura mínima que la app necesita para no romperse al renderizar
function validateBackup(data){
  const fail=msg=>{throw new Error('Formato inválido: '+msg);};
  if(!data||typeof data!=='object')fail('el archivo no contiene un objeto.');
  if(!Array.isArray(data.sessions))fail('falta la lista de sesiones.');
  if(!Array.isArray(data.library))fail('falta la biblioteca.');
  data.sessions.forEach((s,i)=>{
    const n='sesión '+(i+1);
    if(!s||isNaN(new Date(s.date).getTime()))fail(n+' sin fecha válida.');
    if(!Array.isArray(s.exercises))fail(n+' sin lista de ejercicios.');
    s.exercises.forEach(e=>{
      if(!e||typeof e.name!=='string'||!Array.isArray(e.sets))fail(n+' tiene un ejercicio mal formado.');
    });
  });
  data.library.forEach((e,i)=>{
    if(!e||e.id==null||typeof e.name!=='string'||typeof e.muscle!=='string')fail('ejercicio '+(i+1)+' de la biblioteca mal formado.');
  });
  if(data.weightLog!=null&&!Array.isArray(data.weightLog))fail('el registro de peso no es una lista.');
  if(data.profile!=null&&typeof data.profile!=='object')fail('el perfil no es válido.');
  if(data.routines!=null&&!Array.isArray(data.routines))fail('las rutinas no son una lista.');
}

// Repara registros con fecha inválida (bug antiguo: date:'custom'); el id es el timestamp de creación
function repairWeightLog(log){
  return log
    .map(e=>isValidDate(e.date)?e:{...e,date:localISODate(new Date(e.id))})
    .sort((a,b)=>parseLocalDate(a.date)-parseLocalDate(b.date));
}

export {sanitizeProfile,validateBackup,repairWeightLog};
