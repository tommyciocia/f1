# Modalità Carriera

Implementata il 28 ottobre 2026 nel gioco esistente. Il pulsante **CARRIERA**
nella Home apre il campionato, con classifiche piloti e costruttori, calendario,
progressi e risultati completi di ciascun Gran Premio.

## Due percorsi e impostazioni separate

Il pulsante **CARRIERA** apre due slot, ciascuno con la propria stagione:

- **Crea la tua squadra**: scegli nome squadra, identità pilota, numero,
  due colori e prestazioni della monoposto. Gareggi con la tua vettura aggiunta
  alle 22 esistenti, per un totale di 23 piloti e 12 team.
- **Sostituisci un pilota**: scegli uno dei 22 sedili e la tua identità pilota.
  Il pilota scelto lascia la griglia; ne erediti scuderia, livrea, prestazioni,
  compagno e box. Restano 22 piloti e 11 team. Le qualifiche sono 22→16→10.

Ogni slot mostra pilota, squadra, stagione, GP completati e weekend da riprendere.
Uno slot occupato propone **CONTINUA CARRIERA**: riaprire il percorso non ne
cancella i progressi. È possibile portare avanti entrambi i campionati.

La scheda **IMPOSTAZIONI** di ogni carriera salva separatamente difficoltà,
numero di giri, sensibilità, volume, abilitazione qualifiche, durata Q1/Q2/Q3,
controllo, qualità grafica e inversione sterzo. Le opzioni si applicano nel
weekend della carriera scelta; tornando al menu vengono ripristinate quelle
delle gare singole. Anche identità, roster, prestazioni e gomme di partenza
sono conservati nel proprio slot. Le modifiche successive del paddock delle
gare singole non alterano una carriera già creata.

Le modifiche e i risultati si salvano automaticamente; **SALVA CARRIERA**
permette anche un salvataggio esplicito. Il salvataggio precedente viene
recuperato nello slot **Crea la tua squadra**, con risultati e identità.

## Calendario

Dal 30 ottobre 2026 la creazione propone **10 Gran Premi** come formato breve
oppure **24 Gran Premi** come stagione completa. Il formato breve usa Barcelona,
Suzuka, Spa, Monaco, Silverstone, Red Bull Ring, COTA, Bahrain, Singapore e Monza.
È identificato nel salvataggio da `format: "sprint10"`, termina alla decima gara
e conserva lo stesso formato nelle stagioni successive. Le vecchie stagioni
e la loro migrazione a 24 GP restano compatibili; quelle nuove da 10 non vengono
allungate durante il caricamento. La dimensione del calendario determina
progresso, risultati, campioni e disponibilità del prossimo GP.

Il formato completo usa tutti i 24 circuiti nell'ordine del
[calendario F1 2026 originale da 24 GP](https://www.formula1.com/en/latest/article/formula-1-reveals-calendar-for-2026-season.YctbMZWqBvrgyddrnauo8).
Questo riferimento mantiene tutti i 24 GP richiesti nel gioco.
I nomi, le mappe, i box e le geometrie vengono letti da `CIRCUIT_DATA`: non sono
state create copie dei tracciati. Ogni pista ospita un GP per stagione.

| GP | Circuito | ID esistente |
|---:|---|---|
| 1 | Albert Park | `albert-park` |
| 2 | Shanghai | `shanghai` |
| 3 | Suzuka | `suzuka` |
| 4 | Bahrain | `bahrain` |
| 5 | Jeddah | `jeddah` |
| 6 | Miami | `miami` |
| 7 | Montréal | `montreal` |
| 8 | Monaco | `monaco` |
| 9 | Barcelona-Catalunya | `barcelona` |
| 10 | Red Bull Ring | `red-bull-ring` |
| 11 | Silverstone | `silverstone` |
| 12 | Spa-Francorchamps | `spa` |
| 13 | Hungaroring | `hungaroring` |
| 14 | Zandvoort | `zandvoort` |
| 15 | Monza | `monza` |
| 16 | Madring | `madring` |
| 17 | Baku | `baku` |
| 18 | Marina Bay | `singapore` |
| 19 | Circuit of The Americas | `cota` |
| 20 | Messico | `mexico` |
| 21 | Interlagos | `interlagos` |
| 22 | Las Vegas | `las-vegas` |
| 23 | Lusail | `lusail` |
| 24 | Yas Marina | `yas-marina` |

## Weekend e punti

**INIZIA GRAN PREMIO** carica la pista prevista e avvia Q1, Q2 e Q3, oppure
la scelta gomme se le qualifiche sono disattivate. Restano i normali comandi, l'uscita dai box,
la simulazione degli ultimi giri degli avversari, la griglia di qualifica,
la scelta delle gomme, l'usura e le soste. Durate e difficoltà usano le
impostazioni della carriera. La scelta del circuito delle gare singole non viene
sovrascritta.

I punti sono 25, 18, 15, 12, 10, 8, 6, 4, 2 e 1 per i primi dieci classificati;
gli altri ricevono zero. Non viene assegnato alcun bonus per il giro veloce.
La tabella richiesta viene usata anche nelle gare brevi del simulatore.

La carriera riceve l'ordine definitivo da `endRace()`, dopo l'applicazione
delle squalifiche già previste dal gioco. Una gara senza partenza, senza un
arrivo valido o su un circuito diverso da quello previsto non fa avanzare
il campionato. Qualifiche e posizioni provvisorie non assegnano punti.

I non classificati e gli squalificati ricevono zero punti. Un pilota che non
arriva ma ha percorso almeno il 90% dei giri del vincitore, arrotondato per
difetto, può restare classificato. Nelle gare di un giro occorre comunque
completare almeno un giro. Dal menu Pausa della gara di carriera è disponibile
**RITIRATI DAL GRAN PREMIO**: la propria auto si ferma ai box e gli avversari
concludono la gara con la fisica e l'IA esistenti in simulazione rapida.

Le classifiche vengono ricostruite dai risultati salvati. I costruttori sommano
i punti dei propri piloti, inclusa la squadra del giocatore con la sua vettura.
Lo storico conserva nomi e team effettivi di ogni risultato e i punti
costruttori restano al team per cui sono stati conquistati.

A parità di punti si confrontano vittorie, secondi posti, terzi posti e così
via. Se tutti i piazzamenti in gara coincidono, si confrontano i piazzamenti
delle qualifiche, come previsto dal regolamento 2026. Una parità assoluta
anche dopo questi confronti viene mostrata esplicitamente, senza inventare
un campione casuale.

Riferimenti: [FIA 2026, sezione A, A2.1.4 e A2.2](https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_a_general_provisions_-_iss_03_-_2026-06-25.pdf)
e [sezione B, B2.5.5](https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf).

## Progressi e fine della stagione

Il calendario avanza solo alla registrazione di un risultato finale valido.
Ogni GP ha un identificativo composto da stagione e numero di gara: chiamate
ripetute, riaperture e due schede sullo stesso GP non sommano punti due volte.
La ripetizione di un GP già conteggiato non viene proposta tra le azioni
del risultato di carriera.

La carriera squadra usa `f1sim.career.v1` e `f1sim.career.backup.v1`;
la carriera pilota usa `f1sim.career.driver.v1` e `f1sim.career.driver.backup.v1`.
Ogni slot ha quindi anche la propria copia di sicurezza.
Vengono salvati impostazioni, identità, calendario, partecipanti, risultati,
classifiche, punti, vittorie, podi e GP corrente. Al caricamento i dati sono
validati e i totali ricalcolati; una copia di sicurezza permette di recuperare
un salvataggio primario danneggiato. Se lo storage è indisponibile, l'interfaccia
lo segnala e mantiene in memoria i progressi di entrambi gli slot, anche
passando da una carriera all'altra. Quando lo storage torna disponibile è
possibile risalvarli.

I precedenti salvataggi da dieci GP vengono estesi a 24: risultati, punti e
GP interrotto vengono conservati nello stesso ordine; seguono tutte le piste
mancanti nell'ordine ufficiale, senza duplicati. Anche una vecchia stagione
conclusa a dieci GP prosegue fino al 24°. Ogni nuova stagione parte dal calendario
completo nell'ordine ufficiale. Nei salvataggi da 24 GP con ordine diverso,
le tappe ancora da disputare vengono riordinate allo stesso modo, conservando
i risultati già registrati e l'eventuale GP in corso.

Chiudendo durante un weekend, si riparte dall'inizio dello stesso GP;
tutte le gare già concluse rimangono conteggiate. Le gare singole non modificano
il mondiale. Il salvataggio è locale al browser e non richiede connessioni di rete.

Dopo il 24° risultato si apre automaticamente **CAMPIONI DEL MONDO**, con
pilota e costruttore campioni, punti, vittorie, podi, margine sul secondo e
classifiche finali. **NUOVA STAGIONE** azzera il campionato dello slot corrente
conservando partecipanti, squadra o sedile, impostazioni e calendario.
L'altra carriera resta disponibile con i suoi progressi.

## Verifiche

- 33 test della carriera: due percorsi, tutti i 22 sedili, impostazioni isolate,
  salvataggi separati, migrazione, cambio slot con storage pieno, calendario,
  integrazione, punti, spareggi, NC/DSQ,
  ritiro, salvataggi ostili o danneggiati, migrazione da dieci a 24 GP,
  riordino dei GP ancora da disputare, due schede, 24 GP e nuova stagione.
- 42 test di regressione: griglia e settori su 24 circuiti, avvio e gomme,
  regole di gara, salvataggi, server e TLS. Totale: 75 test superati.
- Verifiche browser per carriera, due profili, qualifiche, gomme/soste,
  comandi, rendering e sicurezza.
- `browser-career.cjs` disputa tutti e 24 i GP con fisica e IA reali,
  comprese le soste. Nel primo GP simula realmente anche Q1/Q2/Q3;
  nei successivi usa la funzione esistente di fine anticipata delle qualifiche.
  Verifica la ripresa dopo riapertura, desktop/mobile, cerimonia, nuova stagione
  e un ulteriore GP con ritiro del giocatore. Nessun risultato di gara viene
  sostituito con un vincitore estratto casualmente.
- `browser-career-profiles.cjs` crea entrambe le carriere dall'interfaccia,
  modifica le impostazioni, verifica salvataggi e riapertura, e disputa
  qualifiche e GP con il pilota sostituito e la sua sosta effettiva.

Comandi:

```text
npm run test:career
npm run test:browser-career
npm run test:browser-career-profiles
```

Il test browser richiede lo stesso Playwright e Microsoft Edge degli altri
test del progetto. Usa un profilo isolato e salva gli screenshot nella cartella
temporanea di sistema. Per caricare le modifiche ricaricare il gioco; se si usa
il server statico incluso, riavviarlo perché legge i file pubblici all'avvio.
