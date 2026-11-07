import { DurableObject } from "cloudflare:workers";

// The password generator runs entirely in the browser. This server exists only
// to satisfy the Gadget platform. It never receives, stores, or logs passwords.
export class Gadget extends DurableObject {
  async ping() {
    return "ok";
  }
}
