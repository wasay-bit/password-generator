# Password Generator

A password generator that follows common security practices. Nothing is stored or sent over the network. It comes in two forms: a browser page, and a command-line tool.

> **Authorship:** Written by AI (Claude) as a practice project. The password rules are simple examples, and the project has not been audited.

## Quick start

**Browser:** open the Gadget page, or open `client.js` in a page that runs it.

**Command line** (Node.js 18 or newer, no packages needed):

```bash
node cli.js                        # one 20-character password
node cli.js --length 32 --count 5  # five 32-character passwords
node cli.js --no-symbols           # letters and digits only
node cli.js --help                 # all options
```

**Tests:**

```bash
npm test
```

## Design choices

- **Secure randomness.** Uses the platform's cryptographic random source (`crypto.getRandomValues`), never `Math.random`.
- **No modulo bias.** Draws that would favor some characters are thrown away and redrawn (rejection sampling), so each character is equally likely.
- **Guaranteed character mix.** If several character types are selected, every password contains at least one of each. The result is shuffled so those characters aren't always at the start.
- **Entropy estimate.** Shows roughly how many bits of entropy the length and character set provide. For example, 20 characters from the full set is about 120 bits.
- **No storage.** Passwords exist only in memory and are never logged, saved, or sent anywhere.
- **Look-alike filter.** Optionally removes characters that are easy to confuse (0, O, 1, l, I, |).

## Files

- `lib/generator.js`: the tested core (random numbers, character sets, generation, strength labels).
- `cli.js`: the command-line tool. Uses `lib/generator.js`.
- `client.js`: the browser page. Runs as a single file in the Gadget, so it keeps its own copy of the rules.
- `server.js`: a placeholder for the Gadget platform. It doesn't handle passwords.
- `test/generator.test.js`: tests for the core: randomness, rejection sampling, character rules, errors, entropy, and strength labels.
- `test/sync.test.js`: checks that `client.js` matches the character sets and strength thresholds in the core.
- `LEARNING.md`: a walkthrough of how the code works.

## Tests and CI

Tests run with `npm test` and on every push through GitHub Actions (`.github/workflows/tests.yml`).

## Limitations

- The entropy figure assumes the generator is working correctly. It measures the generator's randomness, not how well a password resists cracking.
- The browser copy of the rules is not imported from the core, because of how the Gadget runs. `test/sync.test.js` catches drift in the key values, not every change.
- Anything shown on screen is only as safe as the device and browser it runs on.
- It's not audited. Use a password manager for real accounts.
