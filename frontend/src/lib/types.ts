// ─── Age Group ───────────────────────────────────────────────────────────────

export type AgeGroup = '6-8' | '9-12' | '13-16' | 'adult';

// ─── Stimulus ─────────────────────────────────────────────────────────────────

export interface Stimulus {
  type: string;
  content: string;
  title?: string;
}

// ─── Session request ──────────────────────────────────────────────────────────

export interface CreateSessionRequest {
  age_group: AgeGroup;
  stimulus: Stimulus;
  model_size?: 'fast' | 'accurate';
  rag_enabled?: boolean;
  thinking_mode?: boolean;
  language?: string;
}

// ─── Evaluation scores ────────────────────────────────────────────────────────

export interface EvalScores {
  socratism: number;
  age_fit: number;
  builds_on: number;
  openness: number;
  advancement: number;
  overall: number;
  weighted_overall?: number;
}

// ─── Question types ───────────────────────────────────────────────────────────

export type QuestionType =
  | 'conceptual'
  | 'assumption'
  | 'evidence'
  | 'perspective'
  | 'implication'
  | 'metacognitive'
  | 'opening'
  | 'statement';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  conceptual: 'Conceptual',
  assumption: 'Suposición',
  evidence: 'Evidencia',
  perspective: 'Perspectiva',
  implication: 'Implicación',
  metacognitive: 'Metacognitiva',
  opening: 'Apertura',
  statement: 'Afirmación',
};

export const QUESTION_TYPE_COLORS: Record<QuestionType, string> = {
  conceptual: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  assumption: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  evidence: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  perspective: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  implication: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  metacognitive: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  opening: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  statement: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

// ─── Turn ─────────────────────────────────────────────────────────────────────

export interface Turn {
  id?: number;
  role: 'child' | 'assistant';
  content: string;
  question_type?: QuestionType;
  thinking_trace?: string;
  eval_scores?: EvalScores;
  forbidden_behaviors_detected?: string[];
  rag_moves_used?: string[];
  timestamp?: string | number;
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

export interface ThinkingEvent {
  trace: string;
}

export interface TokenEvent {
  text: string;
}

export interface CompleteEvent {
  turn: Turn;
}

// ─── Session response ─────────────────────────────────────────────────────────

export interface SessionResponse {
  session_id: string;
  age_group: AgeGroup;
  stimulus: Stimulus;
  model_size: string;
  language: string;
  turns: Turn[];
  phases: Record<string, boolean>;
  created_at: number;
}

// ─── Evaluation summary ───────────────────────────────────────────────────────

export interface EvalSummary {
  session_id: string;
  turn_count: number;
  avg_scores: EvalScores;
  question_type_distribution: Partial<Record<QuestionType, number>>;
  forbidden_behaviors_by_turn: Record<string, string[]>;
}

// ─── Compare response ─────────────────────────────────────────────────────────

export interface CompareResponseItem {
  content: string;
  scores: EvalScores;
  prompt_used: string;
}

export interface CompareResponse {
  base_response: CompareResponseItem;
  p4c_response: CompareResponseItem;
  improvement_pct: number;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export interface Preset {
  id: string;
  title: string;
  ageGroup: AgeGroup;
  stimulus: Stimulus;
}

export const PRESETS: Preset[] = [
  // ─── 6-8 años ──────────────────────────────────────────────────────────────
  {
    id: 'justice-6-8',
    title: '¿Qué es ser justo?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿Qué es ser justo? ¿Es lo mismo para todos?', title: '¿Qué es ser justo?' },
  },
  {
    id: 'friendship-6-8',
    title: '¿Qué es un amigo?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿Qué hace que alguien sea un buen amigo?', title: '¿Qué es un amigo?' },
  },
  {
    id: 'lying-6-8',
    title: '¿Está mal mentir?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿Está siempre mal decir una mentira, o hay veces que puede estar bien?', title: '¿Está mal mentir?' },
  },
  {
    id: 'alive-6-8',
    title: '¿Qué cosas están vivas?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿Cómo sabes si algo está vivo? ¿Una planta está viva igual que un perro?', title: '¿Qué cosas están vivas?' },
  },
  {
    id: 'feelings-6-8',
    title: '¿Pueden sentir los animales?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿Crees que los animales sienten cosas como tú? ¿Cómo lo sabes?', title: '¿Pueden sentir los animales?' },
  },
  {
    id: 'rules-6-8',
    title: '¿Para qué sirven las reglas?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿Por qué existen las reglas? ¿Sería mejor no tener ninguna?', title: '¿Para qué sirven las reglas?' },
  },
  {
    id: 'sharing-6-8',
    title: '¿Hay que compartir siempre?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿Debemos compartir todas nuestras cosas? ¿Hay cosas que no hace falta compartir?', title: '¿Hay que compartir siempre?' },
  },
  {
    id: 'fear-6-8',
    title: '¿Está mal tener miedo?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿Tener miedo significa que eres cobarde? ¿Para qué sirve el miedo?', title: '¿Está mal tener miedo?' },
  },
  {
    id: 'dreams-6-8',
    title: '¿Qué son los sueños?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: 'Cuando sueñas dormido, ¿es real lo que ves? ¿Cómo sabes que lo que ves despierto sí es real?', title: '¿Qué son los sueños?' },
  },
  {
    id: 'stars-6-8',
    title: '¿Qué hay detrás de las estrellas?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿El espacio termina en algún sitio? ¿Qué habría después si terminara?', title: '¿Qué hay detrás de las estrellas?' },
  },
  {
    id: 'color-6-8',
    title: '¿Vemos los colores igual?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: 'Cuando tú y yo vemos el color rojo, ¿estamos viendo exactamente lo mismo? ¿Cómo podríamos saberlo?', title: '¿Vemos los colores igual?' },
  },
  {
    id: 'numbers-6-8',
    title: '¿Existen los números?',
    ageGroup: '6-8',
    stimulus: { type: 'question', content: '¿El número 3 existe en algún lugar, o solo existe cuando lo pensamos o lo escribimos?', title: '¿Existen los números?' },
  },

  // ─── 9-12 años ─────────────────────────────────────────────────────────────
  {
    id: 'truth-9-12',
    title: '¿Siempre hay que decir la verdad?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: '¿Siempre es bueno decir la verdad, incluso cuando duele?', title: '¿Siempre hay que decir la verdad?' },
  },
  {
    id: 'happiness-9-12',
    title: '¿Qué es la felicidad?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: '¿Qué necesitas para ser feliz? ¿Es lo mismo para todos?', title: '¿Qué es la felicidad?' },
  },
  {
    id: 'fairness-9-12',
    title: '¿Es justo que no todos seamos iguales?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: 'Algunas personas nacen con más ventajas que otras. ¿Es eso justo? ¿Quién decide lo que es justo?', title: '¿Es justo que no todos seamos iguales?' },
  },
  {
    id: 'robots-9-12',
    title: '¿Pueden pensar las máquinas?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: 'Si un robot puede resolver problemas y responder preguntas, ¿está pensando de verdad o solo simulando?', title: '¿Pueden pensar las máquinas?' },
  },
  {
    id: 'courage-9-12',
    title: '¿Qué es el valor?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: '¿Es valiente alguien que hace algo aterrador aunque tenga miedo, o solo quien no siente miedo?', title: '¿Qué es el valor?' },
  },
  {
    id: 'nature-9-12',
    title: '¿La naturaleza tiene derechos?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: '¿Deberían los ríos, los bosques o los animales tener derechos como las personas? ¿Por qué?', title: '¿La naturaleza tiene derechos?' },
  },
  {
    id: 'evolution-9-12',
    title: '¿Por qué existen tantos seres vivos diferentes?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: 'Los seres vivos cambian a lo largo de millones de años. ¿Qué implica eso sobre de dónde venimos y quiénes somos?', title: '¿Por qué existen tantos seres vivos diferentes?' },
  },
  {
    id: 'money-9-12',
    title: '¿Por qué vale el dinero?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: 'Un billete es solo papel. ¿Por qué le damos valor? ¿Qué pasaría si todos deci diéramos que no vale nada?', title: '¿Por qué vale el dinero?' },
  },
  {
    id: 'memory-9-12',
    title: '¿Eres la misma persona de hace cinco años?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: 'Si has cambiado tanto desde que eras bebé, ¿qué hace que sigas siendo tú y no otra persona?', title: '¿Eres la misma persona de hace cinco años?' },
  },
  {
    id: 'infinite-9-12',
    title: '¿Puede existir el infinito?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: '¿El universo tiene fin? ¿Sería posible contar hasta el infinito? ¿Qué significa que algo no tenga límite?', title: '¿Puede existir el infinito?' },
  },
  {
    id: 'art-9-12',
    title: '¿Cualquier cosa puede ser arte?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: 'Si alguien pone un ladrillo en un museo y dice que es arte, ¿lo es? ¿Quién decide qué es arte?', title: '¿Cualquier cosa puede ser arte?' },
  },
  {
    id: 'time-9-12',
    title: '¿El tiempo pasa igual para todos?',
    ageGroup: '9-12',
    stimulus: { type: 'question', content: 'Cuando te diviertes, el tiempo vuela; cuando te aburres, pasa lento. ¿El tiempo es siempre el mismo o depende de quién lo vive?', title: '¿El tiempo pasa igual para todos?' },
  },

  // ─── 13-16 años ─────────────────────────────────────────────────────────────
  {
    id: 'freedom-13-16',
    title: '¿Somos realmente libres?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: '¿Hasta qué punto somos libres para tomar nuestras propias decisiones?', title: '¿Somos realmente libres?' },
  },
  {
    id: 'identity-13-16',
    title: '¿Qué te hace ser tú?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: '¿Qué es lo que te hace ser quien eres? ¿Cambiarías si cambiaran tus recuerdos?', title: '¿Qué te hace ser tú?' },
  },
  {
    id: 'ethics-ai-13-16',
    title: '¿La IA puede ser ética?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: '¿Puede una inteligencia artificial tomar decisiones morales? ¿O la moralidad requiere conciencia?', title: '¿La IA puede ser ética?' },
  },
  {
    id: 'democracy-13-16',
    title: '¿Es la democracia el mejor sistema?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: 'Si la mayoría vota algo injusto, ¿sigue siendo legítimo? ¿Qué límites debería tener la voluntad popular?', title: '¿Es la democracia el mejor sistema?' },
  },
  {
    id: 'consciousness-13-16',
    title: '¿Qué es la consciencia?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: '¿Por qué tenemos experiencias subjetivas? ¿Sería posible un ser que procese información sin sentir nada?', title: '¿Qué es la consciencia?' },
  },
  {
    id: 'climate-responsibility-13-16',
    title: '¿Quién es responsable del cambio climático?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: '¿Debe cada individuo cambiar su estilo de vida, o la responsabilidad recae principalmente en gobiernos y empresas? ¿Pueden coexistir ambas?', title: '¿Quién es responsable del cambio climático?' },
  },
  {
    id: 'genes-destiny-13-16',
    title: '¿Nuestros genes determinan quiénes somos?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: 'La ciencia muestra que muchos rasgos tienen base genética. ¿Si nuestro carácter viene en parte de los genes, cuánto control real tenemos sobre nosotros mismos?', title: '¿Nuestros genes determinan quiénes somos?' },
  },
  {
    id: 'simulation-13-16',
    title: '¿Podríamos vivir en una simulación?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: '¿Cómo sabrías si la realidad que percibes es genuina o una simulación computacional? ¿Cambiaría algo en tu vida saberlo?', title: '¿Podríamos vivir en una simulación?' },
  },
  {
    id: 'social-media-truth-13-16',
    title: '¿Las redes sociales distorsionan la realidad?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: 'Si los algoritmos nos muestran solo lo que queremos ver, ¿podemos seguir formándonos una opinión objetiva? ¿Existe la objetividad?', title: '¿Las redes sociales distorsionan la realidad?' },
  },
  {
    id: 'privacy-13-16',
    title: '¿Tienes derecho a la privacidad total?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: '¿Justifica la seguridad colectiva la vigilancia masiva de ciudadanos? ¿Dónde está el límite entre seguridad y libertad individual?', title: '¿Tienes derecho a la privacidad total?' },
  },
  {
    id: 'multiverse-13-16',
    title: '¿Existen otros universos?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: 'Algunos físicos proponen que existen infinitos universos paralelos. ¿Si no podemos observarlos ni medirlos, tiene sentido hablar de ellos como científicos?', title: '¿Existen otros universos?' },
  },
  {
    id: 'meaning-13-16',
    title: '¿Tiene sentido la vida?',
    ageGroup: '13-16',
    stimulus: { type: 'question', content: '¿El significado de la vida lo descubrimos o lo inventamos? ¿Puede tener sentido algo en un universo que no fue creado con ningún propósito?', title: '¿Tiene sentido la vida?' },
  },

  // ─── Adultos ─────────────────────────────────────────────────────────────────
  {
    id: 'free-will-adult',
    title: '¿Existe el libre albedrío?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: 'Si cada decisión que tomamos es resultado de causas físicas previas (neuronas, genes, experiencias), ¿puede existir la libertad real? ¿Cambia eso la responsabilidad moral?', title: '¿Existe el libre albedrío?' },
  },
  {
    id: 'truth-adult',
    title: '¿Qué es la verdad?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: '¿Es la verdad algo que descubrimos o algo que construimos socialmente? ¿Pueden existir verdades contradictorias según el contexto cultural?', title: '¿Qué es la verdad?' },
  },
  {
    id: 'obligation-adult',
    title: '¿Tenemos obligaciones con las generaciones futuras?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: '¿Debemos sacrificar bienestar presente para proteger a personas que aún no existen? ¿Pueden tener derechos quienes todavía no han nacido?', title: '¿Tenemos obligaciones con las generaciones futuras?' },
  },
  {
    id: 'consciousness-hard-adult',
    title: 'El problema difícil de la consciencia',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: '¿Por qué la actividad neuronal produce experiencia subjetiva? ¿Es concebible un ser físicamente idéntico a nosotros pero sin experiencia interior —un “zombi filosófico”?', title: 'El problema difícil de la consciencia' },
  },
  {
    id: 'ethics-consequentialism-adult',
    title: '¿Justifica el fin los medios?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: '¿Deberíamos juzgar las acciones solo por sus consecuencias, o hay actos intrínsecamente incorrectos independientemente del resultado? ¿Cómo resuelves el dilema del tranvía?', title: '¿Justifica el fin los medios?' },
  },
  {
    id: 'science-limits-adult',
    title: '¿Tiene límites el método científico?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: '¿Hay preguntas legítimas que la ciencia no puede responder, o cualquier pregunta válida es en principio científica? ¿Qué hace que una teoría sea científica?', title: '¿Tiene límites el método científico?' },
  },
  {
    id: 'identity-continuity-adult',
    title: 'Identidad personal y continuidad',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: 'Si reemplazáramos cada neurona de tu cerebro gradualmente por componentes sintéticos idénticos, ¿seguirías siendo tú? ¿Qué constituye la continuidad de la identidad personal?', title: 'Identidad personal y continuidad' },
  },
  {
    id: 'justice-distributive-adult',
    title: '¿Qué es una sociedad justa?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: '¿Debería una sociedad justa igualar los resultados, las oportunidades, o solo garantizar las libertades formales? ¿Cómo se justifica la desigualdad económica?', title: '¿Qué es una sociedad justa?' },
  },
  {
    id: 'language-thought-adult',
    title: '¿El lenguaje moldea el pensamiento?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: '¿Podemos pensar conceptos que no tienen palabra en nuestro idioma? ¿El lenguaje que hablamos limita o expande lo que podemos concebir?', title: '¿El lenguaje moldea el pensamiento?' },
  },
  {
    id: 'entropy-meaning-adult',
    title: '¿Puede haber sentido en un universo que se extingue?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: 'La termodinámica predice que el universo acabará en equilibrio térmico y máxima entropía. ¿Cómo articulas el valor de la existencia humana frente a esa perspectiva?', title: '¿Puede haber sentido en un universo que se extingue?' },
  },
  {
    id: 'emergence-adult',
    title: '¿Cómo surge lo nuevo de lo conocido?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: 'La consciencia emerge de neuronas, la vida de moléculas, la sociedad de individuos. ¿Es la emergencia solo una descripción conveniente, o implica que el todo es genuinamente distinto a la suma de sus partes?', title: '¿Cómo surge lo nuevo de lo conocido?' },
  },
  {
    id: 'math-reality-adult',
    title: '¿Las matemáticas describen o crean la realidad?',
    ageGroup: 'adult',
    stimulus: { type: 'question', content: '¿Las estructuras matemáticas existen independientemente de la mente humana (platonismo) o son construcciones que proyectamos sobre el mundo? ¿Por qué las matemáticas son tan “incomprensiblemente útiles” en física?', title: '¿Las matemáticas describen o crean la realidad?' },
  },
];

// ─── Score colour helpers ─────────────────────────────────────────────────────

export function getScoreColor(score: number): string {
  if (score >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 4) return 'bg-emerald-50 dark:bg-emerald-900/30';
  if (score >= 3) return 'bg-amber-50 dark:bg-amber-900/30';
  return 'bg-rose-50 dark:bg-rose-900/30';
}

// ─── Conversations (persisted) ────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  age_group: AgeGroup;
  stimulus: Stimulus;
  model_size: string;
  language: string;
  created_at: number;
  updated_at: number;
  turn_count: number;
}

export interface ConversationsPage {
  total: number;
  page: number;
  per_page: number;
  pages: number;
  items: ConversationSummary[];
}

export interface ConversationTurn {
  id: number;
  turn_index: number;
  child_input: string;
  content: string;
  question_type: QuestionType;
  thinking_trace: string;
  eval_scores: EvalScores;
  forbidden_behaviors_detected: string[];
  rag_moves_used: string[];
  timestamp: number;
}

export interface ConversationDetail {
  id: string;
  age_group: AgeGroup;
  stimulus: Stimulus;
  model_size: string;
  language: string;
  created_at: number;
  updated_at: number;
  turns: ConversationTurn[];
}
