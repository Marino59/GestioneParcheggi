import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, OWNER_UID } from './firebase.js';
import { NOMI_MESI, formattaDataMeseAnno, calcolaMesiArretrati, ricalcolaUltimoPagamento, parseDataOrdinabile } from './utils.js';
import { MonthPicker, SpotBadge } from './components.jsx';

const COLLECTION = `clienti_v2/${OWNER_UID}/records`;

export default function PaymentModal({ isOpen, onClose, client, setNotification }) {
    const [paymentDate, setPaymentDate] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });

    useEffect(() => {
        if (isOpen && client) {
            const ump = client['Ultimo mese pagato'];
            if (ump && ump.includes('/')) {
                try {
                    const [mese, anno] = ump.split('/');
                    setPaymentDate({ month: parseInt(mese, 10) - 1, year: parseInt(anno, 10) });
                } catch {
                    const n = new Date();
                    setPaymentDate({ month: n.getMonth(), year: n.getFullYear() });
                }
            } else {
                const n = new Date();
                setPaymentDate({ month: n.getMonth(), year: n.getFullYear() });
            }
        }
    }, [client, isOpen]);

    const { mesiDaPagare, importoTotale } = useMemo(() => {
        if (!isOpen || !client) return { mesiDaPagare: 0, importoTotale: 0 };
        const importoMensile = parseFloat(client.importoTotale) || 0;
        if (!client['Ultimo mese pagato'] || !client['Ultimo mese pagato'].includes('/')) {
            return { mesiDaPagare: 1, importoTotale: importoMensile };
        }
        try {
            const [mesePagato, annoPagato] = client['Ultimo mese pagato'].split('/').map(Number);
            const dataUltimoMese = new Date(annoPagato, mesePagato - 1);
            const dataSelezionata = new Date(paymentDate.year, paymentDate.month);
            if (dataSelezionata <= dataUltimoMese) return { mesiDaPagare: 0, importoTotale: 0 };
            const diff = (paymentDate.year - annoPagato) * 12 + (paymentDate.month - (mesePagato - 1));
            return { mesiDaPagare: diff, importoTotale: diff * importoMensile };
        } catch { return { mesiDaPagare: 0, importoTotale: 0 }; }
    }, [client, paymentDate, isOpen]);

    const storicoPagamenti = useMemo(() => {
        if (!client) return [];
        let list = client.pagamenti || [];
        if (list.length === 0 && client['Ultimo mese pagato'] && client['Ultimo mese pagato'].includes('/')) {
            list = [{
                data: client['Data ultimo pagamento'] || '-',
                importo: parseFloat(client.importoTotale) || 0,
                meseRiferimento: client['Ultimo mese pagato'],
                timestamp: 0,
                isSynthetic: true
            }];
        }
        return [...list].sort((a, b) => parseDataOrdinabile(b.meseRiferimento) - parseDataOrdinabile(a.meseRiferimento));
    }, [client]);

    if (!isOpen || !client) return null;

    const posti = client.postiAssegnati || [];
    const importiPosti = client.importiPosti || {};

    const handlePrint = () => {
        const w = window.open('', '_blank');
        if (!w) { setNotification({ message: 'Popup bloccato!', type: 'error' }); return; }
        const mesePagato = `${NOMI_MESI[paymentDate.month]} ${paymentDate.year}`;
        const dataCorrente = new Date().toLocaleDateString('it-IT');
        const postiRows = posti.map(p => {
            const imp = parseFloat(importiPosti[p] || 0);
            return `<tr><td>${p}</td><td>${p.startsWith('K') || p.startsWith('M') ? 'Container/Box' : 'Posto Auto'}</td><td style="text-align:right">€${(imp * mesiDaPagare).toFixed(2)}</td></tr>`;
        }).join('');

        w.document.write(`<!DOCTYPE html><html><head><title>Ricevuta</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}
        .header{text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:20px}
        .title{font-size:24px;font-weight:bold}.subtitle{color:#666;font-size:16px}
        table{width:100%;border-collapse:collapse;margin:20px 0}
        th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #eee}
        th{background:#f5f5f5;font-weight:bold}
        .total{background:#e8f0fe;font-weight:bold;font-size:18px}
        .info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
        .sign{display:flex;justify-content:space-between;margin-top:60px}
        .sign-box{border-top:1px solid #000;width:200px;text-align:center;padding-top:8px;font-size:12px}
        @media print{.no-print{display:none}}</style></head><body>
        <div class="header"><div class="title">RICEVUTA DI PAGAMENTO</div>
        <div class="subtitle">Gestione Parcheggi v2</div>
        <div style="margin-top:8px;font-size:14px">Data: ${dataCorrente}</div></div>
        <div class="info-row"><span><b>Cliente:</b></span><span>${client.Nome} ${client.Cognome}</span></div>
        <div class="info-row"><span><b>Codice:</b></span><span>${client.Codice || '-'}</span></div>
        <div class="info-row"><span><b>Periodo pagato:</b></span><span>${mesiDaPagare === 1 ? mesePagato : `${mesiDaPagare} mesi fino a ${mesePagato}`}</span></div>
        <table><thead><tr><th>Posto / Box</th><th>Tipo</th><th style="text-align:right">Importo</th></tr></thead>
        <tbody>${postiRows}<tr class="total"><td colspan="2"><b>TOTALE</b></td><td style="text-align:right"><b>€${importoTotale.toFixed(2)}</b></td></tr></tbody></table>
        <div class="sign"><div class="sign-box">Firma di chi riceve</div><div class="sign-box">Firma di chi paga</div></div>
        <script>window.onload=function(){window.print()}</script></body></html>`);
        w.document.close();
    };

    const handleRegister = async () => {
        if (importoTotale <= 0) {
            setNotification({ message: "Seleziona un mese successivo all'ultimo pagato.", type: 'warning' });
            return;
        }
        const oggi = new Date();
        const dataString = `${oggi.getDate().toString().padStart(2, '0')}/${(oggi.getMonth() + 1).toString().padStart(2, '0')}/${oggi.getFullYear()}`;
        const nuovoMeseRiferimento = `${(paymentDate.month + 1).toString().padStart(2, '0')}/${paymentDate.year}`;

        const nuovoPagamento = {
            data: dataString,
            importo: importoTotale,
            meseRiferimento: nuovoMeseRiferimento,
            timestamp: Date.now()
        };

        let listaPagamenti = [...(client.pagamenti || [])];
        if (listaPagamenti.length === 0 && client['Ultimo mese pagato'] && client['Ultimo mese pagato'].includes('/')) {
            listaPagamenti.push({
                data: client['Data ultimo pagamento'] || '-',
                importo: parseFloat(client.importoTotale) || 0,
                meseRiferimento: client['Ultimo mese pagato'],
                timestamp: Date.now() - 1000
            });
        }
        listaPagamenti.push(nuovoPagamento);

        const updatedData = {
            'Ultimo mese pagato': nuovoMeseRiferimento,
            'Data ultimo pagamento': dataString,
            'pagamenti': listaPagamenti
        };
        try {
            await updateDoc(doc(db, COLLECTION, client.id), updatedData);
            setNotification({ message: 'Pagamento registrato!', type: 'success' });
            onClose();
        } catch (err) {
            setNotification({ message: `Errore: ${err.message}`, type: 'error' });
        }
    };

    const handleDeletePayment = async (paymentToDelete) => {
        if (!window.confirm(`Sei sicuro di voler stornare/cancellare il pagamento per ${formattaDataMeseAnno(paymentToDelete.meseRiferimento)}?`)) {
            return;
        }

        let updatedFields;
        if (paymentToDelete.isSynthetic) {
            // Se storniamo il pagamento sintetico (ereditato da V1), resettiamo l'ultimo mese pagato
            updatedFields = {
                'Ultimo mese pagato': '',
                'Data ultimo pagamento': '',
                'pagamenti': []
            };
        } else {
            const listaPagamenti = client.pagamenti || [];
            const nuovaLista = listaPagamenti.filter(p => p.timestamp !== paymentToDelete.timestamp);
            updatedFields = ricalcolaUltimoPagamento(nuovaLista);
        }

        try {
            await updateDoc(doc(db, COLLECTION, client.id), updatedFields);
            setNotification({ message: 'Pagamento stornato con successo!', type: 'success' });
            onClose();
        } catch (err) {
            setNotification({ message: `Errore nello storno: ${err.message}`, type: 'error' });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-40 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Registra Pagamento</h2>
                    <p className="text-gray-600 mt-1">{client.Nome} {client.Cognome}</p>
                </div>
                <div className="p-6 space-y-4">
                    {/* Posti inclusi */}
                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Posti inclusi nel pagamento:</p>
                        <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-lg min-h-[40px]">
                            {posti.length === 0
                                ? <span className="text-sm text-gray-400">Nessun posto assegnato</span>
                                : posti.map(p => (
                                    <div key={p} className="flex items-center gap-1">
                                        <SpotBadge codice={p} />
                                        <span className="text-xs text-gray-500">€{parseFloat(importiPosti[p] || 0).toFixed(0)}/m</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Ultimo pagato */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-100 p-3 rounded-lg text-center">
                            <p className="text-sm text-gray-500">Ultimo mese pagato</p>
                            <p className="font-bold text-lg text-gray-800">{formattaDataMeseAnno(client['Ultimo mese pagato'])}</p>
                        </div>
                        <div className="bg-gray-100 p-3 rounded-lg text-center">
                            <p className="text-sm text-gray-500">Data reg. pagamento</p>
                            <p className="font-bold text-lg text-gray-800">{client['Data ultimo pagamento'] || '-'}</p>
                        </div>
                    </div>

                    {/* Selezione mese */}
                    <div>
                        <p className="text-center text-sm font-medium text-gray-500 mb-1">Paga fino a:</p>
                        <MonthPicker value={paymentDate} onChange={setPaymentDate} />
                    </div>

                    {/* Totale */}
                    <div className="mt-4 p-4 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-lg text-center">
                        <p className="text-sm font-medium text-indigo-700">
                            {mesiDaPagare > 1 ? `${mesiDaPagare} mesi × €${(parseFloat(client.importoTotale) || 0).toFixed(2)}/mese` : 'Importo Totale'}
                        </p>
                        <p className="text-4xl font-bold text-indigo-800 mt-1">€{importoTotale.toFixed(2)}</p>
                    </div>

                    {/* Storico pagamenti */}
                    <div className="mt-4 border-t pt-4">
                        <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Storico Pagamenti
                        </h3>
                        <div className="max-h-36 overflow-y-auto border rounded-lg">
                            {storicoPagamenti.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">Nessun pagamento registrato</p>
                            ) : (
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b">
                                            <th className="p-2 text-gray-500 font-medium">Data</th>
                                            <th className="p-2 text-gray-500 font-medium">Mese</th>
                                            <th className="p-2 text-gray-500 font-medium text-right">Importo</th>
                                            <th className="p-2 text-center text-gray-500 font-medium"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {storicoPagamenti.map((p, idx) => (
                                            <tr key={p.timestamp || idx} className="hover:bg-gray-50">
                                                <td className="p-2 text-gray-600">{p.data}</td>
                                                <td className="p-2 text-gray-700 font-medium">{formattaDataMeseAnno(p.meseRiferimento)}</td>
                                                <td className="p-2 text-gray-800 text-right font-semibold">€{parseFloat(p.importo || 0).toFixed(2)}</td>
                                                <td className="p-2 text-center">
                                                    <button type="button" onClick={() => handleDeletePayment(p)} className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors" title="Cancella Pagamento">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-between gap-3 rounded-b-xl border-t">
                    <button onClick={handlePrint}
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Stampa Ricevuta
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-sm">Annulla</button>
                        <button onClick={handleRegister} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-sm">Registra Pagamento</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
