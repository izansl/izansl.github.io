(() => {
  // Crear el canvas y añadirlo al body
  let v = document.createElement("canvas");
  document.body.appendChild(v);

  let x = v.getContext("2d", { alpha: false }),
      p = devicePixelRatio || 1,
      b = document.createElement("canvas"),
      y = b.getContext("2d"),
      W, H;

  function R() {
    W = innerWidth * p;
    H = innerHeight * p;
    v.width = W;
    v.height = H;
    b.width = W * 2;
    b.height = H * 2;
  }
  R();
  onresize = R;

  // Configuración
  let st = {
    lim: 50,
    spawn: 0.02,
    col: "#ffffff",
    lineMulticolor: false,
    circleMulticolor: false,
    circleMode: "fill",
    circleColor: "#ffffff",
    lineGlow: true,
    glowStrength: 12,
    hideCircles: false,
    circleSize: 4,
    alwaysBranch: false,
    forwardBranchChance: 0.12,
    backBranchChance: 0.08,
    branchDensity: 2,
    timingPreset: "original",
    timing: "original",
    lockTilt: true,
    driftX: 155,
    driftY: 150
  };

  st.tr = [];
  st.jn = [];

  // Configuración de tiempos
  if (st.timing === "slow") {
    st.growTimeMin = 2200;
    st.growTimeMax = 3600;
    st.holdTimeMin = 1400;
    st.holdTimeMax = 2400;
    st.fadeTime = 1600;
  } else if (st.timing === "fast") {
    st.growTimeMin = 900;
    st.growTimeMax = 1500;
    st.holdTimeMin = 500;
    st.holdTimeMax = 900;
    st.fadeTime = 800;
  } else {
    st.growTimeMin = st.growTimeMin || 1500;
    st.growTimeMax = st.growTimeMax || 2500;
    st.holdTimeMin = st.holdTimeMin || 1000;
    st.holdTimeMax = st.holdTimeMax || 2000;
    st.fadeTime = st.fadeTime || 1200;
  }

  if (st.alwaysBranch && st.lim > 300) st.lim = 300;

  // Funciones de utilidades
  const RAD = Math.PI / 180,
        AL = [0, 45, 90, 135, 180, 225, 270, 315],
        AS = new Set(AL),
        TR = [45, 90],
        r = (a = 1, b = 0) => Math.random() * (a - b) + b,
        ch = a => a[(Math.random() * a.length) | 0],
        ND = d => ((d % 360) + 360) % 360,
        CB = () => 0.5 + (Math.random() - 0.5) * Math.random();

  function PT(base) {
    let c = new Set;
    for (let d of TR) {
      let a1 = ND(base + d),
          a2 = ND(base - d);
      if (AS.has(a1)) c.add(a1);
      if (AS.has(a2)) c.add(a2);
    }
    let a = [...c];
    return a.length ? ch(a) : base;
  }

  function mk(p, a) {
    let s = p || { x: CB() * b.width, y: CB() * b.height },
        bd = typeof a === "number" ? ND(a) : ch(AL),
        ba = bd * RAD,
        p1 = { x: s.x + Math.cos(ba) * r(80, 120), y: s.y + Math.sin(ba) * r(80, 120) },
        td = PT(bd),
        ta = td * RAD,
        p2 = { x: p1.x + Math.cos(ta) * r(80, 160), y: p1.y + Math.sin(ta) * r(80, 160) },
        p3 = { x: p2.x + Math.cos(ta) * r(100, 200), y: p2.y + Math.sin(ta) * r(100, 200) };

    return {
      pts: [s, p1, p2, p3],
      h: st.col || ch([170, 180, 190, 200]),
      b: performance.now(),
      dt: r(st.growTimeMax, st.growTimeMin),
      ht: r(st.holdTimeMax, st.holdTimeMin),
      ft: st.fadeTime,
      bs: 0,
      be: 0
    };
  }

  function L(a) {
    let l = 0;
    for (let i = 0; i < a.length - 1; i++) {
      l += Math.hypot(a[i + 1].x - a[i].x, a[i + 1].y - a[i].y);
    }
    return l;
  }

  function DOT(xc, yc, R, al, end) {
    if (st.circleMode === "none" || st.hideCircles) return;
    let sc = st.circleColor;
    if (st.circleMulticolor) {
      let h = end ? (Date.now() / 20) % 360 : (Date.now() / 10) % 360;
      sc = `hsla(${h},90%,60%,${al})`;
    }
    if (st.circleMode === "fill" || st.circleMode === "both") {
      y.fillStyle = sc;
      y.beginPath();
      y.arc(xc, yc, R, 0, 7);
      y.fill();
    }
    if (st.circleMode === "stroke" || st.circleMode === "both") {
      y.globalCompositeOperation = "destination-out";
      y.beginPath();
      y.arc(xc, yc, R - 1.5 * p, 0, 7);
      y.fill();
      y.globalCompositeOperation = "source-over";
      y.strokeStyle = sc;
      y.lineWidth = 1.5 * p;
      y.beginPath();
      y.arc(xc, yc, R, 0, 7);
      y.stroke();
    }
  }

  function DR(t, n) {
    let A = n - t.b,
        PL = L(t.pts),
        al = 1,
        pct = 0;

    if (A < t.dt) {
      pct = A / t.dt;
      al = pct;
    } else if (A < t.dt + t.ht) {
      pct = 1;
    } else if (A < t.dt + t.ht + t.ft) {
      pct = 1;
      al = 1 - (A - t.dt - t.ht) / t.ft;
    } else {
      t.d = 1;
      return;
    }

    al *= .8;
    let DL = PL * pct,
        ls = st.lineMulticolor ? `hsla(${(Date.now() / 15) % 360},100%,60%,${al})` : st.col || `hsla(${t.h},70%,70%,${al})`;

    y.strokeStyle = ls;
    y.lineWidth = 1.5 * p;
    y.lineCap = "round";

    if (st.lineGlow) {
      y.shadowBlur = st.glowStrength * p;
      y.shadowColor = ls;
    } else {
      y.shadowBlur = 0;
      y.shadowColor = "transparent";
    }

    y.beginPath();
    y.moveTo(t.pts[0].x, t.pts[0].y);

    let rem = DL;
    for (let i = 0; i < t.pts.length - 1; i++) {
      let A = t.pts[i], B = t.pts[i + 1],
          SL = Math.hypot(B.x - A.x, B.y - A.y);

      if (rem >= SL) {
        y.lineTo(B.x, B.y);
        rem -= SL;
      } else {
        let q = rem / SL;
        y.lineTo(A.x + (B.x - A.x) * q, A.y + (B.y - A.y) * q);
        break;
      }
    }
    y.stroke();

    if (!st.hideCircles) DOT(t.pts[0].x, t.pts[0].y, st.circleSize * p, al, false);

    if (pct >= 1) {
      if (!st.hideCircles) DOT(t.pts[3].x, t.pts[3].y, st.circleSize * p, al, true);

      let F = st.alwaysBranch || Math.random() < st.forwardBranchChance;
      if (!t.be && st.tr.length < st.lim && F) {
        t.be = 1;
        let dx = t.pts[3].x - t.pts[2].x,
            dy = t.pts[3].y - t.pts[2].y,
            parent = ND(Math.atan2(dy, dx) * 180 / Math.PI),
            used = new Set;

        for (let k = 0; k < st.branchDensity; k++) {
          let cand = PT(parent);
          if (cand === parent) continue;
          if (used.has(cand)) continue;
          used.add(cand);
          st.tr.push(mk(t.pts[3], cand));
          if (st.tr.length >= st.lim) break;
        }
      }

      let Bk = st.alwaysBranch || Math.random() < st.backBranchChance;
      if (!t.bs && st.tr.length < st.lim && Bk) {
        t.bs = 1;
        let dx = t.pts[1].x - t.pts[0].x,
            dy = t.pts[1].y - t.pts[0].y,
            parent = ND((Math.atan2(dy, dx) * 180 / Math.PI) + 180),
            used = new Set;

        for (let k = 0; k < st.branchDensity; k++) {
          let cand = PT(parent);
          if (cand === parent) continue;
          if (used.has(cand)) continue;
          used.add(cand);
          st.tr.push(mk(t.pts[0], cand));
          if (st.tr.length >= st.lim) break;
        }
      }
    }
  }

  function CAM(n) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = "#000";
    x.fillRect(0, 0, W, H);

    let px = Math.sin(n * .0002) * 155,
        py = Math.cos(n * .00015) * 150,
        rot = 0,
        z = 1.08 + .04 * Math.sin(n * .0001);

    x.translate(W / 2, H / 2);
    x.rotate(rot);
    x.scale(z, z);
    x.translate(-b.width / 2 + px, -b.height / 2 + py);
  }

  function LOOP(n) {
    y.setTransform(1, 0, 0, 1, 0, 0);
    y.clearRect(0, 0, b.width, b.height);

    if (Math.random() < 0.02 && st.tr.length < st.lim) st.tr.push(mk());

    for (let i = st.tr.length - 1; i >= 0; i--) {
      DR(st.tr[i], n);
      if (st.tr[i].d) st.tr.splice(i, 1);
    }

    CAM(n);
    x.drawImage(b, 0, 0);
    requestAnimationFrame(LOOP);
  }

  requestAnimationFrame(LOOP);
})();
