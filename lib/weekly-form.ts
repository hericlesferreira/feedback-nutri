type Rule = { key: string; values: (string | number | boolean)[] };
type Item = {
  key: string;
  title: string;
  kind: "scale" | "number" | "long_text" | "single_choice";
  help_text?: string;
  required?: boolean;
  config?: Record<string, unknown>;
  when?: Rule[];
};

const adherence = [
  "Consegui seguir na maior parte dos dias.",
  "Segui parcialmente, mas tive algumas dificuldades.",
  "Tive bastante dificuldade para seguir.",
  "Praticamente não consegui seguir.",
];
const situations = ["Não.", "Sim, uma ou duas vezes.", "Sim, três ou mais vezes.", "Minha alimentação ficou desorganizada durante boa parte da semana."];
const satisfaction = ["Fiquei satisfeito com as refeições.", "Senti fome com frequência.", "Tive vontade frequente de comer além do planejado.", "Tive dificuldade para comer as quantidades prescritas.", "Algumas refeições ficaram repetitivas ou enjoativas.", "Não percebi dificuldades importantes."];
const training = ["Consegui cumprir o que estava planejado.", "Fiz parte do que estava planejado.", "Não consegui realizar os treinos.", "Não tenho treinos programados atualmente.", "Estou em recuperação ou fui orientado a não treinar."];
const support = ["Organizar melhor minha alimentação.", "Controlar melhor a fome ou a vontade de comer.", "Melhorar minha relação com refeições fora do planejamento.", "Conseguir manter os treinos.", "Melhorar o sono, a energia ou a rotina.", "Ajustar meu plano alimentar.", "Manter o que está funcionando.", "Tenho outra dificuldade.", "Não sei por onde começar."];

const rule = (key: string, values: Rule["values"]): Rule => ({ key, values });
const choice = (key: string, title: string, options: string[], when?: Rule[], multiple = false): Item =>
  ({ key, title, kind: "single_choice", config: { options, multiple }, when });
const followUp = (key: string, title: string, ...when: Rule[]): Item =>
  ({ key, title, kind: "long_text", when });

const goalProgress = ["Consegui realizar.", "Consegui parcialmente.", "Não consegui.", "A meta deixou de fazer sentido para minha rotina."];

const items: Item[] = [
  choice("goalReview", "Como foi colocar sua meta em prática?", goalProgress, [rule("previousGoal", [true])]),
  followUp("goalSuccess", "O que ajudou você a conseguir?", rule("goalReview", [goalProgress[0]])),
  followUp("goalBarrier", "O que mais dificultou?", rule("goalReview", goalProgress.slice(1, 3))),
  followUp("goalChanged", "O que mudou desde que combinamos isso?", rule("goalReview", [goalProgress[3]])),
  { key: "week", title: "Como você avalia sua semana em relação à alimentação e aos cuidados com a saúde?", kind: "scale", config: { min: 0, max: 10, min_label: "Muito difícil", max_label: "Excelente" } },
  followUp("weekLow", "O que mais pesou para você dar essa nota?", rule("week", [0, 1, 2, 3, 4, 5])),
  followUp("weekHigh", "O que mais contribuiu para sua semana ter sido assim?", rule("week", [6, 7, 8, 9, 10])),
  choice("adherence", "Como foi seguir seu planejamento alimentar nesta semana?", adherence),
  choice("barrier", "Qual foi a principal dificuldade?", ["Falta de tempo ou organização.", "Fome ou pouca saciedade.", "Dificuldade com as quantidades prescritas.", "Falta de opções práticas.", "Alimentação fora de casa.", "Vontade de comer alimentos diferentes.", "Cansaço, ansiedade ou outras emoções.", "Não gostei de algumas refeições.", "Outra situação."], [rule("adherence", adherence.slice(1))]),
  followUp("barrierOther", "Qual foi a outra situação?", rule("barrier", ["Outra situação."])),
  choice("situations", "Você teve alguma refeição ou situação alimentar diferente do planejado?", situations),
  choice("reaction", "Como você lidou com essas situações?", ["Comi de maneira diferente e depois retomei minha rotina normalmente.", "Acabei comendo mais do que gostaria, mas retomei depois.", "Tive dificuldade para retomar minha alimentação.", "Senti culpa ou tentei compensar comendo menos ou pulando refeições.", "Senti que perdi o controle sobre a quantidade que comi.", "Outra situação."], [rule("situations", situations.slice(1))]),
  choice("satisfaction", "Como você se sentiu em relação à fome e à satisfação com sua alimentação?", satisfaction, undefined, true),
  followUp("hunger", "Em quais momentos do dia você sentiu mais fome?", rule("satisfaction", [satisfaction[1]])),
  followUp("amount", "Quais refeições ou alimentos ficaram mais difíceis de consumir?", rule("satisfaction", [satisfaction[3]])),
  followUp("meal", "Qual refeição você gostaria que ajustássemos?", rule("satisfaction", [satisfaction[4]])),
  choice("training", "Como foram seus treinos e atividades físicas nesta semana?", training),
  choice("trainingBarrier", "O que mais dificultou?", ["Falta de tempo.", "Cansaço.", "Falta de motivação.", "Mudanças na rotina.", "Dor ou desconforto físico.", "Doença ou indisposição.", "Dificuldade com o ambiente ou local de treino.", "Outra situação."], [rule("training", training.slice(1, 3))]),
  choice("sleep", "Como esteve seu sono?", ["Bom", "Regular", "Ruim"]),
  choice("energy", "Como esteve sua energia?", ["Boa", "Oscilante", "Baixa"]),
  choice("stress", "Como esteve seu nível de estresse?", ["Baixo", "Moderado", "Elevado"]),
  choice("impact", "Você percebeu que isso atrapalhou sua alimentação ou seus treinos?", ["Sim.", "Não.", "Não sei dizer."], [rule("sleep", ["Ruim"]), rule("energy", ["Baixa"]), rule("stress", ["Elevado"])]),
  followUp("impactNote", "Quer comentar como isso afetou sua rotina?", rule("impact", ["Sim."])),
  { key: "win", title: "Qual foi sua principal conquista nesta semana?", kind: "long_text", help_text: "Pode ser uma mudança na alimentação, um treino realizado, uma situação que conseguiu administrar melhor ou qualquer pequena evolução que tenha sido importante para você." },
  choice("support", "Pensando na próxima semana, em que você mais gostaria de receber minha ajuda?", support),
  followUp("nextChange", "Qual pequena mudança você acredita que poderia ajudar?", rule("support", [...support.slice(0, 6), support[7]])),
  followUp("keep", "O que você gostaria de continuar fazendo na próxima semana?", rule("support", [support[6]])),
  {
    key: "goalConfidence",
    title: "De 0 a 10, quão confiante você está de que conseguirá realizar essa mudança?",
    kind: "scale",
    required: false,
    when: [{ key: "nextChange", values: [] }, { key: "keep", values: [] }],
    config: { min: 0, max: 10, min_label: "Nada confiante", max_label: "Muito confiante" },
  },
  { key: "weight", title: "Peso atual (kg)", kind: "number", required: false, help_text: "Opcional. Informe seu peso para acompanhar a evolução no gráfico.", config: { unit: "kg", step: 0.1, metric: "weight" } },
];

export const weeklyQuestions = items.map(({ key, when, config, required, ...item }, index) => ({
  ...item,
  position: index + 1,
  required: required ?? !when,
  config: { ...config, key, ...(when ? { when } : {}) },
}));
