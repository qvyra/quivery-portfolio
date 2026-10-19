// Dev server a phone on the same network can reach (npm run dev:lan)
import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { lanAddresses } from "./lan.mjs";

const port = process.env.PORT ?? "3000";
const addresses = lanAddresses();

console.log("");
if (addresses.length === 0) {
  console.log(
    "  No local network address found. Is Wi-Fi or Ethernet connected?",
  );
} else {
  console.log("  Open on your phone (same Wi-Fi as this PC):");
  for (const { name, address } of addresses) {
    console.log(`    http://${address}:${port}/dev/design   (${name})`);
  }
  console.log("");
  console.log(
    '  Use these, not the "Network" URL Next prints below: that one can',
  );
  console.log(
    "  be a virtual adapter (Hyper-V, WSL, Docker) your phone can't reach.",
  );
}
console.log("");

// listens on every interface, next.config.ts allows these as dev origins
const next = fileURLToPath(import.meta.resolve("next/dist/bin/next"));
const child = spawn(
  process.execPath,
  [next, "dev", "--hostname", "0.0.0.0", "--port", port],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
