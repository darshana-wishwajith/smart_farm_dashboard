import { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import emailjs from '@emailjs/browser';
import './App.css';

const firebaseConfig = {
  apiKey: "AIzaSyDfGMVPzxX5EU8tKRuFpR0DDSlTrhoppu8",
  authDomain: "gen-lang-client-0865510674.firebaseapp.com",
  projectId: "gen-lang-client-0865510674",
  storageBucket: "gen-lang-client-0865510674.firebasestorage.app",
  messagingSenderId: "409810718879",
  appId: "1:409810718879:web:9edd671db4c7b5e9ac92aa",
  databaseURL: "https://gen-lang-client-0865510674-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Default thresholds if none exist in localStorage
const DEFAULT_THRESHOLDS = {
  dht22_temp_high: 35,
  dht22_temp_low: 10,
  dht22_humidity_high: 80,
  dht22_humidity_low: 30,
  ds18b20_temp_high: 30,
  ds18b20_temp_low: 15,
  soil_moisture_high: 90,
  soil_moisture_low: 20,
  mq135_gas_high: 800,
  turbidity_high: 20
};

// Replace with your EmailJS credentials
const EMAILJS_SERVICE_ID = "service_u1zq5yn"; 
const EMAILJS_TEMPLATE_ID = "template_8mj83ty";
const EMAILJS_PUBLIC_KEY = "pTb_ynqzyDnxy6hE8";

function App() {
  const [sensorData, setSensorData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [statusText, setStatusText] = useState('Connecting...');
  
  // Settings & Threshold State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('smartFarmThresholds');
    return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS;
  });

  const [alertConfig, setAlertConfig] = useState(() => {
    const saved = localStorage.getItem('smartFarmAlertConfig');
    return saved ? JSON.parse(saved) : { email: "", alertsEnabled: false };
  });

  // Cool down timer reference to prevent spamming emails (1 hour cooldown per exact alert message)
  const lastAlertsSent = useRef({});

  useEffect(() => {
    const sensorRef = ref(database, 'sensor_data/current');
    
    // Listen to Firebase Realtime Database
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensorData(data);
        checkStaleness(data.last_updated);
        checkThresholds(data); // Run checks when new data arrives
      } else {
        setIsConnected(false);
        setStatusText('No Data in DB');
      }
    }, (error) => {
      console.error("Firebase read error:", error);
      setIsConnected(false);
      setStatusText('DB Error');
    });

    // Check staleness every 5 seconds in case device drops offline and DB stops updating
    const interval = setInterval(() => {
        if(sensorData?.last_updated) {
           checkStaleness(sensorData.last_updated);
        }
    }, 5000);

    return () => {
        unsubscribe();
        clearInterval(interval);
    };
  }, [sensorData?.last_updated]);

  const checkStaleness = (lastUpdatedStr) => {
      if (!lastUpdatedStr) return;
      const updateTime = new Date(lastUpdatedStr);
      const diffInSeconds = (new Date() - updateTime) / 1000;
      
      if (diffInSeconds > 30) {
          setIsConnected(false);
          setStatusText("ESP32 Offline (Old Data)");
      } else {
          setIsConnected(true);
          setStatusText("Live");
      }
  };

  const checkThresholds = (data) => {
    if (!alertConfig.alertsEnabled || !alertConfig.email) return;

    let alerts = [];

    if (data.dht22_temp > thresholds.dht22_temp_high) alerts.push(`Air Temp High: ${data.dht22_temp}°C`);
    if (data.dht22_temp < thresholds.dht22_temp_low) alerts.push(`Air Temp Low: ${data.dht22_temp}°C`);
    if (data.dht22_humidity > thresholds.dht22_humidity_high) alerts.push(`Air Humidity High: ${data.dht22_humidity}%`);
    if (data.dht22_humidity < thresholds.dht22_humidity_low) alerts.push(`Air Humidity Low: ${data.dht22_humidity}%`);
    if (data.ds18b20_temp > thresholds.ds18b20_temp_high) alerts.push(`Water Temp High: ${data.ds18b20_temp}°C`);
    if (data.ds18b20_temp < thresholds.ds18b20_temp_low) alerts.push(`Water Temp Low: ${data.ds18b20_temp}°C`);
    if (data.soil_moisture > thresholds.soil_moisture_high) alerts.push(`Soil Moisture High: ${data.soil_moisture}%`);
    if (data.soil_moisture < thresholds.soil_moisture_low) alerts.push(`Soil Moisture Low: ${data.soil_moisture}%`);
    if (data.mq135_gas > thresholds.mq135_gas_high) alerts.push(`Gas/Air Quality High: ${data.mq135_gas} PPM`);
    if (data.turbidity > thresholds.turbidity_high) alerts.push(`Turbidity High: ${data.turbidity} NTU`);

    if (alerts.length > 0) {
      const alertMessage = alerts.join(', ');
      triggerEmailAlert(alertMessage);
    }
  };

  const triggerEmailAlert = (message) => {
      const now = Date.now();
      const lastSent = lastAlertsSent.current[message] || 0;
      const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown per specific alert message

      if (now - lastSent > COOLDOWN_MS) {
          console.log("Sending Email Alert: ", message);
          
          emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
             to_email: alertConfig.email,
             message: message,
             time: new Date().toLocaleString()
          }, EMAILJS_PUBLIC_KEY).then(() => {
              console.log("Email sent successfully!");
              lastAlertsSent.current[message] = now;
          }).catch(err => {
              console.error("Failed to send email alert", err);
          });
      }
  };

  const saveSettings = (newThresholds, newAlertConfig) => {
    setThresholds(newThresholds);
    setAlertConfig(newAlertConfig);
    localStorage.setItem('smartFarmThresholds', JSON.stringify(newThresholds));
    localStorage.setItem('smartFarmAlertConfig', JSON.stringify(newAlertConfig));
    setIsSettingsOpen(false);
  };

  const formatValue = (val, decimals = 1) => {
      return val !== undefined && val !== null ? Number(val).toFixed(decimals) : '--';
  };

  const lastUpdatedDisplay = sensorData?.last_updated 
        ? new Date(sensorData.last_updated).toLocaleString() 
        : 'Never';

  return (
    <div className="dashboard-container">
      <header>
        <div className="header-inner">
          <div className="title-group">
            <h1><i className="fa-solid fa-leaf"></i> Smart Farm</h1>
            <p className="subtitle">Real-time Environmental Monitoring</p>
          </div>
          <div className="header-actions">
            <div className="status-indicator">
              <span className={`dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
              <span>{statusText}</span>
            </div>
            <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
              <i className="fa-solid fa-gear"></i> Settings
            </button>
          </div>
        </div>
      </header>

      <main className="grid-container">
        <SensorCard 
            icon="fa-solid fa-temperature-half" 
            iconClass="temp-icon"
            title="Air Temperature" 
            value={formatValue(sensorData?.dht22_temp)} 
            unit="°C" 
            sensorName="DHT22"
            isAlert={sensorData?.dht22_temp > thresholds.dht22_temp_high || sensorData?.dht22_temp < thresholds.dht22_temp_low} 
        />
        <SensorCard 
            icon="fa-solid fa-droplet" 
            iconClass="humidity-icon"
            title="Air Humidity" 
            value={formatValue(sensorData?.dht22_humidity)} 
            unit="%" 
            sensorName="DHT22" 
            isAlert={sensorData?.dht22_humidity > thresholds.dht22_humidity_high || sensorData?.dht22_humidity < thresholds.dht22_humidity_low} 
        />
        <SensorCard 
            icon="fa-solid fa-water" 
            iconClass="water-temp-icon"
            title="Water/Soil Temp" 
            value={formatValue(sensorData?.ds18b20_temp)} 
            unit="°C" 
            sensorName="DS18B20" 
            isAlert={sensorData?.ds18b20_temp > thresholds.ds18b20_temp_high || sensorData?.ds18b20_temp < thresholds.ds18b20_temp_low} 
        />
        <SensorCard 
            icon="fa-solid fa-seedling" 
            iconClass="soil-icon"
            title="Soil Moisture" 
            value={formatValue(sensorData?.soil_moisture, 0)} 
            unit="%" 
            sensorName="Capacitive Sensor" 
            isAlert={sensorData?.soil_moisture > thresholds.soil_moisture_high || sensorData?.soil_moisture < thresholds.soil_moisture_low} 
        />
        <SensorCard 
            icon="fa-solid fa-wind" 
            iconClass="gas-icon"
            title="Air Quality (Gas)" 
            value={formatValue(sensorData?.mq135_gas, 0)} 
            unit="PPM" 
            sensorName="MQ-135" 
            isAlert={sensorData?.mq135_gas > thresholds.mq135_gas_high} 
        />
        <SensorCard 
            icon="fa-solid fa-glass-water" 
            iconClass="turbidity-icon"
            title="Water Turbidity" 
            value={formatValue(sensorData?.turbidity)} 
            unit="NTU" 
            sensorName="Analog Turbidity" 
            isAlert={sensorData?.turbidity > thresholds.turbidity_high} 
        />
      </main>

      <footer>
        <p>Last Updated: <span>{lastUpdatedDisplay}</span></p>
      </footer>

      {isSettingsOpen && (
        <SettingsModal 
          currentThresholds={thresholds} 
          currentAlertConfig={alertConfig} 
          onSave={saveSettings} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}
    </div>
  );
}

// Reusable Sensor Card Component
function SensorCard({ icon, iconClass, title, value, unit, sensorName, isAlert }) {
    return (
        <div className={`card ${isAlert ? 'alert-pulse' : ''}`}>
            <div className={`card-icon ${isAlert ? 'alert-icon' : iconClass}`}><i className={icon}></i></div>
            <div className="card-content">
                <h3 className={isAlert ? 'alert-text' : ''}>{title}</h3>
                <div className="value-container">
                    <span className={`value ${isAlert ? 'alert-text' : ''}`}>{value}</span>
                    <span className={`unit ${isAlert ? 'alert-text' : ''}`}>{unit}</span>
                </div>
                <p className="sensor-name">{sensorName}</p>
            </div>
        </div>
    );
}

// Settings Modal Component
function SettingsModal({ currentThresholds, currentAlertConfig, onSave, onClose }) {
  const [thresh, setThresh] = useState({...currentThresholds});
  const [config, setConfig] = useState({...currentAlertConfig});

  const handleChange = (e) => {
    setThresh({...thresh, [e.target.name]: Number(e.target.value)});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(thresh, config);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2><i className="fa-solid fa-bell"></i> Alert Settings</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="settings-section">
            <h3>Email Configuration</h3>
            <div className="input-group full-width">
              <label>
                <input 
                  type="checkbox" 
                  checked={config.alertsEnabled} 
                  onChange={(e) => setConfig({...config, alertsEnabled: e.target.checked})} 
                /> Enable Email Alerts
              </label>
            </div>
            {config.alertsEnabled && (
              <div className="input-group full-width">
                <label>Alert Email Address</label>
                <input 
                  type="email" 
                  value={config.email} 
                  onChange={(e) => setConfig({...config, email: e.target.value})} 
                  placeholder="name@example.com" 
                  required={config.alertsEnabled}
                />
              </div>
            )}
          </div>

          <div className="settings-section">
            <h3>DHT22 Air Temp (°C)</h3>
            <div className="grid-2">
              <div className="input-group">
                <label>Low Alert</label>
                <input type="number" name="dht22_temp_low" value={thresh.dht22_temp_low} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>High Alert</label>
                <input type="number" name="dht22_temp_high" value={thresh.dht22_temp_high} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>DHT22 Humidity (%)</h3>
            <div className="grid-2">
              <div className="input-group">
                <label>Low Alert</label>
                <input type="number" name="dht22_humidity_low" value={thresh.dht22_humidity_low} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>High Alert</label>
                <input type="number" name="dht22_humidity_high" value={thresh.dht22_humidity_high} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>DS18B20 Water/Soil Temp (°C)</h3>
            <div className="grid-2">
              <div className="input-group">
                <label>Low Alert</label>
                <input type="number" name="ds18b20_temp_low" value={thresh.ds18b20_temp_low} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>High Alert</label>
                <input type="number" name="ds18b20_temp_high" value={thresh.ds18b20_temp_high} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Soil Moisture (%)</h3>
            <div className="grid-2">
              <div className="input-group">
                <label>Low Alert</label>
                <input type="number" name="soil_moisture_low" value={thresh.soil_moisture_low} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>High Alert</label>
                <input type="number" name="soil_moisture_high" value={thresh.soil_moisture_high} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Other Sensors</h3>
            <div className="grid-2">
              <div className="input-group">
                <label>MQ-135 Gas High (PPM)</label>
                <input type="number" name="mq135_gas_high" value={thresh.mq135_gas_high} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>Turbidity High (NTU)</label>
                <input type="number" name="turbidity_high" value={thresh.turbidity_high} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
