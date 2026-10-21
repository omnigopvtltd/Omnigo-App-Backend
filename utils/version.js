// Strict format used when an admin saves a version: 1.2.3
const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

const isStrictVersion = (value) =>
  typeof value === "string" && VERSION_REGEX.test(value.trim());

/**
 * Parses app versions safely.
 * "1.2.3", "1.2", "1.2.3+45" (Flutter build number) and "1.2.3-beta"
 * all become [major, minor, patch]. Returns null if the value is invalid.
 */
const parseVersion = (value) => {
  if (typeof value !== "string") return null;
  const core = value.trim().split(/[+-]/)[0];
  if (!/^\d+(\.\d+){0,2}$/.test(core)) return null;

  const parts = core.split(".").map(Number);
  while (parts.length < 3) parts.push(0);
  return parts;
};

/**
 * Returns -1 if a < b, 1 if a > b, 0 if equal.
 * Returns null if either version is invalid (caller must handle it).
 */
const compareVersions = (a, b) => {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;

  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
};

module.exports = { VERSION_REGEX, isStrictVersion, parseVersion, compareVersions };
