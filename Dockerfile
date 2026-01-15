# Questo file è un manuale di istruzioni per Docker 
# su come costruire il "computer virtuale" che eseguirà il codice Python

# Usa un'immagine Python leggera
FROM python:3.9-slim

# Imposta la directory di lavoro
WORKDIR /app

# Installa la libreria per MQTT
RUN pip install paho-mqtt

# Copia lo script nella cartella
COPY main.py .

# Esegui lo script senza buffer (per vedere i log subito)
CMD ["python", "-u", "main.py"]