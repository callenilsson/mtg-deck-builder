// Lists every top-level statement of every script (in load order) with its names and size.
// Usage: node dev/inventory.mjs [root] [--json]
import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";
const root = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const order = [...fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="js\/([^?"]+)/g)].map(m => m[1]);
const out = [];
for (const f of order){
  const src = fs.readFileSync(path.join(root, "js", f), "utf8");
  const ast = acorn.parse(src, {ecmaVersion: "latest", sourceType: "script", locations: true});
  ast.body.forEach((st, i) => {
    if (st.type === "ExpressionStatement" && st.directive) return;
    let names = [];
    if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") names = [st.id.name];
    else if (st.type === "VariableDeclaration") names = st.declarations.map(d => d.id.name || "{…}");
    const lines = st.loc.end.line - st.loc.start.line + 1;
    out.push({f, i, line: st.loc.start.line, lines, kind: st.type.replace("Declaration", "").replace("Statement", ""), names, preview: names.length ? "" : src.slice(st.start, st.start + 70).replace(/\s+/g, " ")});
  });
}
if (process.argv.includes("--json")) console.log(JSON.stringify(out));
else for (const s of out) console.log(`${s.f}:${s.line} (${s.lines}) ${s.kind} ${s.names.join(",") || s.preview}`);
