// Transcripción exacta de Data/DepartamentosPeru.cpp; no se consultan servicios externos.
const dms = (g,m,s) => -(g+m/60+s/3600);
const filas = [["0", "Amazonas", "Chachapoyas", "6", "13", "46", "77", "52", "22", "24"], ["1", "Áncash", "Huaraz", "9", "31", "47", "77", "31", "45", "48"], ["2", "Apurímac", "Abancay", "13", "37", "44", "72", "53", "10", "86"], ["3", "Arequipa", "Arequipa", "16", "23", "36", "71", "31", "44", "110"], ["4", "Ayacucho", "Ayacucho", "13", "9", "37", "74", "13", "31", "133"], ["5", "Cajamarca", "Cajamarca", "7", "9", "17", "78", "30", "39", "163"], ["6", "Cusco", "Cusco", "13", "31", "9", "71", "58", "36", "213"], ["7", "Huancavelica", "Huancavelica", "12", "47", "13", "74", "58", "17", "242"], ["8", "Huánuco", "Huánuco", "9", "55", "48", "76", "14", "23", "274"], ["9", "Ica", "Ica", "14", "3", "49", "75", "43", "45", "305"], ["10", "Junín", "Huancayo", "12", "4", "15", "75", "12", "32", "321"], ["11", "La Libertad", "Trujillo", "8", "6", "0", "79", "1", "50", "350"], ["12", "Lambayeque", "Chiclayo", "6", "46", "1", "79", "51", "2", "372"], ["13", "Lima", "Lima", "12", "2", "43", "77", "1", "51", "386"], ["14", "Loreto", "Iquitos", "3", "44", "53", "73", "14", "39", "425"], ["15", "Madre de Dios", "Puerto Maldonado", "12", "35", "37", "69", "10", "36", "440"], ["16", "Moquegua", "Moquegua", "17", "11", "39", "70", "56", "0", "452"], ["17", "Pasco", "Cerro de Pasco", "10", "40", "57", "76", "15", "25", "464"], ["18", "Piura", "Piura", "5", "9", "9", "80", "39", "28", "481"], ["19", "Puno", "Puno", "15", "50", "25", "70", "1", "41", "503"], ["20", "San Martín", "Moyobamba", "6", "2", "5", "76", "58", "27", "542"], ["21", "Tacna", "Tacna", "18", "0", "7", "70", "15", "7", "564"], ["22", "Tumbes", "Tumbes", "3", "34", "16", "80", "27", "33", "576"], ["23", "Ucayali", "Pucallpa", "8", "22", "5", "74", "32", "36", "586"]];
export const departamentosPeru = Object.freeze(filas.map(([id,departamento,capital,a,b,c,d,e,f,pagina]) => Object.freeze({
 id:+id,departamento,capital,latitud:dms(+a,+b,+c),longitud:dms(+d,+e,+f),
 fuente:'INEI - Directorio Nacional de Municipalidades 2019',
 urlFuente:'https://www.inei.gob.pe/media/MenuRecursivo/publicaciones_digitales/Est/Lib1653/Libro.pdf',
 pagina:+pagina,fechaConsulta:'2026-10-04'
})));
export function obtenerDepartamento(id) {
 if (!Number.isInteger(id)||id<0||id>=24) throw new RangeError('ID de departamento inválido.');
 return departamentosPeru[id];
}
export function calcularDistanciaHaversine(a,b) {
 for (const p of [a,b]) if (!p||!Number.isFinite(p.latitud)||!Number.isFinite(p.longitud)||Math.abs(p.latitud)>90||Math.abs(p.longitud)>180) throw new RangeError('Coordenadas inválidas.');
 const rad=g=>g*(Math.PI/180);
 const la=rad(a.latitud),lb=rad(b.latitud),dl=rad(b.latitud-a.latitud),dn=rad(b.longitud-a.longitud);
 const s=Math.sin(dl/2),t=Math.sin(dn/2),h=Math.max(0,Math.min(1,s*s+Math.cos(la)*Math.cos(lb)*t*t));
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
/** Modelo académico v1: no representa servicios ni tarifas comerciales. */
export function calcularPesosGeograficos(a,b) {
 const distancia=calcularDistanciaHaversine(a,b);
 if (!(distancia>0)) throw new RangeError('Se requieren puntos distintos.');
 const movimiento=60*(Math.min(distancia,200)/300+Math.max(0,distancia-200)/650);
 return {distancia,tiempo:30+movimiento,costo:20+0.15*distancia+0.30*movimiento};
}
