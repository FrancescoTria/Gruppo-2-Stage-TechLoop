import time
import paho.mqtt.client as mqtt
import json
import random

# --- CONFIGURAZIONE ---
BROKER = "mosquitto"
PORT = 1883
TOPIC_BASE = "opentherm-gateway"

# --- STATO INIZIALE ---
state = {
    "water_temp": 35.0,
    "pressure": 1.5,
    "flame_on": False,
    "modulation": 0,
    "setpoint": 40.0,
    "error_code": 0,       # 0 = Nessun errore
    "slave_status": 0,     # Bitmask stato
    "fault_active": False  # Se True, simuliamo la rottura
}

# --- FUNZIONI MQTT ---
def on_connect(client, userdata, flags, rc):
    print(f"Connesso al Broker con codice: {rc}")
    # Ci iscriviamo a DUE argomenti: il setpoint e il comando guasti
    client.subscribe(f"{TOPIC_BASE}/setpoint/set")
    client.subscribe(f"{TOPIC_BASE}/fault/set") 

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode()
    print(f"[RX] Messaggio ricevuto su {topic}: {payload}")

    # Logica Setpoint Temperatura
    if "setpoint" in topic:
        try:
            state["setpoint"] = float(payload)
        except:
            pass

    # Logica Guasto 
    elif "fault" in topic:
        if payload == "ON":
            state["fault_active"] = True
            print("!!! ATTENZIONE: SIMULAZIONE ROTTURA TUBO ATTIVATA !!!")
        else:
            state["fault_active"] = False
            state["pressure"] = 1.5 # Ripristina pressione
            state["error_code"] = 0
            print("!!! RIPARAZIONE EFFETTUATA: SISTEMA OK !!!")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

print("Avvio simulazione Caldaia (Tentativo connessione)...")
while True:
    try:
        client.connect(BROKER, PORT, 60)
        break
    except:
        time.sleep(5)

client.loop_start()

# --- CICLO PRINCIPALE ---
while True:
    # 1. GESTIONE GUASTO (Rottura Tubo)
    if state["fault_active"]:
        # Se il guasto è attivo, la pressione scende velocemente
        if state["pressure"] > 0:
            state["pressure"] -= 0.05  # Perde 0.05 bar ogni secondo
            state["pressure"] = round(state["pressure"], 2)
        
        # Se la pressione è critica (< 0.8), scatta l'errore
        if state["pressure"] < 0.8:
            state["error_code"] = 10     # Errore bassa pressione
            state["flame_on"] = False    # Spegni fiamma per sicurezza
            state["modulation"] = 0
    else:
        # Funzionamento Normale: Pressione oscilla intorno a 1.5
        variation = random.uniform(-0.02, 0.02)
        state["pressure"] = round(1.5 + variation, 2)
        state["error_code"] = 0

    # 2. LOGICA TERMOSTATO (Funziona solo se non c'è errore 10)
    if state["error_code"] == 0:
        if state["water_temp"] < state["setpoint"] - 2:
            state["flame_on"] = True
            state["modulation"] = 100
        elif state["water_temp"] > state["setpoint"] + 2:
            state["flame_on"] = False
            state["modulation"] = 0

    # 3. FISICA DELL'ACQUA
    TEMPERATURA_AMBIENTE = 20.0  # La casa non scende mai sotto questa temperatura
    
    if state["flame_on"]:
        state["water_temp"] += 0.4
    else:
        # Si raffredda SOLO se è più calda dell'ambiente
        if state["water_temp"] > TEMPERATURA_AMBIENTE:
            state["water_temp"] -= 0.1 

    # Calcolo Status Bit (Per Home Assistant)
    # Bit 0 = Guasto (1 se attivo), Bit 3 = Fiamma (8 se attiva)
    status_val = 0
    if state["flame_on"]: status_val += 8
    if state["error_code"] > 0: status_val += 1
    
    # 4. INVIO DATI A HOME ASSISTANT
    payload = {
        "ID_0": {"master_status": 0, "slave_status": status_val},
        "ID_25": round(state["water_temp"], 1), # Mandata
        "ID_28": round(state["water_temp"] - 10, 1), # Ritorno (finto)
        "ID_1": state["setpoint"],
        "ID_9": state["pressure"],
        "ID_17": state["modulation"],
        "ID_5": state["error_code"] # Codice errore
    }

    client.publish(f"{TOPIC_BASE}/status", json.dumps(payload))
    time.sleep(1)