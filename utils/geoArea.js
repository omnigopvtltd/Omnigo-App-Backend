
const DEFAULT = "72.20,32.50,73.10,33.20";

function getArea() {
  const raw = (process.env.GEO_AREA ?? DEFAULT).trim();
  if (!raw || /^(off|none|false)$/i.test(raw)) return null;
  const p = raw.split(",").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n)) || p[0] >= p[2] || p[1] >= p[3]) {
    console.error("[geo] GEO_AREA galat ha (minLon,minLat,maxLon,maxLat chahiye), default use ho raha ha");
    return getDefault();
  }
  return { minLon: p[0], minLat: p[1], maxLon: p[2], maxLat: p[3] };
}
function getDefault() { const p = DEFAULT.split(",").map(Number); return { minLon: p[0], minLat: p[1], maxLon: p[2], maxLat: p[3] }; }

module.exports = { getArea };