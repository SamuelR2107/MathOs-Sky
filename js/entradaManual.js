import {validarCantidad,validarOrigen,validarPesos as comprobarPesos} from './tipos.js';
const intentar=fn=>{try{fn();return {valido:true,mensaje:''};}catch(e){return {valido:false,mensaje:e.message};}};
export const validarCantidadDepartamentos=n=>intentar(()=>validarCantidad(n));
export const validarPesos=(...p)=>intentar(()=>comprobarPesos(...p));
export const validarDepartamentos=nombres=>intentar(()=>{
 if(!Array.isArray(nombres))throw new TypeError('Lista de departamentos inválida.');
 validarCantidad(nombres.length);
 const claves=nombres.map(n=>{
  if(typeof n!=='string')throw new TypeError('Nombre inválido.');
  const c=n.replace(/[ \t\n\r\f\v\u00a0]+/g,' ').replace(/^ | $/g,'').replace(/[A-ZÁÉÍÓÚÜÑ]/g,c=>c.toLowerCase());
  if(!c)throw new Error('Nombre vacío.');return c;
 });
 if(new Set(claves).size!==claves.length)throw new Error('Departamentos duplicados.');
});
function extremos(g,a,b) {
 validarOrigen(g.obtenerCantidadNodos(),a);validarOrigen(g.obtenerCantidadNodos(),b);
 if(a===b)throw new RangeError('No se permiten lazos.');
}
/** Operaciones sin mutación parcial; mensajes para futura UI, sin dependencias gráficas. */
export const EntradaManual=Object.freeze({
 agregarConexion:(g,a,b,...p)=>intentar(()=>{
  extremos(g,a,b);
  if(g.existeConexion(a,b))throw new Error('La conexión ya existe.');
  comprobarPesos(...p);g.agregarConexion(a,b,...p);
 }),
 modificarConexion:(g,a,b,...p)=>intentar(()=>{extremos(g,a,b);g.modificarConexion(a,b,...p);}),
 eliminarConexion:(g,a,b)=>intentar(()=>{
  extremos(g,a,b);if(!g.existeConexion(a,b))throw new Error('La conexión no existe.');g.eliminarConexion(a,b);
 })
});
