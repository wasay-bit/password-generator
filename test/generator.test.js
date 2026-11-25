import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  CHARSETS,
  DEFAULTS,
  MAX_LENGTH,
  MIN_LENGTH,
  defaultFill,
  entropyBits,
  generate,
  pool,
  randomInt,
  strengthLabel,
} from "../lib/generator.js";

// A fill function that returns the given 32-bit values in order. It lets
// tests force exact random outcomes.
function scripted(values) {
  let i = 0;
  return (buf) => {
    buf[0] = values[i++];
    return buf;
  };
}

test("randomInt always returns a whole number in range", () => {
  for (const max of [1, 2, 3, 7, 26, 62, 94, 256, 1000]) {
    for (let i = 0; i < 500; i++) {
      const n = randomInt(max);
      assert.ok(Number.isInteger(n) && n >= 0 && n < max, `${n} out of range for ${max}`);
    }
  }
});

test("randomInt rejects values in the biased leftover range (rejection sampling)", () => {
  // For max = 3: 2^32 % 3 = 1, so the limit is 2^32 - 1 = 4294967295.
  // A draw of 4294967295 must be thrown away. The next draw, 5, gives 5 % 3 = 2.
  let calls = 0;
  const fill = (buf) => {
    calls++;
    buf[0] = calls === 1 ? 4294967295 : 5;
    return buf;
  };
  assert.equal(randomInt(3, fill), 2);
  assert.equal(calls, 2);
});

test("randomInt gives every value about equal chances", () => {
  const max = 10;
  const counts = new Array(max).fill(0);
  const draws = 100000;
  for (let i = 0; i < draws; i++) counts[randomInt(max)]++;
  const expected = draws / max;
  for (const c of counts) {
    assert.ok(Math.abs(c - expected) < expected * 0.05, `count ${c} is far from ${expected}`);
  }
});

test("randomInt refuses impossible sizes", () => {
  assert.throws(() => randomInt(0), RangeError);
  assert.throws(() => randomInt(-3), RangeError);
  assert.throws(() => randomInt(2.5), RangeError);
});

test("passwords use the platform's cryptographic random source, not Math.random", () => {
  const original = webcrypto.getRandomValues;
  let used = 0;
  webcrypto.getRandomValues = (buf) => {
    used++;
    return original.call(webcrypto, buf);
  };
  try {
    const realMath = Math.random;
    Math.random = () => {
      throw new Error("Math.random must not be used for passwords");
    };
    try {
      const r = generate({ length: 16 });
      assert.equal(r.error, "");
      assert.ok(used > 0, "getRandomValues was never called");
    } finally {
      Math.random = realMath;
    }
  } finally {
    webcrypto.getRandomValues = original;
  }
  assert.equal(typeof defaultFill, "function");
});

test("pool leaves out look-alike characters by default and keeps them when asked", () => {
  const without = pool({}).chars;
  for (const ch of "O0oIl1|") assert.ok(!without.includes(ch), `${ch} should be removed`);
  const withAll = pool({ avoidAmbiguous: false }).chars;
  for (const ch of "O0oIl1|") assert.ok(withAll.includes(ch), `${ch} should be kept`);
});

test("pool only includes the sets that are turned on", () => {
  const { groups } = pool({ lower: true, upper: false, digits: false, symbols: false });
  assert.equal(groups.length, 1);
  assert.equal(groups[0], CHARSETS.lower.replace(/[O0oIl1|]/g, ""));
  assert.equal(pool({ lower: false, upper: false, digits: false, symbols: false }).groups.length, 0);
});

test("generate returns the requested length and only allowed characters", () => {
  for (let len = MIN_LENGTH; len <= MAX_LENGTH; len += 7) {
    const r = generate({ length: len });
    assert.equal(r.error, "");
    assert.equal(r.password.length, len);
    const { chars } = pool({});
    for (const ch of r.password) assert.ok(chars.includes(ch), `unexpected character ${ch}`);
  }
});

test("every selected character type appears in every password", () => {
  for (let i = 0; i < 300; i++) {
    const { password } = generate({ length: 12 });
    assert.ok(/[a-z]/.test(password), "missing lowercase");
    assert.ok(/[A-Z]/.test(password), "missing uppercase");
    assert.ok(/[0-9]/.test(password), "missing digit");
    assert.ok(/[!@#$%^&*()\-_=+\[\]{};:,.<>?]/.test(password), "missing symbol");
  }
});

test("turning a set off keeps it out of the password", () => {
  for (let i = 0; i < 200; i++) {
    const { password } = generate({ length: 16, symbols: false, digits: false });
    assert.ok(!/[0-9!@#$%^&*()\-_=+\[\]{};:,.<>?]/.test(password), `unexpected character in ${password}`);
  }
});

test("settings that can't work give a clear error", () => {
  assert.match(generate({ lower: false, upper: false, digits: false, symbols: false }).error, /at least one/);
  assert.match(generate({ length: 3 }).error, /too short/);
  assert.match(generate({ length: MAX_LENGTH + 1 }).error, /64 or less/);
  assert.match(generate({ length: 2.5 }).error, /too short/);
});

test("entropy is length times log2 of the pool size, rounded down", () => {
  // Lowercase only, look-alikes kept: 26 characters, 10 long.
  const r = generate({ length: 10, upper: false, digits: false, symbols: false, avoidAmbiguous: false });
  assert.equal(r.entropy, Math.floor(10 * Math.log2(26)));
  assert.equal(r.entropy, 47);
  assert.equal(entropyBits(20, 64), 120);
});

test("strength labels change at the documented thresholds", () => {
  assert.equal(strengthLabel(59), "Weak");
  assert.equal(strengthLabel(60), "Reasonable");
  assert.equal(strengthLabel(79), "Reasonable");
  assert.equal(strengthLabel(80), "Strong");
  assert.equal(strengthLabel(99), "Strong");
  assert.equal(strengthLabel(100), "Very strong");
});

test("the default settings produce a strong password", () => {
  const r = generate();
  assert.equal(r.password.length, DEFAULTS.length);
  assert.ok(r.entropy >= 100, `default entropy ${r.entropy} is below 100`);
  assert.equal(strengthLabel(r.entropy), "Very strong");
});
