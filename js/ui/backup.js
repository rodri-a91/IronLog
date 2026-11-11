// Copia de seguridad: exportar e importar.
import {validateBackup} from '../core/backup.js';
import {localISODate} from '../core/dates.js';

const {useState,useEffect,useRef,useMemo}=React;
const h=React.createElement;

// ---- Backup Tab ----
function downloadBackup({sessions,library,profile,weightLog,routines}){
  const payload={version:3,exportedAt:new Date().toISOString(),sessions,library,profile,weightLog,routines};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='ironlog-backup-'+localISODate()+'.json';
  a.click();
  // Revocar en diferido: Safari puede cancelar la descarga si se revoca de inmediato
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

function BackupTab({sessions,library,profile,weightLog,routines,onRestore,onExported,onBack}){
  const [importError,setImportError]=useState('');
  const [importOk,setImportOk]=useState(false);
  const fileRef=useRef();

  const dataSize=useMemo(()=>{
    const raw=JSON.stringify({sessions,library,profile,weightLog,routines});
    return (new Blob([raw]).size/1024).toFixed(1);
  },[sessions,library,profile,weightLog,routines]);

  function exportData(){
    downloadBackup({sessions,library,profile,weightLog,routines});
    onExported&&onExported();
  }

  function handleFileChange(e){
    setImportError('');setImportOk(false);
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        validateBackup(data);
        const confirm=window.confirm(
          `Se van a importar:\n• ${data.sessions.length} sesiones\n• ${data.library.length} ejercicios`+
          (data.routines?`\n• ${data.routines.length} rutinas`:'')+`\n\nEsto reemplazará todos los datos actuales. ¿Continuar?`
        );
        if(!confirm){e.target.value='';return;}
        onRestore(data);
        setImportOk(true);
      }catch(err){
        setImportError('Error al leer el archivo: '+err.message);
      }
      e.target.value='';
    };
    reader.readAsText(file);
  }

  return h('div',{className:'content'},
    h('button',{className:'back-link',onClick:onBack},'‹ Perfil'),
    h('div',{className:'ptitle'},'COPIA DE SEGURIDAD'),
    h('div',{className:'psub'},'Exporta e importa todos tus datos'),

    h('div',{className:'card'},
      h('div',{className:'cardtitle'},'Exportar'),
      h('p',{style:{fontSize:13,color:'var(--t2)',lineHeight:1.6,marginBottom:16}},
        'Descarga un archivo JSON con todas tus sesiones, ejercicios y perfil. Guárdalo en iCloud, Google Drive o donde prefieras. Puedes importarlo en cualquier momento para restaurar todo.'
      ),
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--bg2)',borderRadius:10,marginBottom:14}},
        h('div',null,
          h('div',{style:{fontSize:13,fontWeight:600,color:'var(--t1)'}},sessions.length+' sesiones · '+library.length+' ejercicios · '+routines.length+' rutinas'),
          h('div',{style:{fontSize:11,color:'var(--t2)',marginTop:2}},'Tamaño estimado: '+dataSize+' KB')
        ),
        h('div',{style:{fontSize:24}},'📦')
      ),
      h('button',{className:'btn btnp',style:{width:'100%'},onClick:exportData},
        '⬇ Descargar copia de seguridad'
      )
    ),

    h('div',{className:'card'},
      h('div',{className:'cardtitle'},'Importar'),
      h('p',{style:{fontSize:13,color:'var(--t2)',lineHeight:1.6,marginBottom:16}},
        'Selecciona un archivo de copia de seguridad generado por IronLog para restaurar tus datos. ',
        h('strong',{style:{color:'var(--accent)'}},'Atención: esto reemplazará todos los datos actuales.')
      ),
      h('input',{ref:fileRef,type:'file',accept:'.json,application/json',style:{display:'none'},onChange:handleFileChange}),
      h('button',{className:'btn btns',style:{width:'100%'},onClick:()=>fileRef.current.click()},
        '⬆ Seleccionar archivo de copia'
      ),
      importError&&h('div',{className:'notice notice-err'},importError),
      importOk&&h('div',{className:'notice notice-ok'},'✅ Datos importados correctamente.')
    ),

    h('div',{className:'card'},
      h('div',{className:'cardtitle'},'Cómo guardar la copia en el iPhone'),
      h('p',{style:{fontSize:13,color:'var(--t2)',lineHeight:1.7}},
        '1. Pulsa "Descargar copia de seguridad".',h('br',null),
        '2. Safari te preguntará dónde guardarlo — elige ',h('strong',{style:{color:'var(--t1)'}},'iCloud Drive'),
        ' o ',h('strong',{style:{color:'var(--t1)'}},'En mi iPhone'),'.',h('br',null),
        '3. Para restaurar, abre IronLog, ven aquí e importa ese archivo desde la app Archivos.'
      )
    )
  );
}

export {downloadBackup,BackupTab};
