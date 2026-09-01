import { db } from './index'
import { exercises } from './schema'

/** Catálogo inicial: lo que hay en cualquier gimnasio de barrio. */
const CATALOG: { name: string; zone: string }[] = [
  { name: 'Remo T', zone: 'Espalda' },
  { name: 'Jalón al pecho', zone: 'Espalda' },
  { name: 'Remo con barra', zone: 'Espalda' },
  { name: 'Remo en polea baja', zone: 'Espalda' },
  { name: 'Dominadas', zone: 'Espalda' },
  { name: 'Pullover en polea', zone: 'Espalda' },

  { name: 'Press banca', zone: 'Pecho' },
  { name: 'Press inclinado con mancuernas', zone: 'Pecho' },
  { name: 'Press plano con mancuernas', zone: 'Pecho' },
  { name: 'Aperturas en peck deck', zone: 'Pecho' },
  { name: 'Cruces en poleas', zone: 'Pecho' },
  { name: 'Fondos en paralelas', zone: 'Pecho' },

  { name: 'Vuelos laterales', zone: 'Hombro' },
  { name: 'Vuelos posteriores', zone: 'Hombro' },
  { name: 'Press militar', zone: 'Hombro' },
  { name: 'Press Arnold', zone: 'Hombro' },
  { name: 'Elevaciones frontales', zone: 'Hombro' },
  { name: 'Face pull', zone: 'Hombro' },

  { name: 'Bíceps con mancuerna', zone: 'Brazo' },
  { name: 'Curl con barra Z', zone: 'Brazo' },
  { name: 'Martillo', zone: 'Brazo' },
  { name: 'Curl en banco inclinado', zone: 'Brazo' },
  { name: 'Tríceps en polea', zone: 'Brazo' },
  { name: 'Francés con mancuerna', zone: 'Brazo' },
  { name: 'Fondos en banco', zone: 'Brazo' },

  { name: 'Sentadilla', zone: 'Pierna' },
  { name: 'Prensa 45°', zone: 'Pierna' },
  { name: 'Extensiones de cuádriceps', zone: 'Pierna' },
  { name: 'Camilla femoral', zone: 'Pierna' },
  { name: 'Peso muerto rumano', zone: 'Pierna' },
  { name: 'Zancadas', zone: 'Pierna' },
  { name: 'Hip thrust', zone: 'Pierna' },
  { name: 'Gemelos de pie', zone: 'Pierna' },

  { name: 'Plancha', zone: 'Core' },
  { name: 'Abdominales en polea', zone: 'Core' },
  { name: 'Rueda abdominal', zone: 'Core' },
  { name: 'Elevación de piernas colgado', zone: 'Core' },
]

async function seed() {
  const inserted = await db
    .insert(exercises)
    .values(CATALOG)
    .onConflictDoNothing({ target: exercises.name })
    .returning({ name: exercises.name })

  console.log(`Catálogo: ${inserted.length} ejercicios nuevos, ${CATALOG.length} en total.`)
}

seed().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
