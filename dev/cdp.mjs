// Drive headless Chromium over the DevTools protocol: run steps, collect console errors, take screenshots.
import fs from "node:fs";
const [port, url, outDir, w, h, mobile] = process.argv.slice(2);
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") errors.push("EXC " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push("CONSOLE " + m.params.args.map(a => a.value ?? a.description).join(" "));
};
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({id: i, method, params})); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async expr => { const r = await send("Runtime.evaluate", {expression: expr, awaitPromise: true, returnByValue: true}); if (r.result?.exceptionDetails) errors.push("EVAL " + expr.slice(0, 60) + " -> " + (r.result.exceptionDetails.exception?.description || "")); return r.result?.result?.value; };
const shot = async name => { const r = await send("Page.captureScreenshot", {format: "png"}); fs.writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.result.data, "base64")); };
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {width: +w, height: +h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile});
if (mobile) await send("Emulation.setTouchEmulationEnabled", {enabled: true});
await send("Page.navigate", {url});
await sleep(9000);
const steps = JSON.parse(fs.readFileSync(`${outDir}/steps.json`, "utf8"));
for (const s of steps){
  if (s.js) { const v = await ev(s.js); if (s.log) console.log(s.log, JSON.stringify(v)); if (s.save) (await import("node:fs")).writeFileSync(s.save, String(v)); }
  if (s.clickjs){ const pt = await ev(s.clickjs); if (pt){ for (const type of ["mouseMoved","mousePressed","mouseReleased"]) await send("Input.dispatchMouseEvent", {type, x: pt.x, y: pt.y, button: "left", clickCount: 1}); } console.log("clicked", JSON.stringify(pt)); }
  if (s.dblclickjs){ const pt = await ev(s.dblclickjs); for (const n of [1, 2]){ for (const type of ["mousePressed","mouseReleased"]) await send("Input.dispatchMouseEvent", {type, x: pt.x, y: pt.y, button: "left", clickCount: n}); if (n === 1) await sleep(120); } console.log("dblclicked", JSON.stringify(pt)); }
  if (s.pinchjs){ const pt = await ev(s.pinchjs); const tp = (d) => [{x: pt.x - d, y: pt.y, id: 1}, {x: pt.x + d, y: pt.y, id: 2}]; await send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: tp(pt.from)}); for (let k = 1; k <= 12; k++){ await send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: tp(pt.from + (pt.to - pt.from) * k / 12)}); await sleep(30); } await send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []}); console.log("pinched", JSON.stringify(pt)); }
  if (s.dragjs){ const pt = await ev(s.dragjs); const steps = 12; await send("Input.dispatchMouseEvent", {type: "mouseMoved", x: pt.x, y: pt.y}); await send("Input.dispatchMouseEvent", {type: "mousePressed", x: pt.x, y: pt.y, button: "left", clickCount: 1}); for (let k = 1; k <= steps; k++){ await send("Input.dispatchMouseEvent", {type: "mouseMoved", x: pt.x + pt.dx * k / steps, y: pt.y + (pt.dy || 0) * k / steps, button: "left", buttons: 1}); await sleep(16); } await send("Input.dispatchMouseEvent", {type: "mouseReleased", x: pt.x + pt.dx, y: pt.y + (pt.dy || 0), button: "left", clickCount: 1}); console.log("dragged", JSON.stringify(pt)); }
  if (s.swipejs){ const pt = await ev(s.swipejs); const steps = 12; await send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x: pt.x, y: pt.y}]}); for (let k = 1; k <= steps; k++){ await send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x: pt.x + pt.dx * k / steps, y: pt.y + (pt.dy || 0) * k / steps}]}); await sleep(16); } await send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []}); console.log("swiped", JSON.stringify(pt)); }
  if (s.wait) await sleep(s.wait);
  if (s.shot) await shot(s.shot + (mobile ? "-m" : ""));
}
console.log("ERRORS:", errors.length ? "\n" + errors.join("\n") : "none");
ws.close(); process.exit(0);
