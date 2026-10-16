import { OG_ASSET_DATA } from '@/og/ogAssetData';

/** Returns an embedded card asset (font or logo). Assets are inlined so no file tracing is needed at deploy time. */
export async function readOgAsset(fileName: string): Promise<Buffer> {
    const data = Object.hasOwn(OG_ASSET_DATA, fileName) ? OG_ASSET_DATA[fileName] : undefined;
    if (data === undefined) throw new Error(`Unknown OG asset: ${fileName}`);
    return Buffer.from(data, 'base64');
}

/** Copies a Buffer's bytes into a standalone ArrayBuffer, as the image renderer expects for fonts. */
export function toArrayBuffer(buffer: Buffer): ArrayBuffer {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}
