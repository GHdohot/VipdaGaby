import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const site = path.join(root, "public");
await mkdir(site, { recursive: true });
await cp(path.join(root, "landing"), site, { recursive: true });
await cp(path.join(root, "dashboard"), path.join(site, "dashboard"), { recursive: true });
console.log("Build Vercel pronto: public/; painel: /dashboard/admin.html");
