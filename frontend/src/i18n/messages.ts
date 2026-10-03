// English messages are the source keys; French must cover every UI message.
export const fr = {
  "Must be greater than {limit}.": "La valeur doit être supérieure à {limit}.",
  "Must be at least {limit}.":
    "La valeur doit être supérieure ou égale à {limit}.",
  "Must be less than {limit}.": "La valeur doit être inférieure à {limit}.",
  "Must be at most {limit}.":
    "La valeur doit être inférieure ou égale à {limit}.",
  "Enter an integer.": "Saisissez un nombre entier.",
  "Enter a finite number.": "Saisissez un nombre fini.",
  "This field is required.": "Ce champ est obligatoire.",
  "Solving · {progress}": "Calcul · {progress}",
  Workflow: "Parcours",
  "Loading solve…": "Chargement du calcul…",
  "Every river, solved to the last combo.":
    "Chaque river, résolue au dernier combo près.",
  "Reference engine · v0.1": "Moteur de référence · v0.1",
  Board: "Cartes communes",
  "Pick 5 cards · card removal applies to both ranges":
    "Choisissez 5 cartes · retrait appliqué aux deux ranges",
  "{count} / 5 cards selected": "{count} / 5 cartes sélectionnées",
  Random: "Aléatoire",
  Clear: "Effacer",
  Deck: "Jeu de cartes",
  Ranges: "Ranges",
  "Brush weight": "Poids du pinceau",
  "Brush {weight}": "Pinceau {weight}",
  "Range player": "Joueur de la range",
  "Out of position": "Hors de position",
  "In position": "En position",
  "{weight} weighted · {count} live": "{weight} pondérés · {count} actifs",
  "{player} range matrix": "Matrice de la range {player}",
  "{hand}: {live} live / {total} selected combos":
    "{hand} : {live} actifs / {total} combos sélectionnés",
  "{player} range string": "Range {player} au format texte",
  "AA, AKs, AKo, AhKh · weights: AKs:0.75 · no + or interval shorthand.":
    "AA, AKs, AKo, AhKh · poids : AKs:0.75 (point décimal) · sans + ni intervalle.",
  "Card removal: {count} combos blocked by the board":
    "Retrait des cartes : {count} combos bloqués par le tableau",
  "Clear range": "Vider la range",
  "Custom {label}": "Personnaliser : {label}",
  "Custom %": "Autre %",
  "Add size": "Ajouter",
  Stakes: "Pot et tapis",
  "Pot size": "Taille du pot",
  "Effective stack": "Tapis effectif",
  "Stack-to-pot ratio": "Rapport tapis / pot",
  "Bet tree": "Arbre de mises",
  "% of pot": "% du pot",
  "OOP bet sizes": "Mises OOP",
  "IP bet sizes (vs check)": "Mises IP (après parole)",
  "Facing a bet: fold or call.": "Face à une mise : se coucher ou suivre.",
  "Bets cap at the effective stack. Raises are not supported in this MVP.":
    "Mises limitées au tapis effectif. Les relances ne sont pas prises en charge dans ce MVP.",
  Solver: "Solveur",
  Iterations: "Itérations",
  Algorithm: "Algorithme",
  "CFR+ · linear average": "CFR+ · moyenne linéaire",
  "CFR · uniform average": "CFR · moyenne uniforme",
  "Stop at an exploitability target": "Arrêter au seuil d’exploitabilité",
  "Convergence target": "Seuil de convergence",
  "% pot": "% du pot",
  "Exact card removal · deterministic traversal":
    "Retrait exact des cartes · parcours déterministe",
  "Python reference engine · no rake":
    "Moteur de référence Python · sans prélèvement",
  "{count} iterations · asynchronous": "{count} itérations · asynchrone",
  "Heads-up · River · OOP first to act": "Duel · River · OOP parle en premier",
  "Spot setup": "Configuration du spot",
  "Load quick preset": "Charger l’exemple",
  "Save spot": "Exporter le spot",
  "Recent solves": "Calculs récents",
  "Persisted runs · latest 25": "25 derniers calculs enregistrés",
  "Cannot reach the API. Start the stack to launch a solve.":
    "API inaccessible. Démarrez les services pour lancer un calcul.",
  "Loading saved runs…": "Chargement des calculs enregistrés…",
  "Your first solve will appear here. Configure a spot or load the quick preset.":
    "Votre premier calcul apparaîtra ici. Configurez un spot ou chargez l’exemple.",
  Run: "Calcul",
  Status: "État",
  "Open run": "Ouvrir",
  "River only · Heads-up · No rake · Up to 3 bet sizes per player · Raises not supported · Exact reference solver, up to 20,000 compatible deals and 300,000 tree nodes.":
    "River uniquement · Duel · Sans prélèvement · Jusqu’à 3 mises par joueur · Sans relance · Solveur exact de référence, limité à 20 000 distributions compatibles et 300 000 nœuds.",
  Solving: "Calcul en cours",
  "In the queue": "En attente",
  "Solve complete": "Calcul terminé",
  "Solve cancelled": "Calcul annulé",
  "Solve failed": "Échec du calcul",
  "Stopping…": "Arrêt en cours…",
  Stop: "Arrêter",
  "Target reached": "Seuil atteint",
  "Fixed iteration budget": "Nombre fixe d’itérations",
  "Waiting for a worker": "En attente d’un moteur de calcul",
  "Saved in PostgreSQL": "Enregistré dans PostgreSQL",
  "Run again": "Relancer",
  "Inspect strategy": "Voir la stratégie",
  Exploitability: "Exploitabilité",
  "Target {value}": "Seuil : {value}",
  "Solve progress": "Progression du calcul",
  "{progress} of iteration budget": "{progress} des itérations prévues",
  Elapsed: "Temps écoulé",
  "Iterations / s": "Itérations / s",
  "Compatible deals": "Distributions compatibles",
  Convergence: "Convergence",
  "Exploitability · log scale": "Exploitabilité · échelle logarithmique",
  "Run details": "Détails du calcul",
  "Pot / stack": "Pot / tapis",
  "Tree nodes": "Nœuds de l’arbre",
  Execution: "Exécution",
  "Celery worker": "Moteur Celery",
  "Exact best responses measure the average strategy within this betting tree. Completing the iteration budget does not imply convergence.":
    "Les meilleures réponses exactes évaluent la stratégie moyenne dans cet arbre de mises. Atteindre le nombre d’itérations prévu ne garantit pas la convergence.",
  "Average strategy · {count} iterations":
    "Stratégie moyenne · {count} itérations",
  "Export JSON": "Exporter en JSON",
  "Game tree": "Arbre de jeu",
  "Game tree node": "Nœud de l’arbre de jeu",
  "Hand matrix": "Matrice des mains",
  "Not in range": "Hors range",
  "Strategy matrix": "Matrice de stratégie",
  "Frequencies are weighted by both ranges and reach at this node.":
    "Fréquences pondérées par les deux ranges et leur probabilité d’atteindre ce nœud.",
  "By starting hand class": "Par classe de main",
  Class: "Classe",
  "EVs are net river value minus half the initial pot. OOP + IP = 0. Exploitability is half NashConv within the configured tree; it is not a claim about unrestricted NLHE.":
    "Les EV correspondent à la valeur nette sur la river, moins la moitié du pot initial. OOP + IP = 0. L’exploitabilité vaut la moitié de NashConv dans l’arbre configuré ; elle ne s’applique pas au NLHE sans restriction.",
  "Combo inspector": "Inspecteur de combos",
  "1 live": "1 actif",
  "{count} live": "{count} actifs",
  "1 removed": "1 retiré",
  "{count} removed": "{count} retirés",
  Freq: "Fréq.",
  "The opponent never reaches this node against this combo. Conditional EVs are undefined.":
    "L’adversaire n’atteint jamais ce nœud contre ce combo. Les EV conditionnelles ne sont pas définies.",
  "Blockers · vs {player} range": "Bloqueurs · contre la range {player}",
  removes: "retire",
  "weighted combos": "combos pondérés",
  "Compatible opponent combos": "Combos adverses compatibles",
  "Per-card counts can overlap. The total counts each blocked combo once.":
    "Les comptes par carte peuvent se recouper. Le total ne compte chaque combo bloqué qu’une seule fois.",
  "No playable combos in this hand class.":
    "Aucun combo jouable dans cette classe de main.",
  "Collecting convergence measurements": "Collecte des mesures de convergence",
  "Exact best-response checks appear as the solve progresses.":
    "Les mesures exactes de meilleure réponse apparaissent au fil du calcul.",
  "Exploitability from {start} to {end} percent of pot. Logarithmic scale.":
    "Exploitabilité de {start} à {end} pour cent du pot. Échelle logarithmique.",
  Setup: "Configuration",
  Solve: "Calcul",
  Strategy: "Stratégie",
  Language: "Langue",
  "Riverline — River solver": "Riverline — Solveur de river",
  Idle: "Prêt",
  queued: "En attente",
  running: "En cours",
  completed: "Terminé",
  failed: "Échec",
  cancelled: "Annulé",
  Check: "Parole",
  Call: "Suivre",
  Fold: "Se coucher",
  "All-in": "Tapis",
  "Bet {size}": "Mise {size}",
  "OOP · Root": "OOP · Racine",
  "{player} vs {history}": "{player} face à {history}",
  spades: "pique",
  hearts: "cœur",
  diamonds: "carreau",
  clubs: "trèfle",
  "{rank} of {suit}": "{rank} de {suit}",
  "Empty card": "Emplacement vide",
  "Select one more card to complete the river board.":
    "Sélectionnez encore une carte pour compléter le tableau.",
  "Select {count} more cards to complete the river board.":
    "Sélectionnez encore {count} cartes pour compléter le tableau.",
  "Select at most three sizes per player.":
    "Sélectionnez au maximum trois tailles de mise par joueur.",
  "Enter a size between 0 and 1,000% of pot.":
    "Saisissez une mise supérieure à 0 et inférieure ou égale à 1 000 % du pot.",
  "Queueing…": "Mise en file…",
  "Run solve": "Lancer le calcul",
  "{count} iterations": "{count} itérations",
  "WebSocket connected · updates throttled":
    "WebSocket connecté · mises à jour espacées",
  "Polling fallback · updates throttled":
    "Actualisation périodique · mises à jour espacées",
  "of pot": "du pot",
  "{count} live combos": "{count} combos actifs",
  "Dead · board": "Bloqué · tableau",
  "No opponent": "Aucun adversaire",
  unreachable: "inatteignable",
  "Select at least one combo in each range.":
    "Sélectionnez au moins un combo dans chaque range.",
  "Invalid weight: {token}": "Poids invalide : {token}",
  "Unsupported range token: {token}. Use AA, AKs, AKo or AhKh.":
    "Notation non prise en charge : {token}. Utilisez AA, AKs, AKo ou AhKh.",
  "Request failed ({status})": "Échec de la requête ({status})",
  "Results unavailable: {status}": "Résultats indisponibles : {status}",
  "Error details: {details}": "Détails de l’erreur : {details}",
  "Failed to fetch":
    "Connexion au serveur impossible. Vérifiez que les services sont démarrés.",
  "NetworkError when attempting to fetch resource.":
    "Connexion au serveur impossible. Vérifiez que les services sont démarrés.",
  "Load failed":
    "Connexion au serveur impossible. Vérifiez que les services sont démarrés.",
  "Solve not found": "Calcul introuvable",
  "Queue unavailable. Please retry.":
    "File de calcul indisponible. Veuillez réessayer.",
  "Ranges have no compatible deal":
    "Les ranges n’ont aucune distribution compatible",
  "Ranges have no compatible deal after card removal":
    "Les ranges n’ont aucune distribution compatible après retrait des cartes.",
  "Pot must be finite and positive":
    "Le pot doit être un nombre fini strictement positif.",
  "Effective stack must be finite and non-negative":
    "Le tapis effectif doit être un nombre fini positif ou nul.",
  "Use up to three bet fractions, each in (0, 10]":
    "Utilisez au maximum trois mises, chacune supérieure à 0 et inférieure ou égale à 1 000 % du pot.",
  "The minimum opening bet is 1 bb, except a shorter all-in":
    "La mise minimale est de 1 bb, sauf pour un tapis inférieur.",
  "Iterations must be an integer between 1 and 100000":
    "Le nombre d’itérations doit être un entier compris entre 1 et 100 000.",
  "Only cfr and cfr_plus are supported":
    "Seuls CFR et CFR+ sont pris en charge.",
  "Convergence target must be positive (% of pot)":
    "Le seuil de convergence doit être strictement positif (% du pot).",
  "Duplicate board cards": "Les cartes communes doivent être distinctes.",
  "River board must contain exactly five distinct cards":
    "Le tableau de la river doit contenir exactement cinq cartes distinctes.",
  "Range must contain at least one positive-weight combo":
    "Chaque range doit contenir au moins un combo de poids strictement positif.",
  "Range weights must be finite and in (0, 1]":
    "Les poids des ranges doivent être supérieurs à 0 et inférieurs ou égaux à 1.",
  "Weights must be finite and between 0 and 1":
    "Les poids doivent être des nombres finis compris entre 0 et 1.",
  "Reference solver capacity exceeded; narrow ranges or reduce bet sizes":
    "Capacité du solveur de référence dépassée : réduisez les ranges ou le nombre de tailles de mise.",
} as const;

export type Message = keyof typeof fr;
