(function () {
  const state = {
    structure: "double-cone",
    temp: 100,
    gap: 14,
    barrier: 18,
    bias: 0.22,
    equilibrium: false,
    trails: true,
    running: true,
    forwardEvents: 0,
    backwardEvents: 0,
    tick: 0,
    statCase: "chapter2"
  };

  const particles = [];
  const trailPoints = [];
  const statsCases = {
    chapter2: {
      title: "第二章双锥小口",
      forwardLabel: "小口出去",
      backwardLabel: "小口进入",
      forward: 814,
      backward: 761
    },
    "chapter3-small": {
      title: "第三章锥管小口",
      forwardLabel: "小口出去",
      backwardLabel: "小口进入",
      forward: 5245,
      backward: 5205
    },
    "chapter3-large": {
      title: "第三章锥管大口",
      forwardLabel: "大口进入",
      backwardLabel: "大口出去",
      forward: 832,
      backward: 750
    }
  };

  const palette = {
    ink: "#17201c",
    muted: "#5c6a62",
    line: "#d7ddd7",
    paper: "#fbfcf8",
    teal: "#177e89",
    coral: "#d45b49",
    amber: "#d89a27",
    green: "#4f8c4b",
    violet: "#7357a4",
    carbon: "#29342f",
    argon: "#e99f36"
  };

  function $(id) {
    return document.getElementById(id);
  }

  const els = {
    particleCanvas: $("particle-canvas"),
    geometryCanvas: $("geometry-canvas"),
    pathCanvas: $("path-canvas"),
    temp: $("temp"),
    gap: $("gap"),
    barrier: $("barrier"),
    bias: $("bias"),
    equilibrium: $("equilibrium"),
    trails: $("trails"),
    play: $("play"),
    reset: $("reset"),
    tempValue: $("temp-value"),
    gapValue: $("gap-value"),
    barrierValue: $("barrier-value"),
    biasValue: $("bias-value"),
    hudMode: $("hud-mode"),
    hudFlux: $("hud-flux"),
    hudBalance: $("hud-balance"),
    forwardRate: $("forward-rate"),
    backwardRate: $("backward-rate"),
    netRate: $("net-rate"),
    zScore: $("z-score")
  };

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(260, Math.floor(rect.height || 300));
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return { width, height };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function biasValue() {
    return state.equilibrium ? 0 : state.bias;
  }

  function rates() {
    const kT = 0.0861733 * state.temp;
    const optimumGap = state.structure === "cone-tube" ? 12.6 : 14;
    const gapPenalty = Math.abs(state.gap - optimumGap) / 8.5;
    const gapFactor = clamp(1 - gapPenalty * gapPenalty, 0.16, 1.05);
    const geometryGain = state.structure === "cone-tube" ? 1.45 : 1.0;
    const thermal = Math.exp(-state.barrier / Math.max(3.5, kT * 1.6));
    const b = biasValue();
    const base = 16 * geometryGain * gapFactor * thermal;
    const forward = base * Math.exp(1.55 * b);
    const backward = base * Math.exp(-1.55 * b);
    const net = forward - backward;
    const totalEvents = Math.max(1, state.forwardEvents + state.backwardEvents);
    const z = (state.forwardEvents - state.backwardEvents) / Math.sqrt(totalEvents);
    return { forward, backward, net, z, kT, gapFactor };
  }

  function seedParticles() {
    particles.length = 0;
    for (let i = 0; i < 92; i += 1) {
      particles.push({
        x: Math.random(),
        y: 0.35 + Math.random() * 0.3,
        vx: (Math.random() - 0.5) * 0.006,
        vy: (Math.random() - 0.5) * 0.006,
        side: Math.random() < 0.52 ? 1 : -1,
        phase: Math.random() * Math.PI * 2,
        hot: Math.random() < 0.16
      });
    }
  }

  function sampleEvents(dt) {
    const r = rates();
    const scale = dt * 0.055;
    if (Math.random() < r.forward * scale) {
      state.forwardEvents += 1;
      addTrail(0.46, 0.48, 0.62, 0.38, palette.teal);
    }
    if (Math.random() < r.backward * scale) {
      state.backwardEvents += 1;
      addTrail(0.62, 0.38, 0.46, 0.48, palette.coral);
    }
  }

  function addTrail(x1, y1, x2, y2, color) {
    trailPoints.push({
      x1,
      y1,
      x2,
      y2,
      color,
      life: 1
    });
    if (trailPoints.length > 90) trailPoints.shift();
  }

  function updateParticles(dt) {
    const r = rates();
    const b = biasValue();
    particles.forEach((p) => {
      const brown = Math.sqrt(state.temp / 100) * 0.0029;
      const drift = 0.0015 * b + 0.0006 * Math.sin(state.tick * 0.014 + p.phase);
      const centerPull = (0.5 - p.y) * 0.018;
      const channelWidth = state.structure === "cone-tube" ? 0.2 : 0.16;
      p.vx += (Math.random() - 0.5) * brown + drift;
      p.vy += (Math.random() - 0.5) * brown + centerPull * 0.02;
      if (Math.abs(p.x - 0.52) < 0.08) {
        p.vx += (r.gapFactor - 0.5) * 0.0007 * p.side;
        p.vy += (Math.random() - 0.5) * 0.0025;
      }
      p.x += p.vx * dt * 44;
      p.y += p.vy * dt * 44;
      p.vx *= 0.965;
      p.vy *= 0.965;
      const top = 0.5 - channelWidth - 0.04 * Math.cos((p.x - 0.5) * Math.PI);
      const bottom = 0.5 + channelWidth + 0.04 * Math.cos((p.x - 0.5) * Math.PI);
      if (p.y < top) {
        p.y = top;
        p.vy = Math.abs(p.vy) * 0.6;
      }
      if (p.y > bottom) {
        p.y = bottom;
        p.vy = -Math.abs(p.vy) * 0.6;
      }
      if (p.x > 1.05) {
        p.x = -0.03;
        p.y = 0.44 + Math.random() * 0.12;
        p.vx = 0.002 + Math.random() * 0.004;
      }
      if (p.x < -0.05) {
        p.x = 1.03;
        p.y = 0.44 + Math.random() * 0.12;
        p.vx = -0.002 - Math.random() * 0.004;
      }
    });
    trailPoints.forEach((t) => {
      t.life -= dt * 0.9;
    });
    for (let i = trailPoints.length - 1; i >= 0; i -= 1) {
      if (trailPoints[i].life <= 0) trailPoints.splice(i, 1);
    }
  }

  function drawDevice(ctx, width, height, alpha) {
    const midY = height * 0.5;
    const gapPx = (state.gap - 7) * 4.4;
    const wall = 26;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (state.structure === "double-cone") {
      const left = width * 0.08;
      const right = width * 0.92;
      const neck = width * 0.55;
      ctx.fillStyle = palette.carbon;
      ctx.beginPath();
      ctx.moveTo(left, midY - gapPx - 110);
      ctx.quadraticCurveTo(width * 0.34, midY - gapPx - 74, neck, midY - gapPx - 18);
      ctx.quadraticCurveTo(width * 0.74, midY - gapPx - 46, right, midY - gapPx - 70);
      ctx.lineTo(right, midY - gapPx - 70 - wall);
      ctx.quadraticCurveTo(width * 0.72, midY - gapPx - 72, neck, midY - gapPx - 44);
      ctx.quadraticCurveTo(width * 0.31, midY - gapPx - 124, left, midY - gapPx - 148);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(left, midY + gapPx + 110);
      ctx.quadraticCurveTo(width * 0.34, midY + gapPx + 74, neck, midY + gapPx + 18);
      ctx.quadraticCurveTo(width * 0.74, midY + gapPx + 46, right, midY + gapPx + 70);
      ctx.lineTo(right, midY + gapPx + 70 + wall);
      ctx.quadraticCurveTo(width * 0.72, midY + gapPx + 72, neck, midY + gapPx + 44);
      ctx.quadraticCurveTo(width * 0.31, midY + gapPx + 124, left, midY + gapPx + 148);
      ctx.closePath();
      ctx.fill();
      drawLabel(ctx, "马鞍势垒", neck - 26, midY - gapPx - 6, palette.coral);
      drawLabel(ctx, "A 侧势阱", width * 0.31, midY + gapPx + 40, palette.teal);
      drawLabel(ctx, "B 侧势阱", width * 0.69, midY - gapPx - 40, palette.amber);
    } else {
      const left = width * 0.08;
      const right = width * 0.92;
      ctx.fillStyle = palette.carbon;
      ctx.beginPath();
      ctx.moveTo(left, midY - gapPx - 118);
      ctx.lineTo(right, midY - gapPx - 64);
      ctx.lineTo(right, midY - gapPx - 92);
      ctx.lineTo(left, midY - gapPx - 158);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(left, midY + gapPx + 118);
      ctx.lineTo(right, midY + gapPx + 64);
      ctx.lineTo(right, midY + gapPx + 92);
      ctx.lineTo(left, midY + gapPx + 158);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#38453e";
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.moveTo(width * 0.28, midY + 18);
      ctx.lineTo(width * 0.95, midY - 22);
      ctx.stroke();
      ctx.strokeStyle = "#516058";
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(width * 0.28, midY + 18);
      ctx.lineTo(width * 0.95, midY - 22);
      ctx.stroke();
      drawLabel(ctx, "A 点窄间隙", width * 0.36, midY - 78, palette.coral);
      drawLabel(ctx, "B 点扩散通道", width * 0.67, midY + 72, palette.teal);
    }
    ctx.restore();
  }

  function drawLabel(ctx, text, x, y, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawParticles() {
    const canvas = els.particleCanvas;
    const ctx = canvas.getContext("2d");
    const { width, height } = resizeCanvas(canvas);
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#fbfcf8");
    bg.addColorStop(0.55, "#edf5ee");
    bg.addColorStop(1, "#fff7ec");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height);
    drawDevice(ctx, width, height, 0.96);

    if (state.trails) {
      trailPoints.forEach((t) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, t.life) * 0.7;
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.moveTo(t.x1 * width, t.y1 * height);
        ctx.quadraticCurveTo(width * 0.52, height * 0.38, t.x2 * width, t.y2 * height);
        ctx.stroke();
        ctx.restore();
      });
    }

    particles.forEach((p) => {
      const x = p.x * width;
      const y = p.y * height;
      const radius = p.hot ? 4.2 : 3.2;
      ctx.save();
      ctx.globalAlpha = p.hot ? 0.95 : 0.78;
      ctx.fillStyle = p.hot ? palette.coral : palette.argon;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(23, 32, 28, 0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawGrid(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = "rgba(23,32,28,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGeometry() {
    const canvas = els.geometryCanvas;
    const ctx = canvas.getContext("2d");
    const { width, height } = resizeCanvas(canvas);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f7faf6";
    ctx.fillRect(0, 0, width, height);
    drawDevice(ctx, width, height, 0.94);
    ctx.save();
    ctx.fillStyle = "rgba(23,126,137,0.14)";
    ctx.strokeStyle = palette.teal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.5, width * 0.2, Math.max(28, state.gap * 3.2), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = palette.muted;
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillText(`层间距 ${state.gap.toFixed(1)} Å`, 18, 28);
    ctx.fillText(state.structure === "double-cone" ? "旋转对称嵌套" : "偏心锥管渐变", 18, 50);
    ctx.restore();
  }

  function drawPathCanvas() {
    const canvas = els.pathCanvas;
    const ctx = canvas.getContext("2d");
    const { width, height } = resizeCanvas(canvas);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f7faf6";
    ctx.fillRect(0, 0, width, height);
    const y = height * 0.5;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#dce5dc";
    ctx.beginPath();
    ctx.moveTo(width * 0.08, y);
    ctx.bezierCurveTo(width * 0.25, y - 90, width * 0.42, y + 86, width * 0.58, y);
    ctx.bezierCurveTo(width * 0.72, y - 70, width * 0.84, y - 38, width * 0.94, y - 12);
    ctx.stroke();
    arrowPath(ctx, width * 0.08, y, width * 0.94, y - 12, palette.teal, "有效路径：大口 → 重叠区 → 小口外");
    arrowPath(ctx, width * 0.72, y - 48, width * 0.86, y - 48, palette.coral, "局部往返：不计作泵送");
    ctx.strokeStyle = palette.coral;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width * 0.78, y - 80);
    ctx.lineTo(width * 0.78, y + 75);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = palette.coral;
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillText("统计面", width * 0.78 + 8, y + 70);
  }

  function arrowPath(ctx, x1, y1, x2, y2, color, label) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 80, x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - (y1 - 50), x2 - (x1 + x2) / 2);
    ctx.translate(x2, y2);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -6);
    ctx.lineTo(-12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillText(label, x1 + 10, y1 - 76);
    ctx.restore();
  }

  function drawPotentialPlot() {
    const node = d3.select("#potential-plot");
    node.selectAll("*").remove();
    const rect = node.node().getBoundingClientRect();
    const width = Math.max(360, rect.width);
    const height = 300;
    const margin = { top: 18, right: 24, bottom: 38, left: 48 };
    const svg = node.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const data = d3.range(0, 1.001, 0.01).map((s) => {
      const leftWell = -15 * Math.exp(-Math.pow((s - 0.28) / 0.15, 2));
      const rightWell = -12 * Math.exp(-Math.pow((s - 0.72) / 0.16, 2));
      const saddle = state.barrier * Math.exp(-Math.pow((s - 0.52) / 0.09, 2));
      const tilt = -biasValue() * 22 * (s - 0.5);
      return { s, f: leftWell + rightWell + saddle + tilt };
    });
    const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    const y = d3.scaleLinear().domain([d3.min(data, (d) => d.f) - 4, d3.max(data, (d) => d.f) + 5]).range([innerH, 0]);
    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(5));
    g.append("g").call(d3.axisLeft(y).ticks(5));
    g.append("text").attr("x", innerW / 2).attr("y", innerH + 32).attr("text-anchor", "middle").attr("fill", palette.muted).attr("font-size", 12).text("路径坐标 s");
    g.append("text").attr("x", -innerH / 2).attr("y", -34).attr("transform", "rotate(-90)").attr("text-anchor", "middle").attr("fill", palette.muted).attr("font-size", 12).text("F(s) / meV");
    const area = d3.area()
      .x((d) => x(d.s))
      .y0(innerH)
      .y1((d) => y(d.f))
      .curve(d3.curveCatmullRom.alpha(0.35));
    g.append("path").datum(data).attr("d", area).attr("fill", "rgba(23,126,137,0.12)");
    const line = d3.line()
      .x((d) => x(d.s))
      .y((d) => y(d.f))
      .curve(d3.curveCatmullRom.alpha(0.35));
    g.append("path").datum(data).attr("d", line).attr("fill", "none").attr("stroke", palette.teal).attr("stroke-width", 3);
    const saddle = data.reduce((a, b) => (b.f > a.f ? b : a), data[0]);
    g.append("circle").attr("cx", x(saddle.s)).attr("cy", y(saddle.f)).attr("r", 5).attr("fill", palette.coral);
    g.append("text").attr("x", x(saddle.s) + 8).attr("y", y(saddle.f) - 8).attr("fill", palette.coral).attr("font-weight", 700).attr("font-size", 12).text("马鞍点");
  }

  function drawCycleDiagram() {
    const svg = d3.select("#cycle-diagram");
    svg.selectAll("*").remove();
    const nodes = [
      { id: "A_ext", x: 110, y: 60, label: "A 外侧" },
      { id: "A_H", x: 405, y: 60, label: "A/H" },
      { id: "B_H", x: 405, y: 220, label: "B/H" },
      { id: "B_ext", x: 110, y: 220, label: "B 外侧" }
    ];
    const links = [
      [nodes[0], nodes[1], "吸附扩散", palette.teal],
      [nodes[1], nodes[2], "跨阱", palette.coral],
      [nodes[2], nodes[3], "外扩散", palette.amber],
      [nodes[3], nodes[0], "气相回路", palette.green]
    ];
    svg.append("defs").append("marker")
      .attr("id", "cycle-arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 8)
      .attr("refY", 5)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,0 L10,5 L0,10 Z")
      .attr("fill", palette.ink);
    links.forEach(([a, b, label, color]) => {
      svg.append("line")
        .attr("x1", a.x)
        .attr("y1", a.y)
        .attr("x2", b.x)
        .attr("y2", b.y)
        .attr("stroke", color)
        .attr("stroke-width", 5)
        .attr("stroke-linecap", "round")
        .attr("marker-end", "url(#cycle-arrow)")
        .attr("opacity", 0.75);
      svg.append("text")
        .attr("x", (a.x + b.x) / 2)
        .attr("y", (a.y + b.y) / 2 - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("font-weight", 760)
        .attr("fill", palette.ink)
        .text(label);
    });
    nodes.forEach((n) => {
      svg.append("circle").attr("cx", n.x).attr("cy", n.y).attr("r", 34).attr("fill", "#ffffff").attr("stroke", palette.line).attr("stroke-width", 2);
      svg.append("text").attr("x", n.x).attr("y", n.y + 5).attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 800).attr("fill", palette.ink).text(n.label);
    });
    svg.append("text")
      .attr("x", 260)
      .attr("y", 150)
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
      .attr("font-weight", 820)
      .attr("fill", palette.violet)
      .text("k12 k23 k34 k41 = k21 k32 k43 k14");
  }

  function drawStatsPlot() {
    const cfg = statsCases[state.statCase];
    const node = d3.select("#stats-plot");
    node.selectAll("*").remove();
    const rect = node.node().getBoundingClientRect();
    const width = Math.max(360, rect.width);
    const height = 300;
    const margin = { top: 38, right: 24, bottom: 58, left: 58 };
    const svg = node.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const data = [
      { label: cfg.forwardLabel, value: cfg.forward, color: palette.teal },
      { label: cfg.backwardLabel, value: cfg.backward, color: palette.coral }
    ];
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value) * 1.15]).nice().range([innerH, 0]);
    const x = d3.scaleBand().domain(data.map((d) => d.label)).range([0, innerW]).padding(0.34);
    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y).ticks(5));
    g.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (d) => x(d.label))
      .attr("y", (d) => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerH - y(d.value))
      .attr("fill", (d) => d.color)
      .attr("opacity", 0.86);
    g.selectAll(".bar-label")
      .data(data)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", (d) => x(d.label) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.value) - 8)
      .attr("text-anchor", "middle")
      .attr("font-weight", 800)
      .attr("fill", palette.ink)
      .text((d) => d.value);
    const delta = cfg.forward - cfg.backward;
    const sigma = Math.sqrt(cfg.forward + cfg.backward);
    const z = delta / sigma;
    svg.append("text").attr("x", margin.left).attr("y", 22).attr("fill", palette.ink).attr("font-weight", 850).text(cfg.title);
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", height - 14)
      .attr("fill", Math.abs(z) >= 3 ? palette.green : palette.coral)
      .attr("font-weight", 780)
      .text(`净差值 ${delta};  乐观 z ≈ ${z.toFixed(1)}（未计入轨迹相关性）`);
  }

  function updateLabels() {
    const r = rates();
    els.tempValue.textContent = `${state.temp.toFixed(0)} K`;
    els.gapValue.textContent = `${state.gap.toFixed(1)} Å`;
    els.barrierValue.textContent = `${state.barrier.toFixed(0)} meV`;
    els.biasValue.textContent = state.equilibrium ? "0.00" : state.bias.toFixed(2);
    els.hudMode.textContent = state.structure === "double-cone" ? "双纳米锥" : "偏心锥管";
    els.hudFlux.textContent = `净通量 ${r.net.toFixed(2)}`;
    els.hudBalance.textContent = Math.abs(biasValue()) < 0.005 ? "详细平衡：J≈0" : "非平衡边界";
    els.forwardRate.textContent = r.forward.toFixed(2);
    els.backwardRate.textContent = r.backward.toFixed(2);
    els.netRate.textContent = r.net.toFixed(2);
    els.zScore.textContent = r.z.toFixed(1);
  }

  function redrawStatic() {
    updateLabels();
    drawGeometry();
    drawPathCanvas();
    drawPotentialPlot();
    drawCycleDiagram();
    drawStatsPlot();
  }

  function bindControls() {
    document.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".segment").forEach((b) => b.classList.remove("is-active"));
        button.classList.add("is-active");
        state.structure = button.dataset.structure;
        redrawStatic();
      });
    });

    document.querySelectorAll(".case-button").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".case-button").forEach((b) => b.classList.remove("is-active"));
        button.classList.add("is-active");
        state.statCase = button.dataset.case;
        drawStatsPlot();
      });
    });

    els.temp.addEventListener("input", () => {
      state.temp = Number(els.temp.value);
      redrawStatic();
    });
    els.gap.addEventListener("input", () => {
      state.gap = Number(els.gap.value);
      redrawStatic();
    });
    els.barrier.addEventListener("input", () => {
      state.barrier = Number(els.barrier.value);
      redrawStatic();
    });
    els.bias.addEventListener("input", () => {
      state.bias = Number(els.bias.value);
      redrawStatic();
    });
    els.equilibrium.addEventListener("change", () => {
      state.equilibrium = els.equilibrium.checked;
      redrawStatic();
    });
    els.trails.addEventListener("change", () => {
      state.trails = els.trails.checked;
    });
    els.play.addEventListener("click", () => {
      state.running = !state.running;
      els.play.textContent = state.running ? "⏸" : "▶";
    });
    els.reset.addEventListener("click", () => {
      state.forwardEvents = 0;
      state.backwardEvents = 0;
      trailPoints.length = 0;
      seedParticles();
      updateLabels();
    });
    window.addEventListener("resize", redrawStatic);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    if (state.running) {
      state.tick += 1;
      updateParticles(dt);
      sampleEvents(dt);
    }
    drawParticles();
    updateLabels();
    requestAnimationFrame(frame);
  }

  function init() {
    seedParticles();
    bindControls();
    redrawStatic();
    requestAnimationFrame(frame);
  }

  init();
}());
