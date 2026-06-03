const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const OWNER_UID = "TTUeuWS40vPxFgVPlqgFF8Vie0S2";

try {
    const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (error) {
    console.error('Errore:', error);
    process.exit(1);
}

const db = admin.firestore();

async function run() {
    const snap = await db.collection(`clienti_v2/${OWNER_UID}/records`).get();
    let countWithUmp = 0;
    let countEmptyUmp = 0;
    let countWithPayments = 0;

    snap.forEach(doc => {
        const d = doc.data();
        const ump = d['Ultimo mese pagato'];
        if (ump && ump.includes('/')) {
            countWithUmp++;
        } else {
            countEmptyUmp++;
        }
        if (d.pagamenti && d.pagamenti.length > 0) {
            countWithPayments++;
        }
    });

    console.log(`=== STATISTICHE CLIENTI V2 ===`);
    console.log(`Totale clienti: ${snap.size}`);
    console.log(`Con 'Ultimo mese pagato' valido: ${countWithUmp}`);
    console.log(`Con 'Ultimo mese pagato' vuoto/non valido: ${countEmptyUmp}`);
    console.log(`Con array 'pagamenti' popolato: ${countWithPayments}`);
}
run().catch(console.error);
