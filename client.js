// Password generator: browser (client-side) code.
//
// This file builds the whole page and makes the passwords. It runs inside
// the Gadget's sandboxed iframe. It doesn't call the server, and it doesn't
// save anything, so passwords only live in memory until the page is closed.
//
// The main idea: pick random characters from the allowed sets, make sure
// each selected set is represented, shuffle, and show the result.

// ---------------------------------------------------------------------------
// 1. Character sets
// ---------------------------------------------------------------------------

// The characters each option can use. "symbols" is a short list of common
// punctuation that most websites accept.
const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};

// Characters that are easy to mix up when read by a person.
// The "g" flag means every match in a string gets replaced, not just the first.
const AMBIGUOUS = /[O0oIl1|]/g;

// The current settings. The UI reads and writes this object.
const state = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: true,
  password: "",
};

// ---------------------------------------------------------------------------
// 2. Random numbers
// ---------------------------------------------------------------------------

// Returns a whole number from 0 up to (but not including) max.
//
// Math.random() is NOT safe for passwords because it can be predicted.
// crypto.getRandomValues() is the browser's cryptographic random source.
//
// We also avoid the "modulo bias" trap. If you just do
// (random 32-bit number) % max, some results come up slightly more often
// than others when 2^32 isn't a multiple of max. To fix that, we throw
// away the few numbers at the top of the range ("rejection sampling")
// and draw again. That keeps every result equally likely.
function randomInt(max) {
  const range = 0x100000000; // 2^32, the number of values in a 32-bit integer
  const limit = range - (range % max); // the largest multiple of max that fits
  const buf = new Uint32Array(1); // holds one random 32-bit number
  let n;
  do {
    crypto.getRandomValues(buf); // fill buf with secure random bytes
    n = buf[0];
  } while (n >= limit); // if it's in the biased leftover part, try again
  return n % max;
}

// ---------------------------------------------------------------------------
// 3. Building the pool of allowed characters
// ---------------------------------------------------------------------------

// Works out which character sets are turned on, and returns:
//   chars:  one string with every allowed character (used for filling)
//   groups: one string per turned-on set (used to guarantee the mix)
function pool() {
  let chars = "";
  const groups = [];
  for (const key of ["lower", "upper", "digits", "symbols"]) {
    if (!state[key]) continue; // skip sets the user turned off
    let set = CHARSETS[key];
    if (state.avoidAmbiguous) set = set.replace(AMBIGUOUS, ""); // drop look-alikes
    groups.push(set);
    chars += set;
  }
  return { chars, groups };
}

// ---------------------------------------------------------------------------
// 4. Shuffling
// ---------------------------------------------------------------------------

// Randomly reorders an array in place (Fisher-Yates shuffle).
// Without this, the guaranteed characters would always show up at the
// start of the password, which makes the password easier to guess.
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1); // pick a spot from 0 to i
    [arr[i], arr[j]] = [arr[j], arr[i]]; // swap the two items
  }
  return arr;
}

// ---------------------------------------------------------------------------
// 5. Generating a password
// ---------------------------------------------------------------------------

// Builds a password from the current settings. Returns the password,
// a rough entropy estimate in bits, and an error message if the settings
// can't work.
function generate() {
  const { chars, groups } = pool();

  // Nothing selected: there's nothing to pick from.
  if (groups.length === 0) {
    return { password: "", entropy: 0, error: "Pick at least one character type." };
  }

  // The password must be long enough to hold one character from each set.
  if (state.length < groups.length) {
    return { password: "", entropy: 0, error: "Length is too short for the selected character types." };
  }

  // Step 1: pick one random character from each selected set,
  // so the password always meets every rule the user picked.
  const out = groups.map((g) => g[randomInt(g.length)]);

  // Step 2: fill the rest of the length from the full pool.
  while (out.length < state.length) out.push(chars[randomInt(chars.length)]);

  // Step 3: shuffle so the guaranteed characters aren't always first.
  const password = shuffle(out).join("");

  // Entropy (in bits) = length x log2(size of the pool).
  // Each extra bit doubles the number of guesses an attacker would need.
  // This is an estimate; it ignores patterns and assumes the RNG is good.
  const entropy = Math.floor(state.length * Math.log2(chars.length));

  return { password, entropy, error: "" };
}

// Turns an entropy number into a label and a color for the meter.
function strengthLabel(bits) {
  if (bits >= 100) return { text: "Very strong", color: "#1a7f37" };
  if (bits >= 80) return { text: "Strong", color: "#2da44e" };
  if (bits >= 60) return { text: "Reasonable", color: "#bf8700" };
  return { text: "Weak", color: "#cf222e" };
}

// ---------------------------------------------------------------------------
// 6. Page styling
// ---------------------------------------------------------------------------

// Adds the CSS for the page. The @media rule at the bottom changes the
// layout on small screens (phones) so the controls stack vertically.
const style = document.createElement("style");
style.textContent = `
  body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #f6f8fa; color: #1f2328; }
  .card { max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #d0d7de; border-radius: 10px; padding: 20px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #57606a; font-size: 14px; margin: 0 0 16px; }
  .output { display: flex; gap: 8px; align-items: stretch; }
  .output input { flex: 1; font-family: ui-monospace, Menlo, monospace; font-size: 16px; padding: 10px; border: 1px solid #d0d7de; border-radius: 6px; min-width: 0; }
  button { font: inherit; padding: 10px 14px; border-radius: 6px; border: 1px solid #d0d7de; background: #f6f8fa; cursor: pointer; }
  button.primary { background: #1f883d; color: #fff; border-color: #1f883d; }
  .meter { height: 8px; background: #eaeef2; border-radius: 4px; overflow: hidden; margin: 10px 0 4px; }
  .meter > div { height: 100%; width: 0; transition: width .2s; }
  .meta { font-size: 13px; color: #57606a; display: flex; justify-content: space-between; }
  .row { display: flex; align-items: center; justify-content: space-between; margin: 12px 0; gap: 12px; }
  .row label { font-size: 14px; }
  .checks { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
  .checks label { font-size: 14px; display: flex; gap: 6px; align-items: center; }
  input[type=range] { width: 100%; }
  .error { color: #cf222e; font-size: 14px; margin-top: 8px; min-height: 18px; }
  .note { font-size: 12px; color: #57606a; margin-top: 16px; line-height: 1.5; }
  @media (max-width: 480px) { .checks { grid-template-columns: 1fr; } .output { flex-direction: column; } }
`;
document.head.appendChild(style);

// ---------------------------------------------------------------------------
// 7. Page layout
// ---------------------------------------------------------------------------

// Builds the HTML for the page. Each id="..." is used below to find the
// element and attach behavior to it.
const card = document.createElement("div");
card.className = "card";
card.innerHTML = `
  <h1>Password Generator</h1>
  <p class="sub">Creates random passwords in your browser. Nothing is saved or sent anywhere.</p>
  <div class="output">
    <input id="pw" type="text" readonly aria-label="Generated password" />
    <button id="copy" type="button">Copy</button>
  </div>
  <div class="meter"><div id="bar"></div></div>
  <div class="meta"><span id="strength"></span><span id="bits"></span></div>
  <div class="error" id="err"></div>
  <div class="row">
    <label for="len">Length: <strong id="lenVal"></strong></label>
  </div>
  <input type="range" id="len" min="8" max="64" step="1" />
  <div class="checks">
    <label><input type="checkbox" id="lower" /> Lowercase (a-z)</label>
    <label><input type="checkbox" id="upper" /> Uppercase (A-Z)</label>
    <label><input type="checkbox" id="digits" /> Numbers (0-9)</label>
    <label><input type="checkbox" id="symbols" /> Symbols</label>
    <label><input type="checkbox" id="avoidAmbiguous" /> Avoid look-alikes (0 O 1 l I |)</label>
  </div>
  <div class="row" style="justify-content:flex-start">
    <button id="regen" class="primary" type="button">Generate new password</button>
  </div>
  <p class="note">
    Tips: use a unique password for every account, and store them in a password manager.
    Turn on two-factor authentication wherever it's offered. Anything shown here is only as safe as the device it's on.
  </p>
`;
document.body.appendChild(card);

// Short helper: el("pw") is the same as document.getElementById("pw").
const el = (id) => document.getElementById(id);

// Copies the saved settings into the form controls (used once at startup).
function syncControls() {
  el("len").value = state.length;
  el("lenVal").textContent = state.length;
  for (const k of ["lower", "upper", "digits", "symbols", "avoidAmbiguous"]) el(k).checked = state[k];
}

// Makes a new password and updates the screen: the output box, the
// strength meter, the entropy text, and any error message.
function render() {
  const result = generate();
  state.password = result.password;
  el("pw").value = result.password;
  el("err").textContent = result.error;
  const s = strengthLabel(result.entropy);
  // The meter bar is scaled so 128 bits fills it completely.
  el("bar").style.width = result.password ? Math.min(100, (result.entropy / 128) * 100) + "%" : "0";
  el("bar").style.background = s.color;
  el("strength").textContent = result.password ? s.text : "";
  el("bits").textContent = result.password ? `~${result.entropy} bits of entropy` : "";
}

// ---------------------------------------------------------------------------
// 8. Event listeners (what happens when the user does something)
// ---------------------------------------------------------------------------

// Length slider: save the new length and regenerate right away.
el("len").addEventListener("input", (e) => {
  state.length = Number(e.target.value);
  el("lenVal").textContent = state.length;
  render();
});

// Each checkbox: save its on/off state and regenerate.
for (const k of ["lower", "upper", "digits", "symbols", "avoidAmbiguous"]) {
  el(k).addEventListener("change", (e) => {
    state[k] = e.target.checked;
    render();
  });
}

// "Generate new password" button.
el("regen").addEventListener("click", render);

// Copy button. The clipboard API can be blocked inside some iframes,
// so if it fails we select the text and let the user copy it themselves.
el("copy").addEventListener("click", async () => {
  if (!state.password) return;
  try {
    await navigator.clipboard.writeText(state.password);
    el("copy").textContent = "Copied";
  } catch (e) {
    el("pw").select();
    el("err").textContent = "Copy was blocked. The password is selected so you can copy it manually.";
    return;
  }
  // Change the button text back after 1.5 seconds.
  setTimeout(() => (el("copy").textContent = "Copy"), 1500);
});

// Startup: fill in the controls, then make the first password.
syncControls();
render();
