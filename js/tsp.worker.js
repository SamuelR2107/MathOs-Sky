import {Grafo} from './grafo.js';
import {crearEvaluacionTSP} from './tsp.js';
import {crearDiagnostico} from './diagnostico.js';
import {cantidadCanonicas} from './rutasCanonicas.js';
let activo=null,terminado=null,ultimaRevision=-1;
const enviar=(t,tipo,datos={})=>postMessage({tipo,id:t.id,revision:t.revision,...datos});
const resumen=r=>({mejorRuta:r.mejorRuta,mejorValor:r.mejorValor,cantidadCandidatos:r.cantidadCandidatos,cantidadCiclosValidos:r.cantidadCiclosValidos});
function lote(t) {
 if(activo!==t)return;
 try {
  let sigue=true;
  for(let i=0;i<1024&&sigue;i++)sigue=t.trabajo.siguiente();
  const r=t.trabajo.resultado;
  if(!sigue) {
   if(t.fase==='tsp'&&r.cantidadCiclosValidos===0&&t.diagnosticar) {
    t.resultado=r;t.fase='diagnostico';t.trabajo=crearDiagnostico(t.grafo,t.origen);
   } else {
    if(t.fase==='tsp')t.resultado=r;else t.diagnostico=r;
    activo=null;terminado=t;
    enviar(t,'resultado',{resultado:t.resultado?resumen(t.resultado):null,diagnostico:t.diagnostico??null});return;
   }
  }
  // Throttle: como máximo ~20 mensajes/s, nunca uno por candidata.
  if(performance.now()-t.ultimoProgreso>=50) {
   enviar(t,'progreso',{fase:t.fase,evaluadas:t.trabajo.resultado.cantidadCandidatos,total:t.total});t.ultimoProgreso=performance.now();
  }
  setTimeout(()=>lote(t),0); // Entrega el hilo: permite recibir cancelar/iniciar.
 }catch(e){if(activo===t)activo=null;enviar(t,'error',{mensaje:e.message});}
}
self.onmessage=({data:m})=>{
 try {
  if(!m||typeof m.id!=='string'||!Number.isSafeInteger(m.revision)||m.revision<0)throw new Error('ID/revisión inválidos.');
  if(m.tipo==='iniciar') {
   if(m.revision<=ultimaRevision)throw new Error('La revisión debe ser nueva y creciente.');
   ultimaRevision=m.revision;
   if(activo)enviar(activo,'cancelado');activo=null;terminado=null;
   const grafo=Grafo.fromJSON(m.grafo);
   if(!['tsp','diagnostico'].includes(m.operacion??'tsp'))throw new Error('Operación desconocida.');
   const fase=m.operacion??'tsp';
   const trabajo=fase==='tsp'?crearEvaluacionTSP(grafo,m.origen,m.metrica):crearDiagnostico(grafo,m.origen);
   const t={id:m.id,revision:m.revision,grafo,origen:m.origen,fase,trabajo,diagnosticar:m.diagnosticar!==false,total:cantidadCanonicas(grafo.obtenerCantidadNodos()),ultimoProgreso:performance.now()};
   activo=t;enviar(t,'iniciado');setTimeout(()=>lote(t),0);
  } else if(m.tipo==='cancelar') {
   if(activo?.id===m.id&&activo.revision===m.revision){const t=activo;activo=null;enviar(t,'cancelado');}
  } else if(m.tipo==='pagina') {
   if(!terminado||terminado.id!==m.id||terminado.revision!==m.revision||!terminado.resultado)throw new Error('Resultado no disponible para esta revisión.');
   const inicio=m.inicio,limite=m.limite??100;
   if(!Number.isInteger(inicio)||inicio<0||inicio>terminado.resultado.rutas.length||!Number.isInteger(limite)||limite<1||limite>100)throw new Error('Página inválida (máximo 100).');
   enviar(terminado,'pagina',{pedido:m.pedido,inicio,rutas:terminado.resultado.rutas.slice(inicio,inicio+limite)});
  } else if(m.tipo==='detalle') {
   if(!terminado||terminado.id!==m.id||terminado.revision!==m.revision||!terminado.resultado)throw new Error('Resultado no disponible para esta revisión.');
   const rutas=terminado.resultado.rutas, indice=m.indice;
   if(!Number.isInteger(indice)||indice<0||indice>=rutas.length)throw new Error('Índice de candidata inválido.');
   // Consulta sobre resultados YA evaluados: no vuelve a ejecutar TSP.
   // El prefijo empieza en 0, nunca en el inicio de la página visible.
   let mejor=null;
   for(let i=0;i<=indice;i++)if(rutas[i].valida&&(!mejor||rutas[i].valorTotal<mejor.valorTotal))mejor={...rutas[i],indice:i};
   const candidata=rutas[indice], conexionesFaltantes=[];
   for(let i=1;i<candidata.ruta.length;i++) {
    const a=candidata.ruta[i-1],b=candidata.ruta[i];
    if(!terminado.grafo.existeConexion(a,b))conexionesFaltantes.push({origen:Math.min(a,b),destino:Math.max(a,b)});
   }
   enviar(terminado,'detalle',{pedido:m.pedido,indice,candidata,conexionesFaltantes,mejorParcial:mejor});
  } else throw new Error('Mensaje desconocido.');
 }catch(e){postMessage({tipo:'error',id:m?.id,revision:m?.revision,solicitud:m?.tipo,pedido:m?.pedido,mensaje:e.message});}
};
