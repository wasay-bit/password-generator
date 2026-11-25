#!/usr/bin/env node
// Command-line password generator. Uses lib/generator.js.
//
// Examples:
//   node cli.js                       one 20-character password
//   node cli.js --length 32 --count 5
//   node cli.js --no-symbols --length 16
//   node cli.js --keep-ambiguous      allow 0 O 1 l I |
//
// Passwords are printed to the terminal only. Nothing is saved.

import { DEFAULTS, MAX_LENGTH, MIN_LENGTH, generate, strengthLabel } from "./lib/generator.js";

const USAGE = `Usage: node cli.js [options]

  --length N          password length, ${MIN_LENGTH}-${MAX_LENGTH} (default ${DEFAULTS.length})
  --count N           how many passwords to print (default 1)
  --no-lower          leave out a-z
  --no-upper          leave out A-Z
  --no-digits         leave out 0-9
  --no-symbols        leave out punctuation
  --keep-ambiguous    allow look-alike characters (0 O 1 l I |)
  --help              show this help
`;

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  let count = 1;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} needs a value`);
      return v;
    };
    switch (arg) {
      case "--length": {
        const n = Number(next());
        if (!Number.isInteger(n) || n < MIN_LENGTH || n > MAX_LENGTH) {
          throw new Error(`--length must be a whole number from ${MIN_LENGTH} to ${MAX_LENGTH}`);
        }
        opts.length = n;
        break;
      }
      case "--count": {
        const n = Number(next());
        if (!Number.isInteger(n) || n < 1 || n > 100) throw new Error("--count must be from 1 to 100");
        count = n;
        break;
      }
      case "--no-lower": opts.lower = false; break;
      case "--no-upper": opts.upper = false; break;
      case "--no-digits": opts.digits = false; break;
      case "--no-symbols": opts.symbols = false; break;
      case "--keep-ambiguous": opts.avoidAmbiguous = false; break;
      case "--help": case "-h":
        console.log(USAGE);
        process.exit(0);
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  return { opts, count };
}

try {
  const { opts, count } = parseArgs(process.argv.slice(2));
  for (let i = 0; i < count; i++) {
    const r = generate(opts);
    if (r.error) throw new Error(r.error);
    console.log(`${r.password}   (~${r.entropy} bits, ${strengthLabel(r.entropy)})`);
  }
} catch (err) {
  console.error(`Error: ${err.message}\n`);
  console.error(USAGE);
  process.exit(1);
}
