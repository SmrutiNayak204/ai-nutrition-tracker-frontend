// 🌱 Backend Base URL (change if your backend runs on another host/port)
const BASE_URL = "http://127.0.0.1:5000";

let calorieChart = null;

// =============================
// 👤 User Registration (upsert)
// =============================
document.getElementById("register-form").onsubmit = async (e) => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(e.target).entries());

  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData)
  });

  const data = await res.json();

  const statusEl = document.getElementById("register-status");
  const bmiText = data.bmi ? `BMI: ${data.bmi}` : "BMI: N/A";
  statusEl.innerText = `✅ ${data.message} | ${bmiText} | Daily Target: ${data.calorie_target} kcal`;
};

// =============================
// 📸 Image Upload and Prediction
// =============================
document.getElementById("upload-form").onsubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  const resultDiv = document.getElementById("result");
  resultDiv.style.display = "block";

  if (data.error) {
    resultDiv.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`;
    return;
  }

  // If it's a Salad (show all types)
  if (data.predicted_food === "Salad" && typeof data.nutrition === "object" && !("calories" in data.nutrition)) {
    let html = `<h3>🥗 ${data.predicted_food} (${data.confidence}% confidence)</h3>`;
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
    // For other foods
    const nut = data.nutrition || {};
    resultDiv.innerHTML = `
      <h3>🍽️ ${data.predicted_food} (${data.confidence}% confidence)</h3>
      <p><b>Calories:</b> ${nut.calories ?? "N/A"}</p>
      <p><b>Protein:</b> ${nut.protein ?? "N/A"}g | <b>Fat:</b> ${nut.fat ?? "N/A"}g | <b>Carbs:</b> ${nut.carbs ?? "N/A"}g | <b>Fiber:</b> ${nut.fiber ?? "N/A"}g</p>
      <hr>
      <p><b>Total Calories Today:</b> ${data.total_calories_today || 0} kcal</p>
      ${data.target_exceeded ? "<p style='color:red;'>⚠️ Daily target exceeded!</p>" : "<p style='color:green;'>✅ Within daily target.</p>"}
      ${data.suggestions ? `<hr><p><b>Suggestions:</b><br>${data.suggestions.join("<br>")}</p>` : ""}
    `;
  }

  await loadChart(); // reload chart after every upload
};

// =============================
// 🔢 Weekly Calorie Chart Loader
// =============================
async function loadChart() {
  try {
    const res = await fetch(`${BASE_URL}/weekly_data`);
    const data = await res.json();

    const labels = data.dates && data.dates.length ? data.dates : ["No data"];
    const values = data.calories && data.calories.length ? data.calories : [0];

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
// =========================================================================
