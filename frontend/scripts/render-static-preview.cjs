/*
 * Dependency-free STATIC initial-state browser QA renderer. It renders the real
 * TSX components to HTML with stubbed hooks, Next Link and Image. It does not
 * execute React/Next or represent production security, state, or API behavior.
 */
const fs=require('fs'),path=require('path');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})();
const frontend=path.resolve(__dirname,'..');
const cache=new Map();
const Fragment=Symbol('Fragment');
const create=(type,props={})=>({type,props});
const mockReact={
  useState(v){return [typeof v==='function'?v():v,()=>{}]},
  useMemo(fn){return fn()},
  useRef(v){return {current:v??null}},
  useEffect(){},
  useCallback(fn){return fn()},
  createElement(type,props,...children){return create(type,{...props,children:children.length===1?children[0]:children})}
};
const jsx={jsx:(type,props)=>create(type,props),jsxs:(type,props)=>create(type,props),Fragment};
function load(filepath){
  if(!path.extname(filepath)){if(fs.existsSync(filepath+'.tsx'))filepath+='.tsx';else if(fs.existsSync(filepath+'.ts'))filepath+='.ts';}
  filepath=path.resolve(filepath);
  if(cache.has(filepath))return cache.get(filepath).exports;
  const mod={exports:{}};cache.set(filepath,mod);
  const output=ts.transpileModule(fs.readFileSync(filepath,'utf8'),{fileName:filepath,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  const req=(target)=>{
    if(target==='react')return mockReact;
    if(target==='react/jsx-runtime')return jsx;
    if(target==='next/link')return {__esModule:true,default:({href,children,...props})=>create('a',{href,children,...props})};
    if(target==='next/image')return {__esModule:true,default:({src,alt,className,fill,...props})=>create('img',{src:src.replace(/^\/materials\//,'public/materials/'),alt,className,style:fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:undefined,...props})};
    if(target.startsWith('.'))return load(path.join(path.dirname(filepath),target));
    throw Error('Unsupported preview module: '+target);
  };
  new Function('require','module','exports',output)(req,mod,mod.exports);
  return mod.exports;
}
function escape(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function cssStyle(obj){return Object.entries(obj).map(([key,val])=>key.replace(/[A-Z]/g,s=>'-'+s.toLowerCase())+':'+(typeof val==='number'&&val!==0?`${val}px`:val)).join(';')}
function markup(node){
  if(node==null||typeof node==='boolean')return '';
  if(Array.isArray(node))return node.map(markup).join('');
  if(typeof node==='string'||typeof node==='number')return escape(node);
  if(node.type===Fragment)return markup(node.props.children);
  if(typeof node.type==='function')return markup(node.type(node.props));
  if(typeof node.type!=='string')return '';
  let tag=node.type;
  let attrs='';
  for(const [key,val] of Object.entries(node.props||{})){
    if(key==='children'||key.startsWith('on')||key==='ref'||key==='key'||val==null||typeof val==='function')continue;
    if(key==='suppressHydrationWarning')continue;
    const k=key==='className'?'class':key==='htmlFor'?'for':key;
    if(key==='style'&&typeof val==='object'){attrs+=' style="'+escape(cssStyle(val))+'"';continue;}
    if(typeof val==='boolean'){
      if(key.startsWith('aria-'))attrs+=' '+k+'="'+val+'"';
      else if(val)attrs+=' '+k;
      continue;
    }
    attrs+=' '+k+'="'+escape(val)+'"';
  }
  if(['img','input','br','hr','meta','link','source'].includes(tag))return `<${tag}${attrs}/>`;
  return `<${tag}${attrs}>${markup(node.props.children)}</${tag}>`;
}
const entrypoints={student:'StudentDashboard',reader:'ReaderExperience',admin:'AdminDashboard'};
for(const [name,component] of Object.entries(entrypoints)){
  const f=load(path.join(frontend,'components',component));
  const html=markup(create(f[component],{})).replace(/href="\/(reader|admin)"/g,(_,p)=>`href="${p}.html"`).replace(/href="\/"/g,'href="student.html"').replace(/href="\/#([^\"]+)"/g,(_,p)=>`href="student.html#${p}"`).replace(/href="\/admin#([^\"]+)"/g,(_,p)=>`href="admin.html#${p}"`);
  const doc=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>OYS E-Library ${name} static browser QA</title><link rel="stylesheet" href="app/globals.css"></head><body>${html}<script>/* Static layout snapshot only. React/Next interactions unavailable here. */</script></body></html>`;
  fs.writeFileSync(path.join(frontend,name+'.html'),doc);
  console.log(name+'.html generated from actual TSX markup; bytes '+doc.length);
}
// Make the Student Home the default offline preview.
fs.copyFileSync(path.join(frontend,'student.html'),path.join(frontend,'design-preview.html'));
