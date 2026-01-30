const pb = new PocketBase(window.location.origin);
const container = document.getElementById('error-grid');
const loading = document.getElementById('loading');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');

let allRecords = []; 
let currentProtocol = 'all';
let searchQuery = '';

async function loadErrors() {
    try {
        allRecords = await pb.collection('Caldaia_codici_errori').getFullList({
            sort: '-created',
        });
        loading.style.display = 'none';
        applyFilters(); 
    } catch (err) {
        console.error("Errore:", err);
        loading.innerHTML = `Errore API: ${err.message}.`;
    }
}

function applyFilters() {
    container.innerHTML = ''; 

    const filtered = allRecords.filter(record => {
        const valProtocollo = (record.protocollo || record.Protocollo || '').toLowerCase();
        const matchesProtocol = currentProtocol === 'all' || valProtocollo.includes(currentProtocol);

        const fullText = [
            record.codice || record.Codice || '',
            record.titolo || record.Titolo || '',
            record.descrizione || record.Descrizione || '',
            record.soluzione || record.Soluzione || '',
            record.protocollo || record.Protocollo || ''
        ].join(' ').toLowerCase();

        const matchesSearch = fullText.includes(searchQuery);

        return matchesProtocol && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%">Nessun risultato trovato.</p>';
        return;
    }

    renderRecords(filtered);
}

function renderRecords(records) {
    records.forEach(record => {
        const codice = record.codice || record.Codice || 'N/A';
        const titolo = record.titolo || record.Titolo || 'Errore Sconosciuto';
        const protocollo = record.protocollo || record.Protocollo || 'Generico';
        const descrizione = record.descrizione || record.Descrizione || '';
        const soluzione = record.soluzione || record.Soluzione || 'Contattare assistenza.';
        
        let protoClass = protocollo.toLowerCase().includes('matter') ? 'proto-matter' : 
                         protocollo.toLowerCase().includes('opentherm') ? 'proto-opentherm' : 'proto-generico';

        const cardHTML = `
            <div class="error-card">
                <div class="card-top">
                    <span class="code-badge">${codice}</span>
                    <span class="protocol-badge ${protoClass}">${protocollo}</span>
                </div>
                <h3>${titolo}</h3>
                <p class="desc">${descrizione}</p>
                <div class="solution-box">
                    <strong> Soluzione:</strong>
                    ${soluzione}
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// Eventi Bottoni Filtro
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentProtocol = btn.getAttribute('data-protocol');
        applyFilters();
    });
});

// Evento Barra di Ricerca
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    applyFilters();
});

loadErrors();