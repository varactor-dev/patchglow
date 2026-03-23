/**
 * Encode/decode patch JSON to/from compact URL-safe strings.
 * Uses deflate-raw compression + base64url encoding.
 */

async function compress(data: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(data)
  const cs = new CompressionStream('deflate-raw')
  const writer = cs.writable.getWriter()
  writer.write(input)
  writer.close()
  const chunks: Uint8Array[] = []
  const reader = cs.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

async function decompress(data: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  writer.write(data as unknown as BufferSource)
  writer.close()
  const chunks: Uint8Array[] = []
  const reader = ds.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(result)
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - str.length % 4) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function encodePatchToUrl(patchJson: string): Promise<string> {
  // Strip pretty-print for compact encoding
  const compact = JSON.stringify(JSON.parse(patchJson))
  const compressed = await compress(compact)
  const encoded = toBase64Url(compressed)
  return `${window.location.origin}${window.location.pathname}#patch=${encoded}`
}

export async function decodePatchFromUrl(): Promise<string | null> {
  const hash = window.location.hash
  if (!hash.startsWith('#patch=')) return null
  const encoded = hash.slice('#patch='.length)
  if (!encoded) return null
  try {
    const bytes = fromBase64Url(encoded)
    return await decompress(bytes)
  } catch {
    return null
  }
}

export function clearPatchHash(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
