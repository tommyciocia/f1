# Circuiti F1: fonti, implementazione e verifiche

## Catalogo e configurazioni

Verifica delle fonti effettuata il 26 ottobre 2026. Il catalogo contiene esattamente
queste dieci configurazioni GP. Il numero di curve è quello pubblicato per la
configurazione F1, non il numero di punti della spline.

| Circuito | Paese | km | Curve | Direzione | Fonte delle metriche e mappa di confronto |
| --- | --- | ---: | ---: | --- | --- |
| Circuit de Barcelona-Catalunya | Spagna | 4,657 | 14 | Orario | [Formula 1, guida 2026](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-circuit-de-barcelona-catalunya.7i1UoRE8Za0Jk4LI0r68qk) |
| Suzuka International Racing Course | Giappone | 5,807 | 18 | Orario, figura a otto | [Suzuka, course guide](https://www.suzukacircuit.jp/eng/course_s/) |
| Circuit de Spa-Francorchamps | Belgio | 7,004 | 19 | Orario | [Formula 1, guida 2026](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-circuit-de-spa-francorchamps.pC5N3J3W9LEj8REFvU6FX) |
| Circuit de Monaco | Monaco | 3,337 | 19 | Orario | [Formula 1, guida 2026](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-circuit-de-monaco.vFsmfGHr6RWyLFtxi58wi) |
| Silverstone Circuit | Regno Unito | 5,891 | 18 | Orario | [Formula 1, guida 2026](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-silverstone-2026.5Sl0O8g393enBWVIkjRzOr) |
| Red Bull Ring | Austria | 4,326 | 10 | Orario | [Gestore del circuito, misurazione FIA aggiornata](https://www.redbullring.com/en/events-tickets/formula-1/formula-1-circuit/) |
| Circuit of The Americas | Stati Uniti | 5,513 | 20 | Antiorario | [Formula 1, guida 2026](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-circuit-of-the-americas.3OjhBbugiQRmN4FnlpBtBc) |
| Bahrain International Circuit | Bahrein | 5,412 | 15 | Orario | [Formula 1, GP Bahrain](https://www.formula1.com/en/racing/2025/bahrain) |
| Marina Bay Street Circuit | Singapore | 4,927 | 19 | Antiorario | [Formula 1, guida 2026](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-marina-bay-street-circuit.3d9yfiqIKoQhcMnRLESWbz) |
| Autodromo Nazionale Monza | Italia | 5,793 | 11 | Orario | [Formula 1, guida 2026](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-autodromo-nazionale-monza.51PKqBRlxNs0fzLWQzsnd0) |

Barcelona usa il finale senza chicane; Bahrain la configurazione Grand Prix;
Singapore il layout recente da 19 curve. Il gestore del Red Bull Ring spiega
l'aggiornamento da 4,318 a 4,326 km dovuto al metodo di misura della linea centrale.

## Provenienza e precisione

Le dieci linee geografiche provengono da
[bacinger/f1-circuits](https://github.com/bacinger/f1-circuits), commit
`8094e957b8d6aa8b9f4510c93968556cccd30e02`, licenza MIT, copyright
2019–2025 Tomislav Bacinger. Copie GeoJSON e URL permanenti sono in
`assets/circuits/source/`; il testo della licenza è in
`assets/circuits/LICENSE-data.txt`. Il dataset è una fonte geografica non ufficiale.

Le ricostruzioni sono approssimate. Le coordinate longitudine/latitudine sono
proiettate in un piano locale, interpolate con una spline centripeta e campionate
a circa cinque metri. Una scala uniforme porta ogni giro alla lunghezza ufficiale,
conservando le proporzioni della sagoma. La conversione è la stessa del tachimetro:
11,25 unità di gioco per metro. Le larghezze sono costanti per circuito e adattate
alle dimensioni delle vetture del simulatore; non descrivono ogni variazione reale.

Il primo punto geografico non coincide sempre con la partenza F1 moderna: Monaco
e Silverstone sono riposizionati sui rispettivi rettilinei di partenza. L'ordine
di Singapore nel GeoJSON è invertito per rispettare il senso antiorario di gara.
Le anteprime ruotano rigidamente la stessa geometria per sfruttare lo spazio.

Le corsie box sono ricostruzioni adattate, con ingressi, uscite, lato e punti guida
diversi per circuito; non sono rilievi ufficiali della pit lane. I settori usano
riferimenti configurabili lungo il percorso: quelli adattati dalle mappe non sono
presentati come posizioni esatte dei sensori FIA. Barcelona usa i riferimenti a
1.643 e 3.411 metri riportati nel
[documento del circuito per il cronometraggio](https://www.lemanscup.com/en/race/document/download/2296).

Il motore resta 2D. Suzuka ha due livelli logici e grafici in corrispondenza del
sovrappasso, senza collisioni o agganci al ramo opposto. Le rampe e la quota sono
adattamenti di gioco. Spa conserva il profilo planimetrico Eau Rouge–Raidillon;
non è stata aggiunta una simulazione 3D dei dislivelli. Monaco ha il tornante lento,
il tratto di tunnel scuro, le luci laterali e i portali.

## Architettura e file

- `assets/circuits/circuits.json`: registro di nomi, paesi, dati, direzione,
  larghezze, settori, punti caratteristici e configurazione box.
- `assets/circuits/source/`, `assets/circuits/LICENSE-data.txt`: dati originali,
  provenienza e licenza; nessuna dipendenza dalla rete durante il gioco.
- `scripts/build-circuits.cjs`, `js/circuitData.js`: preparazione riproducibile e
  registro JavaScript locale generato.
- `js/track.js`: spline, curvatura, velocità previste, bordi, cordoli, partenza,
  griglia, settori, percorso box e sovrappasso. Fornisce gli stessi riferimenti
  globali `T`, `N`, `L`, `TW`, `BAR`, `path` ai moduli esistenti.
- `js/circuits.js`, `index.html`, `style.css`: selezione, anteprime dalla geometria
  attiva, dati ufficiali e persistenza. Una sessione in corso blocca il cambio.
- `js/cars.js`, `js/botMotion.js`, `js/physics.js`, `js/ai.js`,
  `js/botRecovery.js`: griglie adattate, ricerca del segmento, avanzamento,
  larghezza utilizzabile, frenata e sorpassi. La ricerca longitudinale usa una
  ricerca binaria; i bot riutilizzano il proprio riferimento persistente.
- `js/pits.js`, `js/strategy.js`: percorsi e piazzali box specifici; partenza delle
  23 auto dai garage dei 12 team. X richiede il transito; frenata prima del raccordo,
  limite 80 km/h in corsia, precedenza all'uscita. Soste e sostituzioni automatiche
  sono disabilitate. Le funzioni di servizio precedenti restano protette dal flag.
- `js/collisions.js`, `js/slipstream.js`: separazione dei livelli di Suzuka.
- `js/laps.js`, `js/session.js`: progresso sulla pista e riposizionamento coerenti
  col circuito caricato; il passaggio al traguardo conta anche nei box in gara.
- `js/render.js`, `js/minimap.js`: tracciato, settori, ponti, tunnel e vetture;
  corretti anche i riferimenti di coordinate dei settori nella minimappa.
- `js/race.js`, `js/menuRecords.js`: risultati e record conservano il circuito.
- `tests/circuits.cjs`, `tests/helpers/game.cjs`, i test di simulazione, qualifiche,
  comandi, gomme, regole, strategia e accesso box: verifiche del nuovo contratto.
- `tests/browser-circuits.cjs`, `tests/browser-controls.cjs`,
  `tests/browser-tyres.cjs`: prove UI aggiornate; `tests/browser.cjs` verifica
  inoltre timer, tabelle e progressione Q1/Q2/Q3.

`js/tyres.js` conserva mescole, stato individuale, degrado, prestazioni e indicatore.
Le qualifiche restano SOFT al 100%; la gara conserva la mescola iniziale scelta.
Il cambio di circuito è consentito nella Home e non modifica una sessione attiva.
Le partenze dai garage mantengono l'intervallo preesistente di 0,5 secondi.

## Verifiche effettivamente eseguite

Sono passati 135 test Node (45 sui circuiti e 90 di regressione) e i quattro
script browser. I risultati numerici per ciascuna pista sono conservati in
`docs/validation-circuits.json`, estratti dalle esecuzioni reali dei test.

Per tutti i circuiti sono state simulate Q1, Q2 e Q3 con quattro minuti per fase:
23/17/10 partecipanti con tempi validi, 6/7 eliminazioni e griglia finale di 23 auto.
Per ciascuno è stata conclusa una gara di due giri con tutte le 23 vetture al
traguardo. Il giocatore viene affidato all'IA soltanto nei test di simulazione;
statistiche ammesse più lente permettono di osservare gli arrivi di tutta la griglia.

Ogni gara di prova comprende un transito richiesto tramite la funzione X: nessun
salto, limite 80 km/h, un solo passaggio al traguardo nei box, nessuna sosta o
sostituzione automatica e gomme MEDIUM consumate normalmente in pista. Le verifiche
controllano coordinate finite, rispetto della carreggiata e persistenza alla Home.

I test mirati verificano collisioni tra vetture, barriere, giri e settori nel ramo
fisico manuale, assenza di duplicati e incroci impropri, esclusione delle collisioni
fra i livelli di Suzuka, griglie, garage e minimappa senza coordinate non finite.
È stato inoltre eseguito un test in cui tutte le 23 monoposto entrano ed escono
esplicitamente dai box, con traffico e SOFT bloccate in qualifica.

I quattro script browser sono stati eseguiti con Edge headless isolato: tutte le
dieci selezioni, anteprime, gare e avvii qualifica, ricarica persistente, Home,
comandi, timer, risultati, gomme e schermate desktop/mobile, senza errori JavaScript.
I controller Xbox/PS4 sono verificati con fixture dell'API Gamepad; la prova con
hardware fisico non è stata eseguita perché non era collegato un dispositivo.
Le intere durate predefinite 18/15/12 minuti non sono state ripetute su ogni pista.

La prova indicativa di 120 frame con 23 vetture ha misurato circa 1,52 ms medi per
`update + render` nel browser headless di questo ambiente. Non misura la frequenza
effettiva di un display o le prestazioni su altri computer.
