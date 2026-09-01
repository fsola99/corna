import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL

if (!url) throw new Error('Falta DATABASE_URL. Copiá .env.example a .env.local y completala.')

/**
 * Neon se consulta por HTTP, que es lo que sobrevive a las funciones efímeras
 * de Vercel. Cualquier otro host usa el driver TCP común, para correr contra un
 * Postgres local. Las dos variantes exponen la misma API de consulta, así que
 * el resto del código no distingue cuál está usando.
 */
export const db = (
  url.includes('.neon.tech') ? drizzleHttp(neon(url), { schema }) : drizzleNode(url, { schema })
) as NeonHttpDatabase<typeof schema>
