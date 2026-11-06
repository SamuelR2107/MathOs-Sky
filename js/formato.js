// Solo presentación: mantiene valores positivos pequeños distinguibles de cero.
const normal=new Intl.NumberFormat('es-PE',{maximumFractionDigits:2});
const cientifico=new Intl.NumberFormat('es-PE',{notation:'scientific',maximumFractionDigits:3});
export function formatearNumero(n){
 if(!Number.isFinite(n))return '—';
 const a=Math.abs(n);return (a!==0&&(a<.01||a>=1e9)?cientifico:normal).format(n);
}
