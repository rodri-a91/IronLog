// Lectura y escritura en localStorage.

// ---- Local Storage ----
function loadState(key,def){try{const v=localStorage.getItem(key);return v?JSON.parse(v):def;}catch(e){return def;}}

let storageWarned=false;

function saveState(key,val){
  try{localStorage.setItem(key,JSON.stringify(val));}
  catch(e){
    if(!storageWarned){
      storageWarned=true;
      alert('⚠ No se han podido guardar los datos (almacenamiento lleno o bloqueado). Exporta una copia de seguridad desde Perfil → Copia de seguridad cuanto antes.');
    }
  }
}

export {loadState,storageWarned,saveState};
