/** Reproducción visual de una ruta ya evaluada. No calcula ni modifica pesos.
 * Reloj y RAF inyectables para verificar pausas y callbacks cancelados. */
export class ReproductorRuta {
  constructor({ruta,existe,revision,actualizar,duracion=1100,ahora=()=>performance.now(),solicitar=f=>requestAnimationFrame(f),cancelar=id=>cancelAnimationFrame(id)}) {
    this.ruta=[...ruta];this.existe=existe;this.revision=revision;this.actualizar=actualizar;
    this.duracion=duracion;this.ahora=ahora;this.solicitar=solicitar;this.cancelar=cancelar;
    this.segmento=0;this.progreso=0;this.velocidad=1;this.estado='listo';this.frame=null;this.generacion=0;
  }
  leer(){return {estado:this.estado,segmento:this.segmento,progreso:this.progreso,total:this.ruta.length-1,origen:this.ruta[this.segmento],destino:this.ruta[this.segmento+1],velocidad:this.velocidad,revision:this.revision};}
  notificar(){if(this.estado!=='destruido')this.actualizar(this.leer());}
  cancelarFrame(){this.generacion++;if(this.frame!==null)this.cancelar(this.frame);this.frame=null;}
  permitido(){return this.existe(this.ruta[this.segmento],this.ruta[this.segmento+1]);}
  avanzar(cantidad){
    while(cantidad>0&&this.estado!=='completado'&&this.estado!=='bloqueado'){
      if(!this.permitido()){this.estado='bloqueado';break;}
      const paso=Math.min(cantidad,1-this.progreso);this.progreso+=paso;cantidad-=paso;
      if(this.progreso>=1){
        if(this.segmento===this.ruta.length-2){this.estado='completado';break;}
        this.segmento++;this.progreso=0;
        if(!this.permitido()){this.estado='bloqueado';break;}
      }
    }
  }
  reproducir(){
    if(['destruido','reproduciendo','bloqueado'].includes(this.estado))return;
    if(this.estado==='completado')this.reiniciar();
    if(!this.permitido()){this.estado='bloqueado';this.notificar();return;}
    this.estado='reproduciendo';this.ultimo=this.ahora();this.notificar();this.programar();
  }
  programar(){
    const token=this.generacion;
    this.frame=this.solicitar(t=>{
      if(token!==this.generacion||this.estado!=='reproduciendo')return;
      this.frame=null;this.avanzar(Math.max(0,t-this.ultimo)*this.velocidad/this.duracion);this.ultimo=t;this.notificar();
      if(this.estado==='reproduciendo')this.programar();
    });
  }
  pausar(){if(this.estado!=='reproduciendo')return;this.cancelarFrame();this.estado='pausado';this.notificar();}
  reiniciar(){if(this.estado==='destruido')return;this.cancelarFrame();this.segmento=0;this.progreso=0;this.estado='listo';this.notificar();}
  cambiarVelocidad(v){if(![.5,1,2].includes(v))throw new RangeError('Velocidad no admitida.');this.velocidad=v;if(this.estado==='reproduciendo')this.ultimo=this.ahora();this.notificar();}
  siguiente(){if(['destruido','completado','bloqueado'].includes(this.estado))return;this.pausar();this.avanzar(1-this.progreso);if(!['completado','bloqueado'].includes(this.estado))this.estado='pausado';this.notificar();}
  destruir(){this.cancelarFrame();this.estado='destruido';}
}
export function posicionTramo(a,b,progreso){return {x:a.x+(b.x-a.x)*progreso,y:a.y+(b.y-a.y)*progreso,angulo:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI};}
