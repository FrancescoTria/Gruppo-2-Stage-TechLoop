// src/types.ts

// Estendiamo il tipo base di PocketBase se necessario, ma qui lo facciamo semplice
export interface BoilerError {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
  
  // I tuoi campi specifici
  code: string;
  severity: 'info' | 'warning' | 'critical'; // Tipi letterali per autocompletamento
  message: string;
  component: string;
  is_resolved: boolean;
  raw_data?: any; // Opzionale
}