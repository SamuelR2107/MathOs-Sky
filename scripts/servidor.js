// Solo desarrollo: servidor estático local, sin API ni lógica de aplicación.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export function crearServidor() {
 return createServer(async(req,res)=>{
  try {
   const url=new URL(req.url,'http://localhost');
   let path=decodeURIComponent(url.pathname);
   if(path.startsWith('/MathOs-Sky/'))path=path.slice('/MathOs-Sky'.length);
   if(path==='/')path='/index.html';
   const file=resolve(root,'.'+path);
   if(!file.startsWith(resolve(root)+sep))throw new Error('Fuera del proyecto');
   res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'})[extname(file)]??'application/octet-stream');
   res.setHeader('Cache-Control','no-store');res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('No encontrado');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const server=crearServidor();server.listen(4173,'127.0.0.1',()=>console.log('MathOs-Sky: http://127.0.0.1:4173/MathOs-Sky/'));
}
