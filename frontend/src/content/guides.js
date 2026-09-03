export const guides = [
  {
    slug: "journal-trading-utile",
    number: "01",
    readTime: 7,
    category: { fr: "Journal", en: "Journal" },
    title: { fr: "Construire un journal de trading vraiment utile", en: "Build a trading journal that is actually useful" },
    summary: {
      fr: "Transforme une liste de résultats en système de feedback capable de montrer ce qui mérite d’être répété ou corrigé.",
      en: "Turn a list of results into a feedback system that reveals what deserves to be repeated or corrected.",
    },
    outcome: {
      fr: "À la fin, tu sauras quoi noter avant, pendant et après un trade, puis comment relire tes données sans te focaliser uniquement sur le P&L.",
      en: "By the end, you will know what to record before, during, and after a trade, and how to review your data without focusing only on P&L.",
    },
    keyPoints: {
      fr: ["Sépare le plan initial du résultat final.", "Utilise des champs cohérents sur chaque trade.", "Cherche des répétitions sur plusieurs trades, jamais une explication parfaite après coup."],
      en: ["Separate the initial plan from the final outcome.", "Use consistent fields for every trade.", "Look for repetition across several trades, not a perfect explanation after the fact."],
    },
    sections: [
      {
        id: "avant-le-trade",
        title: { fr: "1. Capturer la décision avant le résultat", en: "1. Capture the decision before the outcome" },
        paragraphs: {
          fr: ["Un journal devient utile lorsqu’il conserve ce que tu savais au moment de décider. Après la clôture, le résultat influence facilement le souvenir : un gain peut faire paraître une mauvaise entrée logique, et une perte peut faire douter d’un plan pourtant respecté.", "Avant l’entrée, note le setup, le contexte, le niveau d’invalidation et le risque prévu. Ces éléments permettent ensuite de comparer la qualité de la décision avec son résultat."],
          en: ["A journal becomes useful when it preserves what you knew at decision time. Once a trade is closed, the outcome can distort memory: a win can make a poor entry look logical, while a loss can undermine a plan that was followed correctly.", "Before entry, record the setup, context, invalidation level, and planned risk. These elements let you compare decision quality with its outcome."],
        },
        bullets: {
          fr: ["Setup et scénario attendu", "Risque prévu et niveau d’invalidation", "Contexte de marché et annonces connues", "État émotionnel avant l’entrée"],
          en: ["Setup and expected scenario", "Planned risk and invalidation level", "Market context and known events", "Emotional state before entry"],
        },
      },
      {
        id: "apres-le-trade",
        title: { fr: "2. Évaluer l’exécution, pas seulement le gain", en: "2. Evaluate execution, not only profit" },
        paragraphs: {
          fr: ["Après le trade, complète le résultat, le R multiple, les frais et les écarts au plan. Un trade gagnant hors plan reste une alerte comportementale ; un trade perdant parfaitement exécuté peut rester une bonne décision.", "Utilise des tags courts et stables. Si les catégories changent chaque semaine, les statistiques deviennent difficiles à comparer."],
          en: ["After the trade, complete the result, R multiple, fees, and any deviations from the plan. A winning trade outside the plan is still a behavioral warning; a perfectly executed losing trade can remain a good decision.", "Use short, stable tags. If categories change every week, your statistics become difficult to compare."],
        },
      },
      {
        id: "revue-hebdomadaire",
        title: { fr: "3. Transformer les données en prochaine action", en: "3. Turn the data into a next action" },
        paragraphs: {
          fr: ["Une revue hebdomadaire doit aboutir à une décision simple. Compare les setups, les sessions, les erreurs et le respect du plan sur un échantillon suffisant. Ne modifie pas cinq règles à la fois.", "Choisis un comportement à conserver et un comportement à corriger pour la semaine suivante. Cette boucle courte rend le journal opérationnel au lieu d’en faire une archive."],
          en: ["A weekly review should end with one simple decision. Compare setups, sessions, mistakes, and plan compliance across a meaningful sample. Do not change five rules at once.", "Choose one behavior to keep and one behavior to correct next week. This short loop turns the journal into an operating tool rather than an archive."],
        },
      },
    ],
    checklist: {
      fr: ["Créer une liste stable de setups", "Renseigner le risque avant l’entrée", "Distinguer résultat et respect du plan", "Planifier une revue hebdomadaire de 20 minutes"],
      en: ["Create a stable setup list", "Record risk before entry", "Separate outcome from plan compliance", "Schedule a 20-minute weekly review"],
    },
  },
  {
    slug: "comprendre-drawdown-prop-firm",
    number: "02",
    readTime: 8,
    category: { fr: "Gestion du risque", en: "Risk management" },
    title: { fr: "Comprendre le drawdown d’une prop firm", en: "Understand a prop firm drawdown" },
    summary: {
      fr: "Lis correctement une limite fixe, quotidienne ou suiveuse et mesure la marge réellement disponible avant chaque session.",
      en: "Read fixed, daily, and trailing limits correctly and measure the margin truly available before each session.",
    },
    outcome: {
      fr: "Tu pourras transformer les règles officielles de ton compte en limites de session compréhensibles et éviter de confondre solde, equity et marge de sécurité.",
      en: "You will be able to turn your account’s official rules into understandable session limits and avoid confusing balance, equity, and safety margin.",
    },
    keyPoints: {
      fr: ["La méthode de calcul dépend toujours des règles officielles de la firme.", "Le drawdown restant est une capacité de survie, pas un budget à consommer.", "Une marge réduite doit entraîner un risque plus faible, pas plus d’agressivité."],
      en: ["The calculation method always depends on the firm’s official rules.", "Remaining drawdown is survival capacity, not a budget to spend.", "A smaller buffer should lead to lower risk, not more aggression."],
    },
    sections: [
      {
        id: "types-de-limites",
        title: { fr: "1. Identifier la règle réellement appliquée", en: "1. Identify the rule that actually applies" },
        paragraphs: {
          fr: ["Une limite fixe reste généralement rattachée à un niveau défini. Une limite quotidienne se réinitialise selon une heure et une méthode précisées par la firme. Une limite suiveuse peut évoluer avec le solde ou l’equity jusqu’à un éventuel verrouillage.", "Les noms commerciaux ne suffisent pas : lis la documentation officielle et note la base de calcul, l’heure de réinitialisation, le traitement des positions ouvertes et les éventuelles règles de cohérence."],
          en: ["A fixed limit generally remains tied to a defined level. A daily limit resets according to a time and method specified by the firm. A trailing limit may move with balance or equity until a possible lock point.", "Commercial labels are not enough: read the official documentation and record the calculation base, reset time, treatment of open positions, and any consistency rules."],
        },
      },
      {
        id: "calculer-le-coussin",
        title: { fr: "2. Calculer une marge de sécurité exploitable", en: "2. Calculate a usable safety buffer" },
        paragraphs: {
          fr: ["Commence par le niveau de liquidation applicable, puis compare-le à la valeur de référence exigée par la règle. La différence forme ton coussin brut. Retire ensuite une marge volontaire pour les frais, le slippage et les variations intraday.", "Exemple pédagogique : si ta marge brute est de 1 200 $ et que tu conserves 400 $ intouchables, ta capacité opérationnelle n’est pas 1 200 $, mais 800 $. Ce montant ne doit pas devenir automatiquement le risque d’une seule session."],
          en: ["Start with the applicable liquidation level, then compare it with the reference value required by the rule. The difference forms your gross buffer. Then reserve a voluntary margin for fees, slippage, and intraday fluctuations.", "Educational example: if your gross buffer is $1,200 and you preserve $400 as untouchable, your operating capacity is not $1,200 but $800. That amount should not automatically become the risk for a single session."],
        },
      },
      {
        id: "politique-de-risque",
        title: { fr: "3. Adapter le risque avant d’être sous pression", en: "3. Adjust risk before pressure appears" },
        paragraphs: {
          fr: ["Définis à l’avance des paliers : risque normal avec une marge confortable, risque réduit lorsque le coussin diminue, puis arrêt lorsque le seuil interne est atteint. La décision est alors prise à froid.", "PipsEvo peut suivre les valeurs que tu renseignes, mais les règles de la firme restent la source officielle. Vérifie-les après chaque changement de programme ou de compte."],
          en: ["Define tiers in advance: normal risk with a comfortable buffer, reduced risk as the buffer shrinks, and a stop when your internal threshold is reached. The decision is then made without pressure.", "PipsEvo can track the values you enter, but the firm’s rules remain the official source. Recheck them after any program or account change."],
        },
      },
    ],
    checklist: {
      fr: ["Enregistrer le type exact de drawdown", "Noter l’heure et la base de réinitialisation", "Définir une marge volontaire intouchable", "Créer des paliers de réduction du risque"],
      en: ["Record the exact drawdown type", "Record the reset time and calculation base", "Define a voluntary untouchable buffer", "Create risk-reduction tiers"],
    },
  },
  {
    slug: "suivre-r-multiple",
    number: "03",
    readTime: 6,
    category: { fr: "Statistiques", en: "Statistics" },
    title: { fr: "Pourquoi suivre son R multiple", en: "Why track your R multiple" },
    summary: {
      fr: "Compare des trades de tailles différentes avec une unité commune fondée sur le risque réellement prévu.",
      en: "Compare trades of different sizes with a common unit based on the risk actually planned." },
    outcome: {
      fr: "Tu sauras calculer le R d’un trade, interpréter une série et éviter les comparaisons trompeuses basées uniquement sur les dollars.",
      en: "You will know how to calculate a trade’s R, interpret a series, and avoid misleading comparisons based only on dollars." },
    keyPoints: {
      fr: ["1R correspond au risque initial réellement défini.", "Le R normalise les résultats, mais ne remplace pas l’analyse du contexte.", "L’espérance se lit sur une série suffisamment grande."],
      en: ["1R is the actual initial risk you defined.", "R normalizes outcomes but does not replace context analysis.", "Expectancy must be read over a sufficiently large series."],
    },
    sections: [
      { id: "definition", title: { fr: "1. Définir une unité stable", en: "1. Define a stable unit" }, paragraphs: { fr: ["Si tu risques 100 $ avant l’entrée, 1R vaut 100 $. Une perte complète prévue vaut -1R ; un gain de 250 $ vaut +2,5R. La référence doit rester le risque initial, pas un stop déplacé après coup.", "Cette unité permet de comparer un petit compte et un grand compte, ou deux périodes durant lesquelles la taille de position a changé."], en: ["If you risk $100 before entry, 1R equals $100. A full planned loss is -1R; a $250 gain is +2.5R. The reference must remain the initial risk, not a stop moved after the fact.", "This unit lets you compare a small and a large account, or two periods in which position size changed."] } },
      { id: "lire-une-serie", title: { fr: "2. Lire la distribution, pas le trade isolé", en: "2. Read the distribution, not one trade" }, paragraphs: { fr: ["Le R multiple devient intéressant lorsqu’il est regroupé par setup, session ou qualité d’exécution. Observe le gain moyen, la perte moyenne, le taux de réussite et les extrêmes.", "Une stratégie peut avoir moins de 50 % de réussite et rester positive si ses gains moyens compensent ses pertes. L’inverse est également possible avec beaucoup de petits gains et quelques grandes pertes."], en: ["R multiple becomes useful when grouped by setup, session, or execution quality. Observe average win, average loss, win rate, and extremes.", "A strategy can win less than 50% of the time and still be positive if average wins compensate for losses. The reverse is also possible with many small wins and a few large losses."] } },
      { id: "limites", title: { fr: "3. Conserver le contexte", en: "3. Keep the context" }, paragraphs: { fr: ["Deux trades à +2R ne sont pas nécessairement équivalents. L’un peut respecter le plan et l’autre dépendre d’une prise de risque non prévue. Associe toujours le R au setup, au risque prévu et au respect du processus.", "Utilise cette mesure pour poser de meilleures questions, pas pour optimiser artificiellement chaque historique."], en: ["Two +2R trades are not necessarily equivalent. One may follow the plan while the other depends on unplanned risk. Always connect R with the setup, planned risk, and process compliance.", "Use this measure to ask better questions, not to artificially optimize every history."] } },
    ],
    checklist: { fr: ["Fixer 1R avant chaque entrée", "Enregistrer résultat en dollars et en R", "Comparer les R par setup", "Contrôler les valeurs extrêmes"], en: ["Set 1R before each entry", "Record results in dollars and R", "Compare R by setup", "Review extreme values"] },
  },
  {
    slug: "eviter-revenge-trading",
    number: "04",
    readTime: 7,
    category: { fr: "Discipline", en: "Discipline" },
    title: { fr: "Éviter le revenge trading", en: "Avoid revenge trading" },
    summary: { fr: "Construis un protocole concret pour interrompre la boucle perte, urgence et nouvelle prise de risque.", en: "Build a concrete protocol to interrupt the loss, urgency, and renewed-risk loop." },
    outcome: { fr: "Tu disposeras de déclencheurs mesurables, d’une procédure d’arrêt et d’indicateurs pour voir si le comportement recule réellement.", en: "You will have measurable triggers, a stop procedure, and indicators to see whether the behavior is truly declining." },
    keyPoints: { fr: ["Le signal principal est souvent l’urgence de récupérer une perte.", "Une règle utile doit pouvoir être appliquée sous stress.", "Mesure le coût des écarts au plan pour suivre les progrès."], en: ["The main signal is often the urge to recover a loss.", "A useful rule must be executable under stress.", "Measure the cost of plan deviations to track progress."] },
    sections: [
      { id: "reconnaitre", title: { fr: "1. Reconnaître la boucle", en: "1. Recognize the loop" }, paragraphs: { fr: ["Le revenge trading ne commence pas forcément par une taille énorme. Il peut apparaître comme une entrée plus rapide, un setup moins clair ou une envie de modifier le plan pour revenir immédiatement à l’équilibre.", "Identifie tes signaux personnels : accélération du rythme, consultation obsessionnelle du P&L, déplacement du stop ou multiplication des marchés suivis."], en: ["Revenge trading does not always start with oversized risk. It may appear as a faster entry, a weaker setup, or an urge to change the plan to get back to breakeven immediately.", "Identify your personal signals: faster pace, obsessive P&L checking, moving the stop, or multiplying the markets you watch."] } },
      { id: "protocole", title: { fr: "2. Utiliser un protocole non négociable", en: "2. Use a non-negotiable protocol" }, paragraphs: { fr: ["Prépare une règle simple avant la session : après deux pertes consécutives ou une violation de règle, ferme la plateforme pendant une durée précise. Ajoute une action physique ou écrite qui rompt l’automatisme.", "La pause n’est pas une punition. Elle empêche un état émotionnel temporaire de décider du prochain risque."], en: ["Prepare a simple rule before the session: after two consecutive losses or one rule violation, close the platform for a defined period. Add a physical or written action that breaks the automatic behavior.", "The pause is not a punishment. It prevents a temporary emotional state from deciding the next risk."] } },
      { id: "mesurer", title: { fr: "3. Mesurer la récupération comportementale", en: "3. Measure behavioral recovery" }, paragraphs: { fr: ["Suis le nombre de trades hors plan, leur coût en R et le moment où ils apparaissent. Cherche une baisse de fréquence et d’impact sur plusieurs semaines.", "Si le comportement persiste, réduis l’exposition ou interromps le trading réel. Demander l’aide d’un professionnel de santé peut aussi être approprié si la perte de contrôle affecte ton bien-être."], en: ["Track the number of off-plan trades, their cost in R, and when they occur. Look for lower frequency and impact over several weeks.", "If the behavior persists, reduce exposure or stop live trading. Seeking help from a health professional may also be appropriate if loss of control affects your wellbeing."] } },
    ],
    checklist: { fr: ["Lister mes signaux d’urgence", "Définir un seuil d’arrêt automatique", "Préparer une action de pause", "Mesurer chaque trade hors plan en R"], en: ["List my urgency signals", "Define an automatic stop threshold", "Prepare a pause action", "Measure each off-plan trade in R"] },
  },
  {
    slug: "preparer-demande-payout",
    number: "05",
    readTime: 7,
    category: { fr: "Payouts", en: "Payouts" },
    title: { fr: "Préparer une demande de payout", en: "Prepare a payout request" },
    summary: { fr: "Vérifie l’éligibilité, protège la marge restante et conserve une trace claire de chaque retrait.", en: "Check eligibility, protect the remaining buffer, and keep a clear record of every withdrawal." },
    outcome: { fr: "Tu pourras préparer un retrait sans découvrir trop tard son impact sur le solde, le drawdown ou les règles de ton programme.", en: "You will be able to prepare a withdrawal without discovering too late how it affects balance, drawdown, or program rules." },
    keyPoints: { fr: ["Les règles officielles et l’espace de la firme font foi.", "Un payout peut modifier la marge disponible après retrait.", "Le montant demandé n’est pas le montant net reçu tant que frais et conversion ne sont pas confirmés."], en: ["The firm’s official rules and portal are authoritative.", "A payout can change the buffer available after withdrawal.", "The requested amount is not the net amount received until fees and conversion are confirmed."] },
    sections: [
      { id: "eligibilite", title: { fr: "1. Vérifier l’éligibilité avec une source officielle", en: "1. Check eligibility against an official source" }, paragraphs: { fr: ["Contrôle les jours minimum, les seuils de profit, les éventuelles règles de cohérence, l’identité vérifiée et la fenêtre de demande. Les conditions peuvent varier selon le programme et évoluer.", "Crée une courte liste de contrôle avec un lien vers la règle correspondante. Une mémoire ou une publication sur un réseau social ne remplace pas le règlement du compte."], en: ["Check minimum days, profit thresholds, any consistency rules, verified identity, and the request window. Conditions can vary by program and change over time.", "Create a short checklist with a link to the corresponding rule. Memory or a social-media post does not replace the account’s official terms."] } },
      { id: "apres-retrait", title: { fr: "2. Simuler la situation après retrait", en: "2. Simulate the post-withdrawal position" }, paragraphs: { fr: ["Projette le solde après retrait, le niveau de drawdown applicable et la marge de sécurité restante. Ajoute les frais potentiels et évite d’utiliser le profit brut comme seule référence.", "Si le retrait laisse un coussin trop faible pour ton risque habituel, réduis le montant demandé ou adapte ton risque futur avant de valider."], en: ["Project the balance after withdrawal, the applicable drawdown level, and the remaining safety margin. Include potential fees and avoid using gross profit as your only reference.", "If the withdrawal leaves too little buffer for your usual risk, reduce the requested amount or adjust future risk before confirming."] } },
      { id: "tracabilite", title: { fr: "3. Documenter le cycle complet", en: "3. Document the full cycle" }, paragraphs: { fr: ["Enregistre la date, le montant demandé, le statut, les frais, le taux de conversion et le montant net reçu. Cette trace permet de distinguer performance de trading et flux de trésorerie.", "Ne marque le payout comme reçu qu’après confirmation effective. PipsEvo sert à organiser le suivi, pas à garantir l’éligibilité ni le paiement de la firme."], en: ["Record the date, requested amount, status, fees, conversion rate, and net amount received. This trail separates trading performance from cash flow.", "Do not mark the payout as received until it is effectively confirmed. PipsEvo organizes tracking; it does not guarantee eligibility or payment by the firm."] } },
    ],
    checklist: { fr: ["Relire les règles officielles actuelles", "Vérifier toutes les conditions d’éligibilité", "Simuler le solde et le drawdown après retrait", "Archiver la demande et le montant net reçu"], en: ["Re-read the current official rules", "Check every eligibility condition", "Simulate balance and drawdown after withdrawal", "Archive the request and net amount received"] },
  },
  {
    slug: "backtest-sans-se-mentir",
    number: "06",
    readTime: 8,
    category: { fr: "Backtest", en: "Backtesting" },
    title: { fr: "Utiliser un backtest sans se mentir", en: "Use a backtest without fooling yourself" },
    summary: { fr: "Teste une hypothèse définie à l’avance, dans plusieurs contextes, avec des coûts et des règles réalistes.", en: "Test a predefined hypothesis across multiple contexts with realistic costs and rules." },
    outcome: { fr: "Tu sauras préparer un protocole reproductible, reconnaître les biais classiques et décider si une idée mérite un test en conditions simulées.", en: "You will know how to prepare a reproducible protocol, recognize common biases, and decide whether an idea deserves a simulated forward test." },
    keyPoints: { fr: ["Les règles doivent être figées avant de regarder les résultats.", "Un bon résultat historique ne garantit aucune performance future.", "Le drawdown et les séries de pertes comptent autant que le résultat moyen."], en: ["Rules must be frozen before looking at results.", "A strong historical result does not guarantee future performance.", "Drawdown and losing streaks matter as much as the average result."] },
    sections: [
      { id: "hypothese", title: { fr: "1. Écrire une hypothèse falsifiable", en: "1. Write a falsifiable hypothesis" }, paragraphs: { fr: ["Décris précisément le marché, l’unité de temps, les conditions d’entrée, l’invalidation, la sortie, les horaires et les exclusions. Une autre personne devrait pouvoir reproduire le test sans interpréter ton intention.", "Fixe aussi les mesures qui feront conclure que l’idée n’est pas assez robuste. Sans critère d’échec, chaque résultat peut être rationalisé."], en: ["Describe the market, timeframe, entry conditions, invalidation, exit, schedule, and exclusions precisely. Another person should be able to reproduce the test without interpreting your intent.", "Also define the measures that would show the idea is not robust enough. Without failure criteria, every result can be rationalized."] } },
      { id: "echantillon", title: { fr: "2. Tester plusieurs régimes avec des coûts réalistes", en: "2. Test multiple regimes with realistic costs" }, paragraphs: { fr: ["Inclue des périodes calmes, volatiles, directionnelles et sans tendance. Comptabilise spread, commissions, slippage plausible et contraintes d’exécution.", "Évite de choisir uniquement la période qui a inspiré l’idée. Sépare si possible une partie des données pour la validation après avoir construit les règles."], en: ["Include calm, volatile, trending, and range-bound periods. Account for spreads, commissions, plausible slippage, and execution constraints.", "Avoid selecting only the period that inspired the idea. If possible, reserve part of the data for validation after building the rules."] } },
      { id: "decision", title: { fr: "3. Lire le profil de risque avant la moyenne", en: "3. Read the risk profile before the average" }, paragraphs: { fr: ["Analyse l’espérance, la dispersion des résultats, le drawdown maximal, les séries de pertes et la dépendance à quelques trades extrêmes. Une moyenne séduisante peut masquer une expérience impossible à tenir en réel.", "La prochaine étape raisonnable est un forward test simulé avec les règles inchangées. Il vérifie l’exécution et la stabilité sans transformer immédiatement une hypothèse en risque financier."], en: ["Analyze expectancy, result dispersion, maximum drawdown, losing streaks, and dependence on a few extreme trades. An attractive average can hide an experience that is impossible to sustain live.", "A reasonable next step is a simulated forward test with unchanged rules. It tests execution and stability without immediately turning a hypothesis into financial risk."] } },
    ],
    checklist: { fr: ["Écrire les règles avant le test", "Définir un critère d’échec", "Inclure frais et slippage", "Tester plusieurs régimes", "Passer ensuite par un forward test simulé"], en: ["Write the rules before testing", "Define a failure criterion", "Include fees and slippage", "Test multiple regimes", "Then use a simulated forward test"] },
  },
];

export const getGuideBySlug = (slug) => guides.find(guide => guide.slug === slug);

