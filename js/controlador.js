import {CalculoTSP} from './calculoTSP.js';
import {EstadoEscenario} from './estadoEscenario.js';

/** Coordinación DOM/motor. Un único EstadoEscenario posee el grafo real. */
export function conectarEscenarios(interfaz) {
  const estado=new EstadoEscenario();
  let borrador=interfaz.obtenerPreferencias();
  const calculo=new CalculoTSP({leer:()=>estado.leer(),notificar:m=>{
    if(m.tipo==='estado'){interfaz.renderCalculo({...m,activo:estado.activo});mostrarPlan();}
    else if(m.tipo==='progreso')interfaz.renderProgreso(m);
    else if(m.tipo==='resultado') {
      if(!estado.registrarResultado(m.resultado,m.revision))return;
      estado.registrarPlan(m.resultado.cantidadCiclosValidos?null:m.diagnostico,m.revision);
      const escenario=estado.obtenerVista(), nombres=escenario.nodos.map(n=>n.nombre), s=estado.leer();
      const totales={Distancia:0,Tiempo:0,Costo:0};
      const ruta=m.resultado.mejorRuta;
      for(let i=1;i<ruta.length;i++) {
        const e=escenario.conexiones.find(e=>(e.origen===ruta[i-1]&&e.destino===ruta[i])||(e.destino===ruta[i-1]&&e.origen===ruta[i]));
        for(const k of Object.keys(totales))totales[k]+=e[k.toLowerCase()];
      }
      interfaz.renderResultado({resultado:m.resultado,diagnostico:m.diagnostico,sinCiclo:!m.resultado.cantidadCiclosValidos,nombres,metrica:s.metrica,escenario,totales,revision:s.revision});
      mostrarPlan();
      interfaz.renderExplicacion({...s,resultado:m.resultado,nombres});interfaz.irA('recorrido');
    }else if(m.tipo==='pagina')interfaz.renderPagina({...m,total:estado.leer().resultados.valor.cantidadCandidatos,nombres:estado.obtenerVista().nodos.map(n=>n.nombre),metrica:estado.leer().metrica,revision:estado.revision});
    else if(m.tipo==='detalle')interfaz.renderDetalle({...m,escenario:estado.obtenerVista(),metrica:estado.leer().metrica,revision:estado.revision});
    else if(m.tipo==='error-consulta')interfaz.mensajeConsulta(m.mensaje);
  }});
  const on=(name,handler)=>document.addEventListener(`ui:${name}`,e=>{
    if(calculo.ocupado&&!['cancelar-calculo','resolver'].includes(name))return;
    handler(e.detail);
  });
  on('resolver',()=>{if(calculo.ocupado)return;estado.descartarResultado();interfaz.invalidarResultados();interfaz.renderExplicacion({...estado.leer(),nombres:estado.obtenerVista()?.nodos.map(n=>n.nombre)});calculo.iniciar();});
  on('cancelar-calculo',()=>calculo.cancelar());
  on('pagina',datos=>{interfaz.pausarReproduccion();calculo.consultar('pagina',datos);});
  on('seleccionar-ruta',datos=>calculo.consultar('detalle',datos));
  window.addEventListener('pagehide',()=>{
    // BFCache puede conservar el DOM, pero no el Worker que liberamos.
    // Dejar controles recuperables y no ofrecer páginas cuyo almacén ya no existe.
    estado.descartarResultado();interfaz.invalidarResultados();calculo.invalidar();
    interfaz.renderExplicacion({...estado.leer(),nombres:estado.obtenerVista()?.nodos.map(n=>n.nombre)});
    if(estado.activo)interfaz.mensajeEscenario('Tu escenario se conserva en esta página. Vuelve a calcular para consultar sus recorridos.');
  });
  function mostrarPlan() {
    interfaz.renderPlan(estado.obtenerPlan(),estado.obtenerVista()?.nodos.map(n=>n.nombre)??[],estado.leer().resultados);
  }
  function actualizar() {
    interfaz.renderEscenario(estado.obtenerVista());
    interfaz.renderMatrices(estado.obtenerMatrices());
    interfaz.renderEstado(estado.leer());
    interfaz.invalidarResultados();
    calculo.invalidar();
    interfaz.renderExplicacion({...estado.leer(),nombres:estado.obtenerVista()?.nodos.map(n=>n.nombre)});
  }
  function error(action,editor=false) {
    try {action();}catch(e){if(editor)interfaz.mensajeEdicion(e.message,true);else interfaz.mensajeEscenario(e.message,true);}
  }
  on('preferencias',p=>error(()=>{
    const antes=estado.leer();
    if(p.modo!==antes.modo) {
      if(estado.activo&&!window.confirm('Cambiar de modo descartará el escenario actual y sus conexiones. ¿Continuar?')){
        interfaz.establecerPreferencias(borrador);interfaz.renderEscenario(estado.obtenerVista());return;
      }
      estado.cambiarModo(p.modo);
      p={...p,idsDepartamentos:[],origen:''};
      interfaz.renderEscenario(null);interfaz.establecerPreferencias(p);actualizar();
      interfaz.mensajeEscenario('Prepara los destinos de tu nuevo escenario.');
    }
    if(estado.activo&&p.origen!==''&&Number(p.origen)!==estado.leer().origen)estado.cambiarOrigen(Number(p.origen));
    estado.cambiarMetrica(p.metrica);
    borrador={...p,idsDepartamentos:[...p.idsDepartamentos]};
    if(estado.activo) {
      // El selector describe el próximo escenario; nunca cambia nodos del grafo activo.
      interfaz.renderEscenario(estado.obtenerVista());
      if(estado.revision!==antes.revision)actualizar();
      const active=estado.leer();
      const selectionChanged=p.modo==='manual'&&(p.idsDepartamentos.length!==active.idsGeograficos.length||p.idsDepartamentos.some(id=>!active.idsGeograficos.includes(id)));
      if(selectionChanged)interfaz.mensajeEscenario('Selección pendiente: pulsa Crear escenario para reemplazar el escenario activo.');
    }
  }));
  on('crear-escenario',p=>error(()=>{
    if(estado.activo&&!window.confirm('¿Reemplazar el escenario actual? Se descartarán sus conexiones y resultados.'))return;
    if(p.modo==='manual')estado.crearManual(p.idsDepartamentos);
    else {
      const semilla=crypto.getRandomValues(new Uint32Array(1))[0];
      estado.crearAutomatico({cantidadNodos:p.cantidadNodos,garantizarCicloHamiltoniano:p.garantizarCicloHamiltoniano,semilla});
    }
    estado.cambiarMetrica(p.metrica);
    borrador={...p,idsDepartamentos:[...p.idsDepartamentos],origen:'0'};
    actualizar();interfaz.mensajeEscenario(`Escenario creado: ${estado.leer().idsGeograficos.length} destinos. Ya puedes gestionar conexiones y consultar matrices.`);
  }));
  on('personalizar',()=>error(()=>{
    estado.personalizar();const s=estado.leer();
    borrador={...borrador,modo:'manual',idsDepartamentos:s.idsGeograficos,origen:String(s.origen)};
    interfaz.establecerPreferencias(borrador);actualizar();
    interfaz.mensajeEscenario('Escenario personalizado: se conservaron los destinos, el origen y todas las conexiones.');
  }));
  on('editar-par',({origen,destino})=>error(()=>interfaz.renderEdicion(estado.prepararEdicion(origen,destino)),true));
  on('editor-sin-par',()=>estado.cerrarEdicion());
  on('editor-cerrado',()=>estado.cerrarEdicion());
  on('guardar-conexion',datos=>error(()=>{
    const mensaje=estado.guardarConexion(datos);actualizar();
    interfaz.renderEdicion(estado.prepararEdicion(datos.origen,datos.destino));interfaz.mensajeEdicion(mensaje);
    const plan=estado.obtenerPlan();
    interfaz.finalizarGuardado(plan?`${mensaje} ${plan.pendientes.length?`Aún quedan ${plan.pendientes.length} conexiones por completar.`:'Has completado todas las conexiones recomendadas.'}`:mensaje);
  },true));
  on('eliminar-conexion',()=>error(()=>{
    estado.eliminarConexion();actualizar();const e=estado.leer().edicion;
    interfaz.renderEdicion(estado.prepararEdicion(e.origen,e.destino));interfaz.mensajeEdicion('Conexión eliminada en ambos sentidos.');
  },true));
  on('solicitar-pesos',({origen,destino})=>error(()=>interfaz.aplicarSugerencias(estado.sugerirPesos(origen,destino)),true));
  on('seleccionar-conexion',e=>{if(!e.missing&&estado.activo)interfaz.abrirEditor(e);});
  actualizar();
  // Lectura defensiva útil para pruebas y para el futuro adaptador de Worker.
  return Object.freeze({obtenerEstado:()=>estado.leer(),obtenerCalculo:()=>({estado:calculo.estado,ejecucion:calculo.ejecucion?{...calculo.ejecucion}:null})});
}
