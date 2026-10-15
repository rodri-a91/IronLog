# IronLog

Registro de entrenamientos de gimnasio pensado para el móvil. Es una web app (PWA) de un solo archivo: sin servidor, sin cuentas y sin dependencias que instalar. Todos los datos se guardan en el propio dispositivo.

## Funcionalidades

- **Sesión de hoy**: añade ejercicios desde un buscador (ignora tildes, mayúsculas y el orden de las palabras) y registra series de peso × repeticiones, o duración y distancia en el cardio. Cada serie muestra como referencia los valores de la última vez que hiciste ese ejercicio.
- **Cronómetro de sesión**: se pausa solo tras 15 minutos sin actividad y se reanuda al volver a editar la sesión.
- **Borrador automático**: la sesión en curso se guarda mientras entrenas y se recupera si cierras la app.
- **Calorías estimadas**:
  - Fuerza: MET por grupo muscular, ajustado por repeticiones y carga.
  - Cardio: MET por actividad; en carrera con distancia se usa la ecuación del ACSM según la velocidad.
- **Resumen al terminar**: mapa muscular frontal y posterior. Cada ejercicio marca sus músculos principales y secundarios con una escala de series (1–2, 3–4, 5–7, 8+).
- **Historial**: detalle de cada sesión, que se puede editar o eliminar.
- **Estadísticas**:
  - Volumen y calorías por semana, mes (4 semanas) o año (12 meses).
  - Calendario de días entrenados.
  - Progresión de peso por ejercicio.
- **Biblioteca de ejercicios**: 29 ejercicios por defecto más los que crees tú. Se pueden renombrar sin perder el historial, porque las sesiones se vinculan por id.
- **Perfil**: registro de peso corporal con gráfico (se usa para estimar calorías) y 23 logros.
- **Copia de seguridad**: exporta e importa todos los datos en JSON. La app avisa si llevas más de 7 días sin hacer copia.
- **Funciona sin conexión** una vez cargada, y se puede instalar en la pantalla de inicio.
- **Modo claro y oscuro** según el sistema.

## Uso

La app tiene que servirse por **https** (o `localhost`) para que funcionen el modo sin conexión y la instalación. Por ejemplo, con GitHub Pages: *Settings → Pages → Deploy from branch → `main` / root*.

**Instalar en el iPhone:** abre la URL en Safari → Compartir → *Añadir a pantalla de inicio*. Úsala siempre desde ese icono: Safari puede borrar los datos de las webs que no se abren en 7 días, pero no los de las apps instaladas.

**Probar en local:**

```sh
python -m http.server 8000
# abrir http://localhost:8000
```

Si abres `index.html` directamente como archivo, la app funciona, pero sin el modo sin conexión.

## Datos

Todo se guarda en el `localStorage` del navegador, en estas claves:

| Clave | Contenido |
|---|---|
| `il_sessions` | Sesiones guardadas (la más reciente primero) |
| `il_library` | Biblioteca de ejercicios |
| `il_profile` | Nombre, sexo y fecha de nacimiento |
| `il_weightlog` | Registro de peso corporal |
| `il_draft` | Sesión en curso |
| `il_lastBackup` | Fecha de la última exportación |

No hay sincronización entre dispositivos. Para pasar los datos a otro móvil, exporta la copia en *Backup* e impórtala en el otro.

Al cargar o importar datos, la app los migra automáticamente: nombres de ejercicios antiguos, sesiones sin `libraryId`, ejercicios por defecto añadidos en versiones nuevas y fechas de peso inválidas.

## Estructura

| Archivo | Descripción |
|---|---|
| `index.html` | Toda la app: estilos, React 18 (UMD, sin JSX ni build) y Chart.js desde cdnjs |
| `sw.js` | Service worker: red primero para los archivos propios, caché primero para las librerías del CDN |
| `manifest.json` | Manifiesto de la PWA |
| `icon-180.png` | Icono de la app |

## Desarrollo

No hay paso de compilación: se edita `index.html` y se recarga. Los componentes usan `React.createElement` (alias `h`) en lugar de JSX.

- Al cambiar las versiones de las librerías del CDN o la lista de archivos que se cachean, sube `CACHE` en `sw.js` (`ironlog-v1` → `ironlog-v2`). Para cambios solo en `index.html` no hace falta: se sirve primero desde la red.
- Para renombrar un ejercicio por defecto, cambia su nombre en `DEFAULT_LIBRARY` y añade el nombre anterior a `LEGACY_NAMES`, así se migran los datos existentes. No cambies su `id`.
- Los músculos que trabaja cada ejercicio por defecto están en `EXERCISE_REGIONS`.
