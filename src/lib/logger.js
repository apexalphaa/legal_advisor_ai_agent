function timestamp() {
  return new Date().toISOString().split("T")[1].replace("Z", "");
}

export function step(label, message) {
  console.log(`[${timestamp()}] [${label}] ${message}`);
}

export function info(message) {
  console.log(`[${timestamp()}] ${message}`);
}

export function warn(message) {
  console.warn(`[${timestamp()}] WARN: ${message}`);
}

export function error(message) {
  console.error(`[${timestamp()}] ERROR: ${message}`);
}
