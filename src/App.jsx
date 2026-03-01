import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
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

function App() {
  const [sensorData, setSensorData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [statusText, setStatusText] = useState('Connecting...');

  useEffect(() => {
    const sensorRef = ref(database, 'sensor_data/current');
    
    // Listen to Firebase Realtime Database
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensorData(data);
        checkStaleness(data.last_updated);
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
          <h1><i className="fa-solid fa-leaf"></i> Smart Farm</h1>
          <div className="status-indicator">
            <span className={`dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{statusText}</span>
          </div>
        </div>
        <p className="subtitle">Real-time Environmental Monitoring</p>
      </header>

      <main className="grid-container">
        <SensorCard 
            icon="fa-solid fa-temperature-half" 
            iconClass="temp-icon"
            title="Air Temperature" 
            value={formatValue(sensorData?.dht22_temp)} 
            unit="°C" 
            sensorName="DHT22" 
        />
        <SensorCard 
            icon="fa-solid fa-droplet" 
            iconClass="humidity-icon"
            title="Air Humidity" 
            value={formatValue(sensorData?.dht22_humidity)} 
            unit="%" 
            sensorName="DHT22" 
        />
        <SensorCard 
            icon="fa-solid fa-water" 
            iconClass="water-temp-icon"
            title="Water/Soil Temp" 
            value={formatValue(sensorData?.ds18b20_temp)} 
            unit="°C" 
            sensorName="DS18B20" 
        />
        <SensorCard 
            icon="fa-solid fa-seedling" 
            iconClass="soil-icon"
            title="Soil Moisture" 
            value={formatValue(sensorData?.soil_moisture, 0)} 
            unit="%" 
            sensorName="Capacitive Sensor" 
        />
        <SensorCard 
            icon="fa-solid fa-wind" 
            iconClass="gas-icon"
            title="Air Quality (Gas)" 
            value={formatValue(sensorData?.mq135_gas, 0)} 
            unit="PPM" 
            sensorName="MQ-135" 
        />
        <SensorCard 
            icon="fa-solid fa-glass-water" 
            iconClass="turbidity-icon"
            title="Water Turbidity" 
            value={formatValue(sensorData?.turbidity)} 
            unit="NTU" 
            sensorName="Analog Turbidity" 
        />
      </main>

      <footer>
        <p>Last Updated: <span>{lastUpdatedDisplay}</span></p>
      </footer>
    </div>
  );
}

// Reusable Sensor Card Component
function SensorCard({ icon, iconClass, title, value, unit, sensorName }) {
    return (
        <div className="card">
            <div className={`card-icon ${iconClass}`}><i className={icon}></i></div>
            <div className="card-content">
                <h3>{title}</h3>
                <div className="value-container">
                    <span className="value">{value}</span>
                    <span className="unit">{unit}</span>
                </div>
                <p className="sensor-name">{sensorName}</p>
            </div>
        </div>
    );
}

export default App;
