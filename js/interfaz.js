import {formatearNumero as format} from './formato.js';
import {crearPanelReproduccion} from './panelReproduccion.js';
import {departamentosPeru} from './datosPeru.js';
import {cantidadCanonicas} from './rutasCanonicas.js';
import {Visualizacion} from './visualizacion.js';
const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const node = (tag, text, className) => { const el=document.createElement(tag); if(text!==undefined)el.textContent=text;if(className)el.className=className;return el; };
const norm = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const units = {Distancia:'km',Tiempo:'min',Costo:'S/',distancia:'km',tiempo:'min',costo:'S/'};
/** Controlador de presentación. No ejecuta algoritmos ni muta el grafo.
 * Los métodos render* reciben DTO externos; eventos ui:* permiten integrar etapa6. */
export function iniciarInterfaz() {
  const selected = new Set();
  let mode='automatico', graphData=null, matrixData=null, dirty=false, opener=null, pageInfo=null;
  let resultGraph=null, candidateGraph=null, busy=false, blocked=[], synchronizing=false, editorPair=['',''];
  let resultPlayer=null,candidatePlayer=null,ultimoResultado=null,matrixSelection=null,ultimoAnuncio=-Infinity,ultimaFase=null;
  const pausarReproduccion=()=>{resultPlayer?.pausar();candidatePlayer?.pausar();};
  const graph = new Visualizacion($('grafo-plan'));
  const emit = (name,detail) => { if(!synchronizing) document.dispatchEvent(new CustomEvent(`ui:${name}`,{detail})); };
  const announce = message => { $('avisos').textContent=message; };
  const selectedNames = () => departamentosPeru.filter(d=>selected.has(d.id));
  const preferences = () => ({modo:mode,idsDepartamentos:[...selected],cantidadNodos:Number($('cantidad').value),garantizarCicloHamiltoniano:$('garantia').checked,origen:$('origen').value,metrica:document.querySelector('[name=metrica]:checked').value});

  function navigate(focus=false) {
    pausarReproduccion();
    const id=location.hash.slice(1);
    const page=['planificar','recorrido','explorar','modelo'].includes(id)?id:'planificar';
    all('.page').forEach(s=>{s.hidden=s.id!==page;});
    all('.site-header nav a').forEach(a=>{if(a.hash===`#${page}`)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.title=`MathOs-Sky · ${{planificar:'Planificar',recorrido:'Mi recorrido',explorar:'Explorar el cálculo',modelo:'Datos y modelo'}[page]}`;
    if(focus)$(`titulo-${page}`).focus({preventScroll:true});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pausarReproduccion();});
  window.addEventListener('pagehide',pausarReproduccion);
  window.addEventListener('hashchange',()=>navigate(true));
  window.addEventListener('popstate',()=>navigate(true));
  // Actualización sin espera del hashchange ni salto al ancla oculta.
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[href^="#"]');
    if(!link||!['#planificar','#recorrido','#explorar','#modelo'].includes(link.hash))return;
    e.preventDefault();history.pushState(null,'',link.hash);navigate(true);window.scrollTo(0,0);
  });
  navigate();
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-editor]'))openEditor();
    if(e.target.closest('#focus-config'))document.querySelector('[name=modo]:checked').focus();
  });
  all('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
    pausarReproduccion();
    all('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    for(const id of ['rutas','matrices','explicacion'])$(`vista-${id}`).hidden=id!==button.dataset.tab;
  }));
  function updateOptions(select, options, placeholder) {
    const value=select.value;select.replaceChildren(new Option(placeholder,''));
    options.forEach(o=>select.add(new Option(o.nombre??o.departamento,String(o.id))));
    if(options.some(o=>String(o.id)===value))select.value=value;
  }
  function updateSelection() {
    const values=selectedNames();
    $('contador').textContent=`${selected.size} de 10 destinos seleccionados`;
    $('etapa-pendiente').textContent=mode==='manual'?'Selecciona entre 5 y 10 destinos. Crear escenario inicia un grafo sin conexiones.':'Elige una cantidad válida para crear tu escenario.';
    $('seleccionados').replaceChildren(...values.map(d=>node('span',d.departamento,'chip')));
    all('.destination-option input').forEach(input=>{input.checked=selected.has(+input.value);input.disabled=selected.size===10&&!input.checked;});
    $('config-error').textContent=mode==='manual'&&selected.size>0&&selected.size<5?'Selecciona al menos 5 destinos para preparar tu escenario.':'';
    if(!graphData) {
      updateOptions($('origen'),[],'Disponible al crear el escenario');
      $('origen').disabled=true;
    }
    $('summary-title').textContent=mode==='manual'&&values.length?`${values.length} destinos en tu selección`:'Tú eliges el punto de partida';
    $('summary-text').textContent=mode==='manual'&&values.length?values.map(d=>d.departamento).join(' · '):'El recorrido visita cada destino y regresa al origen.';
    if(mode==='automatico')checkCreateAvailability();
    else $('crear').disabled=selected.size<5||selected.size>10;
    emit('preferencias',preferences());
  }
  for(const d of departamentosPeru) {
    const label=node('label',undefined,'destination-option');label.dataset.name=norm(d.departamento);
    const input=node('input');input.type='checkbox';input.value=String(d.id);
    input.addEventListener('change',()=>{if(input.checked&&selected.size<10)selected.add(d.id);else selected.delete(d.id);updateSelection();});
    label.append(input,node('span',d.departamento));$('departamentos').append(label);
  }
  $('buscar').addEventListener('input',()=>{
    const query=norm($('buscar').value.trim());let count=0;
    all('.destination-option').forEach(l=>{l.hidden=!l.dataset.name.includes(query);if(!l.hidden)count++;});
    $('sin-coincidencias').hidden=count!==0;
  });
  $('limpiar').addEventListener('click',()=>{selected.clear();updateSelection();announce('Selección de destinos vacía.');});
  all('[name=modo]').forEach(r=>r.addEventListener('change',()=>{
    mode=r.value;$('auto-controls').hidden=mode!=='automatico';$('manual-controls').hidden=mode!=='manual';updateSelection();
  }));
  function checkCreateAvailability() {
    const n=Number($('cantidad').value);
    $('crear').disabled=mode==='manual'?selected.size<5||selected.size>10:!Number.isInteger(n)||n<5||n>10;
  }
  $('crear').addEventListener('click',()=>emit('crear-escenario',preferences()));
  $('personalizar').addEventListener('click',()=>emit('personalizar'));
  function validateQuantity() {
    const n=Number($('cantidad').value),valid=Number.isInteger(n)&&n>=5&&n<=10;
    $('cantidad').setAttribute('aria-invalid',String(!valid));
    $('config-error').textContent=valid?'':'La cantidad debe ser un número entero entre 5 y 10.';
    $('menos').disabled=valid&&n===5;$('mas').disabled=valid&&n===10;checkCreateAvailability();
    emit('preferencias',preferences());
  }
  $('cantidad').addEventListener('input',validateQuantity);
  for(const [id,delta] of [['menos',-1],['mas',1]])$(id).addEventListener('click',()=>{
    const current=Number($('cantidad').value);$('cantidad').value=String(Math.max(5,Math.min(10,(Number.isFinite(current)?current:5)+delta)));validateQuantity();
  });
  all('[name=metrica]').forEach(r=>r.addEventListener('change',()=>{
    $('priority-hint').textContent={Distancia:'El recorrido de menor distancia geográfica.',Tiempo:'El recorrido de menor tiempo estimado.',Costo:'El recorrido de menor costo estimado.'}[r.value];emit('preferencias',preferences());
  }));
  for(const id of ['origen','garantia'])$(id).addEventListener('change',()=>emit('preferencias',preferences()));

  function updateEndpoints() {
    for(const option of $('hasta').options)option.disabled=option.value!==''&&option.value===$('desde').value;
    if($('hasta').value===$('desde').value)$('hasta').value='';
  }
  const editorValues = () => ({origen:$('desde').value===''?null:Number($('desde').value),destino:$('hasta').value===''?null:Number($('hasta').value),distancia:Number($('distancia').value),tiempo:Number($('tiempo').value),costo:Number($('costo').value)});
  function clearEditorMessages() {
    $('editor-error').textContent='';$('editor-valid').textContent='';
    for(const key of ['desde','hasta','distancia','tiempo','costo']){$(`error-${key}`).textContent='';$(key).removeAttribute('aria-invalid');}
  }
  function requestPair() {
    const {origen,destino}=editorValues();
    const valid=origen!==null&&destino!==null&&origen!==destino;
    $('usar-modelo').disabled=$('guardar-conexion').disabled=!valid;
    $('eliminar-conexion').disabled=true;
    if(valid)emit('editar-par',{origen,destino});
    else {for(const k of ['distancia','tiempo','costo'])$(k).value='';emit('editor-sin-par');}
  }
  function openEditor(edge) {
    pausarReproduccion();
    if(edge){matrixSelection=edge;drawMatrix();}
    if(busy){announce('Cancela o espera a que termine el cálculo para editar.');return;}
    if(!graphData){announce('Crea un escenario antes de editar conexiones.');return;}
    $('conexion-form').reset();clearEditorMessages();
    updateOptions($('desde'),graphData.nodos,'Elige un destino');updateOptions($('hasta'),graphData.nodos,'Elige otro destino');
    $('desde').value=edge?String(edge.origen):'';$('hasta').value=edge?String(edge.destino):'';
    $('desde').disabled=$('hasta').disabled=false;
    $('editor-hint').textContent='Selecciona dos destinos. Si la conexión existe podrás modificarla; si no, crearla.';
    updateEndpoints();dirty=false;editorPair=[$('desde').value,$('hasta').value];$('discard-confirm').hidden=true;
    opener=document.activeElement;$('editor').showModal();document.body.style.overflow='hidden';requestPair();
  }
  function closeEditor() {
    if(dirty){$('discard-confirm').hidden=false;$('seguir-editando').focus();return;}
    $('editor').close();
  }
  $('editor').addEventListener('close',()=>{document.body.style.overflow='';emit('editor-cerrado');(opener?.isConnected?opener:$('abrir-editor')).focus();});
  $('editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor();});
  $('abrir-editor').addEventListener('click',()=>openEditor());
  for(const id of ['cerrar-editor','cancelar-editor'])$(id).addEventListener('click',closeEditor);
  $('descartar').addEventListener('click',()=>{dirty=false;$('conexion-form').reset();closeEditor();});
  $('seguir-editando').addEventListener('click',()=>{$('discard-confirm').hidden=true;$('desde').focus();});
  for(const id of ['desde','hasta'])$(id).addEventListener('change',()=>{
    if(dirty&&!window.confirm('¿Descartar los pesos no guardados para elegir otra conexión?')){
      $('desde').value=editorPair[0];$('hasta').value=editorPair[1];return;
    }
    updateEndpoints();editorPair=[$('desde').value,$('hasta').value];dirty=false;clearEditorMessages();requestPair();
  });
  $('conexion-form').addEventListener('input',e=>{if(['distancia','tiempo','costo'].includes(e.target.id)){dirty=true;$('editor-valid').textContent='';}});
  $('conexion-form').addEventListener('submit',e=>{
    e.preventDefault();const errors=[];let first=null;
    const labels={desde:'Elige el destino de salida.',hasta:'Elige un destino distinto.',distancia:'Introduce una distancia positiva y finita.',tiempo:'Introduce un tiempo positivo y finito.',costo:'Introduce un costo positivo y finito.'};
    for(const id of ['desde','hasta','distancia','tiempo','costo']) {
      const field=$(id),number=Number(field.value);
      const valid=['desde','hasta'].includes(id)?field.value!==''&&Number.isInteger(number)&&graphData?.nodos.some(n=>n.id===number)&&(id!=='hasta'||field.value!==$('desde').value):field.value!==''&&Number.isFinite(number)&&number>0;
      field.setAttribute('aria-invalid',String(!valid));field.setAttribute('aria-describedby',`error-${id}`);
      $(`error-${id}`).textContent=valid?'':labels[id];
      if(!valid){first??=field;errors.push(labels[id]);}
    }
    $('editor-error').textContent=errors.length?'Revisa los campos señalados antes de guardar.':'';
    $('editor-valid').textContent='';
    if(first){first.focus();return;}
    if(e.submitter?.id==='guardar-conexion')emit('guardar-conexion',editorValues());
    else {$('editor-valid').textContent='Campos válidos. Pulsa Guardar conexión para aplicarlos.';emit('borrador-validado',editorValues());}
  });
  $('usar-modelo').addEventListener('click',()=>{
    if(['distancia','tiempo','costo'].some(k=>$(k).value!=='')&&!window.confirm('¿Reemplazar los valores del formulario por sugerencias del modelo? No se guardarán hasta que lo confirmes.'))return;
    emit('solicitar-pesos',editorValues());
  });
  $('eliminar-conexion').addEventListener('click',()=>{if(window.confirm('¿Eliminar esta conexión en ambos sentidos?'))emit('eliminar-conexion');});
  function renderEdicion(conexion) {
    for(const k of ['distancia','tiempo','costo']){$(k).value=conexion.existe?String(conexion[k]):'';$(k).title=$(k).value;}
    $('guardar-conexion').textContent=conexion.existe?'Guardar cambios':'Guardar conexión';
    $('eliminar-conexion').disabled=!conexion.existe;
    $('editor-hint').textContent=conexion.existe?'Conexión existente. Los cambios se aplicarán en ambos sentidos.':'Nueva conexión. Introduce los pesos o usa las sugerencias del modelo.';
    dirty=false;
  }
  function aplicarSugerencias(pesos) {
    for(const k of ['distancia','tiempo','costo']){$(k).value=String(pesos[k]);$(k).title=$(k).value;}
    clearEditorMessages();dirty=true;$('editor-valid').textContent='Sugerencias cargadas, aún sin guardar. Puedes editarlas.';
  }
  function mensajeEdicion(mensaje,error=false) {
    $('editor-error').textContent=error?mensaje:'';$('editor-valid').textContent=error?'':mensaje;
    if(!error)dirty=false;announce(mensaje);
  }
  $('grafo-plan').addEventListener('seleccionar-nodo',e=>{
    $('graph-context').hidden=false;$('graph-context').textContent=`Destino seleccionado: ${e.detail.nombre}${e.detail.capital?` · Capital: ${e.detail.capital}`:""}`;emit('seleccionar-nodo',e.detail);
  });
  $('grafo-plan').addEventListener('seleccionar-conexion',e=>{
    const edge=e.detail;const name=id=>graphData.nodos.find(n=>n.id===id)?.nombre??String(id);
    $('graph-context').hidden=false;$('graph-context').textContent=`${name(edge.origen)} — ${name(edge.destino)} · ${edge.missing?'Conexión faltante, sin pesos asignados':`${format(edge.distancia)} km · ${format(edge.tiempo)} min · S/ ${format(edge.costo)}`}`;
    emit('seleccionar-conexion',edge);
  });

  function renderEscenario(data) {
    graphData=data?structuredClone(data):null;graph.render(graphData);
    $('graph-context').hidden=true;$('graph-status').textContent=data?`${data.nodos.length} destinos · ${data.conexiones.length} ${data.conexiones.length===1?'conexión':'conexiones'}`:'Sin escenario';
    updateOptions($('origen'),data?.nodos??[],'Elige tu punto de partida');$('origen').disabled=!data;
    if(data?.origen!==undefined)$('origen').value=String(data.origen);
    $('abrir-editor').disabled=!data;$('editor-disponible').textContent=data?'Selecciona una conexión en el grafo o en la lista para editarla.':'Crea un escenario para habilitar el editor.';
    $('conexiones-card').hidden=!data;
    const list=$('lista-conexiones');list.replaceChildren();
    if(data) {
      $('summary-title').textContent=`${data.nodos.length} destinos en el escenario activo`;
      $('summary-text').textContent=data.nodos.map(n=>n.nombre).join(' · ');
      $('conexiones-cantidad').textContent=String(data.conexiones.length);
      if(!data.conexiones.length)list.append(node('p','Sin conexiones. Abre el gestor para agregar la primera.','muted'));
      for(const e of data.conexiones) {
        const names=id=>data.nodos.find(n=>n.id===id)?.nombre;
        const button=node('button',undefined,'connection-item');button.type='button';
        button.append(node('strong',`${names(e.origen)} — ${names(e.destino)}`),node('span',`${format(e.distancia)} km · ${format(e.tiempo)} min · S/ ${format(e.costo)}`),node('span','Editar ↗'));
        button.addEventListener('click',()=>openEditor(e));list.append(button);
      }
    }
  }
  function renderMatrices(data) {
    matrixData=data?structuredClone(data):null;matrixSelection=null;
    drawMatrix();
  }
  function drawMatrix() {
    if(!matrixData){$('tabla-matriz').replaceChildren(node('p','Crea un escenario para consultar sus matrices.','table-empty'));return;}
    const type=$('tipo-matriz').value;
    const names=matrixData.nombres, values=matrixData[type];
    if(!values)throw new Error(`Falta la matriz ${type}.`);
    const table=node('table',undefined,'matrix');table.append(node('caption',`${type==='adyacencia'?'Adyacencia':`${type} (${units[type]})`} · filas y columnas representan los mismos destinos`));
    const head=node('thead'),header=node('tr');header.append(node('th','Destino'));
    names.forEach(name=>{const th=node('th',name);th.scope='col';header.append(th);});head.append(header);table.append(head);
    const body=node('tbody');
    names.forEach((name,i)=>{const tr=node('tr'),th=node('th',name);th.scope='row';tr.append(th);
      names.forEach((_,j)=>{const absent=i!==j&&!matrixData.adyacencia[i][j];const value=i===j?'0':type==='adyacencia'?String(values[i][j]):absent?'—':format(values[i][j]);const td=node('td',value,i===j?'diagonal':absent?'absent':'');if(matrixSelection&&((i===matrixSelection.origen&&j===matrixSelection.destino)||(j===matrixSelection.origen&&i===matrixSelection.destino))){td.classList.add('matrix-selected');td.title=`Conexión seleccionada: ${names[i]} — ${names[j]}`;}if(absent&&type!=='adyacencia')td.setAttribute('aria-label','Sin conexión');tr.append(td);});body.append(tr);});
    table.append(body);$('tabla-matriz').replaceChildren(table);
    $('matrix-help').textContent=type==='adyacencia'?'1: existe conexión · 0: no existe conexión. La diagonal siempre es 0.':`Valores en ${units[type]}. —: conexión inexistente · 0: diagonal. Desliza la tabla para ver todos los destinos.`;
  }
  $('tipo-matriz').addEventListener('change',drawMatrix);
  function renderPagina({rutas,inicio,total,nombres,metrica}) {
    $('error-consulta').textContent='';$('numero-pagina').disabled=$('ir-pagina').disabled=false;
    $('numero-pagina').max=String(Math.ceil(total/100));$('numero-pagina').value=String(Math.floor(inicio/100)+1);
    if(rutas.length>100)throw new RangeError('La presentación admite un máximo de 100 candidatas por página.');
    pageInfo={inicio,total};const table=node('table');table.append(node('caption','Candidatas en su orden original de evaluación','sr-only'));const header=node('tr');
    for(const name of ['N.º','Recorrido','Estado',`Valor (${units[metrica]})`,'Detalle']){const th=node('th',name);th.scope='col';header.append(th);}
    const head=node('thead');head.append(header);table.append(head);const body=node('tbody');
    rutas.forEach((r,i)=>{
      const tr=node('tr');tr.append(node('td',String(inicio+i+1)),node('td',r.ruta.map(id=>nombres[id]).join(' → ')),node('td',r.valida?'✓ Válida':'No realizable con estas conexiones',r.valida?'status-valid':'status-invalid'),node('td',r.valida?format(r.valorTotal):'—'));
      const td=node('td'),button=node('button','Ver detalle','secondary');button.type='button';button.setAttribute('aria-label',`Ver detalle del recorrido ${inicio+i+1}`);
      button.addEventListener('click',()=>{
        limpiarCandidata();pausarReproduccion();
        $('detalle-ruta').hidden=false;
        const missing=r.conexionesFaltantes;
        $('detalle-ruta').textContent=`Recorrido ${inicio+i+1}: ${r.ruta.map(id=>nombres[id]).join(' → ')}. ${r.valida?'Todas las conexiones existen.':missing?.length?`Faltan: ${missing.map(e=>`${nombres[e.origen]} — ${nombres[e.destino]}`).join('; ')}.`:'Falta al menos una conexión. Consulta los tramos faltantes debajo.'}`;
        emit('seleccionar-ruta',{indice:inicio+i});
      });td.append(button);tr.append(td);body.append(tr);
    });
    table.append(body);$('tabla-rutas').replaceChildren(table);$('tabla-rutas').scrollTop=0;$('route-count').textContent=`${total} candidatas`;
    $('pagina-info').textContent=total?`${inicio+1}–${inicio+rutas.length} de ${total}`:'Sin candidatas';
    // Solo eventos de petición: no trae datos ni cambia de página sin respuesta externa.
    $('anterior').disabled=inicio===0;$('siguiente').disabled=inicio+rutas.length>=total;
    $('detalle-ruta').hidden=true;limpiarCandidata();
  }
  $('anterior').addEventListener('click',()=>emit('pagina',{inicio:Math.max(0,pageInfo.inicio-100),limite:100}));
  $('siguiente').addEventListener('click',()=>emit('pagina',{inicio:pageInfo.inicio+100,limite:100}));
  function renderResultado(data) {
    resultPlayer?.destruir();resultPlayer=null;ultimoResultado=data;
    resultGraph?.destroy();resultGraph=null;$('resultado-contenido').replaceChildren();
    $('resultado-vacio').hidden=!!data;$('resultado-contenido').hidden=!data||data.sinCiclo;$('sin-ciclo').hidden=!data?.sinCiclo;
    if(!data)return;
    if(data.sinCiclo) {
      const area=$('recomendaciones');area.replaceChildren(node('p',`${data.resultado.cantidadCandidatos} candidatas · 0 válidas · ${data.resultado.cantidadCandidatos} inválidas`));
      if(data.diagnostico) {
        area.append(node('h3',`${data.diagnostico.cantidadMinimaConexiones} conexiones nuevas permitirían completar un recorrido`),node('p','Esta es una recomendación mínima. Puede haber otras alternativas con la misma cantidad de conexiones.'));
        const list=node('ul');data.diagnostico.conexionesFaltantes.forEach(e=>{const li=node('li'),b=node('button',`${data.nombres[e.origen]} — ${data.nombres[e.destino]}: revisar`,'text-button');b.type='button';b.addEventListener('click',()=>openEditor(e));li.append(b);list.append(li);});area.append(list);
      }else area.append(node('p','El diagnóstico de conexiones todavía no está disponible.'));
      announce('No se encontró un recorrido completo.');return;
    }
    const {resultado,nombres,metrica,escenario}=data;
    if(!resultado.mejorRuta?.length||!Number.isFinite(resultado.mejorValor))throw new Error('Se requiere un resultado válido para mostrar un óptimo.');
    const layout=node('div',undefined,'result-layout'),summary=node('article',undefined,'card padded');
    summary.append(node('p','TU MEJOR RECORRIDO','eyebrow'),node('h2',`Prioridad: ${metrica.toLowerCase()}`),node('div',`${format(resultado.mejorValor)} ${units[metrica]}`,'result-total'),node('p','Un recorrido óptimo entre las alternativas válidas.','small'));
    summary.append(node('p',`${resultado.cantidadCandidatos} candidatas · ${resultado.cantidadCiclosValidos} válidas · ${resultado.cantidadCandidatos-resultado.cantidadCiclosValidos} inválidas`,'result-counts'));
    if(data.totales)summary.append(node('p',`Totales de esta misma ruta: ${Object.entries(data.totales).map(([k,v])=>`${format(v)} ${units[k]}`).join(' · ')}. No representan otros óptimos.`,'small'));
    const itinerary=node('ol',undefined,'itinerary');resultado.mejorRuta.forEach((id,i)=>{const li=node('li',nombres[id]);if(i===0||i===resultado.mejorRuta.length-1)li.append(node('small',i===0?'Punto de partida':'Regreso al origen'));itinerary.append(li);});summary.append(itinerary);
    const adjust=node('a','Ajustar escenario →','secondary full');adjust.href='#planificar';summary.append(adjust);
    const visual=node('article',undefined,'card'),heading=node('div',undefined,'graph-heading');heading.append(node('h2','Tu itinerario, conectado'));visual.append(heading);
    const canvas=node('div',undefined,'graph-container');visual.append(canvas);
    const animation=node('div',undefined,'result-controls');
    const alternatives=node('a','Ver alternativas →');alternatives.href='#explorar';
    const general=node('a','Volver a las conexiones del escenario →','secondary');general.href='#planificar';
    visual.append(animation);layout.append(summary,visual);$('resultado-contenido').append(layout);
    resultGraph=new Visualizacion(canvas);resultGraph.render({...escenario,ruta:resultado.mejorRuta});
    resultPlayer=crearPanelReproduccion({contenedor:animation,visualizacion:resultGraph,escenario,ruta:resultado.mejorRuta,revision:data.revision,titulo:'Reproducción del recorrido óptimo',antesDeReproducir:pausarReproduccion});
    const links=node('div',undefined,'actions playback-links');links.append(alternatives,general);animation.append(links);announce('Resultado disponible para consultar.');
  }
  function establecerPreferencias(p) {
    synchronizing=true;
    try {
      if(p.modo)mode=p.modo;
      all('[name=modo]').forEach(r=>r.checked=r.value===mode);
      $('auto-controls').hidden=mode!=='automatico';$('manual-controls').hidden=mode!=='manual';
      if(p.idsDepartamentos){selected.clear();p.idsDepartamentos.forEach(id=>selected.add(id));}
      if(p.cantidadNodos!==undefined)$('cantidad').value=String(p.cantidadNodos);
      if(p.garantizarCicloHamiltoniano!==undefined)$('garantia').checked=p.garantizarCicloHamiltoniano;
      if(p.metrica)all('[name=metrica]').forEach(r=>r.checked=r.value===p.metrica);
      updateSelection();checkCreateAvailability();
      $('buscar').value='';all('.destination-option').forEach(l=>l.hidden=false);$('sin-coincidencias').hidden=true;
    } finally {synchronizing=false;}
  }
  function mensajeEscenario(mensaje,error=false) {
    if(error){$('config-error').textContent=mensaje;return;}
    $('escenario-aviso').textContent=mensaje;$('escenario-aviso').hidden=!mensaje;announce(mensaje);
  }
  function invalidarResultados() {
    limpiarCandidata();
    $('numero-pagina').disabled=$('ir-pagina').disabled=true;$('error-consulta').textContent='';
    renderResultado(null);$('tabla-rutas').replaceChildren(node('p','Aún no hay un cálculo vigente para este escenario.','table-empty'));
    $('anterior').disabled=$('siguiente').disabled=true;$('detalle-ruta').hidden=true;
    $('route-count').textContent='Sin cálculo';$('pagina-info').textContent='Sin páginas disponibles';pageInfo=null;
  }
  function renderEstado({modo:actualMode}) {$('personalizar').hidden=!graphData||actualMode!=='automatico';}
  function irA(id){history.pushState(null,'',`#${id}`);navigate(true);window.scrollTo(0,0);}
  function renderCalculo({estado,activo,mensaje}) {
    const calculating=estado==='calculando';
    if(calculating&&!busy){
      blocked=all('.configuration input,.configuration button,.configuration select,#abrir-editor,#personalizar,.connection-item,#conexion-form input,#conexion-form select,#conexion-form button').filter(e=>e.id!=='cancelar-calculo').map(e=>[e,e.disabled]);
      blocked.forEach(([e])=>e.disabled=true);
    }else if(!calculating&&busy){blocked.forEach(([e,disabled])=>{if(e.isConnected)e.disabled=disabled;});blocked=[];}
    busy=calculating;$('resolver').disabled=!activo||busy;$('cancelar-calculo').hidden=!busy;
    $('calculo-progreso').hidden=!busy;if(busy){$('calculo-progreso').removeAttribute('value');ultimoAnuncio=-Infinity;ultimaFase=null;}
    const labels={'sin-escenario':'Sin escenario. Crea tus destinos para comenzar.',listo:'Listo para calcular.',calculando:'Calculando recorridos; puedes cancelar sin perder el escenario.',completado:'Cálculo completado. El óptimo y las candidatas están disponibles.','sin-ciclo':'Cálculo completado: no existe un recorrido completo. Consulta las conexiones recomendadas.',cancelado:'Cálculo cancelado. Se conservaron todos los datos del escenario.',error:`No se pudo completar el cálculo. ${mensaje??'Inténtalo nuevamente.'}`,obsoleto:'Resultado obsoleto: el escenario cambió. Vuelve a calcular.'};
    $('calculo-estado').textContent=labels[estado];$('calculo-estado').dataset.estado=estado;
    $('resolver-help').textContent=activo?'Evalúa todas las candidatas sin bloquear la interfaz.':'Crea un escenario para calcular.';
    $('vista-rutas').setAttribute('aria-busy',String(busy));
  }
  function renderProgreso({fase,evaluadas,total}){
    if(!busy)return;
    $('calculo-progreso').max=total;$('calculo-progreso').value=evaluadas;
    if(fase!==ultimaFase||performance.now()-ultimoAnuncio>=1000){
      $('calculo-estado').textContent=`${fase==='diagnostico'?'Buscando conexiones mínimas faltantes':'Evaluando candidatas'}: ${evaluadas} de ${total}.`;
      ultimaFase=fase;ultimoAnuncio=performance.now();
    }
  }
  function renderExplicacion({grafo,origen,metrica,resultado,nombres}) {
    $('explicacion-actual').textContent=!grafo?'Crea un escenario para ver sus cantidades.':`${grafo.cantidadNodos} destinos · Origen: ${nombres[origen]} · Prioridad: ${metrica}. (${grafo.cantidadNodos} − 1)! / 2 = ${cantidadCanonicas(grafo.cantidadNodos)} candidatas canónicas. ${resultado?`Evaluadas: ${resultado.cantidadCandidatos}; válidas: ${resultado.cantidadCiclosValidos}; inválidas: ${resultado.cantidadCandidatos-resultado.cantidadCiclosValidos}.`:'Aún sin evaluación vigente; no se conoce cuántas son válidas.'}`;
  }
  function renderDetalle({indice,candidata,conexionesFaltantes,mejorParcial,escenario,metrica,revision}) {
    limpiarCandidata();pausarReproduccion();
    const nombres=escenario.nodos.map(n=>n.nombre), ruta=r=>r.map(i=>nombres[i]).join(' → '), area=$('detalle-ruta');
    area.hidden=false;area.replaceChildren(node('h3',`Candidata ${indice+1}`),node('p',ruta(candidata.ruta)));
    area.append(node('p',candidata.valida?`Válida · ${format(candidata.valorTotal)} ${units[metrica]}`:'No realizable con estas conexiones. Sin valor total.'));
    if(conexionesFaltantes.length)area.append(node('p',`Conexiones faltantes: ${conexionesFaltantes.map(e=>`${nombres[e.origen]} — ${nombres[e.destino]}`).join('; ')}.`));
    area.append(node('h3','Mejor recorrido encontrado hasta aquí'),node('p',mejorParcial?`Candidata ${mejorParcial.indice+1}: ${ruta(mejorParcial.ruta)} · ${format(mejorParcial.valorTotal)} ${units[metrica]}`:'Todavía no se encontró un ciclo válido hasta esta candidata.'),node('small','Mejor parcial en el orden original; el óptimo global se muestra en Mi recorrido.'));
    const steps=node('ol',undefined,'route-breakdown'),weights=[];
    for(let i=1;i<candidata.ruta.length;i++) {
      const a=candidata.ruta[i-1],b=candidata.ruta[i],edge=escenario.conexiones.find(e=>(e.origen===a&&e.destino===b)||(e.origen===b&&e.destino===a));
      const li=node('li',`${nombres[a]} → ${nombres[b]}: ${edge?`${format(edge[metrica.toLowerCase()])} ${units[metrica]}`:'Conexión inexistente; sin peso'}`);
      if(edge){li.title=String(edge[metrica.toLowerCase()]);weights.push(format(edge[metrica.toLowerCase()]));}
      steps.append(li);
    }
    area.append(node('h3','Evaluación de sus conexiones'),steps,node('p',candidata.valida?`${weights.join(' + ')} = ${format(candidata.valorTotal)} ${units[metrica]}`:'No se calcula un total válido porque falta al menos una conexión.'),node('small','Presentación redondeada; el motor utiliza los pesos completos.'),node('p',`Recorrido inverso equivalente: ${ruta([...candidata.ruta].reverse())}. Representa el mismo ciclo no dirigido y no se cuenta nuevamente.`));
    if(ultimoResultado&&!ultimoResultado.sinCiclo){const best=node('button','Ver mejor recorrido','secondary');best.type='button';best.id='ver-optimo';best.addEventListener('click',()=>{candidatePlayer?.reiniciar();resultPlayer?.reiniciar();irA('recorrido');});area.append(best);}
    $('candidata-grafo').hidden=false;candidateGraph=new Visualizacion($('candidata-grafo'));
    candidateGraph.render({...escenario,ruta:candidata.ruta,faltantes:conexionesFaltantes});
    $('candidata-controles').hidden=false;candidatePlayer=crearPanelReproduccion({contenedor:$('candidata-controles'),visualizacion:candidateGraph,escenario,ruta:candidata.ruta,revision,titulo:`Reproducción de candidata ${indice+1}`,antesDeReproducir:pausarReproduccion});
    if(!$('explorar').hidden&&!$('vista-rutas').hidden){area.focus({preventScroll:true});area.scrollIntoView({block:'start',behavior:'instant'});}
  }
  function limpiarCandidata(){candidatePlayer?.destruir();candidatePlayer=null;candidateGraph?.destroy();candidateGraph=null;$('candidata-grafo').hidden=true;$('candidata-controles').hidden=true;}
  function mensajeConsulta(mensaje){$('error-consulta').textContent=mensaje;announce(mensaje);}
  $('resolver').addEventListener('click',()=>emit('resolver'));
  $('cancelar-calculo').addEventListener('click',()=>emit('cancelar-calculo'));
  $('saltar-pagina').addEventListener('submit',e=>{e.preventDefault();if(!pageInfo)return;const n=Number($('numero-pagina').value);if(Number.isInteger(n)&&n>=1&&n<=Math.ceil(pageInfo.total/100))emit('pagina',{inicio:(n-1)*100,limite:100});});
  validateQuantity();updateSelection();
  return {pausarReproduccion,renderCalculo,renderProgreso,renderDetalle,renderExplicacion,mensajeConsulta,irA,renderEscenario,renderMatrices,renderPagina,renderResultado,abrirEditor:openEditor,obtenerPreferencias:preferences,
    establecerPreferencias,renderEdicion,aplicarSugerencias,mensajeEdicion,mensajeEscenario,invalidarResultados,renderEstado};
}
