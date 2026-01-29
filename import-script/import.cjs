// Questo è uno script Node.js aggiornato per la struttura collaborativa.
// Versione corretta per file CSV con separatore a virgola.

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline');

// NOTA: I nomi delle etichette usati come chiavi nel database.
const VOCI_ETICHETTE = [
    "Codice", "Nome", "Cognome", "Status", "Telefono", "Importo mensile", "Posto auto",
    "Modello auto", "Targa", "Inizio contratto", "Campo inutile", "Fine contratto",
    "Ultimo mese pagato", "Data ultimo pagamento", "Note"
];

// --- Configurazione dei file ---
const SERVICE_ACCOUNT_KEY_PATH = './serviceAccountKey.json';
const CSV_FILE_PATH = './clienti.csv'; // Assicurati che il nome del file sia corretto

// Carica le credenziali di Firebase Admin
try {
    const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error(`\n!!! ERRORE: Impossibile trovare o leggere il file della chiave di servizio '${SERVICE_ACCOUNT_KEY_PATH}'.`);
    console.error("Assicurati di averlo scaricato da Firebase, rinominato e messo nella stessa cartella dello script.");
    process.exit(1); // Esce dallo script
}

const db = admin.firestore();

// Funzione per fare domande nel terminale
const askQuestion = (query) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

// Funzione principale per eseguire l'importazione
async function importCsv() {
    try {
        console.log("--- Script di Importazione CSV in Firestore (v3.1 - Correzione Virgola) ---");

        // Chiede l'UID del proprietario
        const ownerId = await askQuestion("\nIncolla qui l'UID dell'utente PROPRIETARIO dei dati: ");
        
        if (!ownerId || ownerId.trim().length < 10) {
            console.error("\nERRORE: OWNER UID non valido. Importazione annullata.");
            return;
        }
        
        const collectionPath = `clienti/${ownerId.trim()}/records`;
        console.log(`\nOK. I dati verranno importati nel percorso: '${collectionPath}'`);
        console.log(`Leggendo il file: ${CSV_FILE_PATH}...\n`);

        const records = [];
        
        if (!fs.existsSync(CSV_FILE_PATH)) {
             console.error(`\nERRORE: Il file '${CSV_FILE_PATH}' non è stato trovato nella cartella.`);
             return;
        }

        fs.createReadStream(CSV_FILE_PATH)
          // ==========================================================
          // --- CORREZIONE APPLICATA QUI ---
          // Il separatore è stato cambiato in virgola ','
          // ==========================================================
          .pipe(csv({ headers: VOCI_ETICHETTE, separator: ',', skipLines: 1 }))
          .on('data', (row) => {
              const recordObject = {};
              // Pulisce i dati e si assicura che tutti i valori siano stringhe
              for (const key in row) {
                  recordObject[key] = row[key] || ''; 
              }
              records.push(recordObject);
          })
          .on('end', async () => {
              if (records.length === 0) {
                  console.log("Nessun record trovato nel file CSV. Controlla che il file non sia vuoto.");
                  return;
              }
              console.log(`Lettura del file CSV completata. Trovati ${records.length} record.`);
              console.log("Inizio l'importazione in Firestore. Attendere...");

              const collectionRef = db.collection(collectionPath);
              let batch = db.batch();
              let operations = 0;

              for (const record of records) {
                  const docRef = collectionRef.doc(); 
                  batch.set(docRef, record);
                  operations++;

                  // Firebase permette un massimo di 500 operazioni per batch
                  if (operations >= 490) {
                      await batch.commit();
                      console.log(`- Inviate ${operations} righe...`);
                      batch = db.batch();
                      operations = 0;
                  }
              }

              if (operations > 0) {
                  await batch.commit();
              }

              console.log(`\n--- IMPORTAZIONE COMPLETATA ---`);
              console.log(`Importati con successo ${records.length} clienti per l'utente ${ownerId}.`);
          });
    } catch (error) {
        console.error("\nSi è verificato un errore durante l'importazione:", error);
    }
}

// Avvia la funzione principale
importCsv();