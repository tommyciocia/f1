# F1 Racing Simulator

Versione 1.2 · Revisione grafica del 30 ottobre 2026: materiali di pista,
scenografia, monoposto, box e HUD rinnovati. Anteprime e verifiche sono in
[docs/GRAPHICS.md](docs/GRAPHICS.md).

Revisione qualità 1.1 del 30 ottobre 2026. Problemi corretti, modifiche,
prove riproducibili e limiti sono raccolti in [docs/QUALITY-REVIEW.md](docs/QUALITY-REVIEW.md).

Apri `index.html` in un browser. Non servono compilazione o dipendenze per giocare.

Per usare l'hosting locale con security headers e limiti alle richieste, esegui
`node server/server.cjs` e apri `http://127.0.0.1:8080`. Per la produzione sono
obbligatori un Node aggiornato, HTTPS e l'origine pubblica configurata.
I dettagli di avvio, l'audit, i test e le configurazioni esterne sono in
[docs/SECURITY.md](docs/SECURITY.md).

Il gioco resta locale: non contiene account o database. I salvataggi sono
validati, ma tempi e risultati calcolati nel browser non sono certificati
contro modifiche del proprietario. Una competizione online richiede un backend
autorevole; il rate limiting locale richiede una protezione DDoS di rete a monte.

## Carriera

La Home include **CARRIERA**, con due percorsi e due salvataggi indipendenti:
**Crea la tua squadra** personalizza nome, pilota, colori e prestazioni, con
23 vetture e 12 team; **Sostituisci un pilota** prende davvero il suo sedile
nella squadra scelta, con 22 vetture e 11 team. Alla creazione scegli **10 GP**
(i dieci circuiti originari) oppure **24 GP**. Le stagioni esistenti da 24 restano
complete. Il menu mostra classifiche,
prossimo GP, calendario e risultati completi.

Ogni carriera ha la propria scheda **IMPOSTAZIONI**: difficoltà, giri, qualifiche
e relative durate, sterzo, audio, controlli e grafica. Le gare singole conservano
le proprie opzioni. I weekend riusano gomme, usura, guida e box esistenti;
con le qualifiche abilitate, la carriera pilota passa da 22 a 16 a 10 vetture.

I punti vengono assegnati solo dalla classifica finale: 25–18–15–12–10–8–6–4–2–1,
senza bonus per il giro veloce. La carriera salva automaticamente i progressi
nel browser e registra ciascun GP una sola volta. Puoi alternare le due carriere
dalla schermata iniziale e usare anche **SALVA CARRIERA** nelle impostazioni.
Il vecchio salvataggio continua nello slot della tua squadra. Un weekend
interrotto riparte dall'inizio, conservando le gare già completate.

Dopo l'ultimo GP del formato scelto compare **CAMPIONI DEL MONDO**, con i vincitori e la possibilità
di iniziare una nuova stagione. Regole, calendario, gestione dei ritiri,
salvataggio e verifiche sono descritti in [docs/CAREER.md](docs/CAREER.md).

## Grafica e fluidità

Erba, sabbia, cemento, ghiaia e asfalto usano materiali procedurali originali.
I circuiti hanno tre ambientazioni visive: parco, città e deserto. Alberi,
edifici, tribune e cartelli di frenata sono disegnati fuori dalla pista;
non introducono ostacoli o modifiche alla fisica. Le posizioni sono generate
con un generatore locale, indipendente dal caso usato dalla simulazione.
La scenografia rappresenta un'ambientazione stilizzata, non una replica degli
edifici o della vegetazione dei circuiti reali.

Le monoposto hanno carrozzerie prerenderizzate a risoluzione tripla, halo,
casco, sospensioni, ali e numero personale; sterzo, ruote, colori gomme e LED
restano dinamici. La cache conserva al massimo 48 livree/numero e una sola
ambientazione attiva. L'anteprima in **SELEZIONA AUTO** è anch'essa ad alta
risoluzione. La visuale più vicina rende leggibili le vetture; C mantiene la
possibilità di allargare l'inquadratura. Le etichette danno priorità al
giocatore ed evitano sovrapposizioni. La classifica conserva tutti i piloti.

`npm run test:browser-graphics` verifica alta/bassa qualità sui 24 circuiti,
assenza di modifiche a fisica e casualità durante il disegno, riutilizzo della
cache, limite delle livree, layout desktop/mobile e ciclo reale dei frame.
Il rapporto è `docs/validation-graphics.json`.

Pista, box, griglia e segnaletica usano una superficie riutilizzata durante il
movimento della camera; anche lo sfondo della minimappa viene conservato.
Le auto, le ruote e le particelle restano animate. La qualità alta applica
automaticamente una risoluzione maggiore per bordi più nitidi, con un limite
alla dimensione delle superfici su schermi molto densi. Il menu non ridisegna
continuamente uno sfondo identico.

Il test `npm run test:browser-performance` controlla riutilizzo, spostamenti,
cambio circuito e livrea, ridimensionamento e limite 4K. Nel confronto locale
su Barcelona, Monaco e Suzuka, il rendering con camera ferma ha richiesto circa
4–4,5 ms per fotogramma, rispetto a 10–15,5 ms senza riutilizzo. Sono misure
del rendering nel browser di prova, non un valore FPS garantito su ogni PC.

## Qualifiche

- Q1: 23 auto, 18 minuti; passano 17 piloti, 6 eliminati nelle posizioni 18–23.
- Q2: 17 auto, 15 minuti; passano 10 piloti, 7 eliminati nelle posizioni 11–17.
- Q3: 10 auto, 12 minuti; i risultati determinano le prime 10 posizioni e la pole.

Le durate sono modificabili nelle impostazioni. È ancora possibile saltare le qualifiche.
Ogni fase riparte dai garage con uscite ogni secondo e cronometri azzerati.
La schermata dei risultati permette di continuare nella fase successiva. Se il giocatore
è eliminato, la sua auto resta nel garage e la telecamera segue i piloti ancora in corsa.

Un giro valido richiede traguardo, entrambi i settori nell'ordine corretto e un giro
completo percorso. Non ci sono track limit: uscire di pista non annulla il tentativo
e la distanza percorsa fuori pista conta normalmente. Riposizionamenti e ingresso ai box
annullano il tentativo. Il miglior tempo viene salvato al traguardo.
Alla scadenza si conserva il controllo fino al traguardo, anche sul giro
di uscita o su un giro annullato; solo i giri lanciati validi assegnano un tempo e
non si avviano nuovi tentativi. Quando il giocatore conclude il suo ultimo giro dopo
lo zero, gli avversari ancora in pista completano i loro giri in simulazione rapida
e i tempi vengono registrati prima di mostrare i risultati.
Il pulsante di fine anticipata conclude subito la fase
con i tempi già registrati, anche in Q1.
Un limite di sicurezza conclude la fase se un pilota rimane fermo sul giro finale,
senza interrompere un giocatore che sta ancora guidando.

Nessun tempo viene assegnato a chi non completa un giro valido. A parità di tempo
prevale chi lo ha ottenuto prima; senza tempo si mantiene l'ordine di accesso alla fase.
I risultati delle tre fasi rimangono disponibili nella sessione di gioco e la gara
successiva utilizza automaticamente l'intera griglia di 23 auto.

I passaggi su settori e traguardo sono interpolati all'interno dei sottopassi
fisici. Attraversare la linea prima dello zero permette ancora un ultimo giro;
attraversarla dopo la scadenza conclude il tentativo. La simulazione del ciclo
normale usa un passo fisso di 1/60 s, con un limite di recupero dei frame lenti.
I distacchi di gara usano tempi misurati su 100 punti comuni per giro, aggiornati
cinque volte al secondo; senza un rilevamento comune compare «—».
Al proprio arrivo viene completata la gara delle altre vetture in simulazione
rapida, conservando un limite di sicurezza per eventuali stalli.

## Audio e pausa

Motore, frenata, menu, partenza e segnale finale sono sintetizzati localmente
con WebAudio. **AUDIO ON/OFF** e il tasto **M** attivano/disattivano il suono senza
perdere il volume scelto. La pausa azzera motore e frenata, anche durante i
semafori. Start/Menu del controller permette sia di mettere in pausa sia di
riprendere. Cambiare finestra o nascondere la pagina mette in pausa la sessione.
I suoni non richiedono file musicali o connessioni esterne.

## Gomme e box

Le qualifiche impongono SOFT rosse al 100% a tutte le auto, senza consumo o penalità.
Prima della gara compare **SCEGLI LE GOMME**, con SOFT rosse, MEDIUM gialle e HARD
bianche. Seleziona una mescola e premi **INIZIA GARA**: la vettura parte con il set
scelto nuovo al 100%. La schermata appare anche saltando le qualifiche e quando
si ricomincia una gara; dopo Q3 conserva la griglia ottenuta. L'ultima scelta viene
ricordata nel browser. Le tre mescole hanno velocità, aderenza e durata differenti
e usano lo stesso sistema di degrado in gara. L'indicatore circolare in basso a
sinistra mostra mescola, percentuale e stato di usura; la torre mostra la sigla
colorata accanto a ciascun pilota.

Nella zona di ingresso specifica del circuito compare **PREMI X PER ENTRARE AI BOX**.
X sulla tastiera, X su Xbox oppure X/Croce su PS4/PS5 avvia la frenata assistita
sulla pista e il transito sulla corsia a **80 km/h**, fino al ricongiungimento.
Il percorso attraversa il traguardo: in gara il passaggio conta un solo giro.
In qualifica l'ingresso annulla il tentativo e conserva i migliori tempi.

In gara X porta alla propria piazzola: il giocatore sceglie SOFT, MEDIUM o HARD e
conferma il cambio. Il servizio dura 2,8 secondi, monta gomme nuove al 100% e
contabilizza la sosta solo al completamento. Da 3 giri è obbligatoria almeno una
sosta; terminarli senza averla completata comporta la squalifica. L'IA effettua
le proprie soste sulla corsia reale. In qualifica restano il transito e le SOFT
al 100%, senza servizio. Le 23 piazzole dei 12 team sono conservate.

La durata competitiva di un set è circa il 33% della gara per le SOFT, il 55% per
le MEDIUM e il 78% per le HARD, con minimi rispettivamente di 3, 4 e 5 giri per
evitare un consumo eccessivo nelle gare brevi. È una stima al 40% di condizione
residua, non un limite: si può continuare con prestazioni progressivamente peggiori.
Ogni vettura conserva distanza e giri del proprio set. Il degrado influisce su
velocità, aderenza, accelerazione e frenata, separatamente dai dati del circuito.
In gara le gomme si consumano tre volte più rapidamente per la distanza percorsa
fuori pista. Tornando sull'asfalto il consumo torna normale; in qualifica resta disattivato.

La schermata **COMANDI** mostra le associazioni e gli input rilevati in tempo reale.
W/S o le frecce accelerano/frenano; A/D o le frecce sterzano; R arretra; ESC mette
in pausa. T conserva il riposizionamento con penalità, C cambia visuale e Spazio
aziona il freno a mano. Sul controller: RT/R2 accelera, LT/L2 frena e, mantenendolo
premuto da fermo senza accelerare, inserisce la retromarcia. Stick sinistro sterza,
B/Cerchio resta un comando alternativo per arretrare e Start/Menu/Options mette in pausa.
I comandi manuali non agiscono durante il transito assistito.

Il rilevamento usa l'API nativa `navigator.getGamepads()`. La sezione di configurazione
per joystick non standard consente di assegnare assi e pulsanti e scegliere il tipo
di grilletti; le impostazioni sono salvate nel browser. Sono mostrati sia i numeri
dei pulsanti premuti sia i valori degli assi. Scollegamento e API non disponibile
lasciano attiva la tastiera. Il supporto fisico di ogni dispositivo va verificato
nel browser con il controller collegato, usando il pannello di diagnostica.

## Circuiti

La Home include **CIRCUITI**, con esattamente le 24 sedi dell’elenco 2026 iniziale:
Albert Park, Shanghai, Suzuka, Bahrain, Jeddah, Miami, Montréal, Monaco,
Barcelona-Catalunya, Red Bull Ring, Silverstone, Spa-Francorchamps, Hungaroring,
Zandvoort, Monza, Madring, Baku, Marina Bay, Circuit of The Americas, Città del
Messico, Interlagos, Las Vegas, Lusail e Yas Marina. Le dieci piste ufficiali
preesistenti sono conservate; sono state aggiunte le 14 mancanti.

Ogni scheda ha **DETTAGLI** per la mappa ingrandita e **SELEZIONA CIRCUITO** per salvare la scelta
nel browser. La selezione resta anche dopo il ritorno alla Home e la riapertura
del gioco. Il cambio di pista azzera una vecchia griglia di qualifica e può avvenire
solo dalla Home. I vecchi ID non più presenti vengono migrati a Barcelona.

Le mappe sono **ricostruzioni 2D approssimate da coordinate geografiche**. Nomi,
lunghezze e curve sono verificati sulle fonti ufficiali; box, larghezze e settori
sono adattati al gioco. **Madring usa una sagoma preliminare**, scalata ai 5,414 km
pubblicati da F1, e non è presentato come replica del layout definitivo omologato.
Suzuka dispone di due livelli per rendering, recuperi e
collisioni; Monaco conserva tornante e tunnel. Anteprime, minimappa e gara usano
la medesima geometria. Le anteprime possono ruotarla per renderla leggibile.

Il registro è in assets/circuits/circuits.json e js/circuitData.js. Per rigenerarlo
dai GeoJSON già inclusi, senza rete o pacchetti, eseguire node scripts/build-circuits.cjs.
Fonti, licenza, architettura e criteri di ricostruzione sono in [docs/CIRCUITS.md](docs/CIRCUITS.md).
I risultati per singolo circuito sono in [docs/validation-circuits.json](docs/validation-circuits.json).

## Verifiche

Il debug di settori, giri iniziali e progressione è descritto in
[docs/DEBUG-PROGRESSION.md](docs/DEBUG-PROGRESSION.md). Le regressioni mirate si
eseguono con `npm run test:progression` e `node tests/browser-progression.cjs`.
In gara tutte le vetture iniziano con zero giri completati; il primo passaggio
dal traguardo apre il giro senza accreditarne uno. S1/S2/S3 usano la distanza
effettiva lungo il circuito e l'HUD conserva i settori del giro precedente.

~~~text
node --test tests/circuits.cjs
node --test tests/simulation.cjs tests/qualifying.cjs tests/controls.cjs tests/tyres.cjs tests/race-setup.cjs tests/race-rules.cjs tests/strategy.cjs tests/pit-access.cjs
node tests/browser-circuits.cjs
node tests/browser.cjs
node tests/browser-controls.cjs
node tests/browser-tyres.cjs
~~~

I test dei circuiti simulano Q1/Q2/Q3 da quattro minuti per fase e gare di due
giri su ciascuna pista, con 23 vetture. Controllano geometria, direzione, griglia,
collisioni, barriere, giri, settori, box, gomme, salvataggio e sovrappasso.
I test di regressione coprono anche qualifiche brevi, eliminazioni, pause, ripartenze,
input e transiti di tutte le monoposto. `npm run test:pit` verifica il servizio
manuale su tutti i circuiti, il conteggio della sosta obbligatoria e una gara con
le soste di tutte le 23 vetture. I casi di solo transito usano esplicitamente
il servizio disabilitato come configurazione di regressione.

I test browser richiedono Playwright e Microsoft Edge; F1_BROWSER_CHANNEL consente
un altro canale Chromium installato. I browser sono isolati, senza usare profili
personali; gli screenshot finiscono nella cartella temporanea di sistema.
Le mappature controller sono provate con fixture dell'API Gamepad. Un controller
fisico non era collegato: la prova hardware resta da fare con il pannello COMANDI.

Per una prova lunga aggiuntiva sul circuito selezionato dal test è disponibile
node tests/qualifying-soak.cjs (intere durate 18/15/12 minuti).

Le regressioni della revisione qualità sono eseguibili con `npm run test:quality`
e, con Playwright/Edge disponibili, `npm run test:browser-quality`. Quest'ultima
usa l'hosting HTTP reale e verifica le schermate, il motore WebAudio, layout da
320 a 1920 pixel, un weekend completo e tutti i dieci GP con 23 arrivi, soste,
salvataggi ricaricati, punteggi e titolo. Genera `docs/validation-quality-browser.json`.
