import {validarCantidad,validarOrigen,validarMetrica} from './tipos.js';
/** Ciclo de vida de un único Worker. Sin motor TSP en el hilo principal.
 * Un Worker nuevo por ejecución permite recalcular la MISMA revisión.
 * ID + revisión + identidad del Worker protegen contra respuestas tardías. */
export class CalculoTSP {
  constructor({leer,notificar,crearWorker=()=>{if(typeof Worker==='undefined')throw new Error('Este navegador no ofrece Web Workers. Abre la aplicación en una versión compatible de Edge, Chrome o Firefox.');return new Worker(new URL('./tsp.worker.js',import.meta.url),{type:'module'});}}) {
    this.leer=leer;this.notificar=notificar;this.crearWorker=crearWorker;
    this.worker=null;this.ejecucion=null;this.secuencia=0;this.pedido=0;this.pedidos={};this.estado='sin-escenario';
  }
  get ocupado(){return this.estado==='calculando';}
  emitir(estado,datos={}){this.estado=estado;this.notificar({tipo:'estado',estado,...datos});}
  liberar(){if(this.worker){this.worker.onmessage=this.worker.onerror=this.worker.onmessageerror=null;this.worker.terminate();}this.worker=null;this.ejecucion=null;this.pedidos={};}
  invalidar(){const anterior=this.estado;this.liberar();this.emitir(!this.leer().grafo?'sin-escenario':['completado','sin-ciclo','calculando','obsoleto'].includes(anterior)?'obsoleto':'listo');}
  iniciar(){
    if(this.ocupado)return;
    try {
      const s=this.leer();if(!s.grafo)throw new Error('Crea un escenario antes de calcular.');
      validarCantidad(s.grafo.cantidadNodos);validarOrigen(s.grafo.cantidadNodos,s.origen);validarMetrica(s.metrica);
      this.liberar();const worker=this.crearWorker();this.worker=worker;
      const t={id:`tsp-${++this.secuencia}`,revision:s.revision,origen:s.origen,metrica:s.metrica};this.ejecucion=t;
      const vigente=()=>this.worker===worker&&this.ejecucion===t&&this.leer().revision===t.revision;
      worker.onmessage=({data:m})=>{
        if(!vigente()||m.id!==t.id||m.revision!==t.revision)return;
        if(m.tipo==='iniciado')return;
        if(m.tipo==='progreso'){this.notificar(m);return;}
        if(m.tipo==='resultado'){
          this.estado=m.resultado.cantidadCiclosValidos?'completado':'sin-ciclo';
          this.notificar({...m,ejecucion:t});this.emitir(this.estado);this.consultar('pagina',{inicio:0,limite:100});
        }else if(m.tipo==='pagina'||m.tipo==='detalle'){
          if(m.pedido===this.pedidos[m.tipo])this.notificar(m);
        }else if(m.tipo==='cancelado'){this.liberar();this.emitir('cancelado');}
        else if(m.tipo==='error'){
          if(['pagina','detalle'].includes(m.solicitud)){
            if(m.pedido===this.pedidos[m.solicitud])this.notificar({tipo:'error-consulta',mensaje:m.mensaje});
          }else this.fallar(m.mensaje);
        }
      };
      worker.onerror=e=>{e.preventDefault?.();if(vigente())this.fallar('No se pudo ejecutar el cálculo. Comprueba que abriste la aplicación mediante HTTP y vuelve a intentar.');};
      worker.onmessageerror=()=>{if(vigente())this.fallar('No se pudo leer la respuesta del cálculo. Inténtalo nuevamente.');};
      this.emitir('calculando');worker.postMessage({tipo:'iniciar',...t,grafo:s.grafo,diagnosticar:true});
    }catch(e){this.fallar(e.message);}
  }
  fallar(mensaje){this.liberar();this.emitir('error',{mensaje});}
  cancelar(){if(!this.ocupado)return;try{this.worker.postMessage({tipo:'cancelar',...this.ejecucion});}finally{this.liberar();this.emitir('cancelado');}}
  consultar(tipo,datos){
    if(!this.worker||!['completado','sin-ciclo'].includes(this.estado))return;
    if(this.leer().revision!==this.ejecucion.revision){this.invalidar();return;}
    if(tipo==='pagina')delete this.pedidos.detalle;
    const pedido=++this.pedido;this.pedidos[tipo]=pedido;
    try{this.worker.postMessage({tipo,...this.ejecucion,...datos,pedido});}
    catch{this.notificar({tipo:'error-consulta',mensaje:'No se pudo consultar esta candidata o página. Vuelve a intentarlo.'});}
  }
}
