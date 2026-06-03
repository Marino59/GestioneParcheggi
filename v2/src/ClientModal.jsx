import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, addDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, OWNER_UID } from './firebase.js';
import { ALL_CAR_SPOTS, ALL_CONTAINERS } from './utils.js';
import { SpotBadge } from './components.jsx';

const COLLECTION = `clienti_v2/${OWNER_UID}/records`;

// Griglia di selezione posti
const SpotGrid = ({ title, spots, selectedSpots, importiPosti, onToggle, onImportoChange, occupiedByOthers }) => (
    <div>
        <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">{title}</h4>
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 mb-3">
            {spots.map(s => {
                const isSelected = selectedSpots.includes(s);
                const isOccupied = occupiedByOthers.includes(s);
                return (
                    <button
                        key={s} type="button"
                        onClick={() => !isOccupied && onToggle(s)}
                        title={isOccupied ? `Occupato da altro cliente` : s}
                        className={`p-1.5 text-center rounded font-mono text-xs font-semibold transition-all
                            ${isSelected ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 scale-105' :
                            isOccupied ? 'bg-gray-300 text-gray-400 cursor-not-allowed' :
                            'bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-800'}`}>
                        {s}
                    </button>
                );
            })}
        </div>
        {/* Importi per i posti selezionati in questa sezione */}
        {spots.filter(s => selectedSpots.includes(s)).length > 0 && (
            <div className="bg-indigo-50 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-indigo-700 mb-2">Importo mensile per posto (€):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {spots.filter(s => selectedSpots.includes(s)).map(s => (
                        <div key={s} className="flex items-center gap-1">
                            <span className="text-xs font-mono font-semibold text-indigo-800 w-10">{s}</span>
                            <input
                                type="number" min="0" step="0.01"
                                value={importiPosti[s] || ''}
                                onChange={e => onImportoChange(s, e.target.value)}
                                placeholder="0.00"
                                className="w-full text-sm border border-indigo-200 rounded px-2 py-1 focus:ring-indigo-400 focus:border-indigo-400"
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

export default function ClientModal({ isOpen, onClose, clientToEdit, setNotification, allClienti }) {
    const [formData, setFormData] = useState({});
    const [selectedSpots, setSelectedSpots] = useState([]);
    const [importiPosti, setImportiPosti] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (clientToEdit) {
                setFormData({ ...clientToEdit });
                setSelectedSpots(clientToEdit.postiAssegnati || []);
                setImportiPosti(clientToEdit.importiPosti || {});
            } else {
                setFormData({ Status: 'A' });
                setSelectedSpots([]);
                setImportiPosti({});
            }
        }
    }, [clientToEdit, isOpen]);

    if (!isOpen) return null;

    // Posti occupati da ALTRI clienti (non dal cliente corrente)
    const occupiedByOthers = (allClienti || [])
        .filter(c => c.id !== (clientToEdit?.id))
        .filter(c => ['', 'A', 'B'].includes(c.Status || ''))
        .flatMap(c => c.postiAssegnati || []);

    const toggleSpot = (s) => {
        setSelectedSpots(prev => {
            const next = prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s];
            // Rimuovi importo se deselezionato
            if (prev.includes(s)) {
                setImportiPosti(p => { const n = { ...p }; delete n[s]; return n; });
            }
            return next;
        });
    };

    const handleImportoChange = (spot, val) => {
        setImportiPosti(prev => ({ ...prev, [spot]: val }));
    };

    const importoTotale = Object.entries(importiPosti)
        .filter(([k]) => selectedSpots.includes(k))
        .reduce((sum, [, v]) => sum + (parseFloat(v) || 0), 0);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData['Nome'] || !formData['Cognome']) {
            setNotification({ message: 'Nome e Cognome sono obbligatori.', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const dataToSave = {
                Nome: formData['Nome'] || '',
                Cognome: formData['Cognome'] || '',
                Codice: formData['Codice'] || '',
                Status: formData['Status'] || 'A',
                Telefono: formData['Telefono'] || '',
                Note: formData['Note'] || '',
                'Modello auto': formData['Modello auto'] || '',
                Targa: formData['Targa'] || '',
                'Inizio contratto': formData['Inizio contratto'] || '',
                'Fine contratto': formData['Fine contratto'] || '',
                'Ultimo mese pagato': formData['Ultimo mese pagato'] || '',
                'Data ultimo pagamento': formData['Data ultimo pagamento'] || '',
                postiAssegnati: selectedSpots,
                importiPosti: importiPosti,
                importoTotale: importoTotale,
            };

            if (clientToEdit?.id) {
                await setDoc(doc(db, COLLECTION, clientToEdit.id), dataToSave, { merge: true });
                setNotification({ message: 'Cliente aggiornato!', type: 'success' });
            } else {
                await addDoc(collection(db, COLLECTION), dataToSave);
                setNotification({ message: 'Cliente creato!', type: 'success' });
            }
            onClose();
        } catch (err) {
            setNotification({ message: `Errore: ${err.message}`, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const fields = [
        { name: 'Codice', label: 'Codice' },
        { name: 'Nome', label: 'Nome *' },
        { name: 'Cognome', label: 'Cognome *' },
        { name: 'Telefono', label: 'Telefono' },
        { name: 'Modello auto', label: 'Modello auto' },
        { name: 'Targa', label: 'Targa' },
        { name: 'Inizio contratto', label: 'Inizio contratto' },
        { name: 'Fine contratto', label: 'Fine contratto' },
        { name: 'Ultimo mese pagato', label: 'Ultimo mese pagato (MM/YYYY)' },
        { name: 'Data ultimo pagamento', label: 'Data ultimo pagamento' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-40 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
                <form onSubmit={handleSave}>
                    <div className="p-6 border-b">
                        <h2 className="text-2xl font-bold text-gray-800">
                            {clientToEdit?.id ? 'Modifica Cliente' : 'Nuovo Cliente'}
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Versione 2 — più posti per cliente</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Dati anagrafici */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-700 mb-3">Dati Anagrafici</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {fields.map(f => (
                                    <div key={f.name}>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">{f.label}</label>
                                        <input
                                            type="text" name={f.name}
                                            value={formData[f.name] || ''}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                                    <select name="Status" value={formData['Status'] || ''} onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="A">Attivo (A)</option>
                                        <option value="B">Sospeso (B)</option>
                                        <option value="C">Cancellato (C)</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Note</label>
                                    <textarea name="Note" value={formData['Note'] || ''} onChange={handleChange} rows={2}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                            </div>
                        </div>

                        {/* Selezione posti */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-gray-700">Posti / Box Assegnati</h3>
                                {selectedSpots.length > 0 && (
                                    <div className="text-right">
                                        <span className="text-sm text-gray-500">Importo totale mensile:</span>
                                        <span className="ml-2 text-lg font-bold text-indigo-700">€{importoTotale.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                            {selectedSpots.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-indigo-50 rounded-lg">
                                    {selectedSpots.map(s => <SpotBadge key={s} codice={s} />)}
                                </div>
                            )}
                            <SpotGrid
                                title="Posti Auto"
                                spots={ALL_CAR_SPOTS}
                                selectedSpots={selectedSpots}
                                importiPosti={importiPosti}
                                onToggle={toggleSpot}
                                onImportoChange={handleImportoChange}
                                occupiedByOthers={occupiedByOthers}
                            />
                            <SpotGrid
                                title="Container / Box"
                                spots={ALL_CONTAINERS}
                                selectedSpots={selectedSpots}
                                importiPosti={importiPosti}
                                onToggle={toggleSpot}
                                onImportoChange={handleImportoChange}
                                occupiedByOthers={occupiedByOthers}
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
                        <button type="button" onClick={onClose}
                            className="px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold text-sm">
                            Annulla
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-sm disabled:opacity-60">
                            {saving ? 'Salvataggio...' : 'Salva Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
