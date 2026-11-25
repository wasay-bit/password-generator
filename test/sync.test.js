// Checks that the browser copy of the rules (client.js) matches lib/generator.js.
// The Gadget runs client.js as one file, so it can't import the library. If this
// test fails, update client.js to match lib/generator.js (or the other way round).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CHARSETS, AMBIGUOUS } from "../lib/generator.js";

const client = await readFile(fileURLToPath(new URL("../client.js", import.meta.url)), "utf8");

test("client.js has the same character sets as lib/generator.js", () => {
  for (const [key, value] of Object.entries(CHARSETS)) {
    assert.ok(client.includes(`${key}: "${value}"`), `client.js is missing ${key}: "${value}"`);
  }
});

test("client.js uses the same look-alike filter", () => {
  assert.ok(client.includes(AMBIGUOUS.source), "look-alike pattern differs");
});

test("client.js uses the same strength thresholds", () => {
  for (const bits of [100, 80, 60]) {
    assert.ok(client.includes(`bits >= ${bits}`), `client.js is missing the ${bits}-bit threshold`);
  }
});
