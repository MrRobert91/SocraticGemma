/**
 * Internationalisation — UI strings and localised presets for ES and EN.
 */

import type { Preset } from './types';
import { PRESETS } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LangCode = 'es' | 'en';

interface StimulusMeta {
  icon: string;
  label: string;
  tooltip: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
}

export interface UITranslations {
  // Hero
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  // Nav
  navConversations: string;
  navLogin: string;
  navRegister: string;
  navLogout: string;
  // Legacy age selector strings kept for compatibility with unused components
  ageGroupLabel: string;
  age_6_8: string;
  age_9_12: string;
  age_13_16: string;
  age_adult: string;
  // Stimulus section
  stimulusSectionHeader: string;
  stimulusTypeLabel: string;
  stimulusQuestion: StimulusMeta;
  stimulusScenario: StimulusMeta;
  stimulusStory: StimulusMeta;
  stimulusTitleLabel: string;
  stimulusTitleOptional: string;
  stimulusContentLabel: string;
  // Presets
  presetsLabel: string;
  // Advanced options
  advancedOptionsLabel: string;
  ragLabel: string;
  durationLabel: string;
  durationUnit: string;
  // Submit
  submitLabel: string;
  submitLoading: string;
  // Errors
  errorStimulusRequired: string;
  // Footer
  footer: string;
  // Nav (extra pages)
  navHome: string;
  navWiki: string;
  navBackConversations: string;
  // Turn counter
  turnSingular: string;
  turnPlural: string;
  // Generic UI
  retryButton: string;
  unknownError: string;
  loadingEllipsis: string;
  // Conversations page — wiki / profile panel
  wikiEmptyTitle: string;
  wikiEmptyDesc: string;
  wikiViewGraph: string;
  profileGlobalTitle: string;
  profileViewWiki: string;
  profileReadFull: string;
  profileShowLess: string;
  // Conversations page — list
  savedConversationsTitle: string;
  conversationsTotalSingular: string;
  conversationsTotalPlural: string;
  paginationPrev: string;
  paginationNext: string;
  errorLoadConversations: string;
  emptyConversationsTitle: string;
  emptyConversationsDesc: string;
  // Wiki page
  wikiPageTitle: string;
  exportZip: string;
  wikiLoadingGraph: string;
  wikiEmptyGraphTitle: string;
  wikiEmptyGraphDesc: string;
  wikiNotGeneratedTitle: string;
  refreshButton: string;
  rebuildButton: string;
  rebuildingButton: string;
  // Wiki panel
  panelClose: string;
  panelResizeDrag: string;
  panelResizeLabel: string;
  panelConversationsLabel: string;
  panelSessionSingular: string;
  panelSessionPlural: string;
  panelViewFullPage: string;
  wikiProfileNodeLabel: string;
  wikiCategoryLabels: Record<string, string>;
  // Session page
  loadingSession: string;
  sessionNotFound: string;
  backToHome: string;
  sessionFallbackTitle: string;
  profileButton: string;
  initialQuestionLabel: string;
  viewPhilosophicalProfile: string;
  continueMoreTurns: string;
  inputPlaceholder: string;
  sendButton: string;
  inputHint: string;
  // Conversation detail page
  readMode: string;
  userLabel: string;
  deleteButton: string;
  deletingButton: string;
  emptyConversation: string;
  continueConversation: string;
  continueTurnsHint: string;
  preparingButton: string;
  continueConversationDesc: string;
  philosophicalProfileTitle: string;
  confirmDeleteConversation: string;
  errorLoadConversation: string;
  deleteErrorAlert: string;
}

// ─── UI Translations ──────────────────────────────────────────────────────────

const T: Record<LangCode, UITranslations> = {
  es: {
    heroTitleLine1: 'La IA que pregunta',
    heroTitleLine2: 'en lugar de responder.',
    heroSubtitle:
      'SocraticGemma se adapta al lenguaje del usuario y guía cada conversación con preguntas socráticas, recuperación de contexto, informes y memoria a largo plazo.',
    navConversations: 'Conversaciones',
    navLogin: 'Iniciar sesión',
    navRegister: 'Registrarse',
    navLogout: 'Salir',
    ageGroupLabel: 'Grupo de edad',
    age_6_8: '6–8 años',
    age_9_12: '9–12 años',
    age_13_16: '13–16 años',
    age_adult: 'Adultos',
    stimulusSectionHeader: '💬 Tu pregunta o escenario',
    stimulusTypeLabel: 'Tipo de estímulo',
    stimulusQuestion: {
      icon: '❓',
      label: 'Pregunta',
      tooltip:
        'Una pregunta abierta sin respuesta única que invita a reflexionar y argumentar. Ideal para explorar conceptos filosóficos.',
      titlePlaceholder: 'ej: ¿Qué es la justicia?',
      contentPlaceholder:
        '¿Es posible ser completamente justo con todo el mundo al mismo tiempo?',
    },
    stimulusScenario: {
      icon: '🎭',
      label: 'Escenario',
      tooltip:
        'Una situación hipotética o dilema ético donde los participantes deben tomar decisiones y razonar sobre sus consecuencias.',
      titlePlaceholder: 'ej: El tranvía descontrolado',
      contentPlaceholder:
        'Un tranvía sin frenos se dirige hacia cinco personas atadas a la vía. Puedes accionar una palanca para desviarlo, pero entonces atropellará a una persona. ¿Qué harías?',
    },
    stimulusStory: {
      icon: '📖',
      label: 'Historia',
      tooltip:
        'Un relato corto con personajes y situaciones que esconden preguntas filosóficas. Facilita la discusión a través de la narrativa.',
      titlePlaceholder: 'ej: El barco de Teseo',
      contentPlaceholder:
        'Cada año, los atenienses sustituían las tablas podridas del barco de Teseo. Con el tiempo, no quedaba ninguna tabla original. ¿Sigue siendo el mismo barco?',
    },
    stimulusTitleLabel: 'Título',
    stimulusTitleOptional: '(opcional)',
    stimulusContentLabel: 'Contenido',
    presetsLabel: 'Sugerencias rápidas',
    advancedOptionsLabel: '⚙️ Opciones avanzadas',
    ragLabel: '📚 RAG habilitado',
    durationLabel: '💬 Duración:',
    durationUnit: 'turnos',
    submitLabel: '🚀 Iniciar diálogo socrático',
    submitLoading: 'Creando sesión...',
    errorStimulusRequired: 'Por favor, introduce un estímulo o pregunta',
    footer:
      'SocraticGemma usa Google Gemma para adaptarse al lenguaje del usuario y construir un mapa vivo de su pensamiento.',
    navHome: 'Inicio',
    navWiki: '🗺 Wiki',
    navBackConversations: '← Conversaciones',
    turnSingular: 'turno',
    turnPlural: 'turnos',
    retryButton: 'Reintentar',
    unknownError: 'Error desconocido',
    loadingEllipsis: 'Cargando…',
    wikiEmptyTitle: 'Wiki filosófico personal',
    wikiEmptyDesc: 'Se construirá automáticamente al terminar conversaciones y generar informes.',
    wikiViewGraph: 'Ver grafo →',
    profileGlobalTitle: 'Tu perfil filosófico global',
    profileViewWiki: 'Ver wiki completa →',
    profileReadFull: '▼ Leer perfil completo',
    profileShowLess: '▲ Mostrar menos',
    savedConversationsTitle: 'Conversaciones guardadas',
    conversationsTotalSingular: 'conversación en total',
    conversationsTotalPlural: 'conversaciones en total',
    paginationPrev: '← Anterior',
    paginationNext: 'Siguiente →',
    errorLoadConversations: 'No se pudieron cargar las conversaciones',
    emptyConversationsTitle: 'No hay conversaciones guardadas aún',
    emptyConversationsDesc: 'Inicia una nueva sesión para que aparezca aquí.',
    wikiPageTitle: 'Tu wiki filosófico',
    exportZip: '⬇ Exportar ZIP',
    wikiLoadingGraph: 'Cargando grafo…',
    wikiEmptyGraphTitle: 'Tu wiki está vacío',
    wikiEmptyGraphDesc: 'Completa una sesión socrática y genera el informe filosófico para empezar a construir tu grafo de conocimiento.',
    wikiNotGeneratedTitle: 'Tu wiki aún no se ha generado',
    refreshButton: '🔄 Recargar',
    rebuildButton: '🛠 Regenerar wiki',
    rebuildingButton: 'Solicitando…',
    panelClose: 'Cerrar',
    panelResizeDrag: 'Arrastra para redimensionar',
    panelResizeLabel: 'Redimensionar panel',
    panelConversationsLabel: 'CONVERSACIONES',
    panelSessionSingular: 'sesión',
    panelSessionPlural: 'sesiones',
    panelViewFullPage: 'Ver página completa →',
    wikiProfileNodeLabel: 'Perfil',
    wikiCategoryLabels: {
      topic: 'Tema filosófico que has explorado en tus conversaciones',
      stream: 'Corriente filosófica (utilitarismo, estoicismo…) relacionada con tus ideas',
      reading: 'Libro o ensayo recomendado por tu perfil',
      profile: 'Tu perfil filosófico global, síntesis de todas tus sesiones',
    },
    loadingSession: 'Cargando sesión...',
    sessionNotFound: 'Sesión no encontrada',
    backToHome: 'Volver al inicio',
    sessionFallbackTitle: 'Sesión',
    profileButton: '🗺️ Perfil',
    initialQuestionLabel: '💬 Pregunta inicial',
    viewPhilosophicalProfile: '🗺️ Ver perfil filosófico',
    continueMoreTurns: '➕ Continuar 5 turnos más',
    inputPlaceholder: 'Escribe tu respuesta...',
    sendButton: 'Enviar',
    inputHint: 'Enter para enviar · Shift+Enter para nueva línea',
    readMode: 'Modo lectura',
    userLabel: 'Usuario',
    deleteButton: 'Eliminar',
    deletingButton: 'Eliminando...',
    emptyConversation: 'Esta conversación no tiene turnos guardados.',
    continueConversation: 'Continuar esta conversación',
    continueTurnsHint: '(+5 turnos)',
    preparingButton: 'Preparando...',
    continueConversationDesc: 'Retoma el diálogo donde lo dejaste. Al terminar se actualizarán el informe, la wiki y tu perfil filosófico global.',
    philosophicalProfileTitle: 'Perfil Filosófico',
    confirmDeleteConversation: '¿Eliminar esta conversación? Esta acción no se puede deshacer.',
    errorLoadConversation: 'No se pudo cargar la conversación',
    deleteErrorAlert: 'No se pudo eliminar la conversación. Inténtalo de nuevo.',
  },

  en: {
    heroTitleLine1: 'The AI that asks',
    heroTitleLine2: 'instead of answering.',
    heroSubtitle:
      'SocraticGemma adapts to the learner language, combining Socratic dialogue, retrieval, reports, and long-term memory.',
    navConversations: 'Conversations',
    navLogin: 'Log in',
    navRegister: 'Sign up',
    navLogout: 'Log out',
    ageGroupLabel: 'Age group',
    age_6_8: '6–8 years',
    age_9_12: '9–12 years',
    age_13_16: '13–16 years',
    age_adult: 'Adults',
    stimulusSectionHeader: '💬 Your question or scenario',
    stimulusTypeLabel: 'Stimulus type',
    stimulusQuestion: {
      icon: '❓',
      label: 'Question',
      tooltip:
        'An open question with no single answer that invites reflection and argument. Ideal for exploring philosophical concepts.',
      titlePlaceholder: 'e.g. What is justice?',
      contentPlaceholder: 'Is it possible to be completely fair to everyone at the same time?',
    },
    stimulusScenario: {
      icon: '🎭',
      label: 'Scenario',
      tooltip:
        'A hypothetical situation or ethical dilemma where participants must make decisions and reason about their consequences.',
      titlePlaceholder: 'e.g. The runaway trolley',
      contentPlaceholder:
        'A runaway trolley is heading towards five people tied to the track. You can pull a lever to divert it, but it will then hit one person. What would you do?',
    },
    stimulusStory: {
      icon: '📖',
      label: 'Story',
      tooltip:
        'A short narrative with characters and situations that hide philosophical questions. Facilitates discussion through storytelling.',
      titlePlaceholder: "e.g. The Ship of Theseus",
      contentPlaceholder:
        'Each year the Athenians replaced the rotting planks of the Ship of Theseus. Eventually no original plank remained. Is it still the same ship?',
    },
    stimulusTitleLabel: 'Title',
    stimulusTitleOptional: '(optional)',
    stimulusContentLabel: 'Content',
    presetsLabel: 'Quick suggestions',
    advancedOptionsLabel: '⚙️ Advanced options',
    ragLabel: '📚 RAG enabled',
    durationLabel: '💬 Length:',
    durationUnit: 'turns',
    submitLabel: '🚀 Start Socratic dialogue',
    submitLoading: 'Creating session…',
    errorStimulusRequired: 'Please enter a stimulus or question',
    footer:
      'SocraticGemma uses Google Gemma to adapt to the learner language and build a living map of their thinking.',
    navHome: 'Home',
    navWiki: '🗺 Wiki',
    navBackConversations: '← Conversations',
    turnSingular: 'turn',
    turnPlural: 'turns',
    retryButton: 'Retry',
    unknownError: 'Unknown error',
    loadingEllipsis: 'Loading…',
    wikiEmptyTitle: 'Personal philosophy wiki',
    wikiEmptyDesc: 'It will be built automatically when you finish conversations and generate reports.',
    wikiViewGraph: 'View graph →',
    profileGlobalTitle: 'Your global philosophical profile',
    profileViewWiki: 'View full wiki →',
    profileReadFull: '▼ Read full profile',
    profileShowLess: '▲ Show less',
    savedConversationsTitle: 'Saved conversations',
    conversationsTotalSingular: 'conversation in total',
    conversationsTotalPlural: 'conversations in total',
    paginationPrev: '← Previous',
    paginationNext: 'Next →',
    errorLoadConversations: 'Could not load conversations',
    emptyConversationsTitle: 'No saved conversations yet',
    emptyConversationsDesc: 'Start a new session and it will appear here.',
    wikiPageTitle: 'Your philosophy wiki',
    exportZip: '⬇ Export ZIP',
    wikiLoadingGraph: 'Loading graph…',
    wikiEmptyGraphTitle: 'Your wiki is empty',
    wikiEmptyGraphDesc: 'Complete a Socratic session and generate the philosophical report to start building your knowledge graph.',
    wikiNotGeneratedTitle: 'Your wiki has not been generated yet',
    refreshButton: '🔄 Refresh',
    rebuildButton: '🛠 Rebuild wiki',
    rebuildingButton: 'Requesting…',
    panelClose: 'Close',
    panelResizeDrag: 'Drag to resize',
    panelResizeLabel: 'Resize panel',
    panelConversationsLabel: 'CONVERSATIONS',
    panelSessionSingular: 'session',
    panelSessionPlural: 'sessions',
    panelViewFullPage: 'View full page →',
    wikiProfileNodeLabel: 'Profile',
    wikiCategoryLabels: {
      topic: 'Philosophical topic you have explored in your conversations',
      stream: 'Philosophical stream (utilitarianism, stoicism…) related to your ideas',
      reading: 'Book or essay recommended by your profile',
      profile: 'Your global philosophical profile, synthesis of all your sessions',
    },
    loadingSession: 'Loading session...',
    sessionNotFound: 'Session not found',
    backToHome: 'Back to home',
    sessionFallbackTitle: 'Session',
    profileButton: '🗺️ Profile',
    initialQuestionLabel: '💬 Initial question',
    viewPhilosophicalProfile: '🗺️ View philosophical profile',
    continueMoreTurns: '➕ Continue 5 more turns',
    inputPlaceholder: 'Write your answer...',
    sendButton: 'Send',
    inputHint: 'Enter to send · Shift+Enter for new line',
    readMode: 'Read mode',
    userLabel: 'User',
    deleteButton: 'Delete',
    deletingButton: 'Deleting...',
    emptyConversation: 'This conversation has no saved turns.',
    continueConversation: 'Continue this conversation',
    continueTurnsHint: '(+5 turns)',
    preparingButton: 'Preparing...',
    continueConversationDesc: 'Pick up the dialogue where you left off. The report, wiki, and your global philosophical profile will be updated when you finish.',
    philosophicalProfileTitle: 'Philosophical Profile',
    confirmDeleteConversation: 'Delete this conversation? This action cannot be undone.',
    errorLoadConversation: 'Could not load the conversation',
    deleteErrorAlert: 'Could not delete the conversation. Please try again.',
  },
};

export function getTranslations(lang: LangCode): UITranslations {
  return T[lang] ?? T.es;
}

// ─── Preset translations ──────────────────────────────────────────────────────

type NonEsLang = Exclude<LangCode, 'es'>;
const PRESET_I18N: Record<string, Partial<Record<NonEsLang, { title: string; content: string }>>> = {
  // ── 6–8 ────────────────────────────────────────────────────────────────────
  'justice-6-8': {
    en: { title: 'What does it mean to be fair?', content: 'What does it mean to be fair? Is it the same for everyone?' },
  },
  'friendship-6-8': {
    en: { title: 'What is a friend?', content: 'What makes someone a good friend?' },
  },
  'lying-6-8': {
    en: { title: 'Is lying wrong?', content: 'Is it always wrong to tell a lie, or are there times when it might be okay?' },
  },
  'alive-6-8': {
    en: { title: 'What things are alive?', content: 'How do you know if something is alive? Is a plant alive in the same way a dog is?' },
  },
  'feelings-6-8': {
    en: { title: 'Can animals feel?', content: 'Do you think animals feel things like you do? How do you know?' },
  },
  'rules-6-8': {
    en: { title: 'What are rules for?', content: 'Why do rules exist? Would it be better to have no rules at all?' },
  },
  'sharing-6-8': {
    en: { title: 'Must we always share?', content: 'Must we share everything we have? Are there things we do not need to share?' },
  },
  'fear-6-8': {
    en: { title: 'Is it wrong to be afraid?', content: 'Does being afraid mean you are a coward? What is fear for?' },
  },
  'dreams-6-8': {
    en: { title: 'What are dreams?', content: 'When you dream at night, is what you see real? How do you know that what you see when awake is real?' },
  },
  'stars-6-8': {
    en: { title: 'What is beyond the stars?', content: 'Does space end somewhere? What would there be after if it ended?' },
  },
  'color-6-8': {
    en: { title: 'Do we all see colours the same?', content: 'When you and I look at red, are we seeing exactly the same thing? How could we find out?' },
  },
  'numbers-6-8': {
    en: { title: 'Do numbers exist?', content: 'Does the number 3 exist somewhere, or only when we think or write it?' },
  },
  // ── 9–12 ───────────────────────────────────────────────────────────────────
  'truth-9-12': {
    en: { title: 'Must we always tell the truth?', content: 'Is it always good to tell the truth, even when it hurts?' },
  },
  'happiness-9-12': {
    en: { title: 'What is happiness?', content: 'What do you need to be happy? Is it the same for everyone?' },
  },
  'fairness-9-12': {
    en: { title: 'Is it fair that we are not all equal?', content: 'Some people are born with more advantages than others. Is that fair? Who decides what fairness means?' },
  },
  'robots-9-12': {
    en: { title: 'Can machines think?', content: 'If a robot can solve problems and answer questions, is it really thinking or just simulating?' },
  },
  'courage-9-12': {
    en: { title: 'What is courage?', content: 'Is someone brave if they do something scary even though they are afraid, or only if they feel no fear at all?' },
  },
  'nature-9-12': {
    en: { title: 'Does nature have rights?', content: 'Should rivers, forests or animals have rights like people? Why?' },
  },
  'evolution-9-12': {
    en: { title: 'Why are there so many different living things?', content: 'Living things change over millions of years. What does that mean for where we come from and who we are?' },
  },
  'money-9-12': {
    en: { title: 'Why does money have value?', content: 'A banknote is just paper. Why do we give it value? What would happen if everyone decided it was worthless?' },
  },
  'memory-9-12': {
    en: { title: 'Are you the same person as five years ago?', content: 'If you have changed so much since you were a baby, what makes you still you and not someone else?' },
  },
  'infinite-9-12': {
    en: { title: 'Can infinity exist?', content: 'Does the universe have an end? Would it be possible to count to infinity? What does it mean for something to have no limit?' },
  },
  'art-9-12': {
    en: { title: 'Can anything be art?', content: 'If someone puts a brick in a museum and calls it art, is it? Who decides what art is?' },
  },
  'time-9-12': {
    en: { title: 'Does time pass the same for everyone?', content: 'When you are having fun, time flies; when you are bored, it drags. Is time always the same, or does it depend on who is living it?' },
  },
  // ── 13–16 ──────────────────────────────────────────────────────────────────
  'freedom-13-16': {
    en: { title: 'Are we truly free?', content: 'To what extent are we free to make our own decisions?' },
  },
  'identity-13-16': {
    en: { title: 'What makes you who you are?', content: 'What is it that makes you who you are? Would you be the same person if your memories changed?' },
  },
  'ethics-ai-13-16': {
    en: { title: 'Can AI be ethical?', content: 'Can artificial intelligence make moral decisions? Or does morality require consciousness?' },
  },
  'democracy-13-16': {
    en: { title: 'Is democracy the best system?', content: 'If the majority votes for something unjust, is it still legitimate? What limits should popular will have?' },
  },
  'consciousness-13-16': {
    en: { title: 'What is consciousness?', content: 'Why do we have subjective experiences? Would it be possible for a being to process information without feeling anything?' },
  },
  'climate-responsibility-13-16': {
    en: { title: 'Who is responsible for climate change?', content: 'Should every individual change their lifestyle, or does the responsibility fall mainly on governments and companies? Can both coexist?' },
  },
  'genes-destiny-13-16': {
    en: { title: 'Do our genes determine who we are?', content: 'Science shows that many traits have a genetic basis. If our character partly comes from our genes, how much real control do we have over ourselves?' },
  },
  'simulation-13-16': {
    en: { title: 'Could we be living in a simulation?', content: 'How would you know if the reality you perceive is genuine or a computer simulation? Would knowing change anything in your life?' },
  },
  'social-media-truth-13-16': {
    en: { title: 'Do social media distort reality?', content: 'If algorithms only show us what we want to see, can we still form an objective opinion? Does objectivity even exist?' },
  },
  'privacy-13-16': {
    en: { title: 'Do you have the right to total privacy?', content: 'Does collective security justify mass surveillance of citizens? Where is the line between security and individual freedom?' },
  },
  'multiverse-13-16': {
    en: { title: 'Do other universes exist?', content: 'Some physicists propose there are infinite parallel universes. If we cannot observe or measure them, does it make sense to speak of them scientifically?' },
  },
  'meaning-13-16': {
    en: { title: 'Does life have meaning?', content: 'Is the meaning of life something we discover or something we invent? Can something have meaning in a universe not created with any purpose?' },
  },
  // ── Adults ─────────────────────────────────────────────────────────────────
  'free-will-adult': {
    en: { title: 'Does free will exist?', content: 'If every decision we make is the result of prior physical causes (neurons, genes, experiences), can real freedom exist? Does that change moral responsibility?' },
  },
  'truth-adult': {
    en: { title: 'What is truth?', content: 'Is truth something we discover or something we construct socially? Can contradictory truths exist depending on cultural context?' },
  },
  'obligation-adult': {
    en: { title: 'Do we have obligations to future generations?', content: 'Must we sacrifice present wellbeing to protect people who do not yet exist? Can those not yet born have rights?' },
  },
  'consciousness-hard-adult': {
    en: { title: 'The hard problem of consciousness', content: "Why does neural activity produce subjective experience? Is it conceivable for a being physically identical to us to lack any inner experience — a 'philosophical zombie'?" },
  },
  'ethics-consequentialism-adult': {
    en: { title: 'Do the ends justify the means?', content: 'Should we judge actions only by their consequences, or are some acts intrinsically wrong regardless of outcome? How do you resolve the trolley problem?' },
  },
  'science-limits-adult': {
    en: { title: 'Does the scientific method have limits?', content: 'Are there legitimate questions science cannot answer, or is any valid question in principle scientific? What makes a theory scientific?' },
  },
  'identity-continuity-adult': {
    en: { title: 'Personal identity and continuity', content: 'If every neuron in your brain were gradually replaced by an identical synthetic component, would you still be you? What constitutes the continuity of personal identity?' },
  },
  'justice-distributive-adult': {
    en: { title: 'What is a just society?', content: 'Should a just society equalise outcomes, opportunities, or only guarantee formal freedoms? How is economic inequality justified?' },
  },
  'language-thought-adult': {
    en: { title: 'Does language shape thought?', content: 'Can we think concepts that have no word in our language? Does the language we speak limit or expand what we can conceive?' },
  },
  'entropy-meaning-adult': {
    en: { title: 'Can there be meaning in a dying universe?', content: 'Thermodynamics predicts the universe will end in thermal equilibrium and maximum entropy. How do you articulate the value of human existence in the face of that prospect?' },
  },
  'emergence-adult': {
    en: { title: 'How does the new arise from the known?', content: 'Consciousness emerges from neurons, life from molecules, society from individuals. Is emergence just a convenient description, or does it imply the whole is genuinely different from the sum of its parts?' },
  },
  'math-reality-adult': {
    en: { title: 'Do mathematics describe or create reality?', content: "Do mathematical structures exist independently of the human mind (Platonism), or are they constructions we project onto the world? Why are mathematics so 'unreasonably effective' in physics?" },
  },
};

/**
 * Returns the PRESETS array with titles and stimulus content translated to the given language.
 * Falls back to the Spanish original for any preset without a translation entry.
 */
export function getLocalizedPresets(lang: LangCode): Preset[] {
  if (lang === 'es') return PRESETS;
  return PRESETS.map((preset) => {
    const tr = PRESET_I18N[preset.id]?.[lang as NonEsLang];
    if (!tr) return preset;
    return {
      ...preset,
      title: tr.title,
      stimulus: { ...preset.stimulus, title: tr.title, content: tr.content },
    };
  });
}
