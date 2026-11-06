import {Grafo} from './grafo.js';
import {validarCantidad} from './tipos.js';
import {obtenerDepartamento,calcularPesosGeograficos} from './datosPeru.js';
/** Mulberry32, estado uint32, período 2^32. No criptográfico.
 * Semilla web reproducible; NO reproduce mt19937/STL ni System.Random. */
export function crearAleatorio(semilla) {
 if(!Number.isInteger(semilla)||semilla<0||semilla>0xffffffff)throw new RangeError('Semilla uint32 inválida.');
 let estado=semilla;
 return ()=>{
  estado=(estado+0x6D2B79F5)>>>0;let t=estado;
  t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
function barajar(a,rng) {for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
/** Selección de IDs separada de topología, como en C++/UI. Orden estable por ID. */
export function seleccionarDepartamentos(cantidad,semilla=0) {
 validarCantidad(cantidad);return barajar(Array.from({length:24},(_,i)=>i),crearAleatorio(semilla)).slice(0,cantidad).sort((a,b)=>a-b);
}
export function generarGrafo(config={},idsDepartamentos) {
 const c={cantidadNodos:5,garantizarCicloHamiltoniano:true,semilla:0,probabilidadConexion:0.35,...config};
 validarCantidad(c.cantidadNodos);
 if(typeof c.garantizarCicloHamiltoniano!=='boolean'||!Number.isFinite(c.probabilidadConexion)||c.probabilidadConexion<0||c.probabilidadConexion>1)throw new RangeError('Configuración inválida.');
 const rng=crearAleatorio(c.semilla);
 // Sobrecarga compatible con C++: IDs 0..n-1 si no se proporciona selección.
 const ids=idsDepartamentos??Array.from({length:c.cantidadNodos},(_,i)=>i);
 if(!Array.isArray(ids)||ids.length!==c.cantidadNodos||new Set(ids).size!==ids.length)throw new RangeError('Selección de departamentos inválida.');
 ids.forEach(obtenerDepartamento);
 const g=new Grafo(c.cantidadNodos);
 const agregar=(a,b)=>{const p=calcularPesosGeograficos(obtenerDepartamento(ids[a]),obtenerDepartamento(ids[b]));g.agregarConexion(a,b,p.distancia,p.tiempo,p.costo);};
 if(c.garantizarCicloHamiltoniano) {
  const orden=barajar(Array.from({length:c.cantidadNodos},(_,i)=>i),rng);
  for(let i=0;i<orden.length;i++)agregar(orden[i],orden[(i+1)%orden.length]);
 }
 for(let a=0;a<c.cantidadNodos;a++)for(let b=a+1;b<c.cantidadNodos;b++)if(!g.existeConexion(a,b)&&rng()<c.probabilidadConexion)agregar(a,b);
 return g;
}
