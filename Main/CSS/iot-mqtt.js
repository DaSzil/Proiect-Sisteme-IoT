/* ===== MQTT Room Sensor Dashboard ===== */
(() => {
    /* Broker */
    const BROKER_WSS = 'wss://d0bf3c7ce3ec409ebe1be86cf04fcaf2.s1.eu.hivemq.cloud:8884/mqtt';
    const MQTT_USER  = 'remus';
    const MQTT_PASS  = 'Remus123';
    const TOPIC_SUB  = 'campus/room/sensor-01/data';

    let client = null, staleTimer = null;

    function connectMQTT(){
        client = mqtt.connect(BROKER_WSS, {
            clientId: 'webui-room-' + Math.random().toString(16).slice(2),
            username: MQTT_USER, password: MQTT_PASS,
            keepalive: 60, clean: true, reconnectPeriod: 3000
        });

        client.on('connect', () => {
            $('#mqttState').textContent = 'Conectat';
            $('#mqttState').classList.add('bg-emerald-600/30');
            log(`✅ MQTT conectat (app ${window.APP_VER})`);

            client.subscribe(TOPIC_SUB, { qos: 1 }, (err)=> {
                if(err){ log('❌ Subscribe: ' + err.message); return; }
                log('📡 Subscribed to: ' + TOPIC_SUB);
            });
        });

        client.on('error', e => log('❌ MQTT error: ' + e.message));
        client.on('close', () => {
            $('#mqttState').textContent = 'Neconectat';
            $('#mqttState').classList.remove('bg-emerald-600/30');
            log('🔌 Conexiune închisă');
        });

        // Acesta este noul "message handler"
        client.on('message', (topic, msgBuf)=>{
            if (topic !== TOPIC_SUB) return;

            const msgString = msgBuf.toString();
            log(`⬅️ ${topic}: ${msgString}`);

            try {
                const data = JSON.parse(msgString);

                // --- Senzori existenți ---
                $('#liveTemp').textContent = data.temp ?? '—';
                $('#liveHum').textContent = data.hum ?? '—';
                $('#liveLight').textContent = data.light ?? '—';
                $('#livePressure').textContent = data.pressure ?? '—';

                // --- LOGICĂ NOUĂ PENTRU VU METER ---
                const noiseText = $('#liveNoise');
                const segments = $$('#vuMeter .vu-segment'); // Selectăm toate segmentele

                if (data.noiseLevel != null) {
                    let percent = Math.max(0, Math.min(100, data.noiseLevel));
                    noiseText.textContent = Math.round(percent);

                    // Calculăm câte segmente trebuie să fie 'on' (de la 0 la 10)
                    const activeSegments = Math.round(percent / 10);

                    // Parcurgem toate segmentele și le setăm starea 'on' sau 'off'
                    segments.forEach((segment, index) => {
                        if (index < activeSegments) {
                            // Acest segment este 'on'
                            segment.classList.remove('bg-black/20');

                            // Setăm culoarea în funcție de poziție
                            if (index < 5) { // Primele 5 segmente (0-4)
                                segment.classList.add('bg-green-500');
                            } else if (index < 8) { // Următoarele 3 (5-7)
                                segment.classList.add('bg-yellow-500');
                            } else { // Ultimele 2 (8-9)
                                segment.classList.add('bg-red-500');
                            }
                        } else {
                            // Acest segment este 'off'
                            segment.classList.add('bg-black/20');
                            segment.classList.remove('bg-green-500', 'bg-yellow-500', 'bg-red-500');
                        }
                    });

                } else {
                    // Resetăm dacă nu primim date (noiseLevel e null)
                    noiseText.textContent = '—';
                    segments.forEach(segment => {
                        segment.classList.add('bg-black/20');
                        segment.classList.remove('bg-green-500', 'bg-yellow-500', 'bg-red-500');
                    });
                }
                // --- SFÂRȘIT LOGICĂ VU METER ---

                // Actualizăm timestamp-ul
                $('#liveTime').textContent = new Date().toLocaleString('ro-RO');
                $('#liveStale').classList.add('hidden');
                clearTimeout(staleTimer);
                staleTimer = setTimeout(()=>$('#liveStale').classList.remove('hidden'), 120000);

            } catch (e) {
                log('❌ Eroare JSON: ' + e.message);
            }
        });
    }

    // --- AM ȘTERS CODUL DEFECT DE AICI ---
    // Logica pentru 'noiseBar' a fost mutată complet
    // în interiorul lui client.on('message')

    connectMQTT();
})();