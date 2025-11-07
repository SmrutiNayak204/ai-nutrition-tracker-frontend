// =============================================
// script.js (updated for Netlify runtime env.js)
// =============================================

// Runtime-configured backend base URL.
// Netlify will inject frontend/env.js with: window._ENV = { API_URL: "https://your-backend.onrender.com" }
// index.html also sets window.API_BASE as a convenience alias.
const BASE_URL = (typeof window !== "undefined" && (window.API_BASE || (window._ENV && window._ENV.API_URL))) || "http://127.0.0.1:5000";

let calorieChart = null;

// Utility to safely parse JSON responses
async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    return { error: "Invalid JSON from server", rawStatus: response.status };
  }
}

// =============================
// 👤 User Registration (upsert)
// =============================
document.getElementById("register-form").onsubmit = async (e) => {
  e.preventDefault();
  const formDataObj = Object.fromEntries(new FormData(e.target).entries());

  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formDataObj)
    });

    const data = await parseJsonSafe(res);

    const statusEl = document.getElementById("register-status");
    if (!res.ok) {
      const msg = data?.message || data?.error || `Server error ${res.status}`;
      statusEl.innerText = `❌ ${msg}`;
      console.error("Register failed:", data);
      return;
    }

    const bmiText = data.bmi ? `BMI: ${data.bmi}` : "BMI: N/A";
    statusEl.innerText = `✅ ${data.message || "Profile saved"} | ${bmiText} | Daily Target: ${data.calorie_target || "N/A"} kcal`;
  } catch (err) {
    console.error("Register error:", err);
    document.getElementById("register-status").innerText = "❌ Network error — couldn't reach server.";
  }
};

// =============================
// 📸 Image Upload and Prediction
// =============================
document.getElementById("upload-form").onsubmit = async (e) => {
  e.preventDefault();
  const formElement = e.target;
  const formData = new FormData(formElement);

  const resultDiv = document.getElementById("result");
  resultDiv.style.display = "block";
  resultDiv.innerHTML = "<p>Analyzing image…</p>";

  try {
    const res = await fetch(`${BASE_URL}/upload`, {
      method: "POST",
      body: formData
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      const msg = data?.error || data?.message || `Server error ${res.status}`;
      resultDiv.innerHTML = `<p style="color:red;">Error: ${msg}</p>`;
      console.error("Upload error:", data);
      return;
    }

    // Clear previous content and show results
    if (data.error) {
      resultDiv.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`;
      return;
    }

    // If it's a Salad (multiple types)
    if (data.predicted_food === "Salad" && typeof data.nutrition === "object" && !("calories" in data.nutrition)) {
      let html = `<h3>🥗 ${data.predicted_food} (${data.confidence ?? "N/A"}% confidence)</h3>`;
      html += "<p><b>Possible Salad Types:</b></p>";
      for (const [type, vals] of Object.entries(data.nutrition)) {
        html += `
          <div class="salad-type">
            <h4>${type}</h4>
            <p>Calories: ${vals.calories}</p>
            <p>Protein: ${vals.protein}g | Fat: ${vals.fat}g | Carbs: ${vals.carbs}g | Fiber: ${vals.fiber}g</p>
          </div>
        `;
      }
      html += `<hr><p><b>Total Calories Today:</b> ${data.total_calories_today || 0} kcal</p>`;
      html += data.target_exceeded ? "<p style='color:red;'>⚠️ Daily target exceeded!</p>" : "<p style='color:green;'>✅ Within daily target.</p>";
      if (data.suggestions) html += `<p><b>Suggestions:</b><br>${data.suggestions.join("<br>")}</p>`;
      resultDiv.innerHTML = html;
    } else {
      const nut = data.nutrition || {};
      resultDiv.innerHTML = `
        <h3>🍽️ ${data.predicted_food || "Unknown"} (${data.confidence ?? "N/A"}% confidence)</h3>
        <p><b>Calories:</b> ${nut.calories ?? "N/A"}</p>
        <p><b>Protein:</b> ${nut.protein ?? "N/A"}g | <b>Fat:</b> ${nut.fat ?? "N/A"}g | <b>Carbs:</b> ${nut.carbs ?? "N/A"}g | <b>Fiber:</b> ${nut.fiber ?? "N/A"}g</p>
        <hr>
        <p><b>Total Calories Today:</b> ${data.total_calories_today || 0} kcal</p>
        ${data.target_exceeded ? "<p style='color:red;'>⚠️ Daily target exceeded!</p>" : "<p style='color:green;'>✅ Within daily target.</p>"}
        ${data.suggestions ? `<hr><p><b>Suggestions:</b><br>${data.suggestions.join("<br>")}</p>` : ""}
      `;
    }

    // reload chart to reflect new data
    await loadChart();
  } catch (err) {
    console.error("Upload failed:", err);
    resultDiv.innerHTML = `<p style="color:red;">Network error — couldn't reach server.</p>`;
  }
};

// =============================
// 🔢 Weekly Calorie Chart Loader
// =============================
async function loadChart() {
  try {
    const res = await fetch(`${BASE_URL}/weekly_data`);
    if (!res.ok) {
      console.warn("No weekly data or server returned error:", res.status);
      // still attempt to parse if possible
    }
    const data = await parseJsonSafe(res);

    const labels = Array.isArray(data.dates) && data.dates.length ? data.dates : ["No data"];
    const values = Array.isArray(data.calories) && data.calories.length ? data.calories : [0];

    const ctx = document.getElementById("calorieChart").getContext("2d");

    // Destroy previous chart instance if exists
    if (calorieChart) {
      calorieChart.destroy();
      calorieChart = null;
    }

    calorieChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Calories Consumed",
            data: values,
            // keep color choices simple; you can change via CSS later if needed
            backgroundColor: labels.map(() => "rgba(39, 174, 96, 0.8)"),
            borderColor: labels.map(() => "rgba(39, 174, 96, 1)"),
            borderWidth: 1
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  } catch (err) {
    console.error("Error loading chart:", err);
  }
}

// Load on page load
loadChart();
// =============================================
// End of script.js
// =============================================
