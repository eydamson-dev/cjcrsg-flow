export interface StoredObject {
  key: string;
  size: number;
}

export interface StorageService {
  write(key: string, content: Uint8Array): Promise<StoredObject>;
  read(key: string): Promise<Uint8Array>;
}
