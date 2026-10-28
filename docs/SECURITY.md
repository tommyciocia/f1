# Sicurezza del simulatore F1

Audit e implementazione: 27 ottobre 2026. Perimetro: questo repository e prove
locali isolate, senza attacchi a servizi esterni.

## Architettura e limite di fiducia

Il gioco è una SPA statica in JavaScript nativo, HTML e Canvas/WebAudio/Gamepad.
Non usa framework, CDN, script remoti o pacchetti di produzione. Le geometrie
dei circuiti sono incluse nel repository; il gioco non le scarica dalla rete.
Impostazioni, paddock e ultimi dieci risultati risiedono in `localStorage`.
La simulazione e i cronometri girano interamente nel browser.

**Non esistono account, password, amministratori, API di scrittura, WebSocket,
database, contratti o budget condivisi.** Il menu paddock modifica una partita
locale ed è una funzione autorizzata del gioco. Non è un pannello amministrativo.

Il proprietario del browser può modificare codice, memoria, orologio e
salvataggi: **questa versione non offre risultati certificati o anti-cheat
competitivo lato server**. Validazione, CSP, checksum o offuscamento sul client
non possono rendere attendibile una simulazione controllata dal giocatore.
Non sono stati introdotti login fittizi o controlli di ruolo nel browser.

## Vulnerabilità e priorità

| Priorità | Riscontro | Correzione e limite |
| --- | --- | --- |
| P1 | `rec.pos` interpolato nell'HTML senza escaping; `my.c1/c2` usati in attributi HTML/CSS | Schema dei record con posizione intera 1–23; colori ammessi solo esadecimali; controllo anche nei renderer gara/qualifiche; test con payload HTML. Richiedeva la contaminazione dello storage o un altro accesso alla stessa origine. Non è stata identificata una sorgente remota di questi dati. |
| P1 | Nessuna CSP; assenza di configurazione verificabile dell'hosting | CSP nel documento e negli header del nuovo server, script inline/eval e connessioni di rete bloccati; anti-framing via header. Valgono gli header soltanto quando si usa questo server o un hosting equivalente. |
| P1 | Node di sistema 24.14.1 precedente alle patch del 21 ottobre | Avvio produzione bloccato per runtime non ammessi. Verifiche TLS/HSTS eseguite con il Node 24.22.1 incluso nel runtime Codex; l'installazione di sistema non è stata modificata. |
| P2 | `Object.assign` di JSON arbitrario nello stato e nel profilo; valori non finiti e strutture inattese | Lista esplicita di proprietà proprie, copie controllate, limiti per numeri/testi/enum; chiavi di prototipo ignorate; riparazione dei posti del paddock. |
| P2 | Record `null`, oggetti o array malformati potevano bloccare menu/fine gara | Lettura limitata a 16 KiB, schema e dieci righe massime; fallback su errori. Impostazioni limitate a 64 KiB prima del parsing. |
| P2 | Possibile esposizione del repository con un file server generico | Nuovo server con elenco esplicito dei soli asset del gioco caricati in memoria; nessun accesso al filesystem per URL. Rifiuto di traversal, symlink/junction, query, percent-encoding e path ambigui. |

Nessun segreto individuato nei sorgenti esaminati e nella scansione dei formati
comuni coperti dai test. La scansione non certifica l'assenza di tutti i possibili
segreti, né copre ambienti esterni, cronologia Git o configurazioni del provider.
`.gitignore` esclude `.env`, chiavi, certificati privati e log. Un segreto già
committato va comunque revocato; ignorarlo successivamente non lo rimuove.

## Controlli implementati

### Browser e salvataggi

- Parsing limitato per dimensione, normalizzazione e fallback senza bloccare il gioco.
- Escaping di testo e attributi, compreso l'apostrofo; colori limitati al formato `#rrggbb`.
- Nomi, roster, statistiche, controller, durata qualifiche e record hanno limiti espliciti.
- CSP: risorse locali, script solo dalla stessa origine, niente handler inline,
  `eval`, plugin, frame, worker, form o connessioni fetch/WebSocket.
- Gli stili negli attributi restano consentiti per le livree, la torre e le
  mappe SVG esistenti; gli elementi `<style>` inline restano vietati. Non si
  dichiara quindi una CSP priva di ogni uso di `unsafe-inline`.
- Nessuna telemetria remota, nuovo gameplay o modifica alla grafica.

### Server statico opzionale (`server/server.cjs`)

Il doppio clic su `index.html` continua a funzionare. Per giocare via HTTP locale:

```powershell
node server/server.cjs
```

Aprire `http://127.0.0.1:8080`. In sviluppo il bind è obbligatoriamente loopback.
Non occorre installare pacchetti. `PORT` consente di cambiare porta.

Il server applica:

- Solo GET/HEAD; nessuna API che possa scrivere risultati o accedere a file privati.
- Controllo Host esatto contro DNS rebinding; rifiuto di origini e richieste
  Fetch Metadata cross-site; nessuna concessione CORS.
- Nessun corpo accettato: Content-Length non zero, transfer encoding ed Expect
  vengono rifiutati. URL massimo 2.048 caratteri, header totali 8 KiB e 64 campi.
- Token bucket per IP: burst 180 richieste, recupero 6/s, massimo 4.096 IP in memoria.
  Bucket globale: burst 2.000, recupero 200/s. Risposte 429/503 e Retry-After.
  I bucket sono in memoria, indipendenti per processo e si azzerano al riavvio.
- Massimo 256 connessioni e 100 richieste per socket, header timeout 5 s,
  request/inactivity timeout 10 s, keep-alive 3 s, handshake TLS 5 s.
- Upgrade WebSocket, CONNECT, HTTP malformato e richieste abusive chiusi/rifiutati.
- Errori generici, nessun elenco directory, stack o percorso di filesystem inviato.
- CSP, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
  COOP/CORP same-origin e restrizioni per camera, microfono e altre API estranee.
  Il gamepad continua a funzionare: non è disabilitato dalla Permissions Policy.
- Log JSON su stderr per gli eventi di rifiuto, senza URL, query, header, body,
  password o token; IP pseudonimizzati con HMAC e chiave casuale per processo.

**Non considera attendibili X-Forwarded-For o X-Forwarded-Proto.** Dietro proxy
tutti i client del proxy condividono il bucket IP: applicare il limite per IP
reale sul gateway, dimensionare il limite dell'origine e limitarne l'accesso
con firewall. Non abilitare una fiducia indiscriminata negli header inoltrati.

Queste misure limitano abusi applicativi; **non sono una difesa sufficiente contro
DDoS distribuiti, saturazione della banda o esaurimento delle risorse del sistema**.
Servono protezioni di rete a monte. Nessuna mitigazione DDoS esterna è stata attivata.

### HTTPS di produzione

Il server rifiuta la produzione senza TLS e senza un'origine HTTPS esatta.
Non si fida del semplice header `X-Forwarded-Proto: https` per abilitare HTTP.

```powershell
# Esempi di percorso/dominio: sostituire con valori reali.
$env:NODE_ENV = 'production'
$env:PUBLIC_ORIGIN = 'https://gioco.example.it'
$env:TLS_CERT_FILE = 'C:\certificati\fullchain.pem'
$env:TLS_KEY_FILE = 'C:\certificati\private.key'
$env:PORT = '8443'
$env:BIND_HOST = '127.0.0.1'
node server/server.cjs
```

`PUBLIC_ORIGIN` deve corrispondere all'indirizzo pubblico, senza slash finale,
percorsi o credenziali; includere la porta se il browser usa una porta non standard.
Il bind loopback dell'esempio richiede un proxy locale HTTPS verso l'origine
HTTPS sulla porta 8443. Per esposizione diretta usare la porta pubblica prevista
e un bind adeguato, insieme al firewall; non è stato configurato un dominio reale.

TLS minimo 1.2, cipher suite sicure predefinite del runtime aggiornato, HSTS
`max-age=31536000`. Nessun `includeSubDomains`/preload imposto senza conoscere
gli altri servizi del dominio. Certificati, rinnovo, chiavi con ACL minime,
redirect HTTP→HTTPS e TLS dal proxy all'origine sono a cura del deployment.
Il processo non deve girare come amministratore/root. La copia del progetto
pubblicata deve essere di sola lettura per il processo, con credenziali e backup
fuori dalla directory pubblica. Riavviare dopo aver aggiornato asset/certificati.

Il controllo runtime ammette i rami 22 da 22.23.4, 24 da 24.22.1 e 26 da 26.12.1,
secondo l'[avviso ufficiale del 21 ottobre 2026](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
È una soglia verificata alla data dell'audit, **non un servizio automatico di
vulnerability intelligence**: installare gli aggiornamenti successivi e mantenere
la policy aggiornata, inclusi i nuovi rami supportati.

### Rilevamento e notifiche

Eventi: limiti richieste/connessioni, origini/Host non ammessi, risorse negate,
path/HTTP malformati, metodi vietati, upgrade, tunnel e handshake TLS falliti.
Prima occorrenza e conteggi a potenze di due entro una finestra di 60 secondi
limitano il volume dei log. Il conteggio è per tipo di evento nell'intero processo,
non per giocatore. Dalla 64a occorrenza l'evento ha severità `critical`.

Collegare stderr a un collector con rotazione, retention limitata e accesso
riservato. Configurare nel collector l'allarme su `severity=critical`, crash,
assenza di disponibilità e anomalie di traffico; provarne la consegna prima del
rilascio. **Non sono state inviate né configurate notifiche a destinatari reali.**
Il server non può rilevare modifiche alla memoria del browser o login sospetti,
perché non riceve dati di partita e non gestisce account.

## Copertura dei requisiti e rischi residui

| Richiesta | Stato effettivo |
| --- | --- |
| XSS e input ostili | Correzioni e regressioni browser/VM implementate; non equivalgono a prova formale di assenza di XSS. |
| DoS/abuso richieste | Limiti applicativi implementati e verificati localmente; CDN/WAF e protezione volumetrica esterni da configurare. |
| CSRF | Nessuna operazione persistente sul server, nessun cookie autenticato; metodi di scrittura rifiutati. Nessun token CSRF fittizio aggiunto. |
| SQL injection, query parametrizzate e permessi DB | Non applicabili: nessun DB o SQL. Da progettare prima di introdurre un database. |
| Password, Argon2id, sessioni, cookie HttpOnly/Secure/SameSite, reset, account takeover e brute force | Non applicabili: nessun account, password, token o cookie di autenticazione. Nessuna autenticazione dichiarata attiva. |
| Ruoli, 2FA amministratori, revoca, IDOR/BOLA e audit amministrativo | Non applicabili: nessuna amministrazione remota o risorsa di altri utenti. Da implementare nel futuro backend. |
| Tempi, classifiche, punti, mercato, contratti e budget autorevoli | Tempi/classifiche/paddock restano locali e modificabili dal proprietario. Punti/contratti/budget condivisi non presenti. Per competizione serve simulazione verificata dal server e autorizzazione delle transazioni. |
| Backup e cifratura DB | Nessun DB sul server da salvare. I salvataggi browser non sono cifrati né hanno backup automatico: cancellare il profilo/storage li elimina. Non inserire segreti nel localStorage. |
| Dipendenze | Zero dipendenze npm di produzione; `npm audit --omit=dev` senza vulnerabilità segnalate. Browser, OS, Node, proxy e tooling vanno mantenuti aggiornati separatamente. |
| HTTPS/header | Implementati nel server incluso e verificati localmente; dominio, certificato attendibile, infrastruttura e policy di un diverso hosting non sono stati verificati. |

Per una futura modalità online: progettare identità e permessi sul server;
password Argon2id o provider di identità mantenuto; MFA obbligatoria per admin;
sessioni revocabili e cookie sicuri; protezione CSRF/reset monouso a scadenza;
query parametrizzate e DB con privilegi minimi; transazioni e vincoli per
budget/contratti/punti; autenticità della simulazione gestita dal server.
Non accettare tempi o esiti arbitrari inviati dal client. Un endpoint che
controlla soltanto se un tempo rientra in un intervallo non basta.

Prima di memorizzare dati di altri giocatori servono backup automatici cifrati
fuori dall'origine, retention e accessi minimi, e una prova documentata di
restore su un ambiente isolato. Non è stata implementata una procedura DB per
un database inesistente. Per la versione statica conservare release versionate,
fare rollback a una release conosciuta e verificare home, asset e header;
non usare un generico file server che esponga tutto il repository.

## Ripetere le verifiche

Esito locale dell'audit: **17 test di sicurezza e 191 test di regressione
superati, nessun errore o test saltato; cinque suite browser superate**.
Le regressioni includono qualifiche e gare su tutti i 24 circuiti, con 23 auto.
I 37 test di qualifiche/gomme/risultati sono stati anche rieseguiti dopo l'ultima
correzione dei renderer. Risultati e versioni del runtime sono registrati in
[validation-security.json](validation-security.json). Queste prove non attestano
un hosting pubblico che non è stato configurato o sottoposto a test.

```text
npm run test:security
npm test
npm audit --omit=dev
node tests/browser-security.cjs
node tests/browser.cjs
node tests/browser-controls.cjs
node tests/browser-tyres.cjs
node tests/browser-circuits.cjs
```

Le suite TLS generano un certificato temporaneo di un giorno con OpenSSL e lo
rimuovono al termine; richiedono `openssl` nel PATH o `F1_OPENSSL` con percorso
all'eseguibile (su Windows il default è quello incluso in Git). Nessuna chiave
privata di test viene committata. Per verificare il ramo produzione/HSTS serve
un runtime ammesso; con un runtime vecchio il test segnala esplicitamente il limite.
Playwright e un browser Chromium/Edge installato servono soltanto per le suite
browser, non per giocare o pubblicare. Usare il runtime/tooling disponibile
tramite NODE_PATH e `F1_BROWSER_CHANNEL` se necessario. I profili browser sono
isolati da quelli personali. Le simulazioni complete dei 24 circuiti sono lunghe.

Copertura: XSS persistente da nomi/colori/posizioni, strutture JSON malformate,
limiti storage e valori non finiti, prototype pollution, salvataggi legittimi,
CSP realmente applicata dal browser, file locali, file riservati e traversal,
Host/origini/metodi/body/header, rate limiting e spoofing X-Forwarded-For,
log senza segreti, limiti di memoria e timeout, HTTPS/HSTS/TLS obsoleto, oltre
alle regressioni di qualifiche, comandi, gomme, box e circuiti esistenti.

Riferimenti tecnici: [API HTTP di Node](https://nodejs.org/api/http.html),
[specifica CSP](https://www.w3.org/TR/CSP3/). La CSP via meta non fornisce
anti-framing: `frame-ancestors` viene applicato tramite header HTTP del server.
