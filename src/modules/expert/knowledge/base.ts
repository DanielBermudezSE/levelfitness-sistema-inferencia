/**
 * CONOCIMIENTO DEL EXPERTO HUMANO (nutrición deportiva) en forma declarativa.
 *
 * Este archivo es la fuente que el script `seed:expert` carga en la base de
 * conocimiento (tablas expert_*). Una vez cargado, el conocimiento se mantiene
 * desde el Admin (módulo de adquisición de conocimiento) sin tocar código.
 *
 * Convenciones del factor de certeza (FC, escala MYCIN -1..1):
 *    0.8 – 1.0  evidencia fuerte / indicación clara
 *    0.5 – 0.7  evidencia moderada
 *    0.2 – 0.4  evidencia débil / beneficio marginal
 *   -0.2 – -0.7 desaconsejado (resta certeza)
 *   -1          contraindicado (veto absoluto)
 *
 * IMPORTANTE: es una herramienta de orientación general sobre suplementos de
 * venta libre; no reemplaza la valoración de un profesional de la salud.
 */

export type VariableSeed = {
  code: string
  name: string
  question?: string
  help?: string
  kind?: "input" | "derived"
  input_type: "single" | "multi" | "number"
  unit?: string
  min?: number
  max?: number
  options?: [string, string][]
}

export type HypothesisSeed = {
  code: string
  name: string
  description: string
  kind?: "product" | "advice"
  product_match?: {
    categories?: string[]
    include?: string
    exclude?: string
    /** Grupo de exclusión: de varias hipótesis del mismo grupo solo se recomienda la de mayor certeza. */
    group?: string
  }
  usage?: string
}

type Cond = [variable: string, operator: string, value: string]

export type RuleSeed = {
  code: string
  name: string
  conditions: Cond[]
  /** Conclusión: hipótesis (h) o hecho intermedio (f = [variable, valor]). */
  h?: string
  f?: [string, string]
  cf: number
  explanation: string
  priority?: number
  source?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIABLES (atributos del dominio)
// ─────────────────────────────────────────────────────────────────────────────
export const VARIABLES: VariableSeed[] = [
  {
    code: "objetivo",
    name: "Objetivo",
    question: "¿Cuál es tu objetivo principal?",
    input_type: "single",
    options: [
      ["ganar_masa", "Ganar masa muscular (volumen)"],
      ["bajar_grasa", "Bajar grasa (definición)"],
      ["recomposicion", "Recomposición: ganar músculo y perder grasa"],
      ["rendimiento", "Más energía y rendimiento en el entreno"],
      ["resistencia", "Mejorar resistencia (correr, ciclismo, natación)"],
      ["bienestar", "Salud y bienestar general"],
    ],
  },
  {
    code: "sexo",
    name: "Sexo",
    question: "¿Cuál es tu sexo biológico?",
    help: "Influye en necesidades de micronutrientes y en qué productos hormonales son seguros.",
    input_type: "single",
    options: [
      ["hombre", "Hombre"],
      ["mujer", "Mujer"],
    ],
  },
  {
    code: "edad",
    name: "Edad",
    question: "¿Cuántos años tienes?",
    input_type: "number",
    unit: "años",
    min: 14,
    max: 90,
  },
  {
    code: "peso",
    name: "Peso",
    question: "¿Cuánto pesas?",
    input_type: "number",
    unit: "kg",
    min: 35,
    max: 250,
  },
  {
    code: "estatura",
    name: "Estatura",
    question: "¿Cuánto mides?",
    input_type: "number",
    unit: "cm",
    min: 130,
    max: 220,
  },
  {
    code: "experiencia",
    name: "Tiempo entrenando",
    question: "¿Cuánto tiempo llevas entrenando de forma constante?",
    input_type: "single",
    options: [
      ["principiante", "Menos de 6 meses"],
      ["intermedio", "Entre 6 meses y 2 años"],
      ["avanzado", "Más de 2 años"],
    ],
  },
  {
    code: "frecuencia",
    name: "Frecuencia semanal",
    question: "¿Cuántos días a la semana entrenas?",
    input_type: "number",
    unit: "días/semana",
    min: 0,
    max: 7,
  },
  {
    code: "duracion",
    name: "Duración de la sesión",
    question: "¿Cuánto dura en promedio cada sesión?",
    input_type: "number",
    unit: "minutos",
    min: 0,
    max: 300,
  },
  {
    code: "tipo_entrenamiento",
    name: "Tipo de entrenamiento",
    question: "¿Qué tipo de entrenamiento haces principalmente?",
    input_type: "single",
    options: [
      ["fuerza", "Pesas / fuerza (gimnasio)"],
      ["resistencia", "Cardio / resistencia (correr, bici, nadar)"],
      ["mixto", "Funcional / CrossFit"],
      ["equipo", "Deporte de equipo o de contacto"],
    ],
  },
  {
    code: "horario",
    name: "Horario de entrenamiento",
    question: "¿A qué hora sueles entrenar?",
    input_type: "single",
    options: [
      ["manana", "En la mañana"],
      ["tarde", "En la tarde"],
      ["noche", "En la noche"],
    ],
  },
  {
    code: "dieta",
    name: "Tipo de dieta",
    question: "¿Cómo es tu alimentación?",
    input_type: "single",
    options: [
      ["omnivora", "Como de todo"],
      ["vegetariana", "Vegetariana"],
      ["vegana", "Vegana"],
    ],
  },
  {
    code: "proteina_dieta",
    name: "Proteína en la dieta",
    question: "¿Cuánta proteína consumes en tus comidas?",
    help: "Carnes, huevos, lácteos, legumbres…",
    input_type: "single",
    options: [
      ["baja", "Poca"],
      ["adecuada", "Normal"],
      ["alta", "Mucha (en casi todas las comidas)"],
    ],
  },
  {
    code: "metabolismo",
    name: "Facilidad para subir de peso",
    question: "¿Cómo es tu facilidad para subir de peso?",
    input_type: "single",
    options: [
      ["me_cuesta_subir", "Me cuesta mucho subir de peso"],
      ["normal", "Normal"],
      ["subo_facil", "Subo de peso con facilidad"],
    ],
  },
  {
    code: "salud",
    name: "Condiciones de salud",
    question: "¿Tienes alguna de estas condiciones?",
    help: "Puedes marcar varias. Es clave para no recomendarte algo contraindicado.",
    input_type: "multi",
    options: [
      ["ninguna", "Ninguna"],
      ["hipertension", "Hipertensión"],
      ["cardiaca", "Enfermedad cardíaca o arritmias"],
      ["diabetes", "Diabetes o resistencia a la insulina"],
      ["renal", "Enfermedad renal"],
      ["hepatica", "Enfermedad hepática"],
      ["embarazo", "Embarazo o lactancia"],
      ["lactosa", "Intolerancia a la lactosa"],
      ["cafeina", "Sensibilidad a la cafeína"],
      ["ansiedad", "Ansiedad o insomnio"],
      ["articulaciones", "Dolor o lesión en articulaciones"],
    ],
  },
  {
    code: "presupuesto",
    name: "Presupuesto mensual",
    question: "¿Cuánto quieres invertir al mes en suplementos?",
    input_type: "number",
    unit: "COP",
    min: 30000,
    max: 3000000,
  },

  // ── Hechos deducidos por el motor (no se preguntan) ─────────────────────────
  { code: "imc", name: "Índice de masa corporal", kind: "derived", input_type: "number" },
  {
    code: "estado_peso",
    name: "Estado de peso",
    kind: "derived",
    input_type: "single",
    options: [
      ["bajo_peso", "Bajo peso"],
      ["normal", "Peso normal"],
      ["sobrepeso", "Sobrepeso"],
      ["obesidad", "Obesidad"],
    ],
  },
  {
    code: "grupo_edad",
    name: "Grupo de edad",
    kind: "derived",
    input_type: "single",
    options: [
      ["adolescente", "Adolescente"],
      ["adulto", "Adulto"],
      ["adulto_mayor", "Adulto mayor"],
    ],
  },
  {
    code: "carga_entrenamiento",
    name: "Carga de entrenamiento",
    kind: "derived",
    input_type: "single",
    options: [
      ["baja", "Baja"],
      ["moderada", "Moderada"],
      ["alta", "Alta"],
    ],
  },
  { code: "evitar_estimulantes", name: "Evitar estimulantes", kind: "derived", input_type: "single", options: [["si", "Sí"]] },
  { code: "evitar_hormonales", name: "Evitar potenciadores hormonales", kind: "derived", input_type: "single", options: [["si", "Sí"]] },
  { code: "requiere_medico", name: "Requiere valoración médica", kind: "derived", input_type: "single", options: [["si", "Sí"]] },
  { code: "perdida_electrolitos", name: "Pérdida alta de electrolitos", kind: "derived", input_type: "single", options: [["si", "Sí"]] },
  { code: "necesidad_proteica", name: "Necesidad proteica", kind: "derived", input_type: "single", options: [["alta", "Alta"]] },
]

// ─────────────────────────────────────────────────────────────────────────────
// HIPÓTESIS (conclusiones posibles)
// ─────────────────────────────────────────────────────────────────────────────
export const HYPOTHESES: HypothesisSeed[] = [
  {
    code: "proteina_whey",
    name: "Proteína whey",
    description: "Proteína de suero de leche de rápida absorción para completar tu requerimiento diario.",
    product_match: {
      categories: ["proteinas"],
      include: "whey|wey|protein|bipro|syntha",
      exclude: "isolat|iso 100|vegan|mass|gainer|gainz|carbs|sachet|beef|titan|pancake",
      group: "proteina",
    },
    usage: "Una porción después de entrenar o para completar la proteína del día. Sigue la porción de la etiqueta.",
  },
  {
    code: "proteina_isolatada",
    name: "Proteína whey aislada (isolate)",
    description: "Proteína de suero muy filtrada: casi sin lactosa, grasa ni carbohidratos.",
    product_match: { categories: ["proteinas"], include: "isolat|iso 100", exclude: "sachet", group: "proteina" },
    usage: "Ideal si toleras mal la lactosa o cuidas calorías. Una porción según etiqueta.",
  },
  {
    code: "proteina_vegetal",
    name: "Proteína vegetal",
    description: "Proteína de origen vegetal, apta para dietas veganas y sin lactosa.",
    product_match: { categories: ["proteinas"], include: "vegan|vegetal", group: "proteina" },
    usage: "Úsala como cualquier proteína en polvo para completar tu requerimiento diario.",
  },
  {
    code: "ganador_peso",
    name: "Ganador de peso (gainer)",
    description: "Mezcla hipercalórica de carbohidratos y proteína para subir de peso.",
    product_match: { categories: ["proteinas"], include: "mass|gainer|gainz|mega carbs", exclude: "isolat" },
    usage: "Complementa tus comidas (no las reemplaza) cuando te cuesta comer lo suficiente.",
  },
  {
    code: "creatina",
    name: "Creatina monohidratada",
    description: "El suplemento con más evidencia para fuerza, potencia y masa muscular.",
    product_match: { categories: ["creatinas"], exclude: "display" },
    usage: "3–5 g al día, todos los días (no necesitas fase de carga). Bebe suficiente agua.",
  },
  {
    code: "preentreno_estimulante",
    name: "Pre-entreno con estimulantes",
    description: "Fórmula con cafeína y otros activos para energía y enfoque en el entrenamiento.",
    product_match: {
      categories: ["pre-entreno"],
      include: "psychotic|c4|venom|kill it|intenze|pase|radical|legacy|electron|reaction|animal m stack",
      exclude: "sachet|display|caja",
      group: "preentreno",
    },
    usage: "30–45 min antes de entrenar. Evítalo en las 6 horas previas a dormir. Empieza con media porción.",
  },
  {
    code: "preentreno_sin_estimulante",
    name: "Pre-entreno sin estimulantes (óxido nítrico)",
    description: "Activos como citrulina, arginina o beta-alanina para bombeo y rendimiento, sin cafeína.",
    product_match: {
      categories: ["pre-entreno", "aminoacidos", "precursores"],
      include: "citrul|arginin|beta.?alan|oxido nitrico",
      group: "preentreno",
    },
    usage: "Antes de entrenar, según etiqueta. Apto para entrenar de noche.",
  },
  {
    code: "quemador_termogenico",
    name: "Quemador termogénico",
    description: "Apoyo al gasto energético durante un déficit calórico (contiene estimulantes).",
    product_match: { categories: ["quemadores"], exclude: "carnit" },
    usage: "Solo como apoyo a un déficit calórico real. Evítalo en la tarde-noche.",
  },
  {
    code: "l_carnitina",
    name: "L-carnitina",
    description: "Apoyo al metabolismo de las grasas, sin estimulantes.",
    product_match: { include: "carnit" },
    usage: "Antes del entrenamiento o en la mañana, según etiqueta.",
  },
  {
    code: "aminoacidos",
    name: "Aminoácidos (BCAA / EAA)",
    description: "Aminoácidos para recuperación y para sostener entrenamientos largos o intensos.",
    product_match: {
      categories: ["aminoacidos"],
      include: "bcaa|eaa|amino|army|nitro shock|smart stack",
      exclude: "sachet|carnit|glutam|arginin|citrul|beta|hmb|peptide",
    },
    usage: "Durante o después del entrenamiento, según etiqueta.",
  },
  {
    code: "glutamina",
    name: "Glutamina",
    description: "Aminoácido de apoyo a la recuperación cuando el volumen de entrenamiento es alto.",
    product_match: { include: "glutam|gl smart" },
    usage: "Después del entrenamiento o antes de dormir, según etiqueta.",
  },
  {
    code: "multivitaminico",
    name: "Multivitamínico",
    description: "Cubre posibles déficits de vitaminas y minerales de la dieta.",
    product_match: {
      include: "optimen|optiwomen|multi|the one|animal pack|survivor|vitafer|nutra c|vitamina c",
    },
    usage: "Con una comida principal, según etiqueta.",
  },
  {
    code: "omega3",
    name: "Omega 3",
    description: "Ácidos grasos EPA/DHA para salud cardiovascular, articular y antiinflamatoria.",
    product_match: { include: "omega" },
    usage: "Con las comidas, según etiqueta.",
  },
  {
    code: "colageno",
    name: "Colágeno hidrolizado",
    description: "Apoyo a articulaciones, tendones, piel y cabello.",
    product_match: { include: "col[aá]geno|collagen|korageem" },
    usage: "Una porción diaria; mejor acompañado de vitamina C.",
  },
  {
    code: "electrolitos",
    name: "Electrolitos / hidratación",
    description: "Reposición de sodio, potasio y magnesio perdidos en el sudor.",
    product_match: { include: "coyote|electrol|hidrat" },
    usage: "Durante o después de sesiones largas o con mucho sudor.",
  },
  {
    code: "magnesio_descanso",
    name: "Magnesio y adaptógenos para el descanso",
    description: "Magnesio y ashwagandha: apoyo al descanso, el estrés y la recuperación.",
    product_match: { include: "magnes|ashwag|inositol", exclude: "monster" },
    usage: "En la noche, según etiqueta.",
  },
  {
    code: "vitamina_d",
    name: "Vitamina D3 + K2",
    description: "Apoyo a la salud ósea, muscular e inmunológica.",
    product_match: { include: "d3|k2" },
    usage: "Con una comida que tenga grasa, según etiqueta.",
  },
  {
    code: "precursor_hormonal",
    name: "Potenciador hormonal natural",
    description: "Fórmulas con extractos para apoyar la producción natural de testosterona.",
    product_match: {
      categories: ["precursores"],
      include: "monster test|testo|testabolic|nova boost|wianabol|oxa-var|animal m stack",
      exclude: "girl|sleep|fema",
    },
    usage: "Solo adultos sanos con experiencia; respeta la etiqueta y los ciclos indicados.",
  },
  {
    code: "consulta_medica",
    name: "Consultar con un profesional de la salud",
    description: "Por tu condición de salud, antes de tomar suplementos consulta a tu médico o nutricionista.",
    kind: "advice",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// REGLAS
// ─────────────────────────────────────────────────────────────────────────────
const F = 100 // prioridad de reglas que deducen hechos
const V = 90 // prioridad de vetos / contraindicaciones
const P = 50 // prioridad de reglas de recomendación

export const RULES: RuleSeed[] = [
  // ── Hechos deducidos: estado de peso (IMC) ─────────────────────────────────
  { code: "RF01", name: "IMC bajo", conditions: [["imc", "lt", "18.5"]], f: ["estado_peso", "bajo_peso"], cf: 1, priority: F, explanation: "Tu IMC es menor a 18.5, lo que corresponde a bajo peso." },
  { code: "RF02", name: "IMC normal", conditions: [["imc", "gte", "18.5"], ["imc", "lt", "25"]], f: ["estado_peso", "normal"], cf: 1, priority: F, explanation: "Tu IMC está entre 18.5 y 24.9 (peso normal)." },
  { code: "RF03", name: "IMC sobrepeso", conditions: [["imc", "gte", "25"], ["imc", "lt", "30"]], f: ["estado_peso", "sobrepeso"], cf: 1, priority: F, explanation: "Tu IMC está entre 25 y 29.9 (sobrepeso)." },
  { code: "RF04", name: "IMC obesidad", conditions: [["imc", "gte", "30"]], f: ["estado_peso", "obesidad"], cf: 1, priority: F, explanation: "Tu IMC es 30 o más (obesidad)." },

  // ── Hechos deducidos: grupo de edad ────────────────────────────────────────
  { code: "RF05", name: "Adolescente", conditions: [["edad", "lt", "18"]], f: ["grupo_edad", "adolescente"], cf: 1, priority: F, explanation: "Eres menor de 18 años." },
  { code: "RF06", name: "Adulto", conditions: [["edad", "gte", "18"], ["edad", "lt", "50"]], f: ["grupo_edad", "adulto"], cf: 1, priority: F, explanation: "Tienes entre 18 y 49 años." },
  { code: "RF07", name: "Adulto mayor", conditions: [["edad", "gte", "50"]], f: ["grupo_edad", "adulto_mayor"], cf: 1, priority: F, explanation: "Tienes 50 años o más." },

  // ── Hechos deducidos: carga de entrenamiento ───────────────────────────────
  { code: "RF08", name: "Carga alta", conditions: [["frecuencia", "gte", "5"], ["duracion", "gte", "60"]], f: ["carga_entrenamiento", "alta"], cf: 1, priority: F, explanation: "Entrenas 5 o más días con sesiones de 60 minutos o más." },
  { code: "RF09", name: "Carga moderada (3–4 días)", conditions: [["frecuencia", "gte", "3"], ["frecuencia", "lt", "5"]], f: ["carga_entrenamiento", "moderada"], cf: 1, priority: F, explanation: "Entrenas entre 3 y 4 días por semana." },
  { code: "RF10", name: "Carga moderada (sesiones cortas)", conditions: [["frecuencia", "gte", "5"], ["duracion", "lt", "60"]], f: ["carga_entrenamiento", "moderada"], cf: 1, priority: F, explanation: "Entrenas 5 o más días, pero con sesiones de menos de 60 minutos." },
  { code: "RF11", name: "Carga baja", conditions: [["frecuencia", "lt", "3"]], f: ["carga_entrenamiento", "baja"], cf: 1, priority: F, explanation: "Entrenas menos de 3 días por semana." },

  // ── Hechos deducidos: evitar estimulantes ──────────────────────────────────
  { code: "RF12", name: "Hipertensión → sin estimulantes", conditions: [["salud", "contains", "hipertension"]], f: ["evitar_estimulantes", "si"], cf: 1, priority: F, explanation: "La hipertensión es una contraindicación para la cafeína y otros estimulantes." },
  { code: "RF13", name: "Cardiopatía → sin estimulantes", conditions: [["salud", "contains", "cardiaca"]], f: ["evitar_estimulantes", "si"], cf: 1, priority: F, explanation: "Con enfermedad cardíaca o arritmias se deben evitar los estimulantes." },
  { code: "RF14", name: "Sensibilidad a cafeína", conditions: [["salud", "contains", "cafeina"]], f: ["evitar_estimulantes", "si"], cf: 1, priority: F, explanation: "Reportaste sensibilidad a la cafeína." },
  { code: "RF15", name: "Ansiedad/insomnio", conditions: [["salud", "contains", "ansiedad"]], f: ["evitar_estimulantes", "si"], cf: 0.8, priority: F, explanation: "Los estimulantes pueden empeorar la ansiedad y el insomnio." },
  { code: "RF16", name: "Embarazo → sin estimulantes", conditions: [["salud", "contains", "embarazo"]], f: ["evitar_estimulantes", "si"], cf: 1, priority: F, explanation: "En embarazo o lactancia se deben evitar los estimulantes." },
  { code: "RF17", name: "Entreno nocturno", conditions: [["horario", "eq", "noche"]], f: ["evitar_estimulantes", "si"], cf: 0.6, priority: F, explanation: "Entrenas de noche: un estimulante podría afectar tu sueño." },
  { code: "RF18", name: "Adolescente → prudencia con estimulantes", conditions: [["grupo_edad", "eq", "adolescente"]], f: ["evitar_estimulantes", "si"], cf: 0.7, priority: F, explanation: "En menores de 18 se recomienda evitar dosis altas de estimulantes." },

  // ── Hechos deducidos: evitar potenciadores hormonales ──────────────────────
  { code: "RF19", name: "Menor de edad → sin hormonales", conditions: [["grupo_edad", "eq", "adolescente"]], f: ["evitar_hormonales", "si"], cf: 1, priority: F, explanation: "Los potenciadores hormonales no son aptos para menores de edad." },
  { code: "RF20", name: "Mujer → sin potenciadores de testosterona", conditions: [["sexo", "eq", "mujer"]], f: ["evitar_hormonales", "si"], cf: 1, priority: F, explanation: "Estos productos están formulados para el perfil hormonal masculino." },
  { code: "RF21", name: "Hepatopatía → sin hormonales", conditions: [["salud", "contains", "hepatica"]], f: ["evitar_hormonales", "si"], cf: 1, priority: F, explanation: "Con enfermedad hepática se deben evitar los potenciadores hormonales." },

  // ── Hechos deducidos: requiere valoración médica ───────────────────────────
  { code: "RF22", name: "Embarazo → médico", conditions: [["salud", "contains", "embarazo"]], f: ["requiere_medico", "si"], cf: 1, priority: F, explanation: "Durante el embarazo o la lactancia cualquier suplemento debe autorizarlo tu médico." },
  { code: "RF23", name: "Enfermedad renal → médico", conditions: [["salud", "contains", "renal"]], f: ["requiere_medico", "si"], cf: 1, priority: F, explanation: "Con enfermedad renal la proteína y la creatina deben ser supervisadas." },
  { code: "RF24", name: "Cardiopatía → médico", conditions: [["salud", "contains", "cardiaca"]], f: ["requiere_medico", "si"], cf: 1, priority: F, explanation: "Con enfermedad cardíaca consulta antes de suplementarte." },
  { code: "RF25", name: "Hepatopatía → médico", conditions: [["salud", "contains", "hepatica"]], f: ["requiere_medico", "si"], cf: 0.9, priority: F, explanation: "Con enfermedad hepática consulta antes de suplementarte." },
  { code: "RF26", name: "Diabetes → médico", conditions: [["salud", "contains", "diabetes"]], f: ["requiere_medico", "si"], cf: 0.6, priority: F, explanation: "Con diabetes conviene ajustar carbohidratos y suplementos con un profesional." },

  // ── Hechos deducidos: hidratación y proteína ───────────────────────────────
  { code: "RF27", name: "Resistencia larga → pérdida de electrolitos", conditions: [["tipo_entrenamiento", "eq", "resistencia"], ["duracion", "gte", "60"]], f: ["perdida_electrolitos", "si"], cf: 0.9, priority: F, explanation: "Haces sesiones de resistencia de 60 minutos o más: pierdes muchos electrolitos en el sudor." },
  { code: "RF28", name: "Funcional intenso → pérdida de electrolitos", conditions: [["tipo_entrenamiento", "eq", "mixto"], ["carga_entrenamiento", "eq", "alta"]], f: ["perdida_electrolitos", "si"], cf: 0.6, priority: F, explanation: "El entrenamiento funcional con carga alta produce mucha sudoración." },
  { code: "RF29", name: "Músculo + proteína insuficiente", conditions: [["objetivo", "in", "ganar_masa,recomposicion"], ["proteina_dieta", "in", "baja,adecuada"]], f: ["necesidad_proteica", "alta"], cf: 0.8, priority: F, explanation: "Para ganar músculo necesitas ~1.6–2.2 g de proteína por kg y con tu dieta probablemente no llegas." },
  { code: "RF30", name: "Definición + proteína baja", conditions: [["objetivo", "eq", "bajar_grasa"], ["proteina_dieta", "in", "baja,adecuada"]], f: ["necesidad_proteica", "alta"], cf: 0.7, priority: F, explanation: "En déficit calórico la proteína alta protege tu masa muscular y te da saciedad." },

  // ── Proteína whey ──────────────────────────────────────────────────────────
  { code: "R01", name: "Necesidad proteica → whey", conditions: [["necesidad_proteica", "eq", "alta"], ["dieta", "neq", "vegana"]], h: "proteina_whey", cf: 0.75, priority: P, explanation: "Necesitas más proteína de la que aporta tu dieta y la whey es la forma más práctica de completarla." },
  { code: "R02", name: "Volumen → whey", conditions: [["objetivo", "eq", "ganar_masa"]], h: "proteina_whey", cf: 0.5, priority: P, explanation: "Para ganar masa muscular la proteína es el nutriente clave." },
  { code: "R03", name: "Recomposición → whey", conditions: [["objetivo", "eq", "recomposicion"]], h: "proteina_whey", cf: 0.55, priority: P, explanation: "En recomposición la proteína alta permite ganar músculo mientras pierdes grasa." },
  { code: "R04", name: "Definición → whey", conditions: [["objetivo", "eq", "bajar_grasa"]], h: "proteina_whey", cf: 0.45, priority: P, explanation: "En definición la proteína ayuda a conservar músculo y a controlar el hambre." },
  { code: "R05", name: "Ya come mucha proteína", conditions: [["proteina_dieta", "eq", "alta"]], h: "proteina_whey", cf: -0.5, priority: V, explanation: "Tu dieta ya aporta mucha proteína; un suplemento proteico es menos necesario." },
  { code: "R06", name: "Lactosa → evitar whey concentrada", conditions: [["salud", "contains", "lactosa"]], h: "proteina_whey", cf: -0.8, priority: V, explanation: "La whey concentrada tiene lactosa y podría causarte molestias digestivas." },
  { code: "R07", name: "Vegano → sin whey", conditions: [["dieta", "eq", "vegana"]], h: "proteina_whey", cf: -1, priority: V, explanation: "La whey es de origen animal (leche), no es apta para veganos." },
  { code: "R08", name: "Renal → sin whey", conditions: [["salud", "contains", "renal"]], h: "proteina_whey", cf: -1, priority: V, explanation: "Con enfermedad renal la ingesta de proteína debe controlarla tu médico." },

  // ── Proteína aislada ───────────────────────────────────────────────────────
  { code: "R09", name: "Lactosa + necesidad proteica → isolate", conditions: [["salud", "contains", "lactosa"], ["necesidad_proteica", "eq", "alta"]], h: "proteina_isolatada", cf: 0.85, priority: P, explanation: "La proteína aislada es casi libre de lactosa: cubre tu proteína sin molestias." },
  { code: "R10", name: "Definición → isolate", conditions: [["objetivo", "eq", "bajar_grasa"], ["necesidad_proteica", "eq", "alta"]], h: "proteina_isolatada", cf: 0.55, priority: P, explanation: "La isolate aporta proteína con muy pocas calorías extra, ideal en definición." },
  { code: "R11", name: "Vegano → sin isolate", conditions: [["dieta", "eq", "vegana"]], h: "proteina_isolatada", cf: -1, priority: V, explanation: "La proteína aislada de suero es de origen animal." },
  { code: "R12", name: "Renal → sin isolate", conditions: [["salud", "contains", "renal"]], h: "proteina_isolatada", cf: -1, priority: V, explanation: "Con enfermedad renal la proteína debe ser supervisada." },

  // ── Proteína vegetal ───────────────────────────────────────────────────────
  { code: "R13", name: "Vegano + objetivo físico → vegetal", conditions: [["dieta", "eq", "vegana"], ["objetivo", "in", "ganar_masa,recomposicion,bajar_grasa"]], h: "proteina_vegetal", cf: 0.9, priority: P, explanation: "Con dieta vegana, la proteína vegetal en polvo te ayuda a llegar a tu requerimiento." },
  { code: "R14", name: "Vegetariano con intolerancia → vegetal", conditions: [["dieta", "eq", "vegetariana"], ["salud", "contains", "lactosa"]], h: "proteina_vegetal", cf: 0.7, priority: P, explanation: "Eres vegetariano y no toleras la lactosa: la proteína vegetal es tu mejor opción." },
  { code: "R15", name: "Renal → sin proteína vegetal", conditions: [["salud", "contains", "renal"]], h: "proteina_vegetal", cf: -1, priority: V, explanation: "Con enfermedad renal la proteína debe ser supervisada." },

  // ── Ganador de peso ────────────────────────────────────────────────────────
  { code: "R16", name: "Hardgainer → gainer", conditions: [["objetivo", "eq", "ganar_masa"], ["metabolismo", "eq", "me_cuesta_subir"]], h: "ganador_peso", cf: 0.8, priority: P, explanation: "Te cuesta subir de peso: un gainer facilita el superávit calórico que necesitas." },
  { code: "R17", name: "Bajo peso → gainer", conditions: [["objetivo", "eq", "ganar_masa"], ["estado_peso", "eq", "bajo_peso"]], h: "ganador_peso", cf: 0.75, priority: P, explanation: "Tu IMC indica bajo peso y quieres ganar masa: necesitas calorías extra." },
  { code: "R18", name: "Sobrepeso → sin gainer", conditions: [["estado_peso", "in", "sobrepeso,obesidad"]], h: "ganador_peso", cf: -0.9, priority: V, explanation: "Con sobrepeso, un producto hipercalórico iría en contra de tu salud." },
  { code: "R19", name: "Definición → sin gainer", conditions: [["objetivo", "eq", "bajar_grasa"]], h: "ganador_peso", cf: -1, priority: V, explanation: "Un gainer aporta muchas calorías: es contrario a bajar grasa." },
  { code: "R20", name: "Diabetes → sin gainer", conditions: [["salud", "contains", "diabetes"]], h: "ganador_peso", cf: -0.9, priority: V, explanation: "Los gainers tienen mucha azúcar, poco recomendable con diabetes." },
  { code: "R21", name: "Sube fácil → sin gainer", conditions: [["metabolismo", "eq", "subo_facil"]], h: "ganador_peso", cf: -0.7, priority: V, explanation: "Si subes de peso con facilidad, con proteína y comida basta." },
  { code: "R22", name: "Vegano → sin gainer", conditions: [["dieta", "eq", "vegana"]], h: "ganador_peso", cf: -0.6, priority: V, explanation: "La mayoría de gainers contienen proteína de leche." },

  // ── Creatina ───────────────────────────────────────────────────────────────
  { code: "R23", name: "Músculo → creatina", conditions: [["objetivo", "in", "ganar_masa,recomposicion"]], h: "creatina", cf: 0.75, priority: P, explanation: "La creatina es el suplemento con más evidencia para ganar fuerza y masa muscular." },
  { code: "R24", name: "Fuerza/potencia → creatina", conditions: [["tipo_entrenamiento", "in", "fuerza,mixto,equipo"]], h: "creatina", cf: 0.5, priority: P, explanation: "Tu entrenamiento es de esfuerzos intensos y cortos, donde la creatina mejora el rendimiento." },
  { code: "R25", name: "Rendimiento → creatina", conditions: [["objetivo", "eq", "rendimiento"]], h: "creatina", cf: 0.45, priority: P, explanation: "La creatina mejora el rendimiento en esfuerzos de alta intensidad." },
  { code: "R26", name: "Dieta sin carne → creatina", conditions: [["dieta", "in", "vegetariana,vegana"]], h: "creatina", cf: 0.35, priority: P, explanation: "Sin carne tus reservas de creatina son menores, por eso te beneficia más." },
  { code: "R27", name: "Adulto mayor → creatina", conditions: [["grupo_edad", "eq", "adulto_mayor"], ["carga_entrenamiento", "in", "moderada,alta"]], h: "creatina", cf: 0.4, priority: P, explanation: "Después de los 50, la creatina junto al entrenamiento ayuda a conservar masa muscular." },
  { code: "R28", name: "Renal → sin creatina", conditions: [["salud", "contains", "renal"]], h: "creatina", cf: -1, priority: V, explanation: "Con enfermedad renal la creatina está contraindicada sin supervisión médica." },
  { code: "R29", name: "Embarazo → sin creatina", conditions: [["salud", "contains", "embarazo"]], h: "creatina", cf: -1, priority: V, explanation: "No hay suficiente evidencia de seguridad en embarazo o lactancia." },
  { code: "R30", name: "Adolescente → prudencia creatina", conditions: [["grupo_edad", "eq", "adolescente"]], h: "creatina", cf: -0.3, priority: V, explanation: "En menores de edad se prioriza la alimentación antes que la suplementación." },

  // ── Pre-entreno con estimulantes ───────────────────────────────────────────
  { code: "R31", name: "Rendimiento → pre-entreno", conditions: [["objetivo", "eq", "rendimiento"]], h: "preentreno_estimulante", cf: 0.7, priority: P, explanation: "Buscas más energía y enfoque: el pre-entreno con cafeína es la opción más directa." },
  { code: "R32", name: "Avanzado en volumen → pre-entreno", conditions: [["experiencia", "eq", "avanzado"], ["objetivo", "in", "ganar_masa,recomposicion"]], h: "preentreno_estimulante", cf: 0.4, priority: P, explanation: "Con tu experiencia, un pre-entreno ayuda a sostener entrenamientos pesados." },
  { code: "R33", name: "Principiante → no necesita pre-entreno", conditions: [["experiencia", "eq", "principiante"]], h: "preentreno_estimulante", cf: -0.4, priority: V, explanation: "Al empezar, la energía depende más del descanso y la alimentación que de un pre-entreno." },
  { code: "R34", name: "Debe evitar estimulantes", conditions: [["evitar_estimulantes", "eq", "si"]], h: "preentreno_estimulante", cf: -1, priority: V, explanation: "Por tu condición u horario, los estimulantes no son adecuados para ti." },
  { code: "R35", name: "Carga baja → sin pre-entreno", conditions: [["carga_entrenamiento", "eq", "baja"]], h: "preentreno_estimulante", cf: -0.5, priority: V, explanation: "Con pocos días de entrenamiento un pre-entreno aporta poco." },

  // ── Pre-entreno sin estimulantes ───────────────────────────────────────────
  { code: "R36", name: "Sin estimulantes + rendimiento → óxido nítrico", conditions: [["evitar_estimulantes", "eq", "si"], ["objetivo", "in", "rendimiento,ganar_masa,recomposicion"]], h: "preentreno_sin_estimulante", cf: 0.7, priority: P, explanation: "Puedes mejorar el bombeo y el rendimiento sin cafeína con citrulina o arginina." },
  { code: "R37", name: "Rendimiento → óxido nítrico", conditions: [["objetivo", "eq", "rendimiento"]], h: "preentreno_sin_estimulante", cf: 0.45, priority: P, explanation: "Los precursores de óxido nítrico mejoran el flujo sanguíneo y la resistencia muscular." },
  { code: "R38", name: "Embarazo → sin pre-entreno", conditions: [["salud", "contains", "embarazo"]], h: "preentreno_sin_estimulante", cf: -1, priority: V, explanation: "En embarazo o lactancia se evitan los pre-entrenos." },

  // ── Quemador termogénico ───────────────────────────────────────────────────
  { code: "R39", name: "Definición con experiencia → quemador", conditions: [["objetivo", "eq", "bajar_grasa"], ["experiencia", "in", "intermedio,avanzado"]], h: "quemador_termogenico", cf: 0.6, priority: P, explanation: "Ya entrenas con constancia: un termogénico puede apoyar tu déficit calórico." },
  { code: "R40", name: "Definición principiante → quemador (débil)", conditions: [["objetivo", "eq", "bajar_grasa"], ["experiencia", "eq", "principiante"]], h: "quemador_termogenico", cf: 0.3, priority: P, explanation: "Al empezar, la dieta pesa mucho más que un quemador; su aporte es secundario." },
  { code: "R41", name: "Debe evitar estimulantes → sin quemador", conditions: [["evitar_estimulantes", "eq", "si"]], h: "quemador_termogenico", cf: -1, priority: V, explanation: "Los termogénicos contienen estimulantes que no son adecuados para ti." },
  { code: "R42", name: "Adolescente → sin quemador", conditions: [["grupo_edad", "eq", "adolescente"]], h: "quemador_termogenico", cf: -1, priority: V, explanation: "Los quemadores no son aptos para menores de edad." },

  // ── L-carnitina ────────────────────────────────────────────────────────────
  { code: "R43", name: "Definición → L-carnitina", conditions: [["objetivo", "eq", "bajar_grasa"]], h: "l_carnitina", cf: 0.45, priority: P, explanation: "La L-carnitina apoya el uso de grasa como energía durante el ejercicio." },
  { code: "R44", name: "Definición sin estimulantes → L-carnitina", conditions: [["objetivo", "eq", "bajar_grasa"], ["evitar_estimulantes", "eq", "si"]], h: "l_carnitina", cf: 0.6, priority: P, explanation: "Es una alternativa sin estimulantes para apoyar tu definición." },
  { code: "R45", name: "Embarazo → sin L-carnitina", conditions: [["salud", "contains", "embarazo"]], h: "l_carnitina", cf: -0.8, priority: V, explanation: "No se recomienda en embarazo o lactancia sin supervisión." },

  // ── Aminoácidos ────────────────────────────────────────────────────────────
  { code: "R46", name: "Carga alta → aminoácidos", conditions: [["carga_entrenamiento", "eq", "alta"]], h: "aminoacidos", cf: 0.55, priority: P, explanation: "Con tu carga de entrenamiento los aminoácidos apoyan la recuperación." },
  { code: "R47", name: "Resistencia → aminoácidos", conditions: [["objetivo", "eq", "resistencia"]], h: "aminoacidos", cf: 0.5, priority: P, explanation: "En sesiones largas los aminoácidos ayudan a reducir el desgaste muscular." },
  { code: "R48", name: "Vegano + músculo → EAA", conditions: [["dieta", "eq", "vegana"], ["objetivo", "in", "ganar_masa,recomposicion"]], h: "aminoacidos", cf: 0.5, priority: P, explanation: "Los aminoácidos esenciales complementan el perfil de la proteína vegetal." },
  { code: "R49", name: "Carga baja → sin aminoácidos", conditions: [["carga_entrenamiento", "eq", "baja"]], h: "aminoacidos", cf: -0.4, priority: V, explanation: "Con poca carga de entrenamiento tu dieta cubre los aminoácidos." },

  // ── Glutamina ──────────────────────────────────────────────────────────────
  { code: "R50", name: "Carga alta → glutamina", conditions: [["carga_entrenamiento", "eq", "alta"]], h: "glutamina", cf: 0.45, priority: P, explanation: "Con alto volumen de entrenamiento la glutamina apoya tu recuperación." },
  { code: "R51", name: "Resistencia muy larga → glutamina", conditions: [["tipo_entrenamiento", "eq", "resistencia"], ["duracion", "gte", "90"]], h: "glutamina", cf: 0.5, priority: P, explanation: "Las sesiones de más de 90 minutos aumentan la demanda de glutamina." },

  // ── Multivitamínico ────────────────────────────────────────────────────────
  { code: "R52", name: "Bienestar → multivitamínico", conditions: [["objetivo", "eq", "bienestar"]], h: "multivitaminico", cf: 0.75, priority: P, explanation: "Para tu bienestar general, un multivitamínico cubre posibles déficits de la dieta." },
  { code: "R53", name: "Déficit calórico → multivitamínico", conditions: [["objetivo", "eq", "bajar_grasa"]], h: "multivitaminico", cf: 0.4, priority: P, explanation: "Al comer menos es más fácil quedarte corto en micronutrientes." },
  { code: "R54", name: "Vegano → multivitamínico", conditions: [["dieta", "eq", "vegana"]], h: "multivitaminico", cf: 0.5, priority: P, explanation: "Con dieta vegana conviene cubrir vitamina B12, hierro y zinc." },
  { code: "R55", name: "Carga alta → multivitamínico", conditions: [["carga_entrenamiento", "eq", "alta"]], h: "multivitaminico", cf: 0.35, priority: P, explanation: "Entrenar mucho aumenta tu demanda de vitaminas y minerales." },

  // ── Omega 3 ────────────────────────────────────────────────────────────────
  { code: "R56", name: "Bienestar → omega 3", conditions: [["objetivo", "eq", "bienestar"]], h: "omega3", cf: 0.65, priority: P, explanation: "El omega 3 apoya la salud cardiovascular y cerebral." },
  { code: "R57", name: "Adulto mayor → omega 3", conditions: [["grupo_edad", "eq", "adulto_mayor"]], h: "omega3", cf: 0.55, priority: P, explanation: "Después de los 50 el omega 3 apoya corazón, articulaciones y memoria." },
  { code: "R58", name: "Articulaciones → omega 3", conditions: [["salud", "contains", "articulaciones"]], h: "omega3", cf: 0.5, priority: P, explanation: "El omega 3 tiene efecto antiinflamatorio que ayuda a las articulaciones." },
  { code: "R59", name: "Vegano → sin omega de pescado", conditions: [["dieta", "eq", "vegana"]], h: "omega3", cf: -0.6, priority: V, explanation: "El omega 3 del catálogo es de aceite de pescado." },

  // ── Colágeno ───────────────────────────────────────────────────────────────
  { code: "R60", name: "Articulaciones → colágeno", conditions: [["salud", "contains", "articulaciones"]], h: "colageno", cf: 0.75, priority: P, explanation: "El colágeno hidrolizado apoya cartílagos y tendones." },
  { code: "R61", name: "Adulto mayor → colágeno", conditions: [["grupo_edad", "eq", "adulto_mayor"]], h: "colageno", cf: 0.5, priority: P, explanation: "Con la edad disminuye la producción natural de colágeno." },
  { code: "R62", name: "Impacto alto → colágeno", conditions: [["tipo_entrenamiento", "in", "equipo,mixto"], ["carga_entrenamiento", "eq", "alta"]], h: "colageno", cf: 0.4, priority: P, explanation: "Tu entrenamiento genera mucho impacto en articulaciones y tendones." },
  { code: "R63", name: "Sin productos animales → sin colágeno", conditions: [["dieta", "in", "vegana,vegetariana"]], h: "colageno", cf: -1, priority: V, explanation: "El colágeno es de origen animal." },

  // ── Electrolitos ───────────────────────────────────────────────────────────
  { code: "R64", name: "Pérdida de electrolitos → hidratación", conditions: [["perdida_electrolitos", "eq", "si"]], h: "electrolitos", cf: 0.8, priority: P, explanation: "Pierdes muchos electrolitos al sudar; reponerlos evita calambres y fatiga." },
  { code: "R65", name: "Resistencia → hidratación", conditions: [["objetivo", "eq", "resistencia"]], h: "electrolitos", cf: 0.6, priority: P, explanation: "En deportes de resistencia la hidratación es clave para el rendimiento." },
  { code: "R66", name: "Deporte de equipo → hidratación", conditions: [["tipo_entrenamiento", "eq", "equipo"]], h: "electrolitos", cf: 0.4, priority: P, explanation: "Los partidos y entrenamientos de equipo implican mucha sudoración." },
  { code: "R67", name: "Renal → sin electrolitos", conditions: [["salud", "contains", "renal"]], h: "electrolitos", cf: -1, priority: V, explanation: "Con enfermedad renal el potasio y el sodio suplementados pueden acumularse en la sangre." },
  { code: "R68", name: "Hipertensión → cuidado con sodio", conditions: [["salud", "contains", "hipertension"]], h: "electrolitos", cf: -0.4, priority: V, explanation: "Las bebidas de electrolitos aportan sodio, a vigilar con hipertensión." },

  // ── Magnesio / descanso ────────────────────────────────────────────────────
  { code: "R69", name: "Ansiedad/insomnio → magnesio", conditions: [["salud", "contains", "ansiedad"]], h: "magnesio_descanso", cf: 0.7, priority: P, explanation: "El magnesio y la ashwagandha apoyan la relajación y la calidad del sueño." },
  { code: "R70", name: "Carga alta → magnesio", conditions: [["carga_entrenamiento", "eq", "alta"]], h: "magnesio_descanso", cf: 0.4, priority: P, explanation: "Entrenar mucho aumenta la pérdida de magnesio y la necesidad de descanso." },
  { code: "R71", name: "Entreno nocturno → descanso", conditions: [["horario", "eq", "noche"], ["carga_entrenamiento", "in", "moderada,alta"]], h: "magnesio_descanso", cf: 0.35, priority: P, explanation: "Entrenas de noche: el magnesio te ayuda a relajarte para dormir mejor." },
  { code: "R72", name: "Embarazo → sin adaptógenos", conditions: [["salud", "contains", "embarazo"]], h: "magnesio_descanso", cf: -0.8, priority: V, explanation: "La ashwagandha no se recomienda en embarazo o lactancia." },

  // ── Vitamina D ─────────────────────────────────────────────────────────────
  { code: "R73", name: "Adulto mayor → vitamina D", conditions: [["grupo_edad", "eq", "adulto_mayor"]], h: "vitamina_d", cf: 0.6, priority: P, explanation: "Después de los 50 la vitamina D ayuda a conservar huesos y músculo." },
  { code: "R74", name: "Mujer adulta mayor → vitamina D", conditions: [["sexo", "eq", "mujer"], ["grupo_edad", "eq", "adulto_mayor"]], h: "vitamina_d", cf: 0.7, priority: P, explanation: "Las mujeres después de los 50 tienen mayor riesgo de pérdida ósea." },
  { code: "R75", name: "Vegano → vitamina D", conditions: [["dieta", "eq", "vegana"]], h: "vitamina_d", cf: 0.4, priority: P, explanation: "Las fuentes alimentarias de vitamina D son mayormente animales." },

  // ── Potenciador hormonal ───────────────────────────────────────────────────
  { code: "R76", name: "Hombre avanzado en volumen → potenciador", conditions: [["sexo", "eq", "hombre"], ["experiencia", "eq", "avanzado"], ["objetivo", "in", "ganar_masa,recomposicion"], ["grupo_edad", "in", "adulto,adulto_mayor"]], h: "precursor_hormonal", cf: 0.45, priority: P, explanation: "Eres un hombre adulto con experiencia: puedes considerar un apoyo hormonal natural." },
  { code: "R77", name: "Debe evitar hormonales", conditions: [["evitar_hormonales", "eq", "si"]], h: "precursor_hormonal", cf: -1, priority: V, explanation: "Por tu edad, sexo o salud, los potenciadores hormonales no son adecuados." },
  { code: "R78", name: "Poca experiencia → sin potenciador", conditions: [["experiencia", "in", "principiante,intermedio"]], h: "precursor_hormonal", cf: -0.6, priority: V, explanation: "Antes de un potenciador hormonal conviene consolidar entrenamiento, dieta y descanso." },
  { code: "R79", name: "Requiere médico → sin potenciador", conditions: [["requiere_medico", "eq", "si"]], h: "precursor_hormonal", cf: -1, priority: V, explanation: "Con tu condición de salud no se recomiendan potenciadores hormonales." },

  // ── Avisos ─────────────────────────────────────────────────────────────────
  { code: "R80", name: "Requiere valoración médica", conditions: [["requiere_medico", "eq", "si"]], h: "consulta_medica", cf: 1, priority: V, explanation: "Tu condición de salud requiere que un profesional valide cualquier suplemento." },
  { code: "R81", name: "Obesidad → acompañamiento", conditions: [["estado_peso", "eq", "obesidad"], ["objetivo", "eq", "bajar_grasa"]], h: "consulta_medica", cf: 0.5, priority: P, explanation: "Para bajar de peso de forma segura te conviene un plan con un profesional." },

  // ── Contraindicaciones adicionales (correcciones tras validar casos) ───────
  { code: "R82", name: "Renal → sin aminoácidos", conditions: [["salud", "contains", "renal"]], h: "aminoacidos", cf: -0.7, priority: V, explanation: "Los aminoácidos suman carga proteica que el riñón debe filtrar." },
  { code: "R83", name: "Renal → sin glutamina", conditions: [["salud", "contains", "renal"]], h: "glutamina", cf: -0.7, priority: V, explanation: "La glutamina también es carga proteica para el riñón." },
  { code: "R84", name: "Renal → sin magnesio suplementado", conditions: [["salud", "contains", "renal"]], h: "magnesio_descanso", cf: -1, priority: V, explanation: "Con enfermedad renal el magnesio suplementado puede acumularse en la sangre." },
  { code: "R85", name: "Embarazo → prenatal médico", conditions: [["salud", "contains", "embarazo"]], h: "multivitaminico", cf: -1, priority: V, explanation: "En embarazo necesitas un prenatal formulado por tu médico, no un multivitamínico deportivo." },
  { code: "R86", name: "Hepatopatía → sin quemador", conditions: [["salud", "contains", "hepatica"]], h: "quemador_termogenico", cf: -1, priority: V, explanation: "Algunos termogénicos sobrecargan el hígado." },
  { code: "R87", name: "Hepatopatía → sin pre-entreno estimulante", conditions: [["salud", "contains", "hepatica"]], h: "preentreno_estimulante", cf: -0.7, priority: V, explanation: "Las fórmulas con muchos estimulantes no se recomiendan con enfermedad hepática." },
  // ── Correcciones tras recorrer el árbol de decisión rama por rama ─────────
  { code: "R88", name: "Cardiopatía → sin óxido nítrico", conditions: [["salud", "contains", "cardiaca"]], h: "preentreno_sin_estimulante", cf: -1, priority: V, explanation: "La arginina y la citrulina pueden interactuar con medicamentos para el corazón o la presión." },
  { code: "R89", name: "Embarazo → omega 3 lo define el médico", conditions: [["salud", "contains", "embarazo"]], h: "omega3", cf: -1, priority: V, explanation: "En embarazo o lactancia el omega 3 (DHA) lo elige tu médico junto con el prenatal." },
  { code: "R90", name: "Embarazo → sin vitamina D suplementaria", conditions: [["salud", "contains", "embarazo"]], h: "vitamina_d", cf: -1, priority: V, explanation: "El prenatal ya incluye vitamina D; sumar otra puede exceder la dosis segura." },
  { code: "R91", name: "Embarazo → whey solo con aval médico", conditions: [["salud", "contains", "embarazo"]], h: "proteina_whey", cf: -0.8, priority: V, explanation: "En embarazo o lactancia la proteína extra debe ajustarla tu médico o nutricionista." },
  { code: "R92", name: "Embarazo → isolate solo con aval médico", conditions: [["salud", "contains", "embarazo"]], h: "proteina_isolatada", cf: -0.8, priority: V, explanation: "En embarazo o lactancia la proteína extra debe ajustarla tu médico o nutricionista." },
  { code: "R93", name: "Embarazo → proteína vegetal solo con aval médico", conditions: [["salud", "contains", "embarazo"]], h: "proteina_vegetal", cf: -0.8, priority: V, explanation: "En embarazo o lactancia la proteína extra debe ajustarla tu médico o nutricionista." },
  { code: "R94", name: "Embarazo → sin gainer", conditions: [["salud", "contains", "embarazo"]], h: "ganador_peso", cf: -1, priority: V, explanation: "Los gainers aportan mucho azúcar y calorías; el aumento de peso en el embarazo lo controla tu médico." },
  { code: "R95", name: "Embarazo → sin colágeno", conditions: [["salud", "contains", "embarazo"]], h: "colageno", cf: -0.8, priority: V, explanation: "No hay suficiente evidencia de seguridad del colágeno suplementado en embarazo." },
  { code: "R96", name: "Embarazo → sin aminoácidos", conditions: [["salud", "contains", "embarazo"]], h: "aminoacidos", cf: -0.8, priority: V, explanation: "No hay suficiente evidencia de seguridad de los aminoácidos aislados en embarazo." },
  { code: "R97", name: "Embarazo → sin glutamina", conditions: [["salud", "contains", "embarazo"]], h: "glutamina", cf: -0.8, priority: V, explanation: "No hay suficiente evidencia de seguridad de la glutamina en embarazo." },
]
