// IMPORTANT: For this mock script to work, you need to set the environment variables
// or initialize it with a service account key file locally.
// E.g.: export FIREBASE_DATABASE_URL="https://gen-lang-client-0865510674-default-rtdb.asia-southeast1.firebasedatabase.app"

// For local testing of this mock without Vercel's env vars, it's easier to just
// hardcode the DB URL if it's in test mode (public read/write).
// However, the Javascript Admin SDK *requires* credentials to initialize.
// If your database is fully PUBLIC for testing, you can use the REST API instead
// of the Admin SDK to keep this mock simple and credential-free for now.

const TARGET_URL =
  "https://gen-lang-client-0865510674-default-rtdb.asia-southeast1.firebasedatabase.app/sensor_data/current.json";

function generateMockData() {
  return {
    dht22_temp: (20 + Math.random() * 10).toFixed(2) * 1, // 20-30 C
    dht22_humidity: (50 + Math.random() * 30).toFixed(2) * 1, // 50-80 %
    ds18b20_temp: (18 + Math.random() * 8).toFixed(2) * 1, // 18-26 C
    soil_moisture: Math.floor(40 + Math.random() * 50), // 40-90 %
    mq135_gas: Math.floor(300 + Math.random() * 200), // 300-500 PPM
    turbidity: (5 + Math.random() * 5).toFixed(2) * 1, // 5-10 NTU
    last_updated: new Date().toISOString(),
  };
}

async function sendDataREST() {
  const data = generateMockData();

  try {
    const response = await fetch(TARGET_URL, {
      method: "PUT", // PUT overwrites the /current node
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log(
        `[${new Date().toLocaleTimeString()}] Sent Data via REST. Status: ${response.status}`,
        data.dht22_temp + "°C",
      );
    } else {
      console.error(
        `[${new Date().toLocaleTimeString()}] Error:`,
        responseData,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Connection error:`,
      error.message,
    );
  }
}

console.log("Starting mock ESP32 data stream directly to Firebase REST API...");
console.log(`Targeting: ${TARGET_URL}`);

// Send initial data immediately
sendDataREST();

// Send data every 5 seconds
setInterval(sendDataREST, 5000);
