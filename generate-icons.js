/**
 * Vygeneruje ikony 192×192 a 512×512 PNG pro PWA
 * Spustit: node generate-icons.js
 */
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

// ─── SVG šablona ikony ────────────────────────────────────────────────────────
function buildSvg(size) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const R = s * 0.38;        // poloměr míče
  const bcy = s * 0.44;      // střed míče (mírně výš)

  // Hex pattern – středový pětiúhelník + 5 okolních hexagonů (zjednodušeno)
  function polar(cx, cy, r, angleDeg) {
    const a = (angleDeg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function pentagon(cx, cy, r, rotDeg = 0) {
    return Array.from({length: 5}, (_, i) => polar(cx, cy, r, rotDeg + i * 72)).map(p => p.join(',')).join(' ');
  }

  function hexagon(cx, cy, r, rotDeg = 0) {
    return Array.from({length: 6}, (_, i) => polar(cx, cy, r, rotDeg + i * 60)).map(p => p.join(',')).join(' ');
  }

  // Rozměry pro míčový vzor
  const pr = R * 0.26;   // poloměr středového pětiúhelníku
  const hr = R * 0.265;  // poloměr hexagonu
  const dist = R * 0.52; // vzdálenost okolních pětiúhelníků od středu

  // Středový pětiúhelník
  const p0 = pentagon(cx, bcy, pr, 0);

  // 5 okolních hexagonů/přechodů
  const surroundHex = [0, 72, 144, 216, 288].map(angle => {
    const [hx, hy] = polar(cx, bcy, dist, angle);
    return hexagon(hx, hy, hr, angle + 30);
  });

  // Bod lopty dole (text "2026")
  const textY = s * 0.88;
  const fontSize = s * 0.13;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a3d1f"/>
      <stop offset="100%" stop-color="#1f7a42"/>
    </linearGradient>
    <linearGradient id="ball" x1="30%" y1="20%" x2="80%" y2="90%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e8e8e8"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="${s*0.01}" dy="${s*0.02}" stdDeviation="${s*0.02}" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Pozadí se zaoblenými rohy -->
  <rect width="${s}" height="${s}" rx="${s*0.18}" fill="url(#bg)"/>

  <!-- Dekorativní linie "hřiště" -->
  <circle cx="${cx}" cy="${cy}" r="${s*0.46}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${s*0.025}"/>
  <line x1="${cx}" y1="${s*0.1}" x2="${cx}" y2="${s*0.9}" stroke="rgba(255,255,255,0.05)" stroke-width="${s*0.015}"/>

  <!-- Fotbalový míč – stín -->
  <circle cx="${cx + s*0.015}" cy="${bcy + s*0.02}" r="${R}" fill="rgba(0,0,0,0.2)" filter="url(#shadow)"/>

  <!-- Fotbalový míč – bílá plocha -->
  <circle cx="${cx}" cy="${bcy}" r="${R}" fill="url(#ball)" stroke="#ddd" stroke-width="${s*0.005}"/>

  <!-- Hexagonální vzor – středový pětiúhelník -->
  <polygon points="${p0}" fill="#1a1a2e" opacity="0.85"/>

  <!-- Hexagonální vzor – okolní šestiúhelníky -->
  ${surroundHex.map(pts => `<polygon points="${pts}" fill="#1a1a2e" opacity="0.75"/>`).join('\n  ')}

  <!-- Odlesk míče -->
  <ellipse cx="${cx - R*0.2}" cy="${bcy - R*0.3}" rx="${R*0.28}" ry="${R*0.18}"
           fill="white" opacity="0.35" transform="rotate(-25, ${cx - R*0.2}, ${bcy - R*0.3})"/>

  <!-- Text "2026" -->
  <text x="${cx}" y="${textY}"
        font-family="'Arial Black', 'Impact', sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        fill="white"
        text-anchor="middle"
        letter-spacing="${s*0.005}"
        opacity="0.95">2026</text>
</svg>`;
}

// ─── Generování ───────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'public');

for (const size of [192, 512]) {
  const svg = buildSvg(size);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`✅ Vygenerováno: icon-${size}.png (${pngBuffer.length} bytes)`);
}

// Vygeneruj také favicon.ico jako 32x32 SVG embedded
const faviconSvg = buildSvg(32);
fs.writeFileSync(path.join(outDir, 'favicon.svg'), faviconSvg);
console.log('✅ Vygenerováno: favicon.svg');
