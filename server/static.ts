import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  let distPath: string;

  if (process.env.ELECTRON_IS_PACKAGED === "true" && process.env.ELECTRON_RESOURCES_PATH) {
    distPath = path.join(
      process.env.ELECTRON_RESOURCES_PATH,
      "app.asar.unpacked",
      "dist",
      "public"
    );
  } else {
    distPath = path.resolve(__dirname, "public");
  }

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
