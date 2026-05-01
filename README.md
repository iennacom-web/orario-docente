# Orario Docente App

App web statica per gestire l'orario scolastico dei docenti, pubblicabile con GitHub Pages.

## Funzioni
- Primo avvio guidato: nome docente e scelta solo mattina / anche pomeriggio.
- Orario salvato localmente sul dispositivo.
- Backup/ripristino nascosti in modalità avanzata, senza riferimenti al JSON nell’interfaccia normale.
- Editor orario semplice: `Classe - Materia (Aula)`.
- Alert 5 minuti prima dell'inizio della lezione.
- Reset completo disponibile nella modalità avanzata.
- Interfaccia mobile-first con accorgimenti di accessibilità.

## Accessibilità
La versione include:
- link “salta al contenuto principale”;
- stati ARIA sui filtri;
- focus visibile per tastiera;
- pulsanti grandi per uso touch;
- contrasto migliorato;
- supporto a preferenze di sistema per contrasto elevato e riduzione movimento.

## Modalità avanzata
La modalità avanzata si apre con 5 tap rapidi sul brand IenMas nel footer oppure con pressione prolungata.
Serve per backup, ripristino e reset. Il codice è verificato tramite hash SHA-256 nel codice client: è una protezione UX, non autenticazione forte.

## Pubblicazione
Caricare nella root del repository:
- `index.html`
- `app.js`
- `schedule.js`
- `styles.css`
- `manifest.json`
- `sw.js`
- `LICENSE`
- `README.md`

Poi attivare GitHub Pages da `Settings > Pages`.

## Licenza
Distribuito con licenza MIT.
