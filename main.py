import time
import paho.mqtt.client as mqtt
import json
import random
import requests

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

# --- FUNZIONI POCKETBASE ---
def get_pocketbase_fix(error_code, protocollo="OpenTherm"):
    # Usiamo host.docker.internal per uscire dal container
    pb_url = "http://pocketbase:8090/api/collections/Caldaia_codici_errori/records"
    
    # NOTA: Qui uso le Maiuscole perché nel tuo DB si chiamano "Codice" e "Protocollo"
    params = {
        "filter": f'Codice="{error_code}" && Protocollo="{protocollo}"'
    }
    
    try:
        r = requests.get(pb_url, params=params, timeout=2)
        
        # Se vuoi vedere i log di debug, togli il commento alla riga sotto:
        # print(f"[DEBUG] DB Status: {r.status_code} | Risposta: {r.text}")

        data = r.json()
        if data.get("items") and len(data["items"]) > 0:
            # NOTA: Anche qui "Soluzione" con la S maiuscola
            return data["items"][0]["Soluzione"]
            
    except Exception as e:
        print(f"Errore DB: {e}")

    return "Contattare assistenza tecnica."

# --- FUNZIONI MQTT ---
def on_connect(client, userdata, flags, rc):
    print(f"Connesso al Broker con codice: {rc}")
    client.subscribe(f"{TOPIC_BASE}/setpoint/set")
    client.subscribe(f"{TOPIC_BASE}/fault/set") 

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode()
    print(f"[RX] Messaggio ricevuto su {topic}: {payload}")

    if "setpoint" in topic:
        try:
            state["setpoint"] = float(payload)
        except ValueError:
            pass
            
    elif "fault" in topic:
        if payload == "ON":
            state["fault_active"] = True
            print("!!! ATTENZIONE: SIMULAZIONE ROTTURA TUBO ATTIVATA !!!")
        elif payload == "OFF":
            state["fault_active"] = False
            state["pressure"] = 1.5
            state["error_code"] = 0
            print("!!! RIPARAZIONE EFFETTUATA: SISTEMA OK !!!")

# --- SETUP MQTT ---
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

# --- LOOP PRINCIPALE ---
while True:
    time.sleep(2)
    
    # 1. SIMULAZIONE GUASTO (Pressione scende)
    if state["fault_active"]:
        state["pressure"] -= 0.1
        if state["pressure"] < 0.8:
            state["error_code"] = 10 
            state["pressure"] = max(0.0, state["pressure"])
    else:
        # Recupero lento pressione se non c'è guasto
        if state["pressure"] < 1.5:
             state["pressure"] += 0.05
             state["pressure"] = round(state["pressure"], 2)
        state["error_code"] = 0

    # 2. LOGICA TERMOSTATO
    if state["error_code"] == 0:
        if state["water_temp"] < state["setpoint"] - 2:
            state["flame_on"] = True
            state["modulation"] = 100
        elif state["water_temp"] > state["setpoint"] + 2:
            state["flame_on"] = False
            state["modulation"] = 0

    # 3. FISICA DELL'ACQUA
    TEMPERATURA_AMBIENTE = 20.0
    if state["flame_on"]:
        state["water_temp"] += 0.4
    else:
        if state["water_temp"] > TEMPERATURA_AMBIENTE:
            state["water_temp"] -= 0.1 

    # 4. PREPARAZIONE DATI PER HA
    # Se c'è errore, interrogo PocketBase
    error_desc = ""
    if state["error_code"] != 0:
        error_desc = get_pocketbase_fix(state["error_code"])

    payload = {
        "ID_0": {"slave_status": (8 if state["flame_on"] else 0) + (1 if state["error_code"] > 0 else 0)},
        "ID_5": state["error_code"],
        "ID_9": round(state["pressure"], 2),
        "ID_25": round(state["water_temp"], 1),
        "ID_28": round(state["water_temp"] - 5, 1), # Ritorno finto
        "ID_1": state["setpoint"],
        "error_description": error_desc 
    }
    
    client.publish(f"{TOPIC_BASE}/status", json.dumps(payload))