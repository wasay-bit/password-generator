# Password Generator

> **Practice project.** This code was written by AI (Claude) to test Cloudflare OS. It was not written by the repo owner.

A browser-based password generator that follows common security practices. Nothing is stored or sent over the network.

## Design choices

- **Secure randomness.** Uses `crypto.getRandomValues` and rejection sampling, so every character is equally likely (no modulo bias).
- **Guaranteed character mix.** If several character types are selected, every password contains at least one of each.
- **Entropy estimate.** Shows roughly how many bits of entropy the chosen length and character set provide.
- **No storage.** Passwords exist only in the page's memory and are never logged, saved, or sent to the server.
- **Look-alike filter.** Optionally removes characters that are easy to confuse (0, O, 1, l, I, |).

## Files

- `client.js`: the generator and UI, runs in the browser.
- `server.js`: a placeholder for the Gadget platform. It doesn't handle passwords.
- `LEARNING.md`: a walkthrough of how the code works.

## Limitations

- The entropy figure assumes the generator is working correctly. It doesn't measure how well a password resists cracking.
- Anything shown on screen is only as safe as the device and browser it runs on.
- It's not audited. Use a password manager for real accounts.
