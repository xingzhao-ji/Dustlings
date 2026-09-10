import{build}from'esbuild';import{readFile,writeFile,readdir}from'node:fs/promises';import{join,resolve}from'node:path';import{createHash}from'node:crypto';
const sandbox='/tmp/dustlings-light-study',out=resolve('artifacts/light-study'),hash=b=>createHash('sha256').update(b).digest('hex'),manifest={kind:'Review-only isolated prototypes. Not integrated, approved, or release builds.',files:[],sources:{}};
for(const variant of['baseline','variant','framed']){
 const base=join(sandbox,variant),html=await readFile(join(base,'index.html'),'utf8'),css=await readFile(join(base,'style.css'),'utf8');const bundled=await build({entryPoints:[join(base,'src/main.js')],bundle:true,write:false,format:'iife',minify:true,target:'es2022'});
 const standalone=html.replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`).replace('<script type="module" src="src/main.js"></script>',()=>`<script>${bundled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`);
 const name=`Dustlings-Light-Study-${variant}.html`;await writeFile(join(out,name),standalone);manifest.files.push({name,bytes:Buffer.byteLength(standalone),sha256:hash(standalone)});manifest.sources[variant]={};
 for(const file of['index.html','style.css',...(await readdir(join(base,'src'))).filter(n=>n.endsWith('.js')).map(n=>'src/'+n)])manifest.sources[variant][file]=hash(await readFile(join(base,file)));
}
await writeFile(join(out,'build-manifest.json'),JSON.stringify(manifest,null,2));console.log('Three review-only standalone prototypes built.');
