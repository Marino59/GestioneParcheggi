# Gestione Parcheggi

Applicazione web per la gestione dei posti auto e container/box di una struttura di parcheggio, sviluppata in React, Vite e Firebase.

## Caratteristiche Principali (Versione 2)
La **Versione 2 (V2)** è l'applicazione principale attualmente attiva:
* **Multi-assegnazione di posti**: Un singolo cliente può essere associato a più posti auto o container, ognuno con la propria quota mensile personalizzata.
* **Pagamento Unico**: L'applicazione calcola automaticamente la somma delle quote e gestisce le scadenze e le registrazioni con un unico flusso di pagamento.
* **Condivisione Posti**: Più clienti possono condividere lo stesso posto o box. Sulla Dashboard, i posti condivisi sono colorati in viola e cliccandoci sopra è possibile scegliere quale scheda anagrafica aprire.
* **Storico Pagamenti e Storno**: Tracciamento di tutte le transazioni con possibilità di stornare qualsiasi pagamento errato (inclusi i record sintetici importati da V1) ripristinando in automatico lo stato precedente del cliente.
* **Modale scrollabile**: Interfaccia ottimizzata per evitare tagli di visualizzazione su schermi di qualsiasi dimensione.

## Sviluppo Locale
1. Entra nella cartella della versione 2:
   ```bash
   cd v2
   ```
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```

## Deploy su Firebase Hosting
1. Compila la build di produzione della V2:
   ```bash
   cd v2
   npm run build
   ```
2. Dalla cartella principale del progetto, effettua il deploy:
   ```bash
   cd ..
   npx firebase deploy --only hosting
   ```
   *(La configurazione pubblica legge la directory `v2/dist` tramite il file `firebase.json`)*
