import {formatearNumero} from './formato.js';
import {ReproductorRuta} from './reproductorRuta.js';
/** Controles reutilizados por óptimo y candidata. Ninguna consulta al Worker. */
export function crearPanelReproduccion({contenedor,visualizacion,escenario,ruta,revision,titulo,antesDeReproducir}) {
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const root=el('div',null,'animation playback');root.dataset.revision=revision;
  const heading=el('h3',titulo),actions=el('div',null,'actions');
  const play=el('button','▶ Reproducir','primary'),pause=el('button','Pausar','secondary'),reset=el('button','Reiniciar','secondary'),step=el('button','Siguiente tramo','secondary');
  for(const [b,k] of [[play,'play'],[pause,'pause'],[reset,'reset'],[step,'step']]){b.type='button';b.dataset.action=k;}
  const label=el('label','Velocidad '),speed=el('select');speed.setAttribute('aria-label','Velocidad de reproducción');
  for(const v of [.5,1,2])speed.add(new Option(`${v}x`,String(v),v===1,v===1));label.append(speed);
  actions.append(play,pause,reset,step,label);
  const status=el('p',null,'playback-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const progress=el('progress');progress.max=ruta.length-1;progress.setAttribute('aria-label','Progreso de reproducción, no del cálculo');
  const note=el('p','Reproduce una ruta ya evaluada. 1,1 segundos visuales por tramo a 1x; no representan minutos de viaje ni cálculo en vivo.','small');
  const legend=el('p','··· Pendiente · ━ Tramo activo · ✓ Recorrido · – – Conexión faltante','small');
  root.append(heading,actions,status,progress,note,legend);contenedor.append(root);
  const names=new Map(escenario.nodos.map(n=>[n.id,n.nombre]));
  const key=(a,b)=>[a,b].sort((x,y)=>x-y).join(':');
  const edges=new Set(escenario.conexiones.map(e=>key(e.origen,e.destino)));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let lastText='',lastControls='';
  const selection=el('p',null,'playback-selection');selection.setAttribute('role','status');root.append(selection);
  const onNode=({detail:n})=>{selection.textContent=`Destino: ${n.nombre}${n.capital?` · Capital: ${n.capital}`:''}`;};
  const onEdge=({detail:e})=>{selection.textContent=`${names.get(e.origen)} — ${names.get(e.destino)}: ${e.missing?'conexión inexistente; sin pesos':`${formatearNumero(e.distancia)} km · ${formatearNumero(e.tiempo)} min · S/ ${formatearNumero(e.costo)}`}`;};
  visualizacion.container.addEventListener('seleccionar-nodo',onNode);visualizacion.container.addEventListener('seleccionar-conexion',onEdge);
  const player=new ReproductorRuta({ruta,revision,existe:(a,b)=>edges.has(key(a,b)),actualizar:s=>{
    visualizacion.actualizarReproduccion(s);
    root.dataset.estado=s.estado;root.dataset.segmento=s.segmento;root.dataset.progreso=s.progreso;
    progress.value=s.segmento+s.progreso;
    const prefix={listo:'Listo',reproduciendo:'Reproduciendo',pausado:'Pausado',completado:'Recorrido completado: regreso al origen',bloqueado:'Detenido antes de una conexión inexistente'}[s.estado];
    const text=`${prefix}. Tramo ${s.segmento+1} de ${s.total}: ${names.get(s.origen)} → ${names.get(s.destino)}.${reduced.matches?' Movimiento reducido: avanza con Siguiente tramo.':''}`;
    if(text!==lastText){status.textContent=text;lastText=text;}
    const controlsKey=`${s.estado}:${reduced.matches}`;
    if(controlsKey!==lastControls){lastControls=controlsKey;
    play.textContent=s.estado==='pausado'?'▶ Continuar':s.estado==='completado'?'▶ Reproducir de nuevo':'▶ Reproducir';
    play.disabled=reduced.matches||['reproduciendo','bloqueado'].includes(s.estado);pause.disabled=s.estado!=='reproduciendo';
    step.disabled=['bloqueado','completado'].includes(s.estado);step.hidden=!reduced.matches;speed.disabled=reduced.matches;
    }
  }});
  play.addEventListener('click',()=>{if(root.closest('[hidden]')||document.hidden)return;antesDeReproducir();player.reproducir();if(player.estado==='reproduciendo')pause.focus({preventScroll:true});});
  pause.addEventListener('click',()=>{player.pausar();play.focus({preventScroll:true});});reset.addEventListener('click',()=>player.reiniciar());
  step.addEventListener('click',()=>{antesDeReproducir();player.siguiente();});
  speed.addEventListener('change',()=>player.cambiarVelocidad(Number(speed.value)));
  const media=()=>{player.pausar();player.notificar();};reduced.addEventListener('change',media);
  player.notificar();
  return {pausar:()=>player.pausar(),reiniciar:()=>player.reiniciar(),destruir:()=>{player.destruir();visualizacion.container.removeEventListener('seleccionar-nodo',onNode);visualizacion.container.removeEventListener('seleccionar-conexion',onEdge);reduced.removeEventListener('change',media);root.remove();}};
}
