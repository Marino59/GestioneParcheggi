import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, OWNER_UID } from './firebase.js';
import { formattaDataMeseAnno, parseDataOrdinabile, downloadCSV } from './utils.js';
import { SortIcon, SpotBadge } from './components.jsx';
import ClientModal from './ClientModal.jsx';

export default function AnagraficaClienti({ setCurrentPage, setNotification, clienti }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCancelled, setShowCancelled] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'Codice', direction: 'asc' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    const processedClienti = useMemo(() => {
        let list = [...clienti];
        if (sortConfig.key) {
            list.sort((a, b) => {
                let va = a[sortConfig.key] || '', vb = b[sortConfig.key] || '';
                if (sortConfig.key === 'partite_aperte' || sortConfig.key === 'importoTotale') {
                    va = parseFloat(a[sortConfig.key]) || 0; vb = parseFloat(b[sortConfig.key]) || 0;
                } else if (sortConfig.key === 'Ultimo mese pagato') {
                    va = parseDataOrdinabile(va); vb = parseDataOrdinabile(vb);
                } else if (sortConfig.key === 'Codice') {
                    va = parseFloat(va) || 0; vb = parseFloat(vb) || 0;
                } else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
                if (va < vb) return sortConfig.direction === 'asc' ? -1 : 1;
                if (va > vb) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        list = list.filter(c => {
            const s = c.Status || '';
            return s === 'C' ? showCancelled : ['', 'A', 'B'].includes(s);
        });
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(c =>
                c.Codice?.toLowerCase().includes(q) ||
                c.Nome?.toLowerCase().includes(q) ||
                c.Cognome?.toLowerCase().includes(q) ||
                (c.postiAssegnati || []).some(p => p.toLowerCase().includes(q))
            );
        }
        return list;
    }, [clienti, searchTerm, showCancelled, sortConfig]);

    const requestSort = (key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const handleNew = () => {
        const maxCode = clienti.reduce((max, c) => { const n = parseInt(c.Codice, 10); return !isNaN(n) && n > max ? n : max; }, 0);
        setEditingClient({ Codice: String(maxCode + 1), Status: 'A' });
        setIsModalOpen(true);
    };

    const handleEdit = (c) => { setEditingClient(c); setIsModalOpen(true); };

    const handleDelete = async (c) => {
        if (window.confirm(`Impostare ${c.Nome} ${c.Cognome} come Cancellato?`)) {
            try {
                await updateDoc(doc(db, `clienti_v2/${OWNER_UID}/records`, c.id), { Status: 'C' });
                setNotification({ message: 'Cliente cancellato.', type: 'success' });
            } catch (e) { setNotification({ message: `Errore: ${e.message}`, type: 'error' }); }
        }
    };

    const getRowColor = (c) => {
        if (c.Status === 'C') return 'bg-gray-200 text-gray-500';
        if (c.partite_aperte > (parseFloat(c.importoTotale || 0) * 2)) return 'bg-red-100';
        if (c.partite_aperte > 0) return 'bg-yellow-100';
        return 'bg-green-50';
    };

    const columns = [
        { label: 'Codice', key: 'Codice' },
        { label: 'Nome', key: 'Nome' },
        { label: 'Cognome', key: 'Cognome' },
        { label: 'Status', key: 'Status' },
        { label: 'Telefono', key: 'Telefono' },
        { label: 'Posti', key: 'postiAssegnati' },
        { label: 'Importo/mese', key: 'importoTotale', format: v => `€${parseFloat(v || 0).toFixed(2)}` },
        { label: 'Ultimo Pagamento', key: 'Ultimo mese pagato', format: formattaDataMeseAnno },
    ];

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                clientToEdit={editingClient} setNotification={setNotification} allClienti={clienti} />
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Anagrafica Clienti</h1>
                    <p className="text-indigo-600 text-sm font-medium mt-1">v2 — più posti per cliente</p>
                </div>
                <button onClick={() => setCurrentPage('dashboard')}
                    className="mt-4 sm:mt-0 text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Dashboard
                </button>
            </header>

            <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
                <div className="relative flex-grow w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </span>
                    <input type="text" placeholder="Cerca per nome, cognome, codice, posto..." value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center text-gray-700 cursor-pointer gap-2 text-sm">
                        <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                        Mostra cancellati
                    </label>
                    <button onClick={handleNew}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Nuovo
                    </button>
                    <button onClick={() => downloadCSV(processedClienti, `clienti_v2_${new Date().toISOString().split('T')[0]}.csv`)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm">
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => requestSort(col.key)}>
                                    <div className="flex items-center">{col.label}{sortConfig.key === col.key && <SortIcon direction={sortConfig.direction} />}</div>
                                </th>
                            ))}
                            <th className="relative px-4 py-3"><span className="sr-only">Azioni</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {processedClienti.map(c => (
                            <tr key={c.id} className={`${getRowColor(c)} hover:bg-gray-50 transition-colors`} onDoubleClick={() => handleEdit(c)}>
                                {columns.map(col => (
                                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                        {col.key === 'postiAssegnati'
                                            ? <div className="flex flex-wrap gap-1">{(c.postiAssegnati || []).map(p => <SpotBadge key={p} codice={p} />)}</div>
                                            : col.format ? col.format(c[col.key]) : c[col.key]
                                        }
                                    </td>
                                ))}
                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button onClick={() => handleEdit(c)} className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 font-semibold">Modifica</button>
                                    {c.Status !== 'C' && <button onClick={() => handleDelete(c)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full hover:bg-red-200 font-semibold">Cancella</button>}
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
