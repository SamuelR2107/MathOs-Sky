import {posicionTramo} from './reproductorRuta.js';
// Solo presentación SVG. No importa Grafo, TSP ni el generador.
const NS = 'http://www.w3.org/2000/svg';
function svgElement(tag, attributes = {}, text) {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}
const pairKey = (a, b) => [a, b].sort((x, y) => x - y).join(':');
/** render({nodos:[{id,nombre}], conexiones:[{origen,destino,distancia?,tiempo?,costo?}],
 * ruta?:number[], faltantes?:[{origen,destino}], origen?:number}).
 * Emite seleccionar-nodo / seleccionar-conexion desde el contenedor (detail).
 * Los IDs son locales. No calcula pesos, rutas ni conexiones faltantes. */
export class Visualizacion {
  constructor(container) {
    this.container = container;
    this.empty = container.innerHTML;
    this.data = null;this.disposed=false;
    this.selected = null;this.editable=false;this.gesture=null;
    this.width = 0;this.reproduccion=null;this.positions=new Map();this.lines=new Map();this.nodeGroups=new Map();this.plane=null;this.styleKey=null;
    this.observer = new ResizeObserver(entries => {
      const width = Math.round(entries[0].contentRect.width);
      if (width > 0 && width !== this.width) { this.width = width; this.draw(); }
    });
    this.observer.observe(container);
  }
  render(data) { this.data = data ? structuredClone(data) : null; this.selected = null; this.reproduccion=null;this.draw(); }
  destroy() { this.cancelarConexion();this.disposed=true;this.observer.disconnect(); this.container.replaceChildren(); }
  permitirConexiones(valor) {
    this.editable=!!valor;
    if(!this.editable)this.cancelarConexion();
    this.container.classList.toggle('connection-editable',this.editable);
  }
  avisarConexion(texto){this.container.dispatchEvent(new CustomEvent('conexion-aviso',{bubbles:true,detail:texto}));}
  cancelarConexion() {
    const g=this.gesture;this.gesture=null;
    if(g?.pointer!==undefined&&g.capture.hasPointerCapture(g.pointer))g.capture.releasePointerCapture(g.pointer);
    this.preview?.remove();this.preview=null;
    for(const node of this.nodeGroups.values())node.classList.remove('connection-source','connection-target');
  }
  iniciarConexion(id,svg) {
    this.cancelarConexion();const p=this.positions.get(id);
    this.gesture={origen:id,svg};
    this.nodeGroups.get(id).classList.add('connection-source');
    this.preview=svgElement('line',{x1:p.x,y1:p.y,x2:p.x,y2:p.y,class:'connection-preview','aria-hidden':'true'});
    svg.append(this.preview);
  }
  destinoConexion(id) {
    for(const [n,group] of this.nodeGroups)group.classList.toggle('connection-target',n===id&&n!==this.gesture?.origen);
    return id!==null&&id!==undefined&&id!==this.gesture?.origen&&this.positions.has(id);
  }
  abrirConexion(id) {
    const origen=this.gesture.origen;this.cancelarConexion();
    this.nodeGroups.get(origen)?.focus();
    this.container.dispatchEvent(new CustomEvent('solicitar-conexion',{bubbles:true,detail:{origen,destino:id}}));
  }
  teclaConexion(id) {
    if(!this.gesture){this.iniciarConexion(id,this.container.querySelector('svg'));this.avisarConexion('Origen elegido. Usa Tab y Enter o Espacio en otro destino. Escape cancela.');}
    else if(this.destinoConexion(id))this.abrirConexion(id);
    else this.avisarConexion('Elige un destino distinto del origen.');
  }
  configurarConexiones(svg) {
    const nodo=e=>{const n=e?.closest?.('.node');return n&&svg.contains(n)?Number(n.dataset.node):null;};
    const destino=e=>nodo(document.elementFromPoint(e.clientX,e.clientY));
    svg.addEventListener('pointerdown',e=>{
      if(!this.editable||e.button!==0||!e.isPrimary)return;
      const id=nodo(e.target);if(id===null)return;
      this.suppressClick=false;this.iniciarConexion(id,svg);
      Object.assign(this.gesture,{pointer:e.pointerId,capture:this.nodeGroups.get(id),x:e.clientX,y:e.clientY,moved:false});
      this.gesture.capture.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove',e=>{
      const g=this.gesture;if(!g||g.pointer!==e.pointerId)return;
      g.moved ||= Math.hypot(e.clientX-g.x,e.clientY-g.y)>6;
      if(!g.moved)return;
      const matrix=svg.getScreenCTM();if(!matrix)return;
      const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
      this.preview.setAttribute('x2',p.x);this.preview.setAttribute('y2',p.y);
      this.destinoConexion(destino(e));
    });
    svg.addEventListener('pointerup',e=>{
      const g=this.gesture;if(!g||g.pointer!==e.pointerId)return;
      this.suppressClick=g.moved;
      const id=destino(e);
      if(g.moved&&this.destinoConexion(id))this.abrirConexion(id);
      else this.cancelarConexion();
    });
    for(const event of ['pointercancel','lostpointercapture'])svg.addEventListener(event,()=>this.cancelarConexion());
    svg.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.gesture){e.preventDefault();this.cancelarConexion();this.avisarConexion('Conexión cancelada.');}});
    svg.addEventListener('focusin',e=>{
      if(!this.gesture||this.gesture.pointer!==undefined)return;
      const id=nodo(e.target),p=this.positions.get(id);
      if(p){this.preview.setAttribute('x2',p.x);this.preview.setAttribute('y2',p.y);this.destinoConexion(id);}
    });
    svg.addEventListener('focusout',e=>{if(this.gesture?.pointer===undefined&&!svg.contains(e.relatedTarget))this.cancelarConexion();});
  }
  actualizarReproduccion(s) {
    this.reproduccion=s;
    if(!this.plane)return;this.plane.removeAttribute('visibility');
    const a=this.positions.get(s.origen),b=this.positions.get(s.destino);if(!a||!b)return;
    const p=posicionTramo(a,b,s.progreso);
    this.plane.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${p.angulo})`);
    const key=`${s.segmento}:${s.estado}`;
    if(this.styleKey!==key){
      this.styleKey=key;const ruta=this.data.ruta,completed=new Set(ruta.slice(1,s.segmento+1).map((n,i)=>pairKey(ruta[i],n)));
      if(s.estado==='completado')completed.add(pairKey(s.origen,s.destino));
      for(const [k,line] of this.lines){
        line.classList.toggle('travel-done',completed.has(k));
        line.classList.toggle('travel-active',k===pairKey(s.origen,s.destino)&&!['listo','completado','bloqueado'].includes(s.estado));
        line.classList.toggle('travel-pending',line.classList.contains('route')&&!completed.has(k)&&k!==pairKey(s.origen,s.destino));
      }
      for(const [id,group] of this.nodeGroups)group.classList.toggle('travel-node',id===(s.estado==='completado'?s.destino:s.origen));
    }
  }
  draw() {
    this.cancelarConexion();
    if(this.disposed)return;
    if (!this.data?.nodos?.length) { this.container.innerHTML = this.empty; return; }
    const {nodos, conexiones = [], ruta = [], faltantes = [], origen} = this.data;
    const width = Math.max(280, this.width || this.container.clientWidth);
    const height = width < 480 ? Math.max(390, nodos.length * 53) : 410;
    const cx = width / 2, cy = height / 2;
    const rx = Math.max(25, width / 2 - 130), ry = height / 2 - 58;
    const positions = new Map(nodos.map((n, i) => {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / nodos.length;
      return [n.id, {x:cx + rx * Math.cos(angle), y:cy + ry * Math.sin(angle)}];
    }));
    this.positions=positions;this.lines=new Map();this.nodeGroups=new Map();this.plane=null;this.styleKey=null;
    const names = new Map(nodos.map(n => [n.id, n.nombre]));
    const routeEdges = new Set(ruta.slice(1).map((n,i) => pairKey(ruta[i],n)));
    const svg = svgElement('svg', {viewBox:`0 0 ${width} ${height}`, class:'svg-graph', role:'group', 'aria-label':'Destinos y conexiones; usa Tab para explorar cada elemento'});
    const select = (element, eventName, detail, key) => {
      const act = () => {
        this.selected = key;
        svg.querySelectorAll('[aria-pressed]').forEach(e => e.setAttribute('aria-pressed', String(e === element)));
        this.container.dispatchEvent(new CustomEvent(eventName, {bubbles:true, detail:structuredClone(detail)}));
      };
      element.addEventListener('click', e=>{if(this.suppressClick){this.suppressClick=false;e.preventDefault();return;}act();});
      element.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();if(e.repeat)return;act();if(this.editable&&eventName==='seleccionar-nodo')this.teclaConexion(detail.id); } });
    };
    for (const edge of [...conexiones.map(e => ({...e, missing:false})), ...faltantes.map(e => ({...e, missing:true}))]) {
      const a = positions.get(edge.origen), b = positions.get(edge.destino);
      if (!a || !b) continue;
      const key = pairKey(edge.origen,edge.destino);
      const description = `${names.get(edge.origen)} — ${names.get(edge.destino)}${edge.missing ? ': conexión faltante' : routeEdges.has(key) ? ': tramo del recorrido' : ': conexión existente'}`;
      const group = svgElement('g', {class:'edge-group',role:'button',tabindex:'0','aria-label':description,'aria-pressed':String(this.selected===key)});
      const points = {x1:a.x,y1:a.y,x2:b.x,y2:b.y};
      group.append(svgElement('title',{},description),svgElement('line',{...points,class:`graph-edge${routeEdges.has(key)?' route':ruta.length?' subdued':''}${edge.missing?' missing':''}`}),svgElement('line',{...points,class:'edge-hit'}));
      this.lines.set(key,group.querySelector('.graph-edge'));
      select(group,'seleccionar-conexion',edge,key);svg.append(group);
    }
    for (const [i,n] of nodos.entries()) {
      const point = positions.get(n.id);
      const group = svgElement('g', {class:'node','data-node':n.id,role:'button',tabindex:'0','aria-label':`${n.nombre}${n.id===origen?', origen':''}`,'aria-pressed':String(this.selected===`node:${n.id}`)});
      group.append(svgElement('circle',{cx:point.x,cy:point.y,r:17}));
      if(n.id===origen)group.append(svgElement('circle',{cx:point.x,cy:point.y,r:23,fill:'none','stroke-dasharray':'3 3'}));
      group.append(svgElement('text',{x:point.x,y:point.y+4,'text-anchor':'middle',class:'node-number'},String(ruta.length? ruta.indexOf(n.id)+1:i+1)));
      const right = point.x > cx + 20, left = point.x < cx - 20;
      const label = svgElement('text',{x:point.x+(right?25:left?-25:0),y:point.y+(right||left?5:point.y<cy?-30:38),'text-anchor':right?'start':left?'end':'middle'},n.nombre);
      // Largos nombres mantienen tamaño legible y caben dentro del viewBox.
      if (n.nombre.length > 12) { label.setAttribute('textLength','96'); label.setAttribute('lengthAdjust','spacingAndGlyphs'); }
      this.nodeGroups.set(n.id,group);group.append(label);select(group,'seleccionar-nodo',n,`node:${n.id}`);svg.append(group);
    }
    if(ruta.length){
      this.plane=svgElement('g',{class:'route-plane','aria-hidden':'true'});
      this.plane.append(svgElement('path',{d:'M16 0 L3 -3 L-5 -14 L-9 -14 L-5 -3 L-13 -3 L-17 -8 L-20 -8 L-17 0 L-20 8 L-17 8 L-13 3 L-5 3 L-9 14 L-5 14 L3 3 Z'}));
      svg.append(this.plane);
    }
    this.container.replaceChildren(svg);
    this.configurarConexiones(svg);
    if(this.reproduccion)this.actualizarReproduccion(this.reproduccion);
    else if(this.plane)this.plane.setAttribute('visibility','hidden');
  }
}
