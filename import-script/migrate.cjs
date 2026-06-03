const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const OWNER_UID = "TTUeuWS40vPxFgVPlqgFF8Vie0S2";

try {
    const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error(`ERRORE: Impossibile caricare il file della chiave di servizio da ${SERVICE_ACCOUNT_KEY_PATH}:`, error);
    process.exit(1);
}

const db = admin.firestore();

async function migrate() {
    console.log(`Avvio migrazione dei dati da V1 a V2 per l'utente: ${OWNER_UID}...`);
    const srcPath = `clienti/${OWNER_UID}/records`;
    const destPath = `clienti_v2/${OWNER_UID}/records`;

    const srcSnap = await db.collection(srcPath).get();
    console.log(`Trovati ${srcSnap.size} clienti nella collezione V1.`);

    if (srcSnap.size === 0) {
        console.log("Nessun cliente da migrare.");
        return;
    }

    const batch = db.batch();
    let count = 0;

    srcSnap.forEach(docSnap => {
        const oldData = docSnap.data();
        const docId = docSnap.id;

        // Estrae e pulisce i posti auto
        const postoAutoStr = oldData['Posto auto'] || '';
        const spots = postoAutoStr.split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Estrae l'importo mensile
        const importoMensileStr = oldData['Importo mensile'] || '0';
        const importoTotale = parseFloat(importoMensileStr) || 0;

        const importiPosti = {};
        if (spots.length > 0) {
            // Assegna per default l'intero importo al primo posto trovato, 0 agli altri
            importiPosti[spots[0]] = importoTotale.toString();
            for (let i = 1; i < spots.length; i++) {
                importiPosti[spots[i]] = "0";
            }
        }

        const newData = {
            Nome: oldData.Nome || '',
            Cognome: oldData.Cognome || '',
            Codice: oldData.Codice || '',
            Status: oldData.Status || 'A',
            Telefono: oldData.Telefono || '',
            Note: oldData.Note || '',
            'Modello auto': oldData['Modello auto'] || '',
            Targa: oldData.Targa || '',
            'Inizio contratto': oldData['Inizio contratto'] || '',
            'Fine contratto': oldData['Fine contratto'] || '',
            'Ultimo mese pagato': oldData['Ultimo mese pagato'] || '',
            'Data ultimo pagamento': oldData['Data ultimo pagamento'] || '',
            pagamenti: oldData.pagamenti || [],
            postiAssegnati: spots,
            importiPosti: importiPosti,
            importoTotale: importoTotale,
        };

        const destRef = db.collection(destPath).doc(docId);
        batch.set(destRef, newData);
        count++;
    });

    await batch.commit();
    console.log(`\nMIGRAZIONE COMPLETATA CON SUCCESSO!`);
    console.log(`Copiati ${count} clienti in 'clienti_v2'.`);
    console.log(`Nota: Gli importi mensili sono stati assegnati interamente al primo posto auto/box trovato.`);
    console.log(`Puoi modificarli individualmente tramite l'interfaccia Anagrafica in locale.`);
}

migrate().catch(err => {
    console.error("Errore durante la migrazione:", err);
});
