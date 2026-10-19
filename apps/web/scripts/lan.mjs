import os from "node:os";

// adapters other devices can't reach: Hyper-V/WSL switches, Docker,
// VirtualBox/VMware, Bluetooth PAN and loopback
const VIRTUAL =
  /vEthernet|WSL|Hyper-V|Default Switch|Docker|docker|br-|veth|VirtualBox|vboxnet|VMware|Bluetooth|Loopback/i;

const isPrivate = (ip) =>
  /^10\./.test(ip) ||
  /^192\.168\./.test(ip) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

/**
 * This machine's LAN IPv4 addresses (Wi-Fi, Ethernet), the ones a phone on the
 * same network can open
 * @returns {{ name: string, address: string }[]}
 */
export function lanAddresses() {
  const found = [];
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL.test(name)) continue;
    for (const address of addresses ?? []) {
      // isPrivate also skips 169.254.x.x (no DHCP lease, unreachable)
      if (address.family !== "IPv4" || address.internal) continue;
      if (isPrivate(address.address))
        found.push({ name, address: address.address });
    }
  }
  return found;
}
