# Orario Docente - v3 GitHub-ready

Versione statica per GitHub Pages.

## Funzioni
- Primo avvio guidato: nome docente e scelta solo mattina / anche pomeriggio.
- Orario salvato localmente sul dispositivo.
- Import/export JSON con nome docente e configurazione.
- Editor orario semplice: `Classe - Materia (Aula)`.
- Alert 5 minuti prima dell'inizio della lezione.
- Reset completo.

## Pubblicazione
Caricare nella root del repository:
- index.html
- app.js
- schedule.js
- styles.css
- manifest.json
- sw.js

Poi attivare GitHub Pages da Settings > Pages.

## Formato JSON esportato
```json
{
  "docente": "Mario Rossi",
  "config": {
    "pomeridiano": false,
    "hours": [8,9,10,11,12,13,14]
  },
  "orario": {
    "Lunedì": {
      "8": "1A - Informatica (Lab)"
    }
  }
}
```
