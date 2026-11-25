# How the password generator works

This is a walkthrough of the code, written to help you read it and rebuild it yourself. Start with `client.js`, since it does all the work.

## The big picture

1. The page shows a set of options (length, which character types, look-alike filter).
2. When an option changes, `render()` runs.
3. `render()` calls `generate()`, which picks random characters and returns a password.
4. The password, a strength meter, and any error message are shown on the page.

Nothing leaves the browser. There's no network call and no storage.

## Step by step

### 1. Character sets
`CHARSETS` holds four strings: lowercase, uppercase, digits, and symbols. `AMBIGUOUS` is a regular expression that matches look-alike characters, so the code can remove them.

### 2. Secure random numbers
`randomInt(max)` returns a whole number from 0 to max-1. It uses `crypto.getRandomValues`, not `Math.random`, because `Math.random` is predictable.

It also avoids modulo bias. Taking a random 32-bit number and doing `% max` makes some results slightly more likely. The fix is "rejection sampling": if the random number lands in the leftover part of the range, throw it away and draw again.

**Try it:** change `randomInt` to use `Math.random()` and explain why that would be a worse choice.

### 3. Building the pool
`pool()` checks which sets are turned on. It returns two things:
- `chars`: every allowed character, joined into one string.
- `groups`: one string per on set, used to guarantee the mix.

### 4. Shuffling
`shuffle(arr)` is a Fisher-Yates shuffle. It walks backward through the array and swaps each item with a random earlier one. Without shuffling, the guaranteed characters would always appear first.

### 5. Generating
`generate()` does four things:
1. Checks that at least one set is on, and that the length is long enough.
2. Picks one character from each on set, so every rule is met.
3. Fills the rest of the length from the full pool.
4. Shuffles, joins the characters into a string, and estimates entropy.

**Entropy** is length multiplied by log2 of the pool size. Each bit doubles the number of guesses an attacker needs. The number is an estimate, not a guarantee.

### 6. Styling
The `style` element holds the CSS. The `@media` line at the end changes the layout on narrow screens.

### 7. Layout
`card.innerHTML` builds the page. The `id` attributes let the code find each element later with `el("id")`.

### 8. Event listeners
Event listeners connect the page to the logic: the slider, the checkboxes, the buttons. Each one updates `state` and then calls `render()`.

## Exercises (for learning)

- Add a fifth option that excludes a custom list of characters.
- Change the strength thresholds and see how the labels change.
- Add a "passphrase" mode that joins random words instead of characters. Think about how the entropy estimate would change.
- Write a test that checks `generate()` never returns a password shorter than the requested length.

## Things to know

- The entropy number only counts character choices. It doesn't account for dictionary words or patterns.
- Browser clipboard access can be blocked, which is why the copy button has a fallback.
