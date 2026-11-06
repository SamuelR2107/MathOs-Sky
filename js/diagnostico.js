import {rutasCanonicas} from './rutasCanonicas.js';
import {validarOrigen} from './tipos.js';
export function crearDiagnostico(grafo,origen) {
 validarOrigen(grafo.obtenerCantidadNodos(),origen);
 const iterador=rutasCanonicas(grafo.obtenerCantidadNodos(),origen);
 const resultado={rutaCandidata:[],conexionesFaltantes:[],cantidadCandidatos:0,cantidadMinimaConexiones:0};
 function siguiente() {
  const paso=iterador.next();if(paso.done)return false;
  const ruta=paso.value,faltantes=[];
  // Una ruta hamiltoniana de n>=5 no puede repetir una arista no dirigida.
  for(let i=1;i<ruta.length;i++) {
   const a=ruta[i-1],b=ruta[i];
   if(!grafo.existeConexion(a,b))faltantes.push({origen:Math.min(a,b),destino:Math.max(a,b)});
  }
  if(!resultado.rutaCandidata.length||faltantes.length<resultado.conexionesFaltantes.length) {
   resultado.rutaCandidata=ruta;resultado.conexionesFaltantes=faltantes;resultado.cantidadMinimaConexiones=faltantes.length;
  }
  resultado.cantidadCandidatos++;return true;
 }
 return {resultado,siguiente};
}
export function diagnosticarConexionesFaltantes(grafo,origen) {
 const t=crearDiagnostico(grafo,origen);while(t.siguiente()){}return t.resultado;
}
