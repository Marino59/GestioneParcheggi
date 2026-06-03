export const NOMI_MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

export const ALL_CAR_SPOTS = ['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12','A13','A14','B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','F01','F02','F03','F04','F05','F06','F07','F08','U01','U02','S01'];
export const ALL_CONTAINERS = ['K01','K02','K03','K04','K05','K06','K07','K08','K09','K10','K11','K12','K13','K14','K15','K16','K17','K18','K19','K20','K21','K22','K23','K24','K25','K26','K27','K28','K29','K30','K31','K32','K33','K34','K35','M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12'];
export const ALL_SPOTS = [...ALL_CAR_SPOTS, ...ALL_CONTAINERS];

export const formattaDataMeseAnno = (data) => {
    if (!data || !data.includes('/')) return '-';
    try {
        const [mese, anno] = data.split('/');
        return `${NOMI_MESI[parseInt(mese, 10) - 1]} ${anno}`;
    } catch { return '-'; }
};

export const parseDataOrdinabile = (dataString) => {
    if (!dataString || !dataString.includes('/')) return 0;
    try {
        const [mese, anno] = dataString.split('/');
        return parseInt(anno, 10) * 100 + parseInt(mese, 10);
    } catch { return 0; }
};

// Calcola mesi arretrati tra ultimoPagato ("MM/YYYY") e oggi
export const calcolaMesiArretrati = (ultimoPagato) => {
    if (!ultimoPagato || !ultimoPagato.includes('/')) return 0;
    try {
        const [mesePagato, annoPagato] = ultimoPagato.split('/').map(Number);
        const oggi = new Date();
        const diff = (oggi.getFullYear() - annoPagato) * 12 + (oggi.getMonth() + 1 - mesePagato);
        return diff > 0 ? diff : 0;
    } catch { return 0; }
};

// Calcola partite aperte: importoTotale * mesi arretrati
export const calcolaPartiteAperte = (cliente) => {
    const importo = parseFloat(cliente.importoTotale) || 0;
    const mesi = calcolaMesiArretrati(cliente['Ultimo mese pagato']);
    return importo * mesi;
};

export const downloadCSV = (data, filename = 'export.csv') => {
    if (!data || !data.length) return;
    const headers = ['Codice','Nome','Cognome','Status','Telefono','Posti','Importo Totale','Ultimo mese pagato','Data ultimo pagamento','Note'];
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
            let v = h === 'Posti' ? (row.postiAssegnati || []).join(' ') : (row[h] || '');
            if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) v = `"${v.replace(/"/g,'""')}"`;
            return v;
        }).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
