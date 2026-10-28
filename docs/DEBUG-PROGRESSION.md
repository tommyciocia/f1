# Debug di settori, partenza e circuiti

Data: 27 ottobre 2026. Intervento sul progetto esistente, inclusi i precedenti
controlli di sicurezza. Nessuna ricostruzione del gioco o delle geometrie.
Il catalogo presente comprende 24 circuiti: sono tutti inclusi nelle verifiche.

## Flusso verificato prima delle modifiche

1. `finishQualiSession()` ordina Q3, gli eliminati Q2 e gli eliminati Q1.
2. La griglia viene convertita in `lastGrid` associando ogni risultato a `c.id`.
3. `startRace()` passa le voci a `mkCars(lastGrid)`, che crea vetture nuove.
4. `gridSlot(k)` determina posizione e orientamento sulla geometria selezionata.
5. `stepCar()` proietta la vettura sulla pista o segue il percorso dell'IA/box.
6. `sectorProgress()` e `progress()` aggiornano settori e giri; `prog()` e
   `order()` alimentano classifica, distacchi e valutazioni del traffico IA.

Prima di cambiare i metodi condivisi sono stati controllati i loro utilizzatori
in fisica, qualifiche, HUD, IA, box, strategia e test. La creazione della griglia
e l'associazione per ID risultavano corrette: sono state conservate.

## Problemi dimostrati e correzioni

| Riscontro | Causa concreta | Correzione |
| --- | --- | --- |
| Giri iniziali a −1 in gara | `mkCars()` usava la stessa sentinella dell'out-lap di qualifica | In gara `lap` parte da 0. `raceStarted` distingue l'avvicinamento dalla griglia dal giro iniziato; `prog()` rimane continuo prima/dopo la linea. L'out-lap delle qualifiche conserva la sua logica. |
| Giri/tempi assegnabili senza un giro completo; conteggio negativo tornando indietro sulla linea | `progress()` incrementava/decrementava i giri confrontando soltanto gli indici nei quarti estremi del circuito | Il primo passaggio apre il giro; per accreditarlo servono entrambi i rilevamenti nell'ordine previsto e almeno il 95% della lunghezza percorsa. La distanza usa avanzamenti firmati lungo il circuito. La retromarcia sulla linea non crea giri completati negativi o nuovi giri veloci. Salti superiori all'8% del circuito in un aggiornamento invalidano il giro. |
| Rilevamento del settore dipendente dal cambio di segmento | `crossedMark()` usava `T[a].s` e `T[b].s`, ignorando la posizione esatta dentro il segmento; a Barcelona i rilevamenti in metri non coincidono necessariamente con un campione | La fisica conserva `trackS` precedente e attuale e li passa al rilevamento. Il passaggio avviene sulla coordinata reale del rilevamento anche se l'indice non cambia. I vecchi argomenti per indice restano disponibili per i chiamanti esistenti. |
| S3 concluso non consultabile dopo il traguardo | `finishSector(...,2)` veniva seguito immediatamente dall'azzeramento della terna | Conservati `lastSecs`, `lastDelta` e `lastState` già presenti nella struttura. L'HUD usa i tempi precedenti per i settori non ancora ripercorsi e il cronometro del settore attivo per quello corrente. Stessa struttura HTML e stessa grafica. |
| Informazioni della qualifica visibili brevemente all'avvio gara | Il refresh dei distacchi poteva ereditare `tickT` dalla schermata precedente | Azzerato `tickT` e aggiornato subito l'HUD con le nuove vetture. I tempi precedenti dei settori vengono puliti anche all'inizio di ogni fase di qualifica. |

I primi quattro test di riproduzione fallivano prima delle correzioni: giri
iniziali, rilevamento dentro lo stesso segmento, ripetizioni avanti/indietro
sul traguardo e salto di coordinate senza giro completo. Dopo l'intervento
superano le verifiche. Un ulteriore test copre i confini numerici vicino a
settori e traguardo, senza tolleranze che anticipino il passaggio della linea.

Non è stata riprodotta un'inversione sistematica da P1 a P23 nella partenza
regolare della versione esaminata: già prima delle modifiche, le prove iniziali
su 24 circuiti collocavano la pole nella prima casella e nella prima posizione.
Non è stato riprodotto neppure un blocco permanente di tutti i settori su S1.
Sono stati corretti i difetti concreti sopra, senza attribuire alla griglia
un errore di associazione che i test non hanno confermato e senza favorire il giocatore.

## File e funzioni interessati

- `js/cars.js`: `mkCars()`, inizializzazione separata dei giri di gara.
- `js/physics.js`: `stepCar()`, passaggio delle coordinate longitudinali effettive.
- `js/sectors.js`: `crossedMark()`, `sectorProgress()`, `finishSector()`.
- `js/laps.js`: `progress()` e `prog()`; l'ordinamento di `order()` resta quello esistente.
- `js/race.js`: `startRace()`, pulizia e primo aggiornamento dell'HUD.
- `js/hud.js`: `sectorHud()`, uso della terna precedente già memorizzata.
- `js/quali.js`: `startQualiSession()`, pulizia della terna precedente fra le fasi.
- `js/strategy.js`: `remainingRaceLaps()`, adeguamento alla stessa progressione
  usata dalla classifica. I pit stop automatici restano disabilitati.
- `tests/progression.cjs`, `tests/browser-progression.cjs`: nuove regressioni mirate.
- `tests/pit-access.cjs` e `tests/simulation.cjs`: fixture dei test di transito
  preparate con settori e distanza già percorsi, oltre al numero di giri. Non
  sono stati rimossi o indeboliti i controlli su transito, velocità e giri.
- `package.json`: nuovo comando `test:progression` e inclusione nella suite completa.

Nessuna modifica a geometrie, elenco dei circuiti, rendering delle vetture,
comandi, parametri della fisica, pneumatici o regole di Q1/Q2/Q3. Il progetto
non contiene una carriera o un sistema condiviso di contratti/budget/punti;
non ne sono stati introdotti di nuovi.

## Verifiche ripetibili

```text
npm run test:progression
npm test
node tests/browser-progression.cjs
node tests/browser.cjs
node tests/browser-controls.cjs
node tests/browser-tyres.cjs
node tests/browser-circuits.cjs
node tests/browser-security.cjs
```

Le nuove prove controllano:

- P1, P12 e P23 sulla griglia di ciascuno dei 24 circuiti, identità e ordine di
  tutte le vetture, orientamento e zero giri/penalità/arrivi iniziali.
- Trasferimento attraverso tutte e tre le fasi di qualifica per P1, P12 e P23
  con tempi controllati nelle fixture, senza alterare la procedura del gioco.
- Continuità della classifica sul primo traguardo, sorpassi e piloti su giri differenti.
- Due giri per giocatore e IA su ogni circuito: S1→S2→S3→S1, terna precedente,
  cronometri indipendenti, somma uguale al tempo sul giro e nessun doppio rilevamento.
- Retromarcia e riattraversamento della linea, salti di coordinate e limiti numerici.
- Browser reale: partenza con acceleratore manuale per due secondi da P1/P12/P23
  senza falsa differenza di un giro; attraversamenti usando `stepCar()` e HUD
  su Barcelona, Suzuka e Monaco. I passaggi dei settori in queste fixture sono
  guidati da pose controllate sulla pista, non da una prova di guida umana.

Le suite già presenti includono selezione e persistenza di tutti i circuiti,
geometria/anteprima, continuità, verso, traguardo e settori, collisioni/barriere,
livelli di Suzuka, box a 80 km/h, qualifiche complete e gare con 23 auto.
Le mappature controller sono fixture dell'API Gamepad: la prova con hardware
fisico non è stata eseguita. I limiti di ricostruzione delle piste, incluso
Madring preliminare, restano quelli descritti in `CIRCUITS.md`.

Esito conclusivo: **215 test nella suite completa superati, nessun errore o
test saltato; otto test mirati rieseguiti sulla versione finale e sei suite
browser superate**. Qualifiche e gare fisiche completate su 24/24 circuiti,
con tutte le 23 vetture al traguardo in ciascuna gara verificata. Le suite
comprendono anche i precedenti 17 test di sicurezza.

Il test aggiuntivo dei confini numerici è stato introdotto mentre la suite
lunga era già in esecuzione ed è compreso negli otto test mirati rieseguiti
successivamente; i conteggi delle due esecuzioni si sovrappongono.
Comandi, risultati e limiti sono in
[validation-progression.json](validation-progression.json).

Per utilizzare le modifiche ricaricare la pagina. Se si usa il server statico
incluso, riavviarlo: carica i file pubblici in memoria all'avvio.
