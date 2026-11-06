/** @typedef {'Distancia'|'Tiempo'|'Costo'} MetricaNombre
 * @typedef {{existe:boolean,distancia:number,tiempo:number,costo:number}} Conexion
 * @typedef {{ruta:number[],valida:boolean,valorTotal:number}} RutaEvaluada
 * @typedef {{rutas:RutaEvaluada[],mejorRuta:number[],mejorValor:number,cantidadCandidatos:number,cantidadCiclosValidos:number}} ResultadoTSP
 * @typedef {{valido:boolean,mensaje:string}} ResultadoValidacion
 * @typedef {{rutaCandidata:number[],conexionesFaltantes:{origen:number,destino:number}[],cantidadCandidatos:number,cantidadMinimaConexiones:number}} DiagnosticoSinCiclo
 * @typedef {{cantidadNodos:number,garantizarCicloHamiltoniano:boolean,semilla:number,probabilidadConexion:number}} ConfiguracionGeneracion
 */
export const Metrica=Object.freeze({Distancia:'Distancia',Tiempo:'Tiempo',Costo:'Costo'});
export function validarMetrica(m) {
 if (!Object.values(Metrica).includes(m)) throw new RangeError('Métrica no reconocida.');
 return m.toLowerCase();
}
export function validarCantidad(n) {
 if (!Number.isInteger(n)||n<5||n>10) throw new RangeError('Se requieren entre 5 y 10 nodos.');
}
export function validarOrigen(n,o) {
 if (!Number.isInteger(o)||o<0||o>=n) throw new RangeError('Origen fuera del grafo.');
}
export function validarPesos(...pesos) {
 if (pesos.length!==3||pesos.some(p=>!Number.isFinite(p)||p<=0)) throw new RangeError('Los tres pesos deben ser positivos y finitos.');
}
/** JSON explícito: únicamente +Infinity se codifica como {$numero:'Infinity'}.
 * null sigue siendo null; nunca se convierte en 0 ni en Infinity.
 * Rechaza NaN/-Infinity, que no son estados válidos del motor. */
export function serializarResultado(resultado) {
 return JSON.stringify(resultado,(_k,v)=>{
  if (v===Infinity) return {$numero:'Infinity'};
  if (typeof v==='number'&&!Number.isFinite(v)) throw new TypeError('Número no serializable.');
  return v;
 });
}
export function deserializarResultado(texto) {
 return JSON.parse(texto,(_k,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&v.$numero==='Infinity'?Infinity:v);
}
