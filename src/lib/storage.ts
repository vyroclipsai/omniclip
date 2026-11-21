import fs from "fs";
import path from "path";

export interface StorageFile {
  key: string;
  buffer: Buffer;
  contentType?: string;
}

export interface StorageProvider {
  save(key: string, data: Buffer | string, contentType?: string): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

/**
 * Local filesystem storage provider (default).
 * Saves files into data/storage and serves via /api/media.
 */
export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), "data", "storage");
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async save(key: string, data: Buffer | string): Promise<string> {
    const fullPath = path.join(this.baseDir, key);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
    await fs.promises.writeFile(fullPath, buffer);
    return this.getUrl(key);
  }

  async get(key: string): Promise<Buffer | null> {
    const fullPath = path.join(this.baseDir, key);
    if (!fs.existsSync(fullPath)) return null;
    return await fs.promises.readFile(fullPath);
  }

  async delete(key: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, key);
    if (!fs.existsSync(fullPath)) return false;
    await fs.promises.unlink(fullPath);
    return true;
  }

  getUrl(key: string): string {
    const fullPath = path.join(this.baseDir, key);
    return `/api/media?file=${encodeURIComponent(fullPath)}`;
  }
}

/**
 * S3 / Cloudflare R2 compatible storage provider interface.
 * Activates when S3_BUCKET and S3_ENDPOINT are configured.
 */
export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private endpoint?: string;
  private publicUrlPrefix: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "omniclip-media";
    this.endpoint = process.env.S3_ENDPOINT;
    this.publicUrlPrefix = process.env.S3_PUBLIC_URL || `https://${this.bucket}.s3.amazonaws.com`;
  }

  async save(key: string, data: Buffer | string): Promise<string> {
    // Ready for @aws-sdk/client-s3 PutObjectCommand
    console.log(`[Storage] Simulated S3 PutObject to s3://${this.bucket}/${key}`);
    return this.getUrl(key);
  }

  async get(key: string): Promise<Buffer | null> {
    console.log(`[Storage] Simulated S3 GetObject from s3://${this.bucket}/${key}`);
    return null;
  }

  async delete(key: string): Promise<boolean> {
    console.log(`[Storage] Simulated S3 DeleteObject from s3://${this.bucket}/${key}`);
    return true;
  }

  getUrl(key: string): string {
    return `${this.publicUrlPrefix}/${key}`;
  }
}

// Singleton storage export
export const storage: StorageProvider =
  process.env.STORAGE_DRIVER === "s3" && process.env.S3_BUCKET
    ? new S3StorageProvider()
    : new LocalStorageProvider();
