import {validarOrigen,validarMetrica} from './tipos.js';
import {rutasCanonicas} from './rutasCanonicas.js';
/** Núcleo incremental compartido por API síncrona y Worker por lotes. */
export function crearEvaluacionTSP(grafo,origen,metrica) {
 validarOrigen(grafo.obtenerCantidadNodos(),origen);validarMetrica(metrica);
 const resultado={rutas:[],mejorRuta:[],mejorValor:Infinity,cantidadCandidatos:0,cantidadCiclosValidos:0};
 const iterador=rutasCanonicas(grafo.obtenerCantidadNodos(),origen);
 function siguiente() {
  const paso=iterador.next();if(paso.done)return false;
  const ruta=paso.value;
  let valida=true;
  for(let i=1;i<ruta.length;i++)if(!grafo.existeConexion(ruta[i-1],ruta[i])){valida=false;break;}
  let valorTotal=Infinity;
  if(valida) {
   valorTotal=0;
   for(let i=1;i<ruta.length;i++) {
    valorTotal+=grafo.obtenerPeso(ruta[i-1],ruta[i],metrica);
    if(!Number.isFinite(valorTotal))throw new RangeError('El valor del ciclo excede el rango de Number.');
   }
   resultado.cantidadCiclosValidos++;
   // Exactamente como C++: < estricto, sin tolerancia al seleccionar el mínimo.
   if(valorTotal<resultado.mejorValor){resultado.mejorValor=valorTotal;resultado.mejorRuta=ruta.slice();}
  }
  resultado.rutas.push({ruta,valida,valorTotal});resultado.cantidadCandidatos++;
  return true;
 }
 return {resultado,siguiente};
}
export function resolverTSP(grafo,origen,metrica) {
 const trabajo=crearEvaluacionTSP(grafo,origen,metrica);while(trabajo.siguiente()){}return trabajo.resultado;
}
