# Gestione Parcheggi - Guida di Progetto (V2 Attiva)

Questo file contiene i comandi di base e i flussi di lavoro per gli sviluppatori.

## Panoramica del Progetto
Applicazione web per la gestione dei parcheggi costruita con React, Vite e Firebase.
Attualmente, la **Versione 2 (V2)** (presente nella cartella `/v2`) è impostata come versione **principale** e attiva per il deploy. La V2 supporta la multi-assegnazione di posti auto/box per cliente, la condivisione evidenziata in viola sulla Dashboard con menu a click, lo storico dei pagamenti e lo storno (anche dei dati virtuali migrati).

## Sviluppo in Locale
Tutte le modifiche e lo sviluppo attivo devono avvenire nella cartella `/v2`.
- `cd v2 && npm run dev`: Avvia il server di sviluppo per la V2 (porta 5173).
- `cd v2 && npm run build`: Compila l'applicazione V2 per la produzione (output in `v2/dist/`).

## Pubblicazione (Deploy su Firebase Hosting)
Il deploy pubblicherà la V2.
1. Compila la V2:
   ```bash
   cd v2
   npm run build
   ```
2. Ritorna alla radice del progetto ed esegui il deploy tramite Firebase CLI (configurato per leggere da `v2/dist` in `firebase.json`):
   ```bash
   cd ..
   npx firebase deploy --only hosting
   ```

## Flusso di lavoro Git (Backup su GitHub)
Dopo aver completato qualsiasi modifica, ricordarsi di salvare lo stato su GitHub:
1. Verifica che la V2 compili correttamente (`npm run build` in `/v2`).
2. Aggiungi i file modificati: `git add .`
3. Effettua il commit usando messaggi convenzionali (es. `feat: ...`, `fix: ...`, `docs: ...`).
4. Invia al server: `git push origin main`.
