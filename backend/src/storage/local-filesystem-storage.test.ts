import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalFilesystemStorage } from "./local-filesystem-storage.js";

let temporaryDirectory: string | undefined;

afterEach(async () => {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = undefined;
  }
});

describe("LocalFilesystemStorage", () => {
  it("stores and retrieves content beneath its configured directory", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "cjcrsg-flow-"));
    const storage = new LocalFilesystemStorage(temporaryDirectory);

    await storage.write("exports/design.png", new TextEncoder().encode("image"));

    const content = await storage.read("exports/design.png");

    expect([...content]).toEqual([...new TextEncoder().encode("image")]);
  });

  it("rejects keys that escape the configured directory", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "cjcrsg-flow-"));
    const storage = new LocalFilesystemStorage(temporaryDirectory);

    await expect(storage.write("../../outside", new Uint8Array())).rejects.toThrow(
      "Storage key must resolve inside the storage directory.",
    );
  });
});
