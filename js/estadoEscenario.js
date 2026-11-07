import {Grafo} from './grafo.js';
import {EntradaManual} from './entradaManual.js';
import {obtenerDepartamento, calcularPesosGeograficos} from './datosPeru.js';
import {seleccionarDepartamentos, generarGrafo} from './generador.js';
import {validarCantidad, validarOrigen, validarMetrica} from './tipos.js';

/** Único propietario del Grafo mutable. Los consumidores reciben DTO derivados.
 * Los índices del grafo son locales: idsGeograficos[local] -> catálogo Perú.
 * No depende del DOM ni ejecuta TSP. */
export class EstadoEscenario {
  #grafo = null;
  #ids = [];
  #origen = null;
  #metrica = 'Distancia';
  #modo = 'automatico';
  #revision = 0;
  #edicion = null;
  #resultados = {estado:'sin-calculo', revision:null, valor:null};
  #semilla = null;
  #plan = null;
  #escenario = 0;

  get activo() { return this.#grafo !== null; }
  get revision() { return this.#revision; }
  #mutacion() {
    this.#revision++;
    this.#resultados = {estado:this.#resultados.estado==='sin-calculo'?'sin-calculo':'obsoleto', revision:null, valor:null};
  }
  #requiereGrafo() { if(!this.#grafo) throw new Error('Crea un escenario antes de gestionar conexiones.'); }
  #instalar(grafo, ids, modo, semilla) {
    this.#escenario++;this.#plan=null;
    this.#grafo=grafo;this.#ids=[...ids];this.#modo=modo;this.#semilla=semilla;
    this.#origen=0;this.#edicion=null;this.#mutacion();
  }
  crearAutomatico(config) {
    const ids=seleccionarDepartamentos(config.cantidadNodos,config.semilla);
    const grafo=generarGrafo(config,ids);
    this.#instalar(grafo,ids,'automatico',config.semilla);
  }
  crearManual(ids) {
    if(!Array.isArray(ids))throw new TypeError('Selecciona tus destinos.');
    validarCantidad(ids.length);
    if(new Set(ids).size!==ids.length)throw new Error('Los departamentos deben ser distintos.');
    ids.forEach(obtenerDepartamento);
    this.#instalar(new Grafo(ids.length),ids,'manual',null);
  }
  cambiarModo(modo) {
    if(!['manual','automatico'].includes(modo))throw new Error('Modo inválido.');
    if(modo===this.#modo)return;
    this.#plan=null;this.#escenario++;
    this.#modo=modo;this.#grafo=null;this.#ids=[];this.#origen=null;this.#edicion=null;this.#semilla=null;this.#mutacion();
  }
  personalizar() {
    this.#requiereGrafo();
    if(this.#modo!=='manual'){this.#modo='manual';this.#mutacion();}
  }
  cambiarOrigen(origen) {
    this.#requiereGrafo();validarOrigen(this.#ids.length,origen);
    if(origen!==this.#origen){this.#origen=origen;this.#mutacion();}
  }
  cambiarMetrica(metrica) {
    validarMetrica(metrica);
    if(metrica!==this.#metrica){this.#metrica=metrica;this.#mutacion();}
  }
  prepararEdicion(origen,destino) {
    this.#requiereGrafo();
    validarOrigen(this.#ids.length,origen);validarOrigen(this.#ids.length,destino);
    if(origen===destino)throw new Error('Elige dos destinos distintos.');
    const conexion=this.#grafo.obtenerConexion(origen,destino);
    this.#edicion={origen,destino,existente:conexion.existe,revision:this.#revision};
    return {...this.#edicion,...conexion};
  }
  cerrarEdicion() { this.#edicion=null; }
  sugerirPesos(origen,destino) {
    this.#requiereGrafo();validarOrigen(this.#ids.length,origen);validarOrigen(this.#ids.length,destino);
    if(origen===destino)throw new Error('Elige dos destinos distintos.');
    return calcularPesosGeograficos(obtenerDepartamento(this.#ids[origen]),obtenerDepartamento(this.#ids[destino]));
  }
  guardarConexion({origen,destino,distancia,tiempo,costo}) {
    this.#requiereGrafo();
    const e=this.#edicion;
    if(!e||e.origen!==origen||e.destino!==destino||e.revision!==this.#revision)throw new Error('Vuelve a seleccionar la conexión; el escenario cambió.');
    const operacion=e.existente?'modificarConexion':'agregarConexion';
    const resultado=EntradaManual[operacion](this.#grafo,origen,destino,distancia,tiempo,costo);
    if(!resultado.valido)throw new Error(resultado.mensaje);
    if(this.#plan&&!e.existente&&!this.#plan.conexiones.some(p=>p.origen===Math.min(origen,destino)&&p.destino===Math.max(origen,destino)))this.#plan.minimoVigente=false;
    this.#mutacion();this.prepararEdicion(origen,destino);
    return e.existente?'Conexión actualizada.':'Conexión agregada.';
  }
  eliminarConexion() {
    this.#requiereGrafo();const e=this.#edicion;
    if(!e?.existente||e.revision!==this.#revision)throw new Error('Selecciona una conexión existente.');
    const resultado=EntradaManual.eliminarConexion(this.#grafo,e.origen,e.destino);
    if(!resultado.valido)throw new Error(resultado.mensaje);
    if(this.#plan)this.#plan.minimoVigente=false;
    this.#mutacion();this.prepararEdicion(e.origen,e.destino);
  }
  descartarResultado() { this.#resultados={estado:'sin-calculo',revision:null,valor:null}; }
  /** Contrato de resultados; rechaza resultados de revisiones antiguas. No calcula. */
  registrarResultado(valor,revision) {
    if(!this.activo||revision!==this.#revision)return false;
    this.#resultados={estado:'vigente',revision,valor:structuredClone(valor)};return true;
  }
  /** Conserva una propuesta topológica, nunca un resultado TSP obsoleto.
   * Agregar solo aristas del mínimo original conserva su minimalidad:
   * cualquier solución nueva de k aristas daría una original de k + agregadas.
   * Otras altas/bajas requieren reevaluar el mínimo; no se ejecuta TSP aquí. */
  registrarPlan(diagnostico,revision) {
    if(!this.activo||revision!==this.#revision)return false;
    if(!diagnostico){this.#plan=null;return true;}
    const conexiones=[...new Map(diagnostico.conexionesFaltantes.map(e=>{
      const origen=Math.min(e.origen,e.destino),destino=Math.max(e.origen,e.destino);
      return [`${origen}:${destino}`,{origen,destino}];
    })).values()];
    this.#plan={escenario:this.#escenario,revisionInicial:revision,ruta:[...diagnostico.rutaCandidata],conexiones,minimoVigente:true};
    return true;
  }
  obtenerPlan() {
    const p=this.#plan;if(!p||p.escenario!==this.#escenario||!this.#grafo)return null;
    const pendientes=p.conexiones.filter(e=>!this.#grafo.existeConexion(e.origen,e.destino));
    const adicionales=[];
    for(let i=1;i<p.ruta.length;i++){
      const origen=Math.min(p.ruta[i-1],p.ruta[i]),destino=Math.max(p.ruta[i-1],p.ruta[i]);
      if(!this.#grafo.existeConexion(origen,destino)&&!p.conexiones.some(e=>e.origen===origen&&e.destino===destino))adicionales.push({origen,destino});
    }
    return structuredClone({...p,pendientes,adicionales,total:p.conexiones.length,agregadas:p.conexiones.length-pendientes.length,garantizaRecorrido:adicionales.length===0});
  }
  leer() {
    return {modo:this.#modo,idsGeograficos:[...this.#ids],origen:this.#origen,metrica:this.#metrica,revision:this.#revision,
      planCorreccion:this.obtenerPlan(),semilla:this.#semilla,grafo:this.#grafo?.toJSON()??null,edicion:this.#edicion?{...this.#edicion}:null,resultados:structuredClone(this.#resultados)};
  }
  obtenerVista() {
    if(!this.#grafo)return null;
    const nodos=this.#ids.map((idGeografico,id)=>{
      const d=obtenerDepartamento(idGeografico);return {id,idGeografico,nombre:d.departamento,capital:d.capital};
    });
    const conexiones=this.#grafo.toJSON().aristas.map(([origen,destino,distancia,tiempo,costo])=>({origen,destino,distancia,tiempo,costo}));
    return {nodos,conexiones,origen:this.#origen};
  }
  obtenerMatrices() {
    if(!this.#grafo)return null;
    return {nombres:this.#ids.map(id=>obtenerDepartamento(id).departamento),adyacencia:this.#grafo.obtenerMatrizAdyacencia(),
      distancia:this.#grafo.obtenerMatrizPesos('Distancia'),tiempo:this.#grafo.obtenerMatrizPesos('Tiempo'),costo:this.#grafo.obtenerMatrizPesos('Costo')};
  }
}
