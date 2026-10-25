# F1 Racing Simulator

Apri `index.html` in un browser. Non servono compilazione o dipendenze per giocare.

## Qualifiche

- Q1: 23 auto, 18 minuti; passano 17 piloti, 6 eliminati nelle posizioni 18–23.
- Q2: 17 auto, 15 minuti; passano 10 piloti, 7 eliminati nelle posizioni 11–17.
- Q3: 10 auto, 12 minuti; i risultati determinano le prime 10 posizioni e la pole.

Le durate sono modificabili nelle impostazioni. È ancora possibile saltare le qualifiche.
Ogni fase riparte dai garage con uscite ogni 2 secondi e cronometri azzerati.
La schermata dei risultati permette di continuare nella fase successiva. Se il giocatore
è eliminato, la sua auto resta nel garage e la telecamera segue i piloti ancora in corsa.

Un giro valido richiede traguardo, entrambi i settori nell'ordine corretto e un giro
completo percorso. Uscite di pista, riposizionamenti e ingresso ai box annullano il
tentativo. Alla scadenza possono finire solo i giri lanciati già iniziati; non si
avviano nuovi tentativi. Il pulsante di fine anticipata applica la stessa regola.
Un limite di sicurezza conclude la fase se un pilota rimane fermo sul giro finale.

Nessun tempo viene assegnato a chi non completa un giro valido. A parità di tempo
prevale chi lo ha ottenuto prima; senza tempo si mantiene l'ordine di accesso alla fase.
I risultati delle tre fasi rimangono disponibili nella sessione di gioco e la gara
successiva utilizza automaticamente l'intera griglia di 23 auto.

## Gomme e box

Le qualifiche impongono SOFT rosse al 100% a tutte le auto, senza consumo o effetti
sulle prestazioni. Il relativo indicatore circolare è in basso a sinistra.
La copia iniziale non conteneva un modulo gomme: la gestione aggiunta riattiva in
gara il consumo in base alla distanza (8 punti percentuali per giro). Sotto il 65%
le prestazioni calano gradualmente; non vengono introdotte soste automatiche.

P oppure X/Quadrato prenota o annulla l'ingresso facoltativo ai box. Raggiungi
l'ingresso a sinistra dopo il traguardo sotto gli 80 km/h. Il transito è assistito,
senza fermate, e all'uscita torna il controllo manuale.

Questa cartella contiene un solo circuito, definito in `js/track.js`, e non contiene
un selettore di circuiti. Qualifiche e gomme usano lunghezza e settori del circuito
caricato, senza definire un secondo sistema di movimento.

## Verifiche

```text
node --test tests/simulation.cjs tests/qualifying.cjs
node tests/qualifying-soak.cjs
```

La prima verifica controlla movimento, box, eliminazioni, tempi, griglia e gomme.
La seconda simula tutti i 45 minuti delle tre fasi con la fisica reale, affidando
anche il giocatore all'AI soltanto durante il test.

`tests/browser.cjs` verifica l'interfaccia in un browser headless separato. Richiede
Playwright e Microsoft Edge; `F1_BROWSER_CHANNEL` permette di scegliere un altro
canale Chromium installato. Gli screenshot di controllo vengono salvati nella
cartella temporanea di sistema, senza modificare il profilo browser dell'utente.
