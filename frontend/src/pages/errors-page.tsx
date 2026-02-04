import React, { useState, useEffect } from 'react';
import pb from '../services/pocketbase';

// 1. INTERFACCIA
interface BoilerError {
  id: string;
  created: string;
  updated: string;
  Codice: string;
  Protocollo: string; 
  Titolo: string;
  Descrizione: string;
}

// 2. STILI (Inclusi i nuovi stili 3D per le card)
const styles: { [key: string]: React.CSSProperties } = {
  container: { 
    padding: '2rem', 
    fontFamily: 'Arial, sans-serif', 
    backgroundColor: 'var(--sfondo-page)', 
    minHeight: '100vh', 
    color: 'var(--testo-base)' 
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '2rem' 
  },
  title: { color: 'var(--testo-base)', margin: 0, fontSize: '1.8rem' },
  
  // KPI
  kpiContainer: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
    gap: '1.5rem', 
    marginBottom: '2rem' 
  },
  card: { 
    padding: '1.5rem', 
    borderRadius: '12px', 
    backgroundColor: '#fff', 
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
    borderLeftWidth: '6px', 
    borderLeftStyle: 'solid' 
  },
  kpiLabel: { fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '0.5rem' },
  bigNumber: { fontSize: '2.5rem', fontWeight: 'bold', margin: 0 },

  // BOTTONI FILTRO
  filterContainer: { display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  filterBtn: {
    padding: '8px 24px',
    border: '2px solid var(--colore-secondario)',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    outline: 'none'
  },

  // --- GRIGLIA CARDS ---
  gridContainer: {
    display: 'grid',
    // Crea colonne automatiche larghe almeno 260px
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '2rem',
    perspective: '1000px' // FONDAMENTALE per l'effetto 3D
  },

  // MODALE
  aiModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(33, 33, 33, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  aiContent: { backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', borderTop: '6px solid var(--colore-secondario)' },
  btnClose: { marginTop: '1.5rem', padding: '10px 20px', cursor: 'pointer', backgroundColor: 'var(--colore-terziario)', color: 'white', border: 'none', borderRadius: '6px', width: '100%' }
};

// --- COMPONENTE CARTA SINGOLA (FLIP CARD) ---
const SingleCard: React.FC<{ 
    error: BoilerError; 
    onAskAi: (msg: string, ctx: string) => void;
    severityColor: string;
}> = ({ error, onAskAi, severityColor }) => {
  
  const [isFlipped, setIsFlipped] = useState(false);

  // Stili locali per la gestione del Flip
  const cardStyles = {
    scene: {
      width: '100%',
      height: '380px', // Altezza fissa > Base (Rettangolo verticale)
      cursor: 'pointer',
      perspective: '1000px',
    },
    inner: {
      position: 'relative' as 'relative',
      width: '100%',
      height: '100%',
      textAlign: 'center' as 'center',
      transition: 'transform 0.8s',
      transformStyle: 'preserve-3d' as 'preserve-3d',
      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
      borderRadius: '16px',
    },
    face: {
      position: 'absolute' as 'absolute',
      width: '100%',
      height: '100%',
      backfaceVisibility: 'hidden' as 'hidden', // Nasconde il retro quando sei sul fronte
      WebkitBackfaceVisibility: 'hidden',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column' as 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box' as 'border-box',
    },
    front: {
      backgroundColor: '#fff',
      borderTop: `8px solid ${severityColor}`,
      color: 'var(--testo-base)',
    },
    back: {
      backgroundColor: '#2d3436', // Sfondo scuro per il retro (effetto "tecnico")
      color: '#fff',
      transform: 'rotateY(180deg)', // Il retro è già girato di 180 gradi
      borderTop: `8px solid ${severityColor}`,
    },
    // Elementi UI
    code: { fontSize: '3rem', fontWeight: 'bold', color: severityColor, margin: '10px 0' },
    badge: { 
        padding: '5px 12px', 
        borderRadius: '20px', 
        fontSize: '0.8rem', 
        marginBottom: '10px',
        backgroundColor: error.Protocollo === 'Matter' ? '#e3f2fd' : '#fff3e0',
        color: error.Protocollo === 'Matter' ? '#1565c0' : '#ef6c00',
        fontWeight: 'bold',
        textTransform: 'uppercase' as 'uppercase'
    },
    title: { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '10px' },
    desc: { fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.9, marginBottom: '20px' },
    solutionBox: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '0.85rem',
        marginBottom: '20px',
        width: '100%',
        textAlign: 'left' as 'left'
    },
    btnAi: {
        padding: '10px 20px',
        backgroundColor: 'var(--colore-secondario)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        width: '100%'
    },
    hint: { fontSize: '0.7rem', marginTop: 'auto', opacity: 0.5 }
  };

  // Dato che non abbiamo la colonna "Soluzione" nel DB, ne simuliamo una generica
  const simulatedSolution = error.Protocollo === 'Matter' 
    ? "Verificare la connettività del bridge Matter e riavviare il nodo."
    : "Controllare la pressione dell'acqua e i cablaggi del termostato.";

  return (
    <div style={cardStyles.scene} onClick={() => setIsFlipped(!isFlipped)}>
      <div style={cardStyles.inner}>
        
        {/* --- FRONTE DELLA CARTA --- */}
        <div style={{ ...cardStyles.face, ...cardStyles.front }}>
            <div style={cardStyles.badge}>{error.Protocollo}</div>
            <div style={cardStyles.code}>{error.Codice}</div>
            <div style={cardStyles.title}>{error.Titolo}</div>
            <div style={{marginTop: '20px', fontSize: '3rem'}}>⚠️</div>
            <div style={cardStyles.hint}>Clicca per vedere la soluzione ↻</div>
        </div>

        {/* --- RETRO DELLA CARTA --- */}
        <div style={{ ...cardStyles.face, ...cardStyles.back }}>
            <h4 style={{margin: '0 0 10px 0', color: severityColor}}>Dettagli Guasto</h4>
            <p style={cardStyles.desc}>{error.Descrizione}</p>
            
            <div style={cardStyles.solutionBox}>
                <strong>🛠️ Soluzione Consigliata:</strong><br/>
                {simulatedSolution}
            </div>

            {/* Il click sul bottone non deve girare la carta, quindi stopPropagation */}
            <button 
                onClick={(e) => {
                    e.stopPropagation(); 
                    onAskAi(error.Titolo, error.Descrizione);
                }} 
                style={cardStyles.btnAi}
            >
                ✨ Chiedi a Gemma
            </button>
            
            <div style={cardStyles.hint}>Clicca per tornare indietro ↻</div>
        </div>

      </div>
    </div>
  );
};

// --- PAGINA PRINCIPALE ---
const ErrorPage: React.FC = () => {
  const [errors, setErrors] = useState<BoilerError[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<string>('Tutti');

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const recordList = await pb.collection('Caldaia_codici_errori').getFullList<BoilerError>({
          sort: '-created',
        });
        setErrors(recordList);
        setLoading(false);
      } catch (err) {
        console.error("Errore fetch:", err);
        setLoading(false);
      }
    };

    fetchErrors();
    pb.collection('Caldaia_codici_errori').subscribe<BoilerError>('*', function (e) {
      if (e.action === 'create') {
        setErrors((prev) => [e.record, ...prev]);
      } else if (e.action === 'update') {
        setErrors((prev) => prev.map((item) => (item.id === e.record.id ? e.record : item)));
      }
    });
    return () => { pb.collection('Caldaia_codici_errori').unsubscribe(); };
  }, []);

  const askGemma = (errorMsg: string, context: string) => {
    setLoading(true);
    setTimeout(() => {
        setAiResponse(`🤖 **Analisi Gemma**\n\nErrore: "${errorMsg}"\n\nDiagnosi Approfondita: Sulla base del protocollo, i valori di telemetria indicano un'anomalia nel sottosistema di accensione.\n\nAzione: 1. Reset fisico. 2. Sostituzione elettrodo.`);
        setLoading(false);
    }, 1500);
  };

  const getSeverityColor = (code: string) => {
     if (code.startsWith('M')) return 'var(--colore-terziario)';
     return 'var(--colore-secondario)';
  };

  const filteredErrors = errors.filter((err) => {
    if (currentFilter === 'Tutti') return true;
    return err.Protocollo === currentFilter;
  });

  const criticalCount = errors.filter(e => e.Codice.startsWith('M')).length; 
  const warningCount = errors.length - criticalCount;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Diagnostica Caldaia</h1>
        {loading && <span style={{fontSize: '0.9rem', opacity: 0.7}}>Sync...</span>}
      </div>

      {/* KPI Dashboard */}
      <div style={styles.kpiContainer}>
        <div style={{ ...styles.card, borderLeftColor: 'var(--colore-terziario)' }}>
          <div style={{ ...styles.kpiLabel, color: 'var(--colore-terziario)' }}>Allarmi Critici</div>
          <p style={{ ...styles.bigNumber, color: 'var(--colore-terziario)' }}>{criticalCount}</p>
        </div>
        <div style={{ ...styles.card, borderLeftColor: 'var(--colore-secondario)' }}>
          <div style={{ ...styles.kpiLabel, color: 'var(--colore-secondario)' }}>Avvisi Attivi</div>
          <p style={{ ...styles.bigNumber, color: 'var(--colore-secondario)' }}>{warningCount}</p>
        </div>
        <div style={{ ...styles.card, borderLeftColor: 'var(--colore-primario)' }}>
          <div style={{ ...styles.kpiLabel, color: 'var(--colore-primario)' }}>Stato Sistema</div>
          <p style={{ ...styles.bigNumber, color: 'var(--colore-primario)', fontSize: '1.5rem', marginTop: '10px' }}>ONLINE ●</p>
        </div>
      </div>

      {/* BOTTONI FILTRO */}
      <div style={styles.filterContainer}>
        {['Tutti', 'Matter', 'OpenTherm'].map((filterName) => (
            <button
                key={filterName}
                onClick={() => setCurrentFilter(filterName)}
                style={{
                    ...styles.filterBtn,
                    backgroundColor: currentFilter === filterName ? 'var(--colore-secondario)' : 'transparent',
                    color: currentFilter === filterName ? '#fff' : 'var(--colore-secondario)',
                }}
            >
                {filterName}
            </button>
        ))}
      </div>

      {/* --- GRIGLIA ERRORI (CARDS 3D) --- */}
      <div style={styles.gridContainer}>
        {filteredErrors.map((err) => (
            <SingleCard 
                key={err.id} 
                error={err} 
                onAskAi={askGemma}
                severityColor={getSeverityColor(err.Codice)}
            />
        ))}
      </div>
      
      {filteredErrors.length === 0 && !loading && (
            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6, gridColumn: '1 / -1' }}>
                Nessun errore trovato per il filtro "{currentFilter}".
            </div>
      )}

      {/* MODALE AI */}
      {aiResponse && (
        <div style={styles.aiModal}>
          <div style={styles.aiContent}>
            <h3 style={{ color: 'var(--colore-secondario)', marginTop: 0 }}>✨ Analisi Gemma</h3>
            <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>{aiResponse}</p>
            <button onClick={() => setAiResponse(null)} style={styles.btnClose}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorPage;