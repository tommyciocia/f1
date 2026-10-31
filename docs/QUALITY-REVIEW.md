# Revisione qualità — F1 Racing Simulator 1.1

Data: 30 ottobre 2026. Interventi sul progetto esistente, senza sostituire il
gioco, la fisica, i circuiti o le modalità già presenti. Il progetto conteneva
già 24 circuiti e due carriere: sono stati mantenuti, insieme ai salvataggi.

## Problemi trovati e correzioni

| Problema osservato nel codice | Correzione implementata |
| --- | --- |
| Il ciclo saltava completamente `update()` in pausa, compreso il polling del controller: Start non poteva riprendere la sessione. | Polling a ogni frame, anche durante la pausa, con regressione sul ciclo reale. |
| Motore ancora udibile dopo aver messo in pausa; countdown non sospeso quando si cambiava finestra. | Silenziamento immediato e pausa automatica anche durante i semafori; rilascio dei tasti. |
| Fisica dipendente dai frame e tutti i sottopassi con lo stesso `raceTime`. | Ciclo a 60 Hz, tempo corretto per ciascun sottopasso e interpolazione dei passaggi. |
| Scadenza qualifica applicata prima della fisica dell'intero frame: poteva chiudere un giro che attraversava la linea appena prima dello zero. | Controllo del tempo effettivo del passaggio, seguito dalla scadenza della fase. |
| Uscite in qualifica ogni 0,5 secondi. | Intervallo di un secondo, mantenendo il controllo del traffico nei garage. |
| Distacchi ricavati dalla distanza divisa per la velocità del giocatore. | Tempi misurati sugli stessi 100 punti per giro; penalità e doppiaggi considerati. Nessuna stima presentata come tempo misurato. |
| Fine gara dieci secondi dopo l'arrivo del giocatore, con possibili avversari ancora in pista. | Completamento accelerato con la stessa fisica e attesa degli arrivi, entro un limite di sicurezza proporzionato al circuito. |
| Le auto già arrivate potevano continuare ad accreditare giri e migliori tempi. | Progressione e settori bloccati al risultato definitivo. |
| Possibile registrazione duplicata chiamando nuovamente `endRace()`. | Conclusione idempotente e record salvato una sola volta. |
| Due auto esattamente coincidenti erano escluse dalla risoluzione delle collisioni. | Separazione deterministica anche con distanza zero, senza divisioni non valide. |
| Mancava il campionato da dieci GP richiesto. | Formato breve da dieci gare selezionabile, predefinito nel modulo di creazione; formato esistente da 24 conservato. |
| Audio limitato a oscillatore motore, urti e bip; nessun mute diretto. | Rumore di frenata filtrato, conferme menu, segnale finale originale e mute persistente. Disconnessione dei nodi audio temporanei al termine. |
| Errori ripetuti in console a ogni frame, senza possibilità di recupero nell'interfaccia. | Arresto della sessione, messaggio visibile e pulsante per ripartire dal menu; risultati già salvati conservati. |
| Il lettore schermo riceveva aggiornamenti continui dei millesimi dei settori. | Etichetta descrittiva dei settori senza annunci continui; toast e messaggi restano accessibili. |
| Rotazione delle ruote dipendente solo dalla velocità istantanea. | Fase delle ruote accumulata con la distanza percorsa. |
| Menu e risultati poco gerarchizzati; HUD stretto su schermi piccoli. | Nuova composizione del menu, scheda circuito con mappa reale, podio, HUD adattivo, classifica scorrevole e comandi pausa/audio accessibili. |

Rimossi anche il vecchio stile `carGrid`, la costante `PLAYER` e la funzione
`movedForward`, privi di utilizzi. Nessuna funzionalità di gioco è stata rimossa.
Le gomme e l'IA già presenti restano attive: usura progressiva, mescole, sorpassi,
frenata anticipata, recupero degli stalli e soste sulla corsia reale.

## Grafica e audio

Il menu mantiene lo sfondo originale già incluso e usa una nuova composizione
con mappa, circuito selezionato e impostazioni reali della prossima sessione.
Le informazioni sono generate dagli stessi dati della simulazione. Il podio
deriva dalla classifica, escludendo squalificati e ritirati. Sull'asfalto è
stata sostituita la linea stradale tratteggiata con una fascia di deposito gomme.
Vetture, livree, dettagli e interfaccia sono disegnati localmente.

Non sono stati aggiunti loghi, immagini, musiche o registrazioni di terzi.
Motore, frenata, menu, semafori e finale usano sintesi WebAudio. Il mute conserva
il volume; la pausa silenzia motore e frenata. Le due carriere mantengono le
proprie preferenze audio, separate dalle gare singole.

## Verifiche riproducibili

- `npm test`: suite del progetto più le regressioni `tests/quality.cjs`.
- `npm run test:quality`: clock a 30/60/144 Hz, controller in pausa, interpolazione,
  limite dello zero, distacchi, collisioni coincidenti, risultati immutabili,
  mute, recupero errori, dieci GP/punti/salvataggi/titolo e 23 arrivi reali.
- `npm run test:browser-quality`: HTTP locale reale, navigazione dei menu,
  configurazione auto/paddock/controller, mute, riapertura, selezione circuiti,
  scelta delle tre mescole, pausa/riavvio, WebAudio, Q1/Q2/Q3 complete e dieci
  gare reali da tre giri con sosta e 23 arrivi ciascuna. Salvataggio ricaricato
  tra i GP, punteggi, titolo e nuova stagione verificati.
- Suite browser già presenti per qualifiche, gomme, controlli, due profili
  carriera, campionato completo da 24 GP, circuiti, progressione, sicurezza,
  rendering, cache e HiDPI.

Le prove delle gare affidano il giocatore all'IA per renderle ripetibili;
ingresso ai box e conferma gomme vengono eseguiti attraverso le funzioni del
gioco. Le prove dei comandi verificano separatamente tastiera e Gamepad API.
La conclusione manuale delle qualifiche è usata dove il test isola altre parti;
nelle prove dedicate Q1/Q2/Q3 scadono naturalmente, senza tempi inventati.

Il rapporto macchina è in [validation-quality-browser.json](validation-quality-browser.json).
Contiene risultati dei dieci GP, misure WebAudio, rettangoli dell'HUD,
versione del browser, errori raccolti e campione del ciclo reale. Gli screenshot
di riferimento sono nella cartella `review`.

Anteprime: [menu](review/menu.png), [gara](review/race.png),
[podio](review/podium.png), [campioni](review/champions.png).
Il riepilogo delle esecuzioni è in [validation-quality.json](validation-quality.json).
Il runtime usato per le prove Node è **v24.22.1**, incluso nell'ambiente di lavoro;
il Node di sistema v24.14.1 è inferiore al requisito già dichiarato dal progetto
per l'hosting di produzione. Il gioco può anche essere aperto direttamente da
`index.html`, senza Node o dipendenze runtime.

### Esito delle esecuzioni

Sono stati verificati **282 casi Node distinti**: la prima esecuzione completa
conteneva 280 casi (277 superati, tre da correggere); i tre sono stati corretti
e rieseguiti con esito positivo, e la suite qualità finale comprende due casi
aggiuntivi, anch'essi superati. Due regressioni avevano ancora ipotesi legate
alle uscite ogni mezzo secondo: l'intervallo atteso è stato aggiornato e il test
che richiedeva un tempo valido per tutti usa tre minuti, sufficienti anche per
l'ultima vettura. Non si assegnano tempi fittizi nelle qualifiche troppo brevi.
La terza regressione ha evidenziato che il limite di aggiornamento dell'HUD
ritardava il cambio della mescola: i cambi di stato ora aggiornano subito la
torre, mantenendo i distacchi periodici. Non è stata ripetuta l'intera suite
da 17 minuti dopo queste correzioni: sono stati rieseguiti i casi interessati
e la suite qualità finale.

Sono passati anche **tutti gli undici script browser**, compresi i campionati
completi da 10 e 24 GP e le due carriere separate. La prova lunga ha simulato
le durate originali **18/15/12 minuti**: 23/17/10 tempi validi, 6/7/0 eliminati,
nessuno stallo e SOFT sempre al 100%. Nelle fasi sono stati completati almeno
12, 10 e 8 giri rispettivamente. La suite circuiti ha percorso Q1/Q2/Q3 e gara
su tutti i 24 tracciati. Nessun errore inatteso di console è rimasto nelle
esecuzioni browser finali. Il recupero da errore è stato verificato anche
nell'interfaccia con un errore controllato.

## Prestazioni e limiti della verifica

Il campione browser iniziale, a 1440×900 con 23 vetture e altre verifiche in
corso sullo stesso PC, ha misurato circa 59 FPS per tre secondi. È una misura
locale, non una garanzia su ogni dispositivo. La cache del rendering conserva
il limite di 12 milioni di pixel; il confronto locale ha misurato circa
4,8–5,8 ms per il rendering con cache contro 12,4–13,7 ms senza cache.
Questi numeri riguardano il solo rendering, senza certificare il frame rate
di una partita lunga su hardware diverso.

La verifica browser è stata eseguita con Microsoft Edge/Chromium su Windows.
Firefox, Safari, dispositivi mobili reali e controller fisici richiedono una
prova aggiuntiva. Il layout è stato verificato anche a 320×568 e 640×360;
il gioco conserva tastiera e controller come input e non aggiunge comandi touch.
L'audio è stato verificato nel grafo WebAudio; non è una prova di ascolto
sull'impianto dell'utente.

Le piste restano ricostruzioni 2D approssimate; Madring conserva la sagoma
preliminare dichiarata. La modalità che sostituisce un pilota conserva
correttamente 22 vetture, mentre gara singola e carriera squadra ne hanno 23.
La guida resta quella di un simulatore 2D accessibile, con assistenza per i bot:
non è una simulazione fisica ufficiale delle monoposto reali.

## Valutazione

La versione migliora stabilità, leggibilità, completezza del campionato e
correttezza delle sessioni, con verifiche automatiche ripetibili. È una buona
candidata per un nuovo controllo qualitativo come gioco motorsport 2D.
Restano da fare un playtest umano prolungato e le prove sugli effettivi browser
e dispositivi richiesti dalla piattaforma. Senza il regolamento e il responso
della piattaforma non è possibile dichiarare superata o garantita la revisione.
