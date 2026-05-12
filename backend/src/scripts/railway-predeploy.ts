import { spawn } from "node:child_process";

const maxAttempts = Number(process.env.PRISMA_DEPLOY_RETRIES ?? 12);
const delayMs = Number(process.env.PRISMA_DEPLOY_RETRY_DELAY_MS ?? 5000);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runPrismaPush() {
  return new Promise<number>((resolve) => {
    const child = spawn("npx", ["prisma", "db", "push"], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`Railway predeploy: prisma db push attempt ${attempt}/${maxAttempts}`);
  const code = await runPrismaPush();
  if (code === 0) {
    console.log("Railway predeploy: prisma db push completed");
    process.exit(0);
  }

  if (attempt < maxAttempts) {
    console.log(`Railway predeploy: database not ready, retrying in ${delayMs}ms`);
    await wait(delayMs);
  }
}

console.error("Railway predeploy: prisma db push failed after all retries");
process.exit(1);
