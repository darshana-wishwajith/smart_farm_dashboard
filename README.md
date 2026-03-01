# Smart Farm Dashboard

A beautiful, premium, mobile-responsive real-time web dashboard for a Smart Farm, built with React, Vite, and Firebase Realtime Database.

## Features

- **Real-time Monitoring:** Connects instantly to Firebase Realtime Database to display live sensor values.
- **Responsive Design:** Premium UI aesthetics leveraging CSS glassmorphism, responsive CSS grids, and FontAwesome icons that works beautifully on mobile, tablet, and desktop.
- **Connection Status:** Automatically checks for data staleness to indicate if the hardware (ESP32) is offline or actively streaming.

## Supported Sensors

- **DHT22**: Air Temperature (`°C`) and Air Humidity (`%`)
- **DS18B20**: Waterproof Water/Soil Temperature (`°C`)
- **Capacitive Sensor**: Soil Moisture (`%`)
- **MQ-135**: Air Quality/Gas (`PPM`)
- **Analog Sensor**: Water Turbidity (`NTU`)

## Getting Started

### Prerequisites

- Node.js installed

### Local Development

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd smart-farm-dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### Hardware Integration (ESP32)

Your ESP32 should be programmed to make `PUT` requests to your Firebase Realtime database at the `/sensor_data/current.json` endpoint.

A mock Node.js script `mock_esp32.js` is included in this repository to simulate hardware data for testing the dashboard. Run it with:

```bash
node mock_esp32.js
```

## Deployment (Vercel, Netlify, Github Pages)

This project is a static React Single Page Application (SPA). To deploy to Vercel:

1. Push this repository to GitHub.
2. Go to Vercel, click "Add New Project", and import the GitHub repository.
3. Vercel will automatically detect the Vite React framework and configure the build settings.
4. Click **Deploy**.
