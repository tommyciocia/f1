# Revisione grafica 1.2 — 30 ottobre 2026

Intervento sul rendering del gioco esistente. Geometria, fisica, IA, gomme,
qualifiche, carriere e salvataggi sono conservati.

## Modifiche

- Materiali procedurali originali per asfalto, erba, cemento, sabbia e ghiaia.
  La pista ha bordi verniciati, guardrail in metallo, cordoli, fascia di gomma
  e vie di fuga continue nelle curve.
- Tre palette ambientali per i 24 circuiti: parco, città e deserto. Alberi,
  arbusti, edifici e tribune con pubblico generano profondità e riferimenti
  visivi, con ombre coerenti. Sono scenografie stilizzate, senza riprodurre
  edifici reali o introdurre nuove collisioni.
- Box con piazzali, tetti, aperture dei garage, illuminazione, scritte e
  fasce nei colori delle squadre. Cartelli 150/100/50 nelle frenate associate
  ai punti caratteristici già presenti nei dati dei circuiti.
- Monoposto con pance e muso sfumati, fondo in carbonio, ali, sospensioni,
  cockpit, casco, visiera, halo e numero. Pneumatici sterzanti con indicazione
  della mescola, bande in movimento e LED di frenata.
- Visuale più vicina e anticipo della camera più contenuto; C allarga ancora
  l'inquadratura. Targhette leggibili senza sovrapposizioni, con precedenza
  al giocatore; tutti i nomi rimangono disponibili nella classifica.
- Strumentazione con superfici e contrasto uniformi, scheda del circuito,
  semafori, minimappa con freccia orientata del giocatore e anteprima auto
  più grande e nitida nel menu di personalizzazione.

Non sono stati aggiunti contenuti esterni, loghi, sponsor o font scaricati.
Tutti i nuovi elementi sono disegnati con Canvas e CSS. L'immagine di sfondo
del menu già inclusa nel progetto è conservata.

## Prestazioni e verifiche

I materiali, gli oggetti statici e le carrozzerie sono generati una volta e
riutilizzati. La cache mantiene una sola ambientazione, tre materiali, tre
alberi e al massimo 48 carrozzerie. La superficie della pista conserva il
limite di 12 milioni di pixel. Le decorazioni fuori dall'inquadratura non
vengono disegnate; qualità bassa riduce la vegetazione e disattiva le ombre
delle monoposto.

La prima versione grafica aveva un filtro di ricampionamento troppo costoso
per i nuovi sprite. Il filtro è stato corretto: le immagini sono già
sovracampionate, quindi il ricampionamento bilineare conserva il dettaglio
evitando il costo del filtro precedente. Nella prova a 1280×800 e densità 2×,
il rendering con cache ha richiesto circa **3,8–4,4 ms/frame** su Barcelona,
Monaco e Suzuka. Ridisegnare tutta la scenografia a ogni frame ha richiesto
circa 28–61 ms: per questo viene riutilizzata la superficie statica.
Sono misure locali del rendering, non una garanzia FPS per ogni computer.
Il campione del ciclo completo a 1440×900 ha misurato circa 54 FPS per quattro
secondi, con simulazione, HUD, vetture e scenografia attivi. I numeri esatti
dell'ultima esecuzione sono conservati nel rapporto JSON.

Verifiche eseguite:

- `node --test tests/quality.cjs`: 11 regressioni superate, compresi campionato,
  salvataggi, timer, pausa, controller, risultati e 23 arrivi.
- `node tests/browser.cjs`: menu, Q1/Q2/Q3, scelta gomme, griglia e layout mobile.
- `node tests/browser-rendering.cjs`: ultimo giro, completamento avversari,
  nodi HUD stabili, visibilità delle vetture, camera e HiDPI.
- `node tests/browser-performance.cjs`: riutilizzo della cache, spostamenti,
  cambio pista e livrea, ridimensionamento e limite 4K.
- `npm run test:browser-graphics`: tutti i 24 circuiti in alta e bassa qualità,
  nessun consumo del generatore casuale del gameplay durante il rendering,
  stato delle vetture immutato dal disegno, cache limitate, layout da 320 pixel
  e misura del ciclo reale nel browser. Nove confronti tra pista intera e
  ritagliata su Barcelona, Monaco e Suzuka non hanno mostrato differenze
  significative nei pixel, verificando la continuità delle giunzioni.

Il rapporto finale del browser è [validation-graphics.json](validation-graphics.json).
Le prove sono state eseguite con Edge/Chromium su Windows; gli altri browser
e i dispositivi fisici conservano i limiti di verifica descritti nel rapporto
della versione 1.1.

## Anteprime

[Gara a Barcelona](review/graphics/barcelona.png) ·
[Gara a Monaco](review/graphics/monaco.png) ·
[Gara in Bahrain](review/graphics/bahrain.png) ·
[Suzuka](review/graphics/suzuka.png) ·
[Dettaglio monoposto](review/graphics/car-detail.png) ·
[Box](review/graphics/pit-lane.png) ·
[Layout mobile](review/graphics/race-320.png)
