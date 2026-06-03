import React, { useState, useMemo } from 'react';
import { formattaDataMeseAnno, parseDataOrdinabile } from './utils.js';
import { SortIcon, SpotBadge } from './components.jsx';
import PaymentModal from './PaymentModal.jsx';
import ClientModal from './ClientModal.jsx';

export default function GestionePagamenti({ setCurrentPage, setNotification, clienti }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'partite_aperte', direction: 'desc' });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    const processedClienti = useMemo(() => {
        let list = clienti.filter(c => ['', 'A'].includes(c.Status || ''));
        if (sortConfig.key) {
            list.sort((a, b) => {
                let va, vb;
                if (sortConfig.key === 'partite_aperte' || sortConfig.key === 'importoTotale') {
                    va = parseFloat(a[sortConfig.key]) || 0; vb = parseFloat(b[sortConfig.key]) || 0;
                } else if (sortConfig.key === 'Ultimo mese pagato') {
                    va = parseDataOrdinabile(a[sortConfig.key]); vb = parseDataOrdinabile(b[sortConfig.key]);
                } else { va = String(a[sortConfig.key] || '').toLowerCase(); vb = String(b[sortConfig.key] || '').toLowerCase(); }
                if (va < vb) return sortConfig.direction === 'asc' ? -1 : 1;
                if (va > vb) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(c =>
                Object.values(c).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q)) ||
                (c.postiAssegnati || []).some(p => p.toLowerCase().includes(q))
            );
        }
        return list;
    }, [clienti, searchTerm, sortConfig]);

    const requestSort = (key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

    const totalPartiteAperte = useMemo(() => processedClienti.reduce((s, c) => s + (c.partite_aperte || 0), 0), [processedClienti]);

    const getRowColor = (c) => {
        if (c.partite_aperte > (parseFloat(c.importoTotale || 0) * 2)) return 'bg-red-100';
        if (c.partite_aperte > 0) return 'bg-yellow-100';
        return 'bg-green-50';
    };

    const columns = [
        { label: 'Codice', key: 'Codice' },
        { label: 'Nome', key: 'Nome' },
        { label: 'Cognome', key: 'Cognome' },
        { label: 'Posti', key: 'postiAssegnati' },
        { label: 'Importo/mese', key: 'importoTotale', format: v => `€${parseFloat(v || 0).toFixed(2)}` },
        { label: 'Ultimo Pagamento', key: 'Ultimo mese pagato', format: formattaDataMeseAnno },
        { label: 'Partite Aperte', key: 'partite_aperte', format: v => `€${parseFloat(v || 0).toFixed(2)}` },
    ];

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} client={selectedClient} setNotification={setNotification} />
            <ClientModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} clientToEdit={selectedClient} setNotification={setNotification} allClienti={clienti} />

            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Gestione Pagamenti</h1>
                    <p className="text-indigo-600 text-sm font-medium mt-1">v2 — pagamento unico per tutti i posti</p>
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
                    <input type="text" placeholder="Cerca cliente o posto..." value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div className="p-3 bg-white border border-indigo-200 rounded-lg shadow-sm text-center min-w-[180px]">
                    <p className="text-xs font-medium text-gray-500">Totale Partite Aperte</p>
                    <p className="text-2xl font-bold text-indigo-600">€{totalPartiteAperte.toFixed(2)}</p>
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
                            <tr key={c.id} className={`${getRowColor(c)} hover:bg-gray-50 transition-colors`} onDoubleClick={() => { setSelectedClient(c); setIsEditModalOpen(true); }}>
                                {columns.map(col => (
                                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                        {col.key === 'postiAssegnati'
                                            ? <div className="flex flex-wrap gap-1">{(c.postiAssegnati || []).map(p => <SpotBadge key={p} codice={p} />)}</div>
                                            : col.format ? col.format(col.key === 'partite_aperte' ? c.partite_aperte : c[col.key]) : c[col.key]
                                        }
                                    </td>
                                ))}
                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => { setSelectedClient(c); setIsPaymentModalOpen(true); }}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm">
                                        Registra Pagamento
                                    </button>
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
