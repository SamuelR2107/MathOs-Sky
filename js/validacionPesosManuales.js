import {calcularPesosGeograficos,obtenerDepartamento} from './datosPeru.js';
/** Política de uso del FORMULARIO; no redefine los pesos admitidos por Grafo/TSP.
 * Multiplicadores UX, no tarifas ni límites científicos. Extremos inclusivos.
 * Cada campo se compara con su propia referencia, nunca con otro peso manual. */
export const LIMITES_PESOS_MANUALES=Object.freeze({
 distancia:Object.freeze({nombre:'Distancia',unidad:'km',habitualMin:.75,habitualMax:2.5,permitidoMin:.4,permitidoMax:4,absolutoMin:.01,absolutoMax:10000}),
 tiempo:Object.freeze({nombre:'Tiempo',unidad:'min',habitualMin:.7,habitualMax:3,permitidoMin:.3,permitidoMax:6,absolutoMin:.1,absolutoMax:14400}),
 costo:Object.freeze({nombre:'Costo',unidad:'S/',habitualMin:.6,habitualMax:3,permitidoMin:.2,permitidoMax:6,absolutoMin:.01,absolutoMax:100000})
});
const numero=new Intl.NumberFormat('es-PE',{maximumFractionDigits:4});
function leerNumero(valor){
 if(typeof valor==='number')return valor;
 if(typeof valor!=='string'||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(valor.trim()))return NaN;
 return Number(valor);
}
export function evaluarPesosManuales(valores,referencia){
 const campos={};
 for(const [clave,l] of Object.entries(LIMITES_PESOS_MANUALES)){
  const valor=leerNumero(valores?.[clave]),ref=referencia?.[clave];
  const minimo=Math.max(l.absolutoMin,ref*l.permitidoMin),maximo=Math.min(l.absolutoMax,ref*l.permitidoMax);
  let nivel='habitual',mensaje='';
  if(!Number.isFinite(valor)||valor<=0) {nivel='invalido';mensaje=`${l.nombre}: introduce un número obligatorio, positivo y finito (${l.unidad}).`;}
  else if(!Number.isFinite(ref)||ref<=0||minimo>maximo){nivel='invalido';mensaje=`No se pudo obtener una referencia válida para ${l.nombre.toLowerCase()}. Vuelve a seleccionar los destinos.`;}
  else if(valor<minimo||valor>maximo){nivel='invalido';mensaje=`${l.nombre}: valor fuera del rango permitido (aprox. ${numero.format(minimo)}–${numero.format(maximo)} ${l.unidad}). Referencia del modelo: ${numero.format(ref)} ${l.unidad}.`;}
  else if(valor<ref*l.habitualMin||valor>ref*l.habitualMax){nivel='atipico';mensaje=`${l.nombre}: valor inusual frente a la referencia de ${numero.format(ref)} ${l.unidad}. Permitido: aprox. ${numero.format(minimo)}–${numero.format(maximo)} ${l.unidad}; requiere confirmación.`;}
  campos[clave]={nivel,mensaje,valor,referencia:ref,minimo,maximo};
 }
 const nivel=Object.values(campos).some(c=>c.nivel==='invalido')?'invalido':Object.values(campos).some(c=>c.nivel==='atipico')?'atipico':'habitual';
 return {nivel,campos,mensaje:{habitual:'Valores correctos.',atipico:'Valores inusuales: revisa estas estimaciones.',invalido:'Valores fuera del rango permitido o campos inválidos.'}[nivel]};
}
export function evaluarPesosEntreDepartamentos(valores,idA,idB){
 return evaluarPesosManuales(valores,calcularPesosGeograficos(obtenerDepartamento(idA),obtenerDepartamento(idB)));
}
