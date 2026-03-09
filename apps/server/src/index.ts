import "reflect-metadata";
import { container, CreateServer } from "./app";

const server = container.resolve(CreateServer);
server.create().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
