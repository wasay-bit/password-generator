// Password generator. Runs fully in the browser.
// Uses crypto.getRandomValues (a cryptographically secure random source) and
// never sends or stores generated passwords.

const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};
const AMBIGUOUS = /[O0oIl1|]/g;

const state = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: true,
  password: "",
};

// Uniform random integer in [0, max) without modulo bias (rejection sampling).
function randomInt(max) {
  const range = 0x100000000;
  const limit = range - (range % max);
  const buf = new Uint32Array(1);
  let n;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limit);
  return n % max;
}

function pool() {
  let chars = "";
  const groups = [];
  for (const key of ["lower", "upper", "digits", "symbols"]) {
    if (!state[key]) continue;
    let set = CHARSETS[key];
    if (state.avoidAmbiguous) set = set.replace(AMBIGUOUS, "");
    groups.push(set);
    chars += set;
  }
  return { chars, groups };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generate() {
  const { chars, groups } = pool();
  if (groups.length === 0) return { password: "", entropy: 0, error: "Pick at least one character type." };
  if (state.length < groups.length) {
    return { password: "", entropy: 0, error: "Length is too short for the selected character types." };
  }
  // Guarantee at least one character from every selected type.
  const out = groups.map((g) => g[randomInt(g.length)]);
  while (out.length < state.length) out.push(chars[randomInt(chars.length)]);
  const password = shuffle(out).join("");
  const entropy = Math.floor(state.length * Math.log2(chars.length));
  return { password, entropy, error: "" };
}

function strengthLabel(bits) {
  if (bits >= 100) return { text: "Very strong", color: "#1a7f37" };
  if (bits >= 80) return { text: "Strong", color: "#2da44e" };
  if (bits >= 60) return { text: "Reasonable", color: "#bf8700" };
  return { text: "Weak", color: "#cf222e" };
}

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

const el = (id) => document.getElementById(id);

function syncControls() {
  el("len").value = state.length;
  el("lenVal").textContent = state.length;
  for (const k of ["lower", "upper", "digits", "symbols", "avoidAmbiguous"]) el(k).checked = state[k];
}

function render() {
  const result = generate();
  state.password = result.password;
  el("pw").value = result.password;
  el("err").textContent = result.error;
  const s = strengthLabel(result.entropy);
  el("bar").style.width = result.password ? Math.min(100, (result.entropy / 128) * 100) + "%" : "0";
  el("bar").style.background = s.color;
  el("strength").textContent = result.password ? s.text : "";
  el("bits").textContent = result.password ? `~${result.entropy} bits of entropy` : "";
}

el("len").addEventListener("input", (e) => {
  state.length = Number(e.target.value);
  el("lenVal").textContent = state.length;
  render();
});
for (const k of ["lower", "upper", "digits", "symbols", "avoidAmbiguous"]) {
  el(k).addEventListener("change", (e) => {
    state[k] = e.target.checked;
    render();
  });
}
el("regen").addEventListener("click", render);
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
  setTimeout(() => (el("copy").textContent = "Copy"), 1500);
});

syncControls();
render();
