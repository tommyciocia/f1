# F1 Racing Simulator

Apri `index.html` in un browser. Non servono compilazione o dipendenze per giocare.

## Qualifiche

- Q1: 23 auto, 18 minuti; passano 17 piloti, 6 eliminati nelle posizioni 18–23.
- Q2: 17 auto, 15 minuti; passano 10 piloti, 7 eliminati nelle posizioni 11–17.
- Q3: 10 auto, 12 minuti; i risultati determinano le prime 10 posizioni e la pole.

Le durate sono modificabili nelle impostazioni. È ancora possibile saltare le qualifiche.
Ogni fase riparte dai garage con uscite ogni 0,5 secondi e cronometri azzerati.
La schermata dei risultati permette di continuare nella fase successiva. Se il giocatore
è eliminato, la sua auto resta nel garage e la telecamera segue i piloti ancora in corsa.

Un giro valido richiede traguardo, entrambi i settori nell'ordine corretto e un giro
completo percorso. Uscite di pista, riposizionamenti e ingresso ai box annullano il
tentativo. Alla scadenza possono finire solo i giri lanciati già iniziati; non si
avviano nuovi tentativi. Il pulsante di fine anticipata conclude subito la fase
con i tempi già registrati, anche in Q1.
Un limite di sicurezza conclude la fase se un pilota rimane fermo sul giro finale.

Nessun tempo viene assegnato a chi non completa un giro valido. A parità di tempo
prevale chi lo ha ottenuto prima; senza tempo si mantiene l'ordine di accesso alla fase.
I risultati delle tre fasi rimangono disponibili nella sessione di gioco e la gara
successiva utilizza automaticamente l'intera griglia di 23 auto.

## Gomme e box

Le qualifiche impongono SOFT rosse al 100% a tutte le auto, senza consumo o penalità.
In gara il giocatore sceglie SOFT, MEDIUM o HARD dalle impostazioni: le tre mescole
hanno velocità, aderenza e durata differenti. L'indicatore circolare in basso a
sinistra mostra mescola, percentuale e stato di usura; la torre mostra la sigla
colorata accanto a ciascun pilota.

Nella zona di ingresso specifica del circuito compare **PREMI X PER ENTRARE AI BOX**.
X sulla tastiera, X su Xbox oppure X/Croce su PS4/PS5 avvia la frenata assistita
sulla pista e il transito sulla corsia a **80 km/h**, fino al ricongiungimento.
Il percorso attraversa il traguardo: in gara il passaggio conta un solo giro.
In qualifica l'ingresso annulla il tentativo e conserva i migliori tempi.

Il catalogo reale usa il solo transito: nessun pit stop automatico, cambio gomme
automatico o sosta obbligatoria. Le 23 piazzole dei 12 team servono alla partenza
delle qualifiche. Le funzioni del precedente servizio restano disabilitate.

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

~~~text
node --test tests/circuits.cjs
node --test tests/simulation.cjs tests/qualifying.cjs tests/controls.cjs tests/tyres.cjs tests/race-rules.cjs tests/strategy.cjs tests/pit-access.cjs
node tests/browser-circuits.cjs
node tests/browser.cjs
node tests/browser-controls.cjs
node tests/browser-tyres.cjs
~~~

I test dei circuiti simulano Q1/Q2/Q3 da quattro minuti per fase e gare di due
giri su ciascuna pista, con 23 vetture. Controllano geometria, direzione, griglia,
collisioni, barriere, giri, settori, box, gomme, salvataggio e sovrappasso.
I test di regressione coprono anche qualifiche brevi, eliminazioni, pause, ripartenze,
input e transiti di tutte le monoposto. I test delle vecchie soste automatiche
sono stati aggiornati al transito senza fermata richiesto per questo catalogo.

I test browser richiedono Playwright e Microsoft Edge; F1_BROWSER_CHANNEL consente
un altro canale Chromium installato. I browser sono isolati, senza usare profili
personali; gli screenshot finiscono nella cartella temporanea di sistema.
Le mappature controller sono provate con fixture dell'API Gamepad. Un controller
fisico non era collegato: la prova hardware resta da fare con il pannello COMANDI.

Per una prova lunga aggiuntiva sul circuito selezionato dal test è disponibile
node tests/qualifying-soak.cjs (intere durate 18/15/12 minuti).
