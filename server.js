import { DurableObject } from "cloudflare:workers";

// Server side of the Gadget.
//
// The Gadget platform expects a Durable Object class named "Gadget".
// The password generator does all its work in the browser (client.js),
// so this class has no real job. It exists so the platform has something
// to run. It never receives, stores, or logs passwords.
export class Gadget extends DurableObject {
  // A simple health-check method. The client doesn't call it; it's here
  // only so the class has one method to show it's alive.
  async ping() {
    return "ok";
  }
}
