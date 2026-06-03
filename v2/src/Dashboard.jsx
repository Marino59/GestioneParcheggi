import React, { useState, useMemo } from 'react';
import { ALL_CAR_SPOTS, ALL_CONTAINERS } from './utils.js';
import ClientModal from './ClientModal.jsx';

export default function DashboardPage({ user, setCurrentPage, setNotification, clienti }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [sharedSpotOccupants, setSharedSpotOccupants] = useState(null);

    const stats = useMemo(() => {
        const attivi = clienti.filter(c => ['', 'A', 'B'].includes(c.Status || ''));
        const inRitardo = attivi.filter(c => (c.partite_aperte || 0) > 0);

        // Mappa posto -> array di clienti (supporto condivisione)
        const spotMap = {};
        attivi.forEach(c => {
            (c.postiAssegnati || []).forEach(p => {
                if (!spotMap[p]) spotMap[p] = [];
                spotMap[p].push(c);
            });
        });
        const postiOccupati = new Set(Object.keys(spotMap));

        return {
            inRitardo: inRitardo.length,
            postiAutoLiberi: ALL_CAR_SPOTS.length - ALL_CAR_SPOTS.filter(p => postiOccupati.has(p)).length,
            containerLiberi: ALL_CONTAINERS.length - ALL_CONTAINERS.filter(p => postiOccupati.has(p)).length,
            clientiTotali: attivi.length,
            postiOccupati,
            spotMap,
        };
    }, [clienti]);

    const handleSpotClick = (postoId, occupants) => {
        if (occupants.length === 1) {
            setSelectedClient(occupants[0]);
            setIsModalOpen(true);
        } else if (occupants.length > 1) {
            setSharedSpotOccupants({ posto: postoId, occupants });
        }
    };

    const SpotCell = ({ posto }) => {
        const occupants = stats.spotMap[posto] || [];
        const isOccupied = occupants.length > 0;
        const isShared = occupants.length > 1;

        let titleText = 'Libero';
        let bgClass = 'bg-green-400 text-white';

        if (isOccupied) {
            if (isShared) {
                titleText = `Condiviso da: ${occupants.map(o => `${o.Nome || ''} ${o.Cognome || ''}`).join(', ')}`;
                bgClass = 'bg-purple-600 text-white cursor-pointer hover:bg-purple-700 hover:scale-105';
            } else {
                const c = occupants[0];
                const nPosti = c ? (c.postiAssegnati || []).length : 0;
                titleText = `${c.Nome} ${c.Cognome} (${nPosti} posti)`;
                bgClass = 'bg-slate-500 text-white cursor-pointer hover:bg-slate-600 hover:scale-105';
            }
        }

        return (
            <div
                onClick={() => isOccupied && handleSpotClick(posto, occupants)}
                title={titleText}
                className={`p-2 text-center rounded-md font-mono text-xs transition-transform duration-150 select-none ${bgClass}`}>
                {posto}
            </div>
        );
    };

    const StatCard = ({ title, value, colorClass, onClick }) => (
        <div className={`p-6 rounded-xl shadow-lg text-white ${colorClass} ${onClick ? 'cursor-pointer hover:-translate-y-1 transition-transform' : ''}`} onClick={onClick}>
            <p className="text-base font-semibold opacity-90">{title}</p>
            <p className="text-5xl font-bold mt-2">{value}</p>
        </div>
    );

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                clientToEdit={selectedClient} setNotification={setNotification} allClienti={clienti} />

            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-indigo-600 text-sm font-semibold mt-1">Gestione Parcheggi v2</p>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0">
                    <button onClick={() => setCurrentPage('anagrafica')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm">
                        Anagrafica
                    </button>
                    <button onClick={() => setCurrentPage('pagamenti')}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold text-sm">
                        Pagamenti
                    </button>
                    <p className="self-center text-slate-500 text-sm hidden sm:block">Benvenuto, {user.displayName?.split(' ')[0] || user.email}</p>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Clienti in Ritardo" value={stats.inRitardo} colorClass="bg-red-500" onClick={() => setCurrentPage('pagamenti')} />
                <StatCard title="Posti Auto Liberi" value={stats.postiAutoLiberi} colorClass="bg-blue-500" />
                <StatCard title="Container Liberi" value={stats.containerLiberi} colorClass="bg-emerald-500" />
                <StatCard title="Clienti Totali" value={stats.clientiTotali} colorClass="bg-indigo-500" onClick={() => setCurrentPage('anagrafica')} />
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center gap-6 mb-4 text-sm text-gray-600">
                <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-green-400 inline-block"></span>Libero</span>
                <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-slate-500 inline-block"></span>Occupato</span>
                <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-purple-600 inline-block"></span>Condiviso (click per scegliere)</span>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-5">Disponibilità Posti</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Posti Auto</h3>
                        <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-9 gap-2">
                            {ALL_CAR_SPOTS.map(p => <SpotCell key={p} posto={p} />)}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Container / Box</h3>
                        <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-9 gap-2">
                            {ALL_CONTAINERS.map(p => <SpotCell key={p} posto={p} />)}
                        </div>
                    </div>
                </div>
            </div>

            {sharedSpotOccupants && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Seleziona Cliente</h3>
                        <p className="text-gray-500 text-xs mb-4">Il posto <span className="font-semibold text-purple-700 font-mono">{sharedSpotOccupants.posto}</span> è condiviso da:</p>
                        <div className="space-y-2">
                            {sharedSpotOccupants.occupants.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        setSelectedClient(c);
                                        setSharedSpotOccupants(null);
                                        setIsModalOpen(true);
                                    }}
                                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all flex justify-between items-center group animate-in slide-in-from-bottom-2 duration-200"
                                >
                                    <div>
                                        <span className="font-semibold text-gray-800 text-sm group-hover:text-indigo-900">{c.Nome} {c.Cognome}</span>
                                        <span className="block text-gray-400 text-xs mt-0.5">Codice: {c.Codice || '-'}</span>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setSharedSpotOccupants(null)}
                            className="mt-5 w-full py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-semibold text-sm transition-colors text-center"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
