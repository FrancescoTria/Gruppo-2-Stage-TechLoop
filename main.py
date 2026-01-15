import time
import paho.mqtt.client as mqtt  # È la libreria standard per far parlare Python con MQTT.
import json                      # Serve per formattare i dati in un modo che Home Assistant possa leggere
import random

# Configurazione MQTT (come da architettura)
# Qui non usiamo "localhost" o un IP. 
# Usiamo il nome del servizio definito nel docker-compose. 
# Docker risolverà automaticamente questo nome nell'IP corretto all'interno della sua rete virtuale
BROKER = "mosquitto" 
PORT = 1883
TOPIC_BASE = "opentherm-gateway"

# Variabili di stato della Caldaia
state = {
    "water_temp": 20.0,      # Temperatura attuale acqua
    "pressure": 1.5,         # Pressione bar
    "flame_on": False,       # Stato fiamma
    "modulation": 0,         # % Modulazione
    "setpoint": 40.0         # Temperatura richiesta da HA
}

# Quando HA ci manda un comando (es. cambia setpoint)
# Questa funzione viene attivata automaticamente solo quando arriva un messaggio dal Broker.
# Decodifica i byte ricevuti, li trasforma in numero (float) e aggiorna il setpoint 
# (la temperatura desiderata). È come se girassi la manopola del termostato.
def on_message(client, userdata, msg):
    try:
        payload = float(msg.payload.decode())
        print(f"Ricevuto comando setpoint: {payload}")
        state["setpoint"] = payload
    except Exception as e:
        print(f"Errore comando: {e}")

client = mqtt.Client()
client.on_message = on_message

print("Connessione al broker MQTT...")
# Se il container della simulazione parte prima del container Mosquitto (il broker), andrebbe in crash. 
# Questo codice dice: "Se fallisci, aspetta 5 secondi e riprova finché non ti connetti".
while True:
    try:
        client.connect(BROKER, PORT, 60)
        break
    except:
        print("In attesa del broker...")
        time.sleep(5)

# Ci iscriviamo al topic dove HA manda i comandi
client.subscribe(f"{TOPIC_BASE}/setpoint/set")  
#Dice al broker "Avvisami se qualcuno pubblica su questo topic"
client.loop_start()
#Avvia un processo in background (thread) che gestisce la rete, 
# mantenendo la connessione viva senza bloccare il resto dello script.

# Loop principale: simula la fisica della caldaia
while True:
    # Logica semplice: se temp < setpoint, accendi fiamma
    # Logica del Termostato: Se l'acqua è più fredda del target (meno un'isteresi di 2 gradi), 
    # accende la fiamma. Se è troppo calda, la spegne.
    if state["water_temp"] < state["setpoint"] - 2:
        state["flame_on"] = True
        state["modulation"] = 100
    elif state["water_temp"] > state["setpoint"] + 2:
        state["flame_on"] = False
        state["modulation"] = 0
    
    # Simulazione Fisica (Riscaldamento / Raffreddamento)
    # Fisica Simulata: Se la fiamma è accesa, la temperatura sale velocemente (+0.5). 
    # Se è spenta, l'acqua si raffredda lentamente per dispersione termica (-0.1).
    if state["flame_on"]:
        state["water_temp"] += 0.5  # Si scalda
    else:
        state["water_temp"] -= 0.1  # Si raffredda (dispersione)

    # Aggiunge un po' di realismo facendo oscillare la pressione, 
    # altrimenti vedresti un grafico piatto e irreale su Home Assistant
    state["pressure"] = round(1.5 + random.uniform(-0.1, 0.1), 2)
    
    # Prepara il pacchetto JSON (Simula il Gateway ESPHome)
    payload = json.dumps({
        "water_temperature": round(state["water_temp"], 1),
        "return_temperature": round(state["water_temp"] - 10, 1),
        "pressure": state["pressure"],
        "modulation": state["modulation"],
        "flame": "ON" if state["flame_on"] else "OFF"
    })
    
    # Invia i dati a Home Assistant via MQTT
    client.publish(f"{TOPIC_BASE}/status", payload)
    print(f"Dati inviati: {payload}")
    
    time.sleep(2) # Aggiorna ogni 2 secondi