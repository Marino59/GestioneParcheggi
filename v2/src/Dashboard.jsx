import React, { useState, useMemo } from 'react';
import { ALL_CAR_SPOTS, ALL_CONTAINERS } from './utils.js';
import ClientModal from './ClientModal.jsx';

export default function DashboardPage({ user, setCurrentPage, setNotification, clienti }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    const stats = useMemo(() => {
        const attivi = clienti.filter(c => ['', 'A', 'B'].includes(c.Status || ''));
        const inRitardo = attivi.filter(c => (c.partite_aperte || 0) > 0);

        // Mappa posto -> cliente (per click)
        const spotMap = {};
        attivi.forEach(c => { (c.postiAssegnati || []).forEach(p => { spotMap[p] = c; }); });
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

    const handleSpotClick = (postoId) => {
        const c = stats.spotMap[postoId];
        if (c) { setSelectedClient(c); setIsModalOpen(true); }
    };

    const SpotCell = ({ posto }) => {
        const isOccupied = stats.postiOccupati.has(posto);
        const c = stats.spotMap[posto];
        const nPosti = c ? (c.postiAssegnati || []).length : 0;
        return (
            <div
                onClick={() => handleSpotClick(posto)}
                title={isOccupied ? `${c?.Nome} ${c?.Cognome} (${nPosti} posti)` : 'Libero'}
                className={`p-2 text-center rounded-md font-mono text-xs transition-transform duration-150 select-none
                    ${isOccupied ? 'bg-slate-500 text-white cursor-pointer hover:bg-slate-600 hover:scale-105' : 'bg-green-400 text-white'}`}>
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
            <div className="flex items-center gap-6 mb-4 text-sm text-gray-600">
                <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-green-400 inline-block"></span>Libero</span>
                <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-slate-500 inline-block"></span>Occupato (click per info)</span>
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
        </div>
    );
}
