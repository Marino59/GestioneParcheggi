// Script di diagnostica: mostra importoTotale, postiAssegnati, importiPosti
// e partite aperte calcolate per ogni cliente della V2
const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const OWNER_UID = "TTUeuWS40vPxFgVPlqgFF8Vie0S2";

try {
    const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (error) {
    console.error('Errore caricamento chiave:', error);
    process.exit(1);
}

const db = admin.firestore();

function calcolaMesiArretrati(ultimoPagato) {
    if (!ultimoPagato || !ultimoPagato.includes('/')) return 0;
    const [mesePagato, annoPagato] = ultimoPagato.split('/').map(Number);
    const oggi = new Date();
    const diff = (oggi.getFullYear() - annoPagato) * 12 + (oggi.getMonth() + 1 - mesePagato);
    return diff > 0 ? diff : 0;
}

async function checkCliente(nomeRicerca) {
    const snap = await db.collection(`clienti_v2/${OWNER_UID}/records`).get();
    
    const results = [];
    snap.forEach(doc => {
        const d = doc.data();
        const nomeCompleto = `${d.Nome || ''} ${d.Cognome || ''}`.toLowerCase();
        if (!nomeRicerca || nomeCompleto.includes(nomeRicerca.toLowerCase())) {
            const mesi = calcolaMesiArretrati(d['Ultimo mese pagato']);
            const importo = parseFloat(d.importoTotale) || 0;
            const partiteAperte = importo * mesi;
            
            // Ricalcola importoTotale dai prezzi dei posti
            const importiPosti = d.importiPosti || {};
            const selectedSpots = d.postiAssegnati || [];
            const importoRicalcolato = selectedSpots.reduce((sum, p) => sum + (parseFloat(importiPosti[p]) || 0), 0);

            results.push({
                nome: `${d.Nome} ${d.Cognome}`,
                codice: d.Codice,
                postiAssegnati: selectedSpots.join(', '),
                importiPosti: JSON.stringify(importiPosti),
                importoTotale_db: importo,
                importoRicalcolato_dai_posti: importoRicalcolato,
                corrispondono: importo === importoRicalcolato,
                ultimoMesePagato: d['Ultimo mese pagato'] || '(nessuno)',
                mesiArretrati: mesi,
                partiteAperte_calcolate: partiteAperte
            });
        }
    });

    if (results.length === 0) {
        console.log('Nessun cliente trovato con quel nome.');
        return;
    }

    results.forEach(r => {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Cliente: ${r.nome} (Codice: ${r.codice})`);
        console.log(`Posti Assegnati:  ${r.postiAssegnati}`);
        console.log(`Importi per posto: ${r.importiPosti}`);
        console.log(`importoTotale nel DB:    €${r.importoTotale_db.toFixed(2)}`);
        console.log(`Ricalcolato dai posti:   €${r.importoRicalcolato_dai_posti.toFixed(2)}`);
        console.log(`I valori corrispondono?  ${r.corrispondono ? '✅ SI' : '❌ NO — il DB ha un valore vecchio!'}`);
        console.log(`Ultimo mese pagato:      ${r.ultimoMesePagato}`);
        console.log(`Mesi arretrati (giugno): ${r.mesiArretrati}`);
        console.log(`Partite aperte calcolate:€${r.partiteAperte_calcolate.toFixed(2)}`);
    });
}

// Cerca "spinoff" per diagnosticare quel cliente specifico
checkCliente('spinoff').catch(console.error);
