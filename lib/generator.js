// Password generator core: the logic with no browser or page code in it.
//
// The browser page (client.js) keeps its own copy of these rules, because the
// Gadget runs client.js as a single file. test/sync.test.js checks that the
// two copies agree on the character sets, look-alike filter, and strength
// thresholds. Change both files together.
//
// Requires Node.js 18 or newer for the command line and tests.

import { webcrypto } from "node:crypto";

// The characters each option can use. "symbols" is a short list of common
// punctuation that most websites accept.
export const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};

// Characters that are easy to mix up when read by a person.
export const AMBIGUOUS = /[O0oIl1|]/g;

export const DEFAULTS = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: true,
};

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 64;

// Fills a Uint32Array with random values. Uses the platform's cryptographic
// source. Math.random() is never used, because it can be predicted.
export function defaultFill(buf) {
  return webcrypto.getRandomValues(buf);
}

// Returns a whole number from 0 up to (but not including) max.
//
// Rejection sampling: (random 32-bit number) % max favors small results when
// 2^32 isn't a multiple of max. So numbers in the leftover top part of the
// range are thrown away and drawn again, which keeps every result equally likely.
export function randomInt(max, fill = defaultFill) {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000) {
    throw new RangeError(`max must be a whole number from 1 to 2^32, got ${max}`);
  }
  const range = 0x100000000;
  const limit = range - (range % max); // largest multiple of max that fits
  const buf = new Uint32Array(1);
  for (;;) {
    fill(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

// Works out the allowed characters for the given options. Returns:
//   chars:  every allowed character in one string (used to fill the password)
//   groups: one string per selected set (used to guarantee the mix)
export function pool(options = {}) {
  const opts = { ...DEFAULTS, ...options };
  let chars = "";
  const groups = [];
  for (const key of ["lower", "upper", "digits", "symbols"]) {
    if (!opts[key]) continue;
    let set = CHARSETS[key];
    if (opts.avoidAmbiguous) set = set.replace(AMBIGUOUS, "");
    groups.push(set);
    chars += set;
  }
  return { chars, groups };
}

// Fisher-Yates shuffle. Without it, the guaranteed characters would always
// come first, which makes the password easier to guess.
export function shuffle(arr, fill = defaultFill) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, fill);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Entropy in bits = length x log2(size of the pool). This is an estimate. It
// assumes the random source is good, and it ignores patterns a person might pick.
export function entropyBits(length, poolSize) {
  return Math.floor(length * Math.log2(poolSize));
}

// Builds a password. Returns { password, entropy, error }, the same shape the
// browser page uses. Never throws for bad settings; it reports them in error.
export function generate(options = {}, fill = defaultFill) {
  const opts = { ...DEFAULTS, ...options };
  const { chars, groups } = pool(opts);

  if (groups.length === 0) {
    return { password: "", entropy: 0, error: "Pick at least one character type." };
  }
  if (!Number.isInteger(opts.length) || opts.length < groups.length) {
    return { password: "", entropy: 0, error: "Length is too short for the selected character types." };
  }
  if (opts.length > MAX_LENGTH) {
    return { password: "", entropy: 0, error: `Length must be ${MAX_LENGTH} or less.` };
  }

  // Step 1: one random character from each selected set, so the password meets every rule.
  const out = groups.map((g) => g[randomInt(g.length, fill)]);
  // Step 2: fill the rest from the full pool.
  while (out.length < opts.length) out.push(chars[randomInt(chars.length, fill)]);
  // Step 3: shuffle so the guaranteed characters aren't always first.
  const password = shuffle(out, fill).join("");

  return { password, entropy: entropyBits(opts.length, chars.length), error: "" };
}

// Turns an entropy number into a label. Same thresholds as the browser page.
export function strengthLabel(bits) {
  if (bits >= 100) return "Very strong";
  if (bits >= 80) return "Strong";
  if (bits >= 60) return "Reasonable";
  return "Weak";
}
