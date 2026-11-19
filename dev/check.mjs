// Checks a split into ordered classic scripts:
// 1. every file parses on its own;
// 2. code that runs while a file loads never reaches (directly or through functions it calls)
//    a name declared in a LATER file — that worked in one big script thanks to hoisting, but not across files.
import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";
import * as walk from "acorn-walk";
const root = process.argv[2];
const order = [...fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="js\/([^?"]+)/g)].map(m => m[1]);
const fileOf = new Map();       // top-level name -> file index
const fnBody = new Map();       // function name -> node
const progs = order.map((f, i) => {
  const src = fs.readFileSync(path.join(root, "js", f), "utf8");
  let ast;
  try { ast = acorn.parse(src, {ecmaVersion: "latest", sourceType: "script", locations: true}); }
  catch (e){ console.log("PARSE ERROR", f, e.message); process.exit(1); }
  for (const st of ast.body){
    if (st.type === "FunctionDeclaration"){ fileOf.set(st.id.name, i); fnBody.set(st.id.name, st); }
    else if (st.type === "ClassDeclaration") fileOf.set(st.id.name, i);
    else if (st.type === "VariableDeclaration") for (const d of st.declarations){
      const names = []; collect(d.id, names);
      for (const n of names){ if (fileOf.has(n)) console.log("DUPLICATE", n, f); fileOf.set(n, i); }
      if (d.id.type === "Identifier" && d.init && /FunctionExpression|ArrowFunctionExpression/.test(d.init.type)) fnBody.set(d.id.name, d.init);
    }
  }
  return {f, ast};
});
function collect(p, out){ if (!p) return; if (p.type === "Identifier") out.push(p.name); else if (p.type === "ObjectPattern") p.properties.forEach(q => collect(q.value || q.argument, out)); else if (p.type === "ArrayPattern") p.elements.forEach(q => collect(q, out)); else if (p.type === "AssignmentPattern") collect(p.left, out); else if (p.type === "RestElement") collect(p.argument, out); }
// identifiers a node uses right away (not inside functions it only defines), plus called IIFEs
function eagerIds(node){
  const ids = new Set();
  walk.recursive(node, null, {
    Identifier(n){ ids.add(n.name); },
    FunctionExpression(){}, ArrowFunctionExpression(){}, FunctionDeclaration(){},
    CallExpression(n, st, c){
      if (/FunctionExpression|ArrowFunctionExpression/.test(n.callee.type)) c(n.callee.body, st); else c(n.callee, st);
      // a handler given to addEventListener only runs on a later event, after every file has loaded
      const later = n.callee.type === "MemberExpression" && /^(add|remove)EventListener$/.test(n.callee.property.name);
      // setTimeout(fn, 1000+) runs well after every file has loaded
      const delayed = n.callee.type === "Identifier" && /^set(Timeout|Interval)$/.test(n.callee.name) && n.arguments[1] && n.arguments[1].type === "Literal" && n.arguments[1].value >= 1000;
      n.arguments.forEach((a, i) => { if (!((later || (delayed && i === 0)) && a.type === "Identifier")) c(a, st); });
    },
    // el.onclick = fn only stores the handler
    AssignmentExpression(n, st, c){
      const handler = n.left.type === "MemberExpression" && !n.left.computed && /^on[a-z]+$/.test(n.left.property.name) && n.right.type === "Identifier";
      c(n.left, st); if (!handler) c(n.right, st);
    },
    MemberExpression(n, st, c){ c(n.object, st); if (n.computed) c(n.property, st); },
    Property(n, st, c){ if (n.computed) c(n.key, st); c(n.value, st); },
    PropertyDefinition(){},
  }, walk.base);
  return ids;
}
// everything a function might use when called (all identifiers inside it, nested callbacks included)
const allIdsCache = new Map();
function allIds(name){
  if (allIdsCache.has(name)) return allIdsCache.get(name);
  const ids = new Set(); allIdsCache.set(name, ids);
  walk.full(fnBody.get(name), n => { if (n.type === "Identifier") ids.add(n.name); });
  return ids;
}
let problems = 0;
progs.forEach(({f, ast}, i) => {
  for (const st of ast.body){
    if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") continue;
    const start = eagerIds(st), seen = new Set(), stack = [...start].map(n => [n, [n]]);
    while (stack.length){
      const [n, trail] = stack.pop();
      if (seen.has(n)) continue; seen.add(n);
      if (fileOf.has(n) && fileOf.get(n) > i){ problems++; console.log(`LATER  ${f}:${st.loc.start.line} uses ${trail.join(" → ")} (declared in ${order[fileOf.get(n)]})`); continue; }
      if (fnBody.has(n)) for (const m of allIds(n)) if (!seen.has(m)) stack.push([m, [...trail, m]]);
    }
  }
});
console.log(problems ? problems + " possible problems" : "OK: nothing runs ahead of its file");
