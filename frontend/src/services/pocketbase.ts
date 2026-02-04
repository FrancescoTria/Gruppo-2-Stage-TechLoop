import PocketBase from 'pocketbase';

// URL del tuo backend (es. Docker container)
const pb = new PocketBase('http://127.0.0.1:8090');

// Opzionale: disabilita l'auto-cancellazione se vuoi gestire i token manualmente
pb.autoCancellation(false);

export default pb;