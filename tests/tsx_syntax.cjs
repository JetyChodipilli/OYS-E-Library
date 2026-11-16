// Real TypeScript parser for TS/TSX syntax, independent of npm installation.
// Does not typecheck React/Next dependencies.
const fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const root=path.resolve(__dirname,'../frontend');
let errors=0,count=0;
function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,item.name);
  if(item.isDirectory())scan(full);
  else if(/\.tsx?$/.test(item.name)){
    const src=fs.readFileSync(full,'utf8');
    const kind=item.name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
    const ast=ts.createSourceFile(full,src,ts.ScriptTarget.Latest,true,kind);
    count++;
    for(const diag of ast.parseDiagnostics){errors++;console.error(full,ts.flattenDiagnosticMessageText(diag.messageText,' '));}
  }
}}
for(const folder of ['components','app','lib'])scan(path.join(root,folder));
console.log(`TS/TSX parsed: ${count} files; syntax errors: ${errors}`);
process.exitCode=errors?1:0;
