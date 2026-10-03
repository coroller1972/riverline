# Riverline

Solveur de référence **heads-up Texas Hold’em, river uniquement**, avec interface React conforme à la direction visuelle Riverline. Les stratégies et EV proviennent de calculs CFR réels. Aucun résultat simulé n’est utilisé par l’application.

![Riverline en français : matrice des stratégies, fréquences de mise et inspecteur de combos](docs/screenshots/strategy-fr.png)

*Analyse d’un spot river : stratégie moyenne CFR+, EV par action et inspection des combos.*

## Démarrer

Prérequis : Docker avec Compose v2+, ou Podman avec un fournisseur Compose fonctionnel.

```bash
cp .env.example .env
docker compose up --build
```

Ouvrir **http://localhost:5173**. La documentation interactive de l’API est disponible sur **http://localhost:8000/docs**.

L’interface est disponible en **français et en anglais**. Le sélecteur **FR / EN** en haut à droite mémorise le choix dans le navigateur. À la première visite, la langue du navigateur est utilisée (français si elle commence par `fr`, anglais sinon). La traduction couvre la configuration, le suivi, les stratégies, les actions, les erreurs courantes et les libellés d’accessibilité. Les nombres suivent la langue choisie ; la notation des ranges conserve le point décimal (`AKs:0.75`) et les exports JSON gardent le format de l’API.

Les migrations Alembic s’exécutent automatiquement avant le démarrage de l’API et du worker. PostgreSQL conserve les configurations, états et résultats dans un volume ; Redis utilise un journal AOF persistant. Les ports exposés sont limités à l’interface loopback. L’application est un MVP local mono-utilisateur, sans authentification ni gestion des quotas.

Sur cette machine, la stack a été vérifiée avec Podman et Docker Compose :

```bash
# Terminal dédié, si le socket Podman standard n’est pas actif :
podman system service --time=0 unix:///tmp/riverline-podman.sock
# Autre terminal :
DOCKER_HOST=unix:///tmp/riverline-podman.sock podman compose up --build
```

## Premier solve

1. Cliquer sur **Charger l’exemple** pour charger neuf distributions de cartes compatibles et un arbre simple.
2. Sélectionner les cinq cartes du board. Désélectionner une carte avant de la remplacer.
3. Éditer les ranges avec les onglets OOP/IP, la matrice 13×13, les poids ou les champs texte.
4. Configurer le pot, le stack et jusqu’à trois sizings par joueur, exprimés en pourcentage du pot.
5. Choisir CFR ou CFR+, le nombre d’itérations et, éventuellement, un seuil d’exploitabilité.
6. Cliquer sur **Lancer le calcul**. Le worker Celery calcule indépendamment de la requête HTTP.
7. Observer les itérations et les mesures de convergence, ou utiliser **Arrêter**.
8. Ouvrir **Voir la stratégie**, choisir un nœud de l’arbre, une classe puis un combo exact.

Les runs restent accessibles dans **Calculs récents** après un rafraîchissement. **Relancer** reprend la configuration enregistrée. **Exporter le spot** exporte la configuration API ; **Exporter en JSON** exporte configuration et résultats.

## Fonctionnalités prises en charge

- Check/bet OOP ; check/bet IP après check ; fold/call face à une mise.
- Jusqu’à trois sizings par joueur. Les mises sont plafonnées au stack et les tapis identiques dédupliqués. Mise minimale : 1 bb, sauf tapis inférieur.
- Classes `AA`, `AKs`, `AKo` et combos `AhKh`. Poids `AKs:0.75`, de 0 à 1.
- Séparateurs virgule, espace ou retour à la ligne ; la dernière occurrence d’un combo remplace son poids ; zéro le retire.
- Cartes du board et incompatibilités entre les deux mains privées exclues exactement.
- CFR à mises à jour simultanées et moyenne uniforme ; CFR+ à mises à jour alternées et moyenne linéaire, sans délai d’averaging.
- Exploitabilité exacte de la stratégie moyenne dans l’arbre configuré, avec arrêt anticipé optionnel.
- Fréquences, EV par action/combo/classe, combos retirés et décompte des blockers.
- WebSocket avec polling de secours, annulation coopérative, persistance et export JSON.

Les classes sont pondérées selon la distribution conjointe et les probabilités d’atteindre le nœud. Les détails d’un combo affichent son poids d’entrée et sa stratégie moyenne. Les EV conditionnelles impossibles sont `null` (affichées `—`), jamais des valeurs inventées.

## Convention des EV

Toutes les valeurs sont exprimées dans l’unité du pot saisi, affichée en big blinds. L’utilité vaut :

```text
u0 = montant du pot attribué à OOP − mises river OOP − pot initial / 2
u1 = −u0
```

Exemple : pot 100, mise 75 payée. Le gagnant vaut +125, le perdant −125. Sur bet/fold sans mise préalable adverse, le gagnant vaut +50. Un partage après call vaut 0. Les mises non payées sont ainsi rendues implicitement par l’attribution explicite du pot.

L’exploitabilité affichée est `100 × (BR_OOP + BR_IP) / (2 × pot initial)`, soit la moitié de NashConv en pourcentage du pot. Une meilleure réponse choisit **une seule action par information set**, sans connaître les cartes privées adverses. Atteindre un nombre d’itérations n’est pas une preuve de convergence. Cette métrique concerne exclusivement l’arbre de mises configuré.

Voir [la note mathématique](docs/MATHEMATICS.md) pour les probabilités, les moyennes et les tests de référence.

## Architecture

```text
frontend/             React + TypeScript strict + Vite + TanStack Query
backend/
  solver/             Domaine pur Python, CFR, river, analyse des résultats
  app/                FastAPI, schémas Pydantic, modèle SQLAlchemy, WebSocket
  workers/            Adaptateur Celery, annulation et lease d’exécution
  alembic/            Migrations PostgreSQL
  tests/              Domaine, convergence, API/worker, intégration réelle
examples/             Configuration indépendante pour le CLI
docs/                 Décisions, mathématiques, validation visuelle
```

`solver` importe uniquement la bibliothèque standard et ses propres modules : aucune dépendance à FastAPI, SQLAlchemy, Redis ou Celery. L’interface stable peut être remplacée ultérieurement par un moteur natif.

La configuration et le résultat sont stockés en JSONB dans une table `solves` : pas de table par combo. Les écritures de progression sont espacées ; les mesures de convergence sont calculées à environ vingt checkpoints. La progression WebSocket lit des snapshots persistants toutes les secondes, ce qui évite de perdre un événement de fin lors d’une reconnexion. Le frontend utilise aussi le polling.

Le worker acquiert atomiquement un lease. Les tâches dupliquées et les résultats d’un ancien worker ne peuvent pas écraser une annulation. Un message redélivré après perte du worker reprend le solve depuis le début lorsque son lease de 120 s expire. Les regrets intermédiaires ne sont pas sauvegardés.

## Utilisation Python indépendante

Depuis `backend/`, aucune installation des dépendances web n’est nécessaire pour utiliser le moteur :

```python
from solver import SolveConfig, solve

result = solve(SolveConfig(
    board=("Qs", "8h", "4h", "2c", "7d"),
    oop_range="AsAd,JhTd",
    ip_range="KhKd",
    pot=100,
    effective_stack=200,
    oop_bet_sizes=(1.0,),
    ip_bet_sizes=(),
    iterations=6000,
))
print(result.ev_oop, result.exploitability_pct)
```

CLI, depuis la racine avec un environnement installé :

```bash
python -m solver examples/river.json > result.json
```

Le CLI attend les champs plats de `SolveConfig` (voir `examples/river.json`). Les exports de l’interface suivent le schéma imbriqué de l’API (`tree` et `solver`) : utiliser `SolveRequest.model_validate(data).to_engine()` pour les convertir.

## Développement local

Python **3.12+**, Node **24**. Les versions testées sont verrouillées par `backend/requirements.lock` (contraintes pip) et `frontend/package-lock.json`.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -c backend/requirements.lock -e './backend[dev]'
npm ci --prefix frontend

docker compose -f docker-compose.yml -f compose.dev.yml up -d postgres redis
export DATABASE_URL=postgresql+psycopg://riverline:riverline_local@localhost:5432/riverline
export REDIS_URL=redis://localhost:6379/0
cd backend
alembic upgrade head
uvicorn app.main:app --reload
```

Dans deux autres terminaux, avec les mêmes variables d’environnement :

```bash
# Depuis backend/, environnement Python activé :
celery -A workers.celery_app:celery_app worker --loglevel=info --concurrency=1
# Depuis la racine, dans un autre terminal :
npm run dev --prefix frontend
```

Vite relaie `/api` et `/ws` vers le port 8000. Ne pas démarrer simultanément le frontend Compose et Vite sur 5173.

## Migrations et tests

```bash
# Migrations dans la stack :
docker compose run --rm migrate

# Tests unitaires, mathématiques et API (SQLite isolé pour ces derniers) :
.venv/bin/python -m pytest backend/tests -q
.venv/bin/ruff check backend
.venv/bin/ruff format --check backend
npm test --prefix frontend
npm run build --prefix frontend

# Après démarrage de la stack, tests PostgreSQL/Redis/Celery/WebSocket :
RIVERLINE_INTEGRATION_URL=http://127.0.0.1:8000 \
  .venv/bin/python -m pytest backend/tests/test_integration.py -q
```

Les tests d’intégration créent des runs de test dans la base locale. Ne pas les pointer vers une base de production. Ils sont ignorés lorsque `RIVERLINE_INTEGRATION_URL` n’est pas définie. Une pipeline GitHub Actions vérifie les tests, le build et la stack Compose.

La validation comprend : catégories et kickers, roues et égalités, comparaison indépendante avec Treys sur 3 000 mains, 1 326 combos / 169 classes, blockers pondérés, comptabilité du pot, invariance de l’ordre de parcours, CFR/CFR+ sur Kuhn (valeur −1/18), meilleure réponse comparée à l’énumération exhaustive, et river polarisée avec équilibre analytique connu (bluff 50 %, call 50 % pour une mise pot dans le cas testé).

## API

| Méthode | Route | Fonction |
| --- | --- | --- |
| GET | `/api/health` | Liveness de l’API |
| POST | `/api/solves` | Validation et envoi à Celery, HTTP 202 |
| GET | `/api/solves` | Les 25 derniers runs |
| GET | `/api/solves/{id}` | État, progression et configuration |
| GET | `/api/solves/{id}/results` | Résultat final, HTTP 409 avant completion |
| DELETE | `/api/solves/{id}` | Annulation idempotente ; conserve l’historique |
| POST | `/api/ranges/preview` | Combos pondérés et card removal |
| WS | `/ws/solves/{id}` | Progression et état terminal |

Exemple :

```bash
curl http://localhost:8000/api/solves -H 'Content-Type: application/json' -d '{
  "game":"NLHE", "street":"river", "pot":100, "effective_stack":100,
  "board":["Qs","8h","4h","2c","7d"],
  "oop_range":"AA,KK,QQ,AKs,AQs",
  "ip_range":"AA,KK,QQ,JJ,AKs,AQs,AJs",
  "tree":{"oop_bet_sizes":[0.75],"ip_bet_sizes":[0.75]},
  "solver":{"algorithm":"cfr_plus","iterations":2000}
}'
```

États : `queued`, `running`, `completed`, `failed`, `cancelled`. Un broker indisponible produit un run `failed` et une réponse 503. Les champs inconnus, les streets non prises en charge, les ranges impossibles et les tailles invalides sont refusés en 422.

## Limites et suite

- Pas de preflop/flop/turn, de multiway, de rake, de raises ni de sizings par combo.
- Raccourcis `JJ+` et `AA-22` explicitement refusés. Entrer les classes séparément.
- Maximum 20 000 deals privés compatibles, 300 000 nœuds et 100 000 itérations. L’API utilise une borne conservatrice du nombre de nœuds avant mise en queue.
- Parcours Python exhaustif. De larges ranges restent coûteuses ; aucune promesse de performance comparable à un solveur commercial.
- Pas de pause/reprise des regrets, de stratégie live ni d’ETA projetée. Les données finales apparaissent à la fin du calcul.
- Les checkpoints d’exploitabilité sont espacés ; un seuil peut être atteint entre deux mesures.
- Les polices de la direction artistique sont chargées depuis Google Fonts, avec fallbacks locaux.
- La création du run puis son envoi au broker ne constituent pas une transaction distribuée : un arrêt brutal de l’API exactement entre les deux peut laisser un run en queue sans message. Annuler et relancer ce run ; un outbox transactionnel constitue une amélioration future.

Prochaines étapes : outbox et supervision des jobs abandonnés, profilage des ranges plus larges, accélération ciblée après mesure, notation de ranges avancée, raises avec leurs règles de min-raise/reopening, puis seulement extension aux streets précédentes. Tout déploiement multi-utilisateur devra ajouter authentification, quotas et limites de ressources.
