// Copia estática de publicación; no despliega ni necesita herramientas de build.
import {mkdir,readdir,copyFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function prepararPublicacion(){
 const destino=resolve(root,'publicacion');await mkdir(destino,{recursive:true});
 const archivos=['index.html'];
 for(const dir of ['js','css']){
  await mkdir(resolve(destino,dir),{recursive:true});
  for(const entry of await readdir(resolve(root,dir),{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith(dir==='js'?'.js':'.css'))archivos.push(`${dir}/${entry.name}`);
 }
 for(const name of archivos)await copyFile(resolve(root,name),resolve(destino,name));
 await writeFile(resolve(destino,'.nojekyll'),'');return {destino,archivos:[...archivos,'.nojekyll']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await prepararPublicacion(),null,2));
