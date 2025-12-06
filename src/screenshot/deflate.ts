/**
 * DEFLATE Compression/Decompression
 * Pure JavaScript implementation for PNG support
 */

/**
 * Adler-32 checksum for zlib
 */
export function adler32(data: Uint8Array): number {
  let a = 1
  let b = 0
  const MOD = 65521

  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD
    b = (b + a) % MOD
  }

  return (b << 16) | a
}

/**
 * CRC32 lookup table
 */
let crc32Table: Uint32Array | null = null

function getCrc32Table(): Uint32Array {
  if (crc32Table)
    return crc32Table

  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c
  }

  crc32Table = table
  return table
}

/**
 * CRC32 checksum
 */
export function crc32(data: Uint8Array): number {
  const table = getCrc32Table()
  let crc = 0xFFFFFFFF

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }

  return crc ^ 0xFFFFFFFF
}

/**
 * Fixed Huffman code tables for DEFLATE
 */
const FIXED_LITERAL_LENGTHS = new Uint8Array(288)
const FIXED_DISTANCE_LENGTHS = new Uint8Array(32)

// Initialize fixed Huffman tables
for (let i = 0; i <= 143; i++) FIXED_LITERAL_LENGTHS[i] = 8
for (let i = 144; i <= 255; i++) FIXED_LITERAL_LENGTHS[i] = 9
for (let i = 256; i <= 279; i++) FIXED_LITERAL_LENGTHS[i] = 7
for (let i = 280; i <= 287; i++) FIXED_LITERAL_LENGTHS[i] = 8
for (let i = 0; i < 32; i++) FIXED_DISTANCE_LENGTHS[i] = 5

/**
 * Length code base values and extra bits
 */
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
]

const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
  3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
]

/**
 * Distance code base values and extra bits
 */
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
]

const DISTANCE_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
  7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
]

/**
 * Huffman tree node
 */
interface HuffmanNode {
  symbol?: number
  left?: HuffmanNode
  right?: HuffmanNode
}

/**
 * Build Huffman tree from code lengths
 */
function buildHuffmanTree(codeLengths: Uint8Array, maxSymbol: number): HuffmanNode {
  const root: HuffmanNode = {}

  // Find max code length
  let maxLen = 0
  for (let i = 0; i <= maxSymbol; i++) {
    if (codeLengths[i] > maxLen)
      maxLen = codeLengths[i]
  }

  if (maxLen === 0)
    return root

  // Count codes of each length
  const blCount = new Uint16Array(maxLen + 1)
  for (let i = 0; i <= maxSymbol; i++) {
    if (codeLengths[i] > 0)
      blCount[codeLengths[i]]++
  }

  // Calculate starting codes for each length
  const nextCode = new Uint16Array(maxLen + 1)
  let code = 0
  for (let bits = 1; bits <= maxLen; bits++) {
    code = (code + blCount[bits - 1]) << 1
    nextCode[bits] = code
  }

  // Build tree
  for (let symbol = 0; symbol <= maxSymbol; symbol++) {
    const len = codeLengths[symbol]
    if (len === 0)
      continue

    code = nextCode[len]++
    let node = root

    for (let bit = len - 1; bit >= 0; bit--) {
      const b = (code >> bit) & 1
      if (b === 0) {
        if (!node.left)
          node.left = {}
        node = node.left
      }
      else {
        if (!node.right)
          node.right = {}
        node = node.right
      }
    }
    node.symbol = symbol
  }

  return root
}

/**
 * Bit reader for decompression
 */
class BitReader {
  private data: Uint8Array
  private pos: number = 0
  private bitPos: number = 0
  private currentByte: number = 0

  constructor(data: Uint8Array) {
    this.data = data
    if (data.length > 0) {
      this.currentByte = data[0]
    }
  }

  readBit(): number {
    if (this.pos >= this.data.length)
      return 0

    const bit = (this.currentByte >> this.bitPos) & 1
    this.bitPos++

    if (this.bitPos === 8) {
      this.bitPos = 0
      this.pos++
      if (this.pos < this.data.length) {
        this.currentByte = this.data[this.pos]
      }
    }

    return bit
  }

  readBits(n: number): number {
    let value = 0
    for (let i = 0; i < n; i++) {
      value |= this.readBit() << i
    }
    return value
  }

  readBitsReverse(n: number): number {
    let value = 0
    for (let i = 0; i < n; i++) {
      value = (value << 1) | this.readBit()
    }
    return value
  }

  alignToByte(): void {
    if (this.bitPos > 0) {
      this.bitPos = 0
      this.pos++
      if (this.pos < this.data.length) {
        this.currentByte = this.data[this.pos]
      }
    }
  }

  readByte(): number {
    this.alignToByte()
    if (this.pos >= this.data.length)
      return 0
    const byte = this.data[this.pos]
    this.pos++
    if (this.pos < this.data.length) {
      this.currentByte = this.data[this.pos]
    }
    return byte
  }

  readUInt16LE(): number {
    const low = this.readByte()
    const high = this.readByte()
    return low | (high << 8)
  }

  get bytesRemaining(): number {
    return this.data.length - this.pos
  }

  readSymbol(tree: HuffmanNode): number {
    let node = tree
    while (node.symbol === undefined) {
      const bit = this.readBit()
      node = bit === 0 ? node.left! : node.right!
      if (!node)
        throw new Error('Invalid Huffman code')
    }
    return node.symbol
  }
}

/**
 * Inflate (decompress) zlib-wrapped DEFLATE data
 */
export function inflate(data: Uint8Array | Buffer): Uint8Array {
  const input = data instanceof Uint8Array ? data : new Uint8Array(data)

  // Check zlib header
  if (input.length < 6)
    throw new Error('Data too short for zlib')

  const cmf = input[0]
  const flg = input[1]

  // Check header
  if ((cmf * 256 + flg) % 31 !== 0)
    throw new Error('Invalid zlib header')

  const cm = cmf & 0x0F
  if (cm !== 8)
    throw new Error('Unsupported compression method')

  // Skip header, decompress
  const deflateData = input.subarray(2, input.length - 4)
  return inflateRaw(deflateData)
}

/**
 * Inflate raw DEFLATE data (without zlib wrapper)
 */
export function inflateRaw(data: Uint8Array): Uint8Array {
  const reader = new BitReader(data)
  const output: number[] = []

  let bfinal = 0

  while (bfinal === 0) {
    bfinal = reader.readBit()
    const btype = reader.readBits(2)

    if (btype === 0) {
      // Stored block
      reader.alignToByte()
      const len = reader.readUInt16LE()
      reader.readUInt16LE() // nlen (complement)

      for (let i = 0; i < len; i++) {
        output.push(reader.readByte())
      }
    }
    else if (btype === 1) {
      // Fixed Huffman codes
      const literalTree = buildHuffmanTree(FIXED_LITERAL_LENGTHS, 287)
      const distanceTree = buildHuffmanTree(FIXED_DISTANCE_LENGTHS, 31)

      decodeBlock(reader, literalTree, distanceTree, output)
    }
    else if (btype === 2) {
      // Dynamic Huffman codes
      const hlit = reader.readBits(5) + 257
      const hdist = reader.readBits(5) + 1
      const hclen = reader.readBits(4) + 4

      // Read code length code lengths
      const codeLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
      const codeLengthLengths = new Uint8Array(19)

      for (let i = 0; i < hclen; i++) {
        codeLengthLengths[codeLengthOrder[i]] = reader.readBits(3)
      }

      const codeLengthTree = buildHuffmanTree(codeLengthLengths, 18)

      // Read literal/length and distance code lengths
      const allLengths = new Uint8Array(hlit + hdist)
      let i = 0

      while (i < allLengths.length) {
        const symbol = reader.readSymbol(codeLengthTree)

        if (symbol < 16) {
          allLengths[i++] = symbol
        }
        else if (symbol === 16) {
          const repeat = reader.readBits(2) + 3
          const prev = i > 0 ? allLengths[i - 1] : 0
          for (let j = 0; j < repeat && i < allLengths.length; j++) {
            allLengths[i++] = prev
          }
        }
        else if (symbol === 17) {
          const repeat = reader.readBits(3) + 3
          for (let j = 0; j < repeat && i < allLengths.length; j++) {
            allLengths[i++] = 0
          }
        }
        else if (symbol === 18) {
          const repeat = reader.readBits(7) + 11
          for (let j = 0; j < repeat && i < allLengths.length; j++) {
            allLengths[i++] = 0
          }
        }
      }

      const literalLengths = allLengths.subarray(0, hlit)
      const distanceLengths = allLengths.subarray(hlit)

      const literalTree = buildHuffmanTree(literalLengths, hlit - 1)
      const distanceTree = buildHuffmanTree(distanceLengths, hdist - 1)

      decodeBlock(reader, literalTree, distanceTree, output)
    }
    else {
      throw new Error('Invalid block type')
    }
  }

  return new Uint8Array(output)
}

/**
 * Decode a Huffman-coded block
 */
function decodeBlock(
  reader: BitReader,
  literalTree: HuffmanNode,
  distanceTree: HuffmanNode,
  output: number[],
): void {
  while (true) {
    const symbol = reader.readSymbol(literalTree)

    if (symbol < 256) {
      // Literal byte
      output.push(symbol)
    }
    else if (symbol === 256) {
      // End of block
      break
    }
    else {
      // Length/distance pair
      const lengthCode = symbol - 257
      if (lengthCode >= LENGTH_BASE.length)
        throw new Error('Invalid length code')

      let length = LENGTH_BASE[lengthCode]
      const extraLengthBits = LENGTH_EXTRA[lengthCode]
      if (extraLengthBits > 0) {
        length += reader.readBits(extraLengthBits)
      }

      const distanceCode = reader.readSymbol(distanceTree)
      if (distanceCode >= DISTANCE_BASE.length)
        throw new Error('Invalid distance code')

      let distance = DISTANCE_BASE[distanceCode]
      const extraDistBits = DISTANCE_EXTRA[distanceCode]
      if (extraDistBits > 0) {
        distance += reader.readBits(extraDistBits)
      }

      // Copy bytes from output buffer
      const start = output.length - distance
      for (let i = 0; i < length; i++) {
        output.push(output[start + i])
      }
    }
  }
}

/**
 * Bit writer for compression
 */
class BitWriter {
  private data: number[] = []
  private currentByte: number = 0
  private bitPos: number = 0

  writeBit(bit: number): void {
    this.currentByte |= (bit & 1) << this.bitPos
    this.bitPos++

    if (this.bitPos === 8) {
      this.data.push(this.currentByte)
      this.currentByte = 0
      this.bitPos = 0
    }
  }

  writeBits(value: number, n: number): void {
    for (let i = 0; i < n; i++) {
      this.writeBit((value >> i) & 1)
    }
  }

  writeBitsReverse(value: number, n: number): void {
    for (let i = n - 1; i >= 0; i--) {
      this.writeBit((value >> i) & 1)
    }
  }

  alignToByte(): void {
    if (this.bitPos > 0) {
      this.data.push(this.currentByte)
      this.currentByte = 0
      this.bitPos = 0
    }
  }

  writeByte(byte: number): void {
    if (this.bitPos === 0) {
      this.data.push(byte & 0xFF)
    }
    else {
      this.writeBits(byte, 8)
    }
  }

  writeUInt16LE(value: number): void {
    this.writeByte(value & 0xFF)
    this.writeByte((value >> 8) & 0xFF)
  }

  finish(): Uint8Array {
    this.alignToByte()
    return new Uint8Array(this.data)
  }
}

/**
 * Build Huffman codes from code lengths
 */
function buildHuffmanCodes(lengths: Uint8Array): Map<number, { code: number, bits: number }> {
  const codes = new Map<number, { code: number, bits: number }>()
  const maxLen = Math.max(...lengths)

  if (maxLen === 0)
    return codes

  // Count codes of each length
  const blCount = new Uint16Array(maxLen + 1)
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] > 0)
      blCount[lengths[i]]++
  }

  // Calculate starting codes for each length
  const nextCode = new Uint16Array(maxLen + 1)
  let code = 0
  for (let bits = 1; bits <= maxLen; bits++) {
    code = (code + blCount[bits - 1]) << 1
    nextCode[bits] = code
  }

  // Assign codes
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const len = lengths[symbol]
    if (len > 0) {
      codes.set(symbol, { code: nextCode[len]++, bits: len })
    }
  }

  return codes
}

/**
 * Get length code for a match length
 */
function getLengthCode(length: number): { code: number, extra: number, extraBits: number } {
  for (let i = 0; i < LENGTH_BASE.length; i++) {
    const nextBase = i + 1 < LENGTH_BASE.length ? LENGTH_BASE[i + 1] : 259
    if (length < nextBase) {
      return {
        code: i + 257,
        extra: length - LENGTH_BASE[i],
        extraBits: LENGTH_EXTRA[i],
      }
    }
  }
  return { code: 285, extra: 0, extraBits: 0 }
}

/**
 * Get distance code for a match distance
 */
function getDistanceCode(distance: number): { code: number, extra: number, extraBits: number } {
  for (let i = 0; i < DISTANCE_BASE.length; i++) {
    const nextBase = i + 1 < DISTANCE_BASE.length ? DISTANCE_BASE[i + 1] : 32769
    if (distance < nextBase) {
      return {
        code: i,
        extra: distance - DISTANCE_BASE[i],
        extraBits: DISTANCE_EXTRA[i],
      }
    }
  }
  return { code: 29, extra: distance - DISTANCE_BASE[29], extraBits: DISTANCE_EXTRA[29] }
}

/**
 * Find longest match using simple hash chain
 */
function findMatch(
  data: Uint8Array,
  pos: number,
  hashTable: Map<number, number[]>,
  windowSize: number = 32768,
  maxLength: number = 258,
): { length: number, distance: number } | null {
  if (pos + 3 > data.length)
    return null

  const hash = ((data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2]) & 0xFFFFFF
  const positions = hashTable.get(hash)

  if (!positions || positions.length === 0)
    return null

  let bestLength = 0
  let bestDistance = 0

  for (let i = positions.length - 1; i >= 0; i--) {
    const matchPos = positions[i]
    const distance = pos - matchPos

    if (distance > windowSize)
      break

    // Count matching bytes
    let length = 0
    while (length < maxLength && pos + length < data.length && data[matchPos + length] === data[pos + length]) {
      length++
    }

    if (length > bestLength) {
      bestLength = length
      bestDistance = distance
      if (length >= maxLength)
        break
    }
  }

  // Minimum match length is 3
  if (bestLength >= 3) {
    return { length: bestLength, distance: bestDistance }
  }

  return null
}

/**
 * Update hash table with new position
 */
function updateHash(
  data: Uint8Array,
  pos: number,
  hashTable: Map<number, number[]>,
  maxChain: number = 4096,
): void {
  if (pos + 3 > data.length)
    return

  const hash = ((data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2]) & 0xFFFFFF
  let positions = hashTable.get(hash)

  if (!positions) {
    positions = []
    hashTable.set(hash, positions)
  }

  positions.push(pos)

  // Limit chain length
  if (positions.length > maxChain) {
    positions.shift()
  }
}

/**
 * Deflate (compress) data with zlib wrapper
 */
export function deflate(data: Uint8Array): Uint8Array {
  // Zlib header: CMF=0x78 (deflate, 32K window), FLG=0x9C (default compression, check bits)
  const header = new Uint8Array([0x78, 0x9C])

  const deflated = deflateRaw(data)

  // Adler-32 checksum
  const checksum = adler32(data)
  const checksumBytes = new Uint8Array(4)
  checksumBytes[0] = (checksum >> 24) & 0xFF
  checksumBytes[1] = (checksum >> 16) & 0xFF
  checksumBytes[2] = (checksum >> 8) & 0xFF
  checksumBytes[3] = checksum & 0xFF

  // Combine
  const result = new Uint8Array(header.length + deflated.length + checksumBytes.length)
  result.set(header, 0)
  result.set(deflated, header.length)
  result.set(checksumBytes, header.length + deflated.length)

  return result
}

/**
 * Deflate raw data (no zlib wrapper) using fixed Huffman codes with LZ77
 */
export function deflateRaw(data: Uint8Array): Uint8Array {
  const writer = new BitWriter()

  // For small data, use stored blocks
  if (data.length < 100) {
    return deflateStore(data)
  }

  // Use fixed Huffman codes with LZ77 compression
  const literalCodes = buildHuffmanCodes(FIXED_LITERAL_LENGTHS)
  const distanceCodes = buildHuffmanCodes(FIXED_DISTANCE_LENGTHS)

  // BFINAL=1, BTYPE=01 (fixed Huffman)
  writer.writeBit(1) // final block
  writer.writeBits(1, 2) // fixed Huffman

  const hashTable = new Map<number, number[]>()
  let pos = 0

  while (pos < data.length) {
    const match = findMatch(data, pos, hashTable)

    if (match && match.length >= 3) {
      // Output length/distance pair
      const lc = getLengthCode(match.length)
      const dc = getDistanceCode(match.distance)

      const litCode = literalCodes.get(lc.code)!
      writer.writeBitsReverse(litCode.code, litCode.bits)
      if (lc.extraBits > 0) {
        writer.writeBits(lc.extra, lc.extraBits)
      }

      const distCode = distanceCodes.get(dc.code)!
      writer.writeBitsReverse(distCode.code, distCode.bits)
      if (dc.extraBits > 0) {
        writer.writeBits(dc.extra, dc.extraBits)
      }

      // Update hash for all positions in match
      for (let i = 0; i < match.length; i++) {
        updateHash(data, pos + i, hashTable)
      }
      pos += match.length
    }
    else {
      // Output literal
      const code = literalCodes.get(data[pos])!
      writer.writeBitsReverse(code.code, code.bits)
      updateHash(data, pos, hashTable)
      pos++
    }
  }

  // End of block symbol (256)
  const endCode = literalCodes.get(256)!
  writer.writeBitsReverse(endCode.code, endCode.bits)

  return writer.finish()
}

/**
 * Deflate using stored blocks only (no compression)
 */
export function deflateStore(data: Uint8Array): Uint8Array {
  const writer = new BitWriter()
  const maxBlockSize = 65535
  let offset = 0

  while (offset < data.length) {
    const remaining = data.length - offset
    const blockSize = Math.min(remaining, maxBlockSize)
    const isLast = offset + blockSize >= data.length

    // Block header
    writer.writeBit(isLast ? 1 : 0) // BFINAL
    writer.writeBits(0, 2) // BTYPE = stored

    writer.alignToByte()
    writer.writeUInt16LE(blockSize)
    writer.writeUInt16LE(~blockSize & 0xFFFF)

    // Block data
    for (let i = 0; i < blockSize; i++) {
      writer.writeByte(data[offset + i])
    }

    offset += blockSize
  }

  return writer.finish()
}
