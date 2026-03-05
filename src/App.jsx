import React, { useState, useEffect, useMemo } from 'react';
// Importa le funzioni di Firebase
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, setDoc, addDoc, updateDoc, query } from 'firebase/firestore';

// --- CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDgciep9O7bg_Yp_DEhUtMlAluao9ozQIM",
    authDomain: "parcheggi-c367b.firebaseapp.com",
    projectId: "parcheggi-c367b",
    storageBucket: "parcheggi-c367b.appspot.com",
    messagingSenderId: "386670673647",
    appId: "1:386670673647:web:c941bd6be8b34cd785e51a"
};


// ====================================================================
// --- CONFIGURAZIONE DI CONDIVISIONE (MODIFICA QUI) ---
// ====================================================================

// 1. Incolla qui l'UID dell'utente "proprietario" dei dati (il tuo).
const OWNER_UID = "TTUeuWS40vPxFgVPlqgFF8Vie0S2";

// 2. Incolla nella lista qui sotto TUTTI gli UID che possono accedere.
//    Devi includere sia il tuo UID che quello di tuo figlio.
const AUTHORIZED_UIDS = [
    "TTUeuWS40vPxFgVPlqgFF8Vie0S2",
    "IMPupY8tg3XiiatH8uCZtgYqQjI3"
];

// ====================================================================


// Inizializzazione dei servizi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// --- COSTANTI E FUNZIONI DI UTILITÀ ---

const VOCI_ETICHETTE = [
    "Codice", "Nome", "Cognome", "Status", "Telefono", "Importo mensile", "Posto auto",
    "Modello auto", "Targa", "Inizio contratto", "Campo inutile", "Fine contratto",
    "Ultimo mese pagato", "Data ultimo pagamento", "Note"
];

const NOMI_MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

const formattaDataMeseAnno = (data) => {
    if (!data || !data.includes('/')) return "-";
    try {
        const [mese, anno] = data.split('/');
        const nomeMese = NOMI_MESI[parseInt(mese, 10) - 1];
        return `${nomeMese} ${anno}`;
    } catch (e) {
        return "-";
    }
};

const parseDataOrdinabile = (dataString) => {
    if (!dataString || !dataString.includes('/')) return 0;
    try {
        const [mese, anno] = dataString.split('/');
        return parseInt(anno, 10) * 100 + parseInt(mese, 10);
    } catch {
        return 0;
    }
}

const calcolaPartiteAperte = (cliente) => {
    const ultimoPagamento = cliente['Ultimo mese pagato'];
    const importoMensile = parseFloat(cliente['Importo mensile']);

    if (!ultimoPagamento || isNaN(importoMensile) || !ultimoPagamento.includes('/')) return 0;

    try {
        const [mesePagato, annoPagato] = ultimoPagamento.split('/').map(Number);
        const oggi = new Date();
        const annoCorrente = oggi.getFullYear();
        const meseCorrente = oggi.getMonth() + 1;
        const mesiDifferenza = (annoCorrente - annoPagato) * 12 + (meseCorrente - mesePagato);
        return mesiDifferenza > 0 ? mesiDifferenza * importoMensile : 0;
    } catch (e) {
        console.error("Errore calcolo partite aperte:", e);
        return 0;
    }
};

// --- COMPONENTI UI (ICONE, ETC) ---

// --- FUNZIONE EXPORT CSV ---
const downloadCSV = (data, filename = 'export.csv') => {
    if (!data || !data.length) return;

    // Usa VOCI_ETICHETTE per l'ordine delle colonne (o le chiavi del primo oggetto)
    const headers = VOCI_ETICHETTE;

    const csvContent = [
        headers.join(','), // Intestazione
        ...data.map(row => headers.map(fieldName => {
            // Gestione dei valori: escape delle virgole e delle virgolette
            let value = row[fieldName] || '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

const SortIcon = ({ direction }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {direction === 'asc' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />}
        {direction === 'desc' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />}
    </svg>
);

const LoadingSpinner = () => (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex justify-center items-center z-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-blue-600"></div>
    </div>
);

const Notification = ({ message, type, onClose }) => {
    if (!message) return null;
    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white z-50 flex items-center gap-3";
    const typeClasses = { success: "bg-green-500", error: "bg-red-500", warning: "bg-yellow-500" };

    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClose]);

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">&times;</button>
        </div>
    );
};

// --- PAGINE E COMPONENTI ---

// ====================================================================
// --- MODIFICA #1: Pagina di login semplificata ---
// ====================================================================
const LoginPage = ({ setNotification }) => {
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Errore con l'accesso Google:", error);
            setNotification({ message: `Errore Google: ${error.message}`, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Gestione Parcheggi</h1>
                    <p className="text-slate-500 mt-2">Accedi per continuare</p>
                </header>
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <button onClick={handleGoogleSignIn} disabled={loading}
                        className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50">
                        <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59L2.56 13.22C1.22 16.25 0 20 0 24s1.22 7.75 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                        {loading ? 'Accesso in corso...' : 'Accedi con Google'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const ClientModal = ({ isOpen, onClose, clientToEdit, setNotification }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (isOpen) {
            setFormData(clientToEdit || {});
        }
    }, [clientToEdit, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData["Nome"] || !formData["Cognome"]) {
            setNotification({ message: "Nome e Cognome sono obbligatori.", type: "error" });
            return;
        }

        try {
            const collectionPath = `clienti/${OWNER_UID}/records`;
            const dataToSave = { ...formData };
            delete dataToSave.id;

            if (formData.id) {
                const docRef = doc(db, collectionPath, formData.id);
                await setDoc(docRef, dataToSave, { merge: true });
                setNotification({ message: "Cliente aggiornato con successo!", type: "success" });
            } else {
                await addDoc(collection(db, collectionPath), dataToSave);
                setNotification({ message: "Cliente creato con successo!", type: "success" });
            }
            onClose();
        } catch (error) {
            console.error("Errore nel salvataggio del cliente:", error);
            setNotification({ message: `Errore nel salvataggio: ${error.message}`, type: "error" });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40 p-4 animate-fade-in-fast">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
                <form onSubmit={handleSave}>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{formData.id ? "Modifica Cliente" : "Nuovo Cliente"}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {VOCI_ETICHETTE.map((label) => {
                                const isCodiceReadonly = label === "Codice" && formData.id;
                                if (label === "Status") {
                                    return (
                                        <div key={label}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                            <select name={label} value={formData[label] || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                                                <option value="">(Nessuno)</option>
                                                <option value="A">Attivo (A)</option>
                                                <option value="B">Sospeso (B)</option>
                                                <option value="C">Cancellato (C)</option>
                                            </select>
                                        </div>
                                    );
                                }
                                if (label === "Note") {
                                    return (
                                        <div key={label} className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                            <textarea name={label} value={formData[label] || ''} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"></textarea>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={label}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                        <input
                                            type="text" name={label} value={formData[label] || ''}
                                            onChange={handleChange} readOnly={isCodiceReadonly}
                                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${isCodiceReadonly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold shadow-sm">Annulla</button>
                        <button type="submit" className="px-4 py-2 rounded-md border border-transparent bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-sm">Salva</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// ====================================================================
// --- MODIFICA #2 e #3: Logica del modale di pagamento aggiornata ---
// ====================================================================
const PaymentModal = ({ isOpen, onClose, client, setNotification }) => {
    const [paymentDate, setPaymentDate] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });

    useEffect(() => {
        if (isOpen && client) {
            if (client['Ultimo mese pagato'] && client['Ultimo mese pagato'].includes('/')) {
                try {
                    const [mese, anno] = client['Ultimo mese pagato'].split('/');
                    // MODIFICA #2: Imposta la data all'ULTIMO mese pagato, non al successivo.
                    // Il mese dal DB è 1-12, lo stato 'month' è 0-11, quindi facciamo `mese - 1`.
                    setPaymentDate({ month: parseInt(mese, 10) - 1, year: parseInt(anno, 10) });
                } catch {
                    // Fallback se la data non è valida
                    const now = new Date();
                    setPaymentDate({ month: now.getMonth(), year: now.getFullYear() });
                }
            } else {
                // Se non c'è mai stato un pagamento, imposta il mese corrente
                const now = new Date();
                setPaymentDate({ month: now.getMonth(), year: now.getFullYear() });
            }
        }
    }, [client, isOpen]);

    // MODIFICA #3: Calcolo dinamico dell'importo da pagare
    const importoDaPagare = useMemo(() => {
        if (!isOpen || !client) return 0;

        const importoMensile = parseFloat(client['Importo mensile']);
        if (isNaN(importoMensile) || importoMensile <= 0) {
            return 0;
        }

        // Se non c'è un ultimo pagamento registrato, l'importo è semplicemente quello di un mese
        if (!client['Ultimo mese pagato'] || !client['Ultimo mese pagato'].includes('/')) {
            return importoMensile;
        }

        try {
            const [mesePagato, annoPagato] = client['Ultimo mese pagato'].split('/').map(Number);
            const dataUltimoPagamento = new Date(annoPagato, mesePagato - 1); // mese - 1 perché Date è 0-indexed

            const dataSelezionata = new Date(paymentDate.year, paymentDate.month);

            // Se la data selezionata è uguale o precedente all'ultimo pagamento, l'importo è zero
            if (dataSelezionata <= dataUltimoPagamento) {
                return 0;
            }

            // Calcola la differenza in mesi tra la data selezionata e l'ultimo pagamento
            const mesiDifferenza = (paymentDate.year - annoPagato) * 12 + (paymentDate.month - (mesePagato - 1));

            return mesiDifferenza * importoMensile;
        } catch (e) {
            console.error("Errore nel calcolo dell'importo da pagare:", e);
            return 0; // In caso di errore, ritorna 0
        }
    }, [client, paymentDate, isOpen]);


    if (!isOpen || !client) return null;

    const changeMonth = (amount) => {
        let newDate = new Date(paymentDate.year, paymentDate.month + amount, 1);
        setPaymentDate({ month: newDate.getMonth(), year: newDate.getFullYear() });
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setNotification({ message: "Impossibile aprire la finestra di stampa. Controlla i popup.", type: "error" });
            return;
        }

        const dataCorrente = new Date().toLocaleDateString('it-IT');
        const mesePagato = `${NOMI_MESI[paymentDate.month]} ${paymentDate.year}`;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ricevuta di Pagamento</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                    .subtitle { font-size: 16px; color: #666; }
                    .content { margin-bottom: 40px; }
                    .row { margin-bottom: 15px; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                    .label { font-weight: bold; color: #444; }
                    .value { font-size: 18px; }
                    .total-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px; border: 1px dashed #ccc; }
                    .total-label { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
                    .total-value { font-size: 32px; font-weight: bold; margin-top: 5px; }
                    .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #888; }
                    .signature { margin-top: 50px; display: flex; justify-content: space-between; }
                    .sign-box { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 10px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">RICEVUTA DI PAGAMENTO</div>
                    <div class="subtitle">Gestione Parcheggi</div>
                    <div style="margin-top: 10px; font-size: 14px;">Data: ${dataCorrente}</div>
                </div>

                <div class="content">
                    <div class="row">
                        <span class="label">Cliente:</span>
                        <span class="value">${client.Nome} ${client.Cognome}</span>
                    </div>
                    <div class="row">
                        <span class="label">Codice Cliente:</span>
                        <span class="value">${client.Codice || '-'}</span>
                    </div>
                    ${client['Posto auto'] ? `
                    <div class="row">
                        <span class="label">Posto Auto:</span>
                        <span class="value">${client['Posto auto']}</span>
                    </div>
                    ` : ''}
                    <div class="row" style="margin-top: 30px;">
                        <span class="label">Mese Riferimento:</span>
                        <span class="value"><strong>${mesePagato}</strong></span>
                    </div>
                </div>

                <div class="total-box">
                    <div class="total-label">Importo Pagato</div>
                    <div class="total-value">€${importoDaPagare.toFixed(2)}</div>
                </div>

                <div class="signature">
                    <div class="sign-box">Firma di chi riceve</div>
                    <div class="sign-box">Firma di chi paga</div>
                </div>

                <div class="footer">
                    <p>Questa ricevuta attesta l'avvenuto pagamento per il periodo indicato.</p>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleRegister = async () => {
        // Non si registra il pagamento se l'importo è 0 (cioè se non si è avanzato il mese)
        if (importoDaPagare <= 0) {
            setNotification({ message: "Seleziona un mese successivo all'ultimo pagato.", type: 'warning' });
            return;
        }

        const oggi = new Date();
        const updatedData = {
            'Ultimo mese pagato': `${(paymentDate.month + 1).toString().padStart(2, '0')}/${paymentDate.year}`,
            'Data ultimo pagamento': `${oggi.getDate().toString().padStart(2, '0')}/${(oggi.getMonth() + 1).toString().padStart(2, '0')}/${oggi.getFullYear()}`
        };

        try {
            const docRef = doc(db, `clienti/${OWNER_UID}/records`, client.id);
            await updateDoc(docRef, updatedData);
            setNotification({ message: "Pagamento registrato con successo!", type: 'success' });
            onClose();
        } catch (error) {
            console.error("Errore registrazione pagamento:", error);
            setNotification({ message: `Errore: ${error.message}`, type: 'error' });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40 p-4 animate-fade-in-fast">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-2 text-gray-800">Registra Pagamento</h2>
                    <p className="text-gray-600 mb-4">{client.Nome} {client.Cognome}</p>
                    <div className="bg-gray-100 p-3 rounded-lg mb-4 text-center">
                        <p className="text-sm text-gray-500">Ultimo mese pagato</p>
                        <p className="font-bold text-lg text-gray-800">{formattaDataMeseAnno(client['Ultimo mese pagato'])}</p>
                    </div>
                    <p className="text-center text-sm font-medium text-gray-500 mt-6 mb-2">Seleziona il mese da pagare</p>
                    <div className="flex items-center justify-center space-x-4 my-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">&larr;</button>
                        <span className="text-xl font-semibold text-gray-800 w-48 text-center">{`${NOMI_MESI[paymentDate.month]} ${paymentDate.year}`}</span>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">&rarr;</button>
                    </div>
                    {/* NUOVO BLOCCO PER L'IMPORTO DINAMICO */}
                    <div className="mt-6 p-4 bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg text-center">
                        <p className="text-sm font-medium text-blue-700">Importo Totale per il Periodo</p>
                        <p className="text-4xl font-bold text-blue-800 mt-1">
                            €{importoDaPagare.toFixed(2)}
                        </p>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-between gap-3">
                    <button type="button" onClick={handlePrint} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold shadow-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Stampa Ricevuta
                    </button>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold shadow-sm">Annulla</button>
                        <button onClick={handleRegister} className="px-4 py-2 rounded-md border border-transparent bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-sm">Registra Pagamento</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ALL_CAR_SPOTS = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13', 'A14', 'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12', 'B13', 'B14', 'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'U01', 'U02', 'S01'];

// ====================================================================
// --- ECCO LA MODIFICA ---
// ====================================================================
const ALL_CONTAINERS = ['K01', 'K02', 'K03', 'K04', 'K05', 'K06', 'K07', 'K08', 'K09', 'K10', 'K11', 'K12', 'K13', 'K14', 'K15', 'K16', 'K17', 'K18', 'K19', 'K20', 'K21', 'K22', 'K23', 'K24', 'K25', 'K26', 'K27', 'K28', 'K29', 'K30', 'K31', 'K32', 'K33', 'K34', 'K35', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12'];

const DashboardPage = ({ user, setCurrentPage, setNotification, clienti }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    const stats = useMemo(() => {
        const clientiAttivi = clienti.filter(c => ['', 'A', 'B'].includes(c.Status || ''));
        const clientiInRitardo = clientiAttivi.filter(c => c.partite_aperte > 0);

        const postiOccupati = new Set(clientiAttivi.map(c => c['Posto auto']).filter(Boolean));

        const postiAutoOccupati = Array.from(postiOccupati).filter(p => ALL_CAR_SPOTS.includes(p));
        const containerOccupati = Array.from(postiOccupati).filter(p => ALL_CONTAINERS.includes(p));

        return {
            clientiInRitardo: clientiInRitardo.length,
            postiAutoLiberi: ALL_CAR_SPOTS.length - postiAutoOccupati.length,
            containerLiberi: ALL_CONTAINERS.length - containerOccupati.length,
            clientiTotali: clientiAttivi.length,
            postiOccupati: postiOccupati,
        };
    }, [clienti]);

    const handleSpotClick = (postoId) => {
        if (!stats.postiOccupati.has(postoId)) return;

        const occupier = clienti.find(c => c['Posto auto'] === postoId && ['', 'A', 'B'].includes(c.Status || ''));
        if (occupier) {
            setSelectedClient(occupier);
            setIsModalOpen(true);
        }
    };

    const StatCard = ({ title, value, colorClass, onClick }) => {
        const isClickable = !!onClick;
        const baseClasses = "p-6 rounded-lg shadow-lg text-white";
        const interactiveClasses = isClickable ? "cursor-pointer transform hover:-translate-y-1 transition-transform duration-200" : "";

        return (
            <div className={`${baseClasses} ${colorClass} ${interactiveClasses}`} onClick={onClick}>
                <p className="text-lg font-semibold">{title}</p>
                <p className="text-4xl font-bold mt-2">{value}</p>
            </div>
        );
    };

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} clientToEdit={selectedClient} setNotification={setNotification} />
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-slate-500 mt-2 text-lg">Benvenuto, {user.displayName || user.email}!</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Clienti in Ritardo" value={stats.clientiInRitardo} colorClass="bg-red-500" onClick={() => setCurrentPage('pagamenti')} />
                <StatCard title="Posti Auto Liberi" value={stats.postiAutoLiberi} colorClass="bg-blue-500" />
                <StatCard title="Container Liberi" value={stats.containerLiberi} colorClass="bg-green-500" />
                <StatCard title="Clienti Totali" value={stats.clientiTotali} colorClass="bg-indigo-500" onClick={() => setCurrentPage('anagrafica')} />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Disponibilità Posti</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Posti Auto</h3>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-2">
                            {ALL_CAR_SPOTS.map(posto => {
                                const isOccupied = stats.postiOccupati.has(posto);
                                return (
                                    <div key={posto} onClick={() => handleSpotClick(posto)}
                                        className={`p-2 text-center rounded-md font-mono text-sm transition-transform duration-150 ${isOccupied ? 'bg-gray-400 text-white cursor-pointer hover:bg-gray-500 hover:scale-105' : 'bg-green-500 text-white'}`}>
                                        {posto}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Container</h3>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-2">
                            {ALL_CONTAINERS.map(posto => {
                                const isOccupied = stats.postiOccupati.has(posto);
                                return (
                                    <div key={posto} onClick={() => handleSpotClick(posto)}
                                        className={`p-2 text-center rounded-md font-mono text-sm transition-transform duration-150 ${isOccupied ? 'bg-gray-400 text-white cursor-pointer hover:bg-gray-500 hover:scale-105' : 'bg-green-500 text-white'}`}>
                                        {posto}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const AnagraficaClienti = ({ user, setCurrentPage, setNotification, clienti }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCancelled, setShowCancelled] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'Codice', direction: 'asc' });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    const processedClienti = useMemo(() => {
        let sorted = [...clienti];

        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let valA = a[sortConfig.key] || '';
                let valB = b[sortConfig.key] || '';

                if (sortConfig.key === 'partite_aperte') {
                    valA = a.partite_aperte;
                    valB = b.partite_aperte;
                } else if (sortConfig.key === 'Ultimo mese pagato') {
                    valA = parseDataOrdinabile(valA);
                    valB = parseDataOrdinabile(valB);
                } else if (sortConfig.key === 'Codice' || sortConfig.key === 'Importo mensile') {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        let statusFiltered = sorted.filter(c => {
            const status = c.Status || '';
            if (status === 'C') return showCancelled;
            return ['', 'A', 'B'].includes(status);
        });

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            statusFiltered = statusFiltered.filter(c =>
                c.Codice?.toLowerCase().includes(lowerSearchTerm) ||
                c.Nome?.toLowerCase().includes(lowerSearchTerm) ||
                c.Cognome?.toLowerCase().includes(lowerSearchTerm) ||
                c['Posto auto']?.toLowerCase().includes(lowerSearchTerm)
            );
        }

        return statusFiltered;
    }, [clienti, searchTerm, showCancelled, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
        setSortConfig({ key, direction });
    };

    const handleNewClient = () => {
        const maxCode = clienti.reduce((max, client) => {
            const code = parseInt(client.Codice, 10);
            return !isNaN(code) && code > max ? code : max;
        }, 0);

        const newCode = (maxCode + 1).toString();

        const newClientTemplate = VOCI_ETICHETTE.reduce((obj, key) => ({ ...obj, [key]: '' }), {});
        newClientTemplate.Codice = newCode;
        newClientTemplate.Status = "A";
        newClientTemplate['Importo mensile'] = "0";

        setEditingClient(newClientTemplate);
        setIsModalOpen(true);
    };
    const handleEditClient = (client) => { setEditingClient(client); setIsModalOpen(true); };

    const handleDeleteClient = async (client) => {
        if (window.confirm(`Sei sicuro di voler impostare lo stato di ${client.Nome} ${client.Cognome} a 'Cancellato'?`)) {
            try {
                const docRef = doc(db, `clienti/${OWNER_UID}/records`, client.id);
                await updateDoc(docRef, { Status: 'C' });
                setNotification({ message: "Cliente impostato come cancellato.", type: 'success' });
            } catch (error) {
                console.error("Errore cancellazione cliente:", error);
                setNotification({ message: `Errore: ${error.message}`, type: 'error' });
            }
        }
    };

    const getRowColor = (cliente) => {
        if (cliente.Status === 'C') return 'bg-gray-200 text-gray-500';
        if (cliente.partite_aperte > (parseFloat(cliente['Importo mensile'] || 0) * 2)) return 'bg-red-200';
        if (cliente.partite_aperte > 0) return 'bg-yellow-200';
        return 'bg-green-100';
    };

    const columns = [
        { label: "Codice", key: "Codice" }, { label: "Nome", key: "Nome" }, { label: "Cognome", key: "Cognome" },
        { label: "Status", key: "Status" }, { label: "Telefono", key: "Telefono" }, { label: "Posto auto", key: "Posto auto" },
        { label: "Ultimo Pagamento", key: "Ultimo mese pagato", format: formattaDataMeseAnno },
    ];

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} clientToEdit={editingClient} setNotification={setNotification} />
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h1 className="text-3xl font-bold text-gray-800">Anagrafica Clienti</h1>
                <button onClick={() => setCurrentPage('dashboard')} className="mt-4 sm:mt-0 text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Torna alla Dashboard
                </button>
            </header>
            <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
                <div className="relative flex-grow w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </span>
                    <input type="text" placeholder="Cerca per nome, cognome, codice..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex items-center space-x-4">
                    <label htmlFor="showCancelled" className="flex items-center text-gray-700 cursor-pointer">
                        <input type="checkbox" id="showCancelled" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <span className="ml-2">Mostra cancellati</span>
                    </label>
                    <button onClick={handleNewClient} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Nuovo
                    </button>
                    <button onClick={() => downloadCSV(processedClienti, `clienti_export_${new Date().toISOString().split('T')[0]}.csv`)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold shadow-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort(col.key)}>
                                    <div className="flex items-center">{col.label}{sortConfig.key === col.key && <SortIcon direction={sortConfig.direction} />}</div>
                                </th>
                            ))}
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Azioni</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {processedClienti.map((cliente) => (
                            <tr key={cliente.id} className={`${getRowColor(cliente)} hover:bg-gray-50 transition-colors duration-150`} onDoubleClick={() => handleEditClient(cliente)}>
                                {columns.map(col => (
                                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{col.format ? col.format(cliente[col.key]) : cliente[col.key]}</td>
                                ))}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button onClick={() => handleEditClient(cliente)} className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 font-semibold">Modifica</button>
                                    {cliente.Status !== 'C' && <button onClick={() => handleDeleteClient(cliente)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full hover:bg-red-200 font-semibold">Cancella</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {processedClienti.length === 0 && <p className="text-center p-12 text-gray-500">Nessun cliente trovato.</p>}
            </div>
        </div>
    );
};

const GestionePagamenti = ({ user, setCurrentPage, setNotification, clienti }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'partite_aperte', direction: 'desc' });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientToEdit, setClientToEdit] = useState(null);

    const processedClienti = useMemo(() => {
        let statusFiltered = clienti.filter(c => {
            const status = c.Status || '';
            return status === '' || status === 'A';
        });

        if (sortConfig.key) {
            statusFiltered.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                if (sortConfig.key === 'partite_aperte') {
                    valA = a.partite_aperte;
                    valB = b.partite_aperte;
                }
                else if (sortConfig.key === 'Ultimo mese pagato') {
                    valA = parseDataOrdinabile(valA);
                    valB = parseDataOrdinabile(valB);
                } else if (sortConfig.key === 'Codice' || sortConfig.key === 'Importo mensile') {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                } else {
                    valA = String(valA || '').toLowerCase();
                    valB = String(valB || '').toLowerCase();
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            return statusFiltered.filter(c =>
                Object.values(c).some(val =>
                    val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearchTerm)
                )
            );
        }

        return statusFiltered;
    }, [clienti, searchTerm, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
        setSortConfig({ key, direction });
    };

    const handleRegisterPayment = (client) => { setSelectedClient(client); setIsPaymentModalOpen(true); };
    const handleEditClient = (client) => { setClientToEdit(client); setIsEditModalOpen(true); };

    const totalPartiteAperte = useMemo(() => {
        return processedClienti.reduce((acc, client) => acc + client.partite_aperte, 0);
    }, [processedClienti]);

    const getRowColor = (cliente) => {
        if (cliente.partite_aperte > (parseFloat(cliente['Importo mensile'] || 0) * 2)) return 'bg-red-200';
        if (cliente.partite_aperte > 0) return 'bg-yellow-200';
        return 'bg-green-100';
    };

    const columns = [
        { label: "Codice", key: "Codice" }, { label: "Nome", key: "Nome" }, { label: "Cognome", key: "Cognome" },
        { label: "Posto", key: "Posto auto" },
        { label: "Importo", key: "Importo mensile", format: (val) => `€${parseFloat(val || 0).toFixed(2)}` },
        { label: "Ultimo Pagamento", key: "Ultimo mese pagato", format: formattaDataMeseAnno },
        { label: "Partite Aperte", key: 'partite_aperte', format: (val) => `€${parseFloat(val || 0).toFixed(2)}` },
    ];

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} user={user} client={selectedClient} setNotification={setNotification} />
            <ClientModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} user={user} clientToEdit={clientToEdit} setNotification={setNotification} />
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h1 className="text-3xl font-bold text-gray-800">Gestione Pagamenti</h1>
                <button onClick={() => setCurrentPage('dashboard')} className="mt-4 sm:mt-0 text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Torna alla Dashboard
                </button>
            </header>
            <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
                <div className="relative flex-grow w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </span>
                    <input type="text" placeholder="Cerca cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-md shadow-sm text-center">
                    <p className="text-sm font-medium text-gray-500">Totale Partite Aperte</p>
                    <p className="text-2xl font-bold text-blue-600">€{totalPartiteAperte.toFixed(2)}</p>
                </div>
            </div>
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort(col.key)}>
                                    <div className="flex items-center">{col.label}{sortConfig.key === col.key && <SortIcon direction={sortConfig.direction} />}</div>
                                </th>
                            ))}
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Azioni</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {processedClienti.map((cliente) => (
                            <tr key={cliente.id} className={`${getRowColor(cliente)} hover:bg-gray-50 transition-colors duration-150`} onDoubleClick={() => handleEditClient(cliente)}>
                                {columns.map(col => (
                                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {col.format ? col.format(col.key === 'partite_aperte' ? cliente.partite_aperte : cliente[col.key]) : cliente[col.key]}
                                    </td>
                                ))}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleRegisterPayment(cliente)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow-sm text-sm">Registra Pagamento</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {processedClienti.length === 0 && <p className="text-center p-12 text-gray-500">Nessun cliente trovato.</p>}
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPALE APP ---

export default function App() {
    const [page, setPage] = useState('login');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ message: null, type: 'success' });
    const [clienti, setClienti] = useState([]);

    const isAuthorized = user && AUTHORIZED_UIDS.includes(user.uid);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setPage('login');
                setClienti([]);
                setLoading(false);
            } else {
                setLoading(true);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user || !isAuthorized) {
            setClienti([]);
            setLoading(false);
            return;
        }

        const collectionPath = `clienti/${OWNER_UID}/records`;
        const q = query(collection(db, collectionPath));

        const unsubscribeData = onSnapshot(q, (querySnapshot) => {
            const clientList = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            const clientListWithPartite = clientList.map(cliente => ({
                ...cliente,
                partite_aperte: calcolaPartiteAperte(cliente)
            }));

            setClienti(clientListWithPartite);
            setLoading(false);
            if (page === 'login') {
                setPage('dashboard');
            }
        }, (error) => {
            console.error("Errore nel fetch dei dati:", error);
            setNotification({ message: `Errore database: ${error.message}.`, type: 'error' });
            setLoading(false);
        });

        return () => unsubscribeData();
    }, [user, isAuthorized, page]);


    const handleCloseNotification = () => {
        setNotification({ message: null, type: 'success' });
    };

    const renderPage = () => {
        if (loading) {
            return <LoadingSpinner />;
        }

        if (!user) {
            return <LoginPage setNotification={setNotification} />;
        }

        if (!isAuthorized) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                    <h1 className="text-2xl font-bold text-red-600">Accesso Negato</h1>
                    <p className="text-slate-600 mt-2">Non sei autorizzato a visualizzare questi dati.</p>
                    <p className="text-sm text-slate-400 mt-4">Tuo UID: {user.uid}</p>
                    <button onClick={() => signOut(auth)} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Logout
                    </button>
                </div>
            );
        }

        switch (page) {
            case 'anagrafica':
                return <AnagraficaClienti user={user} setCurrentPage={setPage} setNotification={setNotification} clienti={clienti} />;
            case 'pagamenti':
                return <GestionePagamenti user={user} setCurrentPage={setPage} setNotification={setNotification} clienti={clienti} />;
            case 'dashboard':
            default: // La dashboard ora è la pagina di default
                return <DashboardPage user={user} setCurrentPage={setPage} setNotification={setNotification} clienti={clienti} />;
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <Notification message={notification.message} type={notification.type} onClose={handleCloseNotification} />
            <main className="h-screen flex flex-col">
                <div className="flex justify-end p-4">
                    {user && isAuthorized && <button onClick={() => signOut(auth)} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Logout</button>}
                </div>
                {renderPage()}
            </main>
        </div>
    );
}
