import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LENGTH = 64

/** Devuelve `scrypt:<salt hex>:<hash hex>`, listo para guardar. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt, KEY_LENGTH)
  return `scrypt:${salt.toString('hex')}:${key.toString('hex')}`
}

/** Compara en tiempo constante. Un hash con formato desconocido nunca valida. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split(':')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false

  const expected = Buffer.from(keyHex, 'hex')
  if (expected.length !== KEY_LENGTH) return false

  const actual = await derive(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH)
  return timingSafeEqual(actual, expected)
}
