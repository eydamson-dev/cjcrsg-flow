import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { StorageService, StoredObject } from "./storage-service.js";

export class LocalFilesystemStorage implements StorageService {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }

  async write(key: string, content: Uint8Array): Promise<StoredObject> {
    const path = this.resolveKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);

    return { key, size: content.byteLength };
  }

  async read(key: string): Promise<Uint8Array> {
    return readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    // rm already ignores missing files with force: true.
    await rm(this.resolveKey(key), { force: true });
  }

  private resolveKey(key: string): string {
    const path = resolve(this.basePath, key);

    if (path !== this.basePath && !path.startsWith(`${this.basePath}${sep}`)) {
      throw new Error("Storage key must resolve inside the storage directory.");
    }

    return path;
  }
}
