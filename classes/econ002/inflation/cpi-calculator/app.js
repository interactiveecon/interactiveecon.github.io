window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    basketBody: $("basketBody"),
    addRowBtn: $("addRowBtn"),
    exampleBtn: $("exampleBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),

    subToggle: $("subToggle"),
    subSection: $("subSection"),
    subTableWrap: $("subTableWrap"),
    subResults: $("subResults"),

    warn: $("warn"),

    cost0: $("cost0"),
    cost1: $("cost1"),
    cost2: $("cost2"),
    cpi0: $("cpi0"),
    cpi1: $("cpi1"),
    cpi2: $("cpi2"),
    pi01: $("pi01"),
    pi12: $("pi12"),
    pi02: $("pi02"),

    paasche20: $("paasche20"),
    lasp20: $("lasp20"),
    diff20: $("diff20"),

    chart: $("chart"),
  };

  function setStatus(msg){ els.status.textContent = msg; }

  // Data model
  let rows = [];
  let subQ2 = {}; // id -> q2

  function uid(){ return "g" + Math.random().toString(16).slice(2,10); }

  function fmtMoney(x){
    if (!Number.isFinite(x)) return "—";
    return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtIndex(x){
    if (!Number.isFinite(x)) return "—";
    return x.toFixed(2);
  }
  function fmtPct(x){
    if (!Number.isFinite(x)) return "—";
    return (100*x).toFixed(2) + "%";
  }

  function num(v){
    const x = Number(v);
    return Number.isFinite(x) ? x : NaN;
  }

  function addRow(initial = { name:"", q0:1, p0:1, p1:1, p2:1 }){
    const id = uid();
    rows.push({ id, ...initial });
    if (!(id in subQ2)) subQ2[id] = initial.q0 ?? 1;
    render();
    compute();
  }

  function removeRow(id){
    rows = rows.filter(r => r.id !== id);
    delete subQ2[id];
    render();
    compute();
  }

  function loadExample(){
    rows = [];
    subQ2 = {};
    // A simple “apples + cars” style example; edit freely
    addRow({ name:"Apples", q0: 10, p0: 1.00, p1: 1.20, p2: 1.10 });
    addRow({ name:"Haircuts", q0: 2, p0: 20.00, p1: 22.00, p2: 24.00 });
    addRow({ name:"Used laptop", q0: 1, p0: 500.00, p1: 520.00, p2: 480.00 });
    setStatus("Example loaded.");
  }

  function reset(){
    rows = [];
    subQ2 = {};
    addRow({ name:"Good A", q0: 5, p0: 2.00, p1: 2.20, p2: 2.40 });
    addRow({ name:"Good B", q0: 3, p0: 10.00, p1: 9.50, p2: 11.00 });
    setStatus("Reset.");
  }

  function render(){
    els.basketBody.innerHTML = "";
    for (const r of rows){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input class="tinput" data-k="name" data-id="${r.id}" value="${escapeHtml(r.name)}" placeholder="e.g., Bread"></td>
        <td><input class="tinput small center" data-k="q0" data-id="${r.id}" type="number" step="0.01" value="${r.q0}"></td>
        <td><input class="tinput small center" data-k="p0" data-id="${r.id}" type="number" step="0.01" value="${r.p0}"></td>
        <td><input class="tinput small center" data-k="p1" data-id="${r.id}" type="number" step="0.01" value="${r.p1}"></td>
        <td><input class="tinput small center" data-k="p2" data-id="${r.id}" type="number" step="0.01" value="${r.p2}"></td>
        <td>
          <button class="btn subtle" data-del="${r.id}" type="button">Remove</button>
        </td>
      `;
      els.basketBody.appendChild(tr);
    }

    // wire inputs
    els.basketBody.querySelectorAll("input[data-id]").forEach(inp => {
      inp.addEventListener("input", () => {
        const id = inp.dataset.id;
        const k = inp.dataset.k;
        const row = rows.find(x => x.id === id);
        if (!row) return;
        if (k === "name") row[k] = inp.value;
        else row[k] = num(inp.value);
        // keep sub Q2 default aligned when toggled on
        if (!(id in subQ2) || !Number.isFinite(subQ2[id])) subQ2[id] = row.q0;
        compute();
      });
    });

    els.basketBody.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", () => removeRow(btn.dataset.del));
    });

    renderSubTable();
  }

  function renderSubTable(){
    els.subTableWrap.innerHTML = "";
    if (!els.subToggle.checked) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <table aria-label="Year 2 quantities table">
        <thead>
          <tr>
            <th style="width:45%;">Good</th>
            <th style="width:25%;">Q0 (base)</th>
            <th style="width:30%;">Q2 (current)</th>
          </tr>
        </thead>
        <tbody id="q2Body"></tbody>
      </table>
    `;
    els.subTableWrap.appendChild(wrap);

    const q2Body = wrap.querySelector("#q2Body");
    for (const r of rows){
      if (!(r.id in subQ2)) subQ2[r.id] = r.q0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(r.name || "Untitled")}</td>
        <td><span class="muted">${Number.isFinite(r.q0) ? r.q0 : "—"}</span></td>
        <td><input class="tinput small center" data-q2="${r.id}" type="number" step="0.01" value="${subQ2[r.id]}"></td>
      `;
      q2Body.appendChild(tr);
    }

    q2Body.querySelectorAll("input[data-q2]").forEach(inp => {
      inp.addEventListener("input", () => {
        const id = inp.dataset.q2;
        subQ2[id] = num(inp.value);
        compute();
      });
    });
  }

  function compute(){
    // validate
    if (rows.length === 0){
      els.warn.textContent = "Add at least one good.";
      return;
    }

    const bad = rows.some(r => !(Number.isFinite(r.q0) && Number.isFinite(r.p0) && Number.isFinite(r.p1) && Number.isFinite(r.p2)));
    els.warn.textContent = bad ? "Some entries are missing or invalid. Results may show —." : "";

    const cost0 = sumCost(rows, (r)=>r.p0, (r)=>r.q0);
    const cost1 = sumCost(rows, (r)=>r.p1, (r)=>r.q0);
    const cost2 = sumCost(rows, (r)=>r.p2, (r)=>r.q0);

    const cpi0 = Number.isFinite(cost0) && cost0 !== 0 ? 100 : NaN;
    const cpi1 = Number.isFinite(cost0) && cost0 !== 0 ? 100 * cost1 / cost0 : NaN;
    const cpi2 = Number.isFinite(cost0) && cost0 !== 0 ? 100 * cost2 / cost0 : NaN;

    els.cost0.textContent = fmtMoney(cost0);
    els.cost1.textContent = fmtMoney(cost1);
    els.cost2.textContent = fmtMoney(cost2);

    els.cpi0.textContent = fmtIndex(cpi0);
    els.cpi1.textContent = fmtIndex(cpi1);
    els.cpi2.textContent = fmtIndex(cpi2);

    els.pi01.textContent = (Number.isFinite(cpi1) && cpi0 !== 0) ? fmtPct((cpi1 - cpi0)/cpi0) : "—";
    els.pi12.textContent = (Number.isFinite(cpi2) && Number.isFinite(cpi1) && cpi1 !== 0) ? fmtPct((cpi2 - cpi1)/cpi1) : "—";
    els.pi02.textContent = (Number.isFinite(cpi2) && cpi0 !== 0) ? fmtPct((cpi2 - cpi0)/cpi0) : "—";

    // substitution panel
    if (els.subToggle.checked){
      els.subResults.style.display = "";
      const cost0_q0 = cost0;
      const cost2_q0 = cost2;

      const cost0_q2 = sumCost(rows, (r)=>r.p0, (r)=>subQ2[r.id]);
      const cost2_q2 = sumCost(rows, (r)=>r.p2, (r)=>subQ2[r.id]);

      const lasp20 = (Number.isFinite(cost0_q0) && cost0_q0 !== 0) ? 100 * cost2_q0 / cost0_q0 : NaN; // fixed basket
      const paasche20 = (Number.isFinite(cost0_q2) && cost0_q2 !== 0) ? 100 * cost2_q2 / cost0_q2 : NaN; // current basket (Paasche-style)

      els.lasp20.textContent = fmtIndex(lasp20);
      els.paasche20.textContent = fmtIndex(paasche20);

      if (Number.isFinite(lasp20) && Number.isFinite(paasche20)){
        els.diff20.textContent = (lasp20 - paasche20).toFixed(2);
      } else {
        els.diff20.textContent = "—";
      }
    } else {
      els.subResults.style.display = "none";
    }

    drawChart([cpi0, cpi1, cpi2]);
  }

  function sumCost(rows, priceFn, qtyFn){
    let s = 0;
    for (const r of rows){
      const p = priceFn(r);
      const q = qtyFn(r);
      if (!Number.isFinite(p) || !Number.isFinite(q)) return NaN;
      s += p*q;
    }
    return s;
  }

  function drawChart(cpi){
    const canvas = els.chart;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){
      canvas.width = W; canvas.height = H;
    }
    ctx.clearRect(0,0,W,H);

    const pad = { l: 44*dpr, r: 16*dpr, t: 14*dpr, b: 34*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const xToPix = (i) => X0 + i * (X1 - X0) / 2;

    const vals = cpi.filter(Number.isFinite);
    const yMin = 90;
    const yMax = vals.length ? Math.max(110, Math.max(...vals) + 10) : 120;

    const yToPix = (y) => Y0 + (yMax - y) * (Y1 - Y0) / (yMax - yMin);

    // grid
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let k=0;k<=5;k++){
      const y = yMin + k*(yMax-yMin)/5;
      const py = yToPix(y);
      ctx.beginPath(); ctx.moveTo(X0,py); ctx.lineTo(X1,py); ctx.stroke();
    }

    // y labels
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let k=0;k<=5;k++){
      const y = yMin + k*(yMax-yMin)/5;
      ctx.fillText(y.toFixed(0), X0 - 8*dpr, yToPix(y));
    }

    // x labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ["Year 0","Year 1","Year 2"].forEach((lab,i)=>{
      ctx.fillText(lab, xToPix(i), Y1 + 8*dpr);
    });

    // line
    const ok = cpi.every(Number.isFinite);
    if (!ok) return;

    ctx.strokeStyle = "rgba(31,119,180,0.85)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<3;i++){
      const x = xToPix(i);
      const y = yToPix(cpi[i]);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // points
    ctx.fillStyle = "rgba(31,119,180,0.85)";
    for (let i=0;i<3;i++){
      const x = xToPix(i);
      const y = yToPix(cpi[i]);
      ctx.beginPath(); ctx.arc(x,y,5*dpr,0,Math.PI*2); ctx.fill();
    }
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  // Events
  els.addRowBtn.addEventListener("click", () => addRow());
  els.exampleBtn.addEventListener("click", loadExample);
  els.resetBtn.addEventListener("click", reset);

  els.subToggle.addEventListener("change", () => {
    els.subSection.style.display = els.subToggle.checked ? "" : "none";
    renderSubTable();
    compute();
  });

  // Typeset formulas once
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // Start
  reset();
});
