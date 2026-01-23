# Procedura di Migrazione a Matter Reale (Hardware)

Questo documento spiega come passare dalla simulazione attuale all'integrazione di un dispositivo Matter fisico (es. Boiler, Termostato, Lampadine).

## Prerequisiti Hardware
* **Adattatore Bluetooth:** Il computer su cui gira Docker deve avere il Bluetooth attivo (necessario per il pairing iniziale).
* **Adattatore Thread (Opzionale ma consigliato):** Se il dispositivo Matter usa Thread (es. Eve, Nanoleaf) invece del Wi-Fi, serve una chiavetta SkyConnect o simile collegata al PC.

## Fase 1: Aggiornamento Rete Docker
I dispositivi Matter reali usano protocolli (mDNS/IPv6) che non passano facilmente attraverso la rete "virtuale" di Docker. Dobbiamo dare al `matter-server` accesso diretto alla scheda di rete.

1.  Apri `docker-compose.yaml`.
2.  Vai alla sezione `matter-server`.
3.  **De-commenta** (togli `#`) la riga: `network_mode: host`.
4.  **Commenta** (aggiungi `#`) l'intera sezione `ports` e le righe `- "5580:5580"`.
    * *Nota: In modalità host, le porte sono aperte automaticamente.*
5.  Salva e riavvia i container:

```bash
docker-compose up -d --build