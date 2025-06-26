/**
 * Funcionalidad para la página de predicción con modelos tabulares con datos de prueba
 */
document.addEventListener("DOMContentLoaded", function () {
  // Cargar modelos
  loadTabularModels();

  // Configurar formulario de predicción
  setupPredictionForm();

  // Inicializar componentes de UI
  setupUserInfo();
});

/**
 * Carga los modelos tabulares disponibles
 */
async function loadTabularModels() {
  const container = document.getElementById("models-container");

  try {
    // Mostrar spinner de carga
    showSpinner(container, "Cargando modelos tabulares...");

    // Obtener modelos
    const response = await getTabularModels();

    if (response && response.success && response.models.length > 0) {
      // Filtrar solo modelos entrenados con datos de prueba
      const testModels = response.models.filter(
        model => !model.metadata || model.metadata.data_type !== "real"
      );

      if (testModels.length === 0) {
        container.innerHTML = `
                <div class="alert alert-info">
                    No hay modelos tabulares entrenados con datos de prueba disponibles. Por favor, entrene un modelo primero.
                </div>
            `;
        return;
      }

      // Generar HTML para la lista de modelos
      let html = '<div class="models-list">';

      testModels.forEach(model => {
        const modelId = model.id;
        const modelName = model.metadata?.model_name || modelId;
        const algorithm = model.metadata?.algorithm || "Desconocido";
        const problemType = model.metadata?.problem_type || "classification";
        const createdAt = new Date(model.created_at).toLocaleString();

        html += `
                <div class="model-item" data-model="${modelId}">
                    <div class="model-header">
                        <h3 class="model-name">${modelName}</h3>
                        <span class="model-algorithm ${algorithm}">${formatAlgorithmName(
          algorithm
        )}</span>
                    </div>
                    <div class="model-details">
                        <p><strong>Tipo:</strong> ${
                          problemType === "classification"
                            ? "Clasificación"
                            : "Regresión"
                        }</p>
                        <p><strong>Creado:</strong> ${createdAt}</p>
                    </div>
                    <button class="btn btn-select-model">Seleccionar</button>
                </div>
            `;
      });

      html += "</div>";
      container.innerHTML = html;

      // Añadir event listeners a los botones de selección
      document.querySelectorAll(".btn-select-model").forEach(btn => {
        btn.addEventListener("click", function () {
          const modelItem = this.closest(".model-item");
          const modelId = modelItem.dataset.model;

          // Resaltar el modelo seleccionado
          document.querySelectorAll(".model-item").forEach(item => {
            item.classList.remove("selected");
          });
          modelItem.classList.add("selected");

          // Actualizar el input con el modelo seleccionado
          document.getElementById("selected-model").value = modelId;

          // Habilitar el botón de predicción
          document.getElementById("predict-btn").disabled = false;
        });
      });
    } else {
      container.innerHTML = `
                <div class="alert alert-info">
                    No hay modelos tabulares disponibles. Por favor, entrene un modelo primero.
                </div>
            `;
    }
  } catch (error) {
    console.error("Error al cargar modelos:", error);
    container.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar modelos: ${error.message}
            </div>
        `;
  }
}

/**
 * Muestra un spinner de carga
 *
 * @param {HTMLElement} container - Contenedor donde mostrar el spinner
 * @param {string} message - Mensaje a mostrar
 */
function showSpinner(container, message = "Cargando...") {
  container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Configura el formulario de predicción
 */
function setupPredictionForm() {
  const predictionForm = document.getElementById("predict-form");

  if (predictionForm) {
    predictionForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Obtener modelo seleccionado
      const modelName = document.getElementById("selected-model").value;

      if (!modelName) {
        showAlert(
          "Por favor, seleccione un modelo",
          "warning",
          document.getElementById("alerts-container")
        );
        return;
      }

      // Mostrar estado de carga
      const predictBtn = document.getElementById("predict-btn");
      predictBtn.disabled = true;
      predictBtn.classList.add("loading");

      try {
        // Realizar predicción
        const response = await predictTabularWithTestData(modelName);

        // Mostrar resultados
        displayPredictionResults(response);

        // Quitar estado de carga
        predictBtn.disabled = false;
        predictBtn.classList.remove("loading");
      } catch (error) {
        console.error("Error al realizar predicción:", error);
        showAlert(
          `Error al realizar predicción: ${error.message}`,
          "danger",
          document.getElementById("alerts-container")
        );

        // Quitar estado de carga
        predictBtn.disabled = false;
        predictBtn.classList.remove("loading");
      }
    });
  }
}

/**
 * Muestra los resultados de la predicción
 *
 * @param {Object} results - Resultados de la predicción
 */
function displayPredictionResults(results) {
  const dataContainer = document.getElementById("data-container");
  const predictionDetails = document.getElementById("prediction-details");
  const resultsCard = document.getElementById("prediction-results");

  if (dataContainer && predictionDetails && resultsCard) {
    // Verificar si hay datos de características utilizadas
    if (results.features_used) {
      // Mostrar datos de características utilizadas
      let featuresHtml = `
                <h3>Datos de Prueba</h3>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Característica</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

      // Añadir cada característica y su valor
      for (const [feature, value] of Object.entries(results.features_used)) {
        featuresHtml += `
                    <tr>
                        <td>${feature}</td>
                        <td>${formatValue(value)}</td>
                    </tr>
                `;
      }

      featuresHtml += `
                        </tbody>
                    </table>
                </div>
                <p class="mt-2 text-muted">Datos generados aleatoriamente para pruebas</p>
            `;

      dataContainer.innerHTML = featuresHtml;
    } else {
      dataContainer.innerHTML = `
                <div class="alert alert-warning">
                    No hay información sobre las características utilizadas.
                </div>
            `;
    }

    // Mostrar detalles de predicción
    const prediction = results.prediction;
    const problemType = results.metadata?.problem_type || "classification";
    const isProbabilistic = prediction.probabilities !== undefined;

    let predictionsHtml = `
            <h3>Resultados de la Predicción</h3>
            <div class="prediction-summary">
                <p>
                    <strong>Modelo:</strong> ${results.model_name}<br>
                    <strong>Algoritmo:</strong> ${formatAlgorithmName(
                      results.metadata?.algorithm || "Desconocido"
                    )}<br>
                    <strong>Tipo:</strong> ${
                      problemType === "classification"
                        ? "Clasificación"
                        : "Regresión"
                    }<br>
                </p>
            </div>
        `;

    // Mostrar la predicción
    if (prediction) {
      if (isProbabilistic) {
        // Para clasificación con probabilidades
        const predictions = prediction.predictions;
        const probabilities = prediction.probabilities[0]; // Primera muestra
        const maxProbIndex = probabilities.indexOf(Math.max(...probabilities));
        const confidence = probabilities[maxProbIndex] * 100;

        predictionsHtml += `
                <div class="prediction-result">
                    <div class="prediction-value">
                        <h4>Clase Predicha: ${predictions[0]}</h4>
                        <div class="confidence-value">Confianza: ${confidence.toFixed(
                          2
                        )}%</div>
                    </div>
                </div>
                
                <h4 class="mt-3">Probabilidades por Clase</h4>
                <div class="probabilities-container">
            `;

        // Mostrar barra de probabilidades para cada clase
        probabilities.forEach((prob, index) => {
          const percentage = prob * 100;
          predictionsHtml += `
                    <div class="probability-item">
                        <div class="probability-label">Clase ${index}</div>
                        <div class="probability-bar-container">
                            <div class="probability-bar" style="width: ${percentage}%"></div>
                            <div class="probability-value">${percentage.toFixed(
                              2
                            )}%</div>
                        </div>
                    </div>
                `;
        });

        predictionsHtml += `</div>`;
      } else {
        // Para regresión o clasificación sin probabilidades
        const predValue = prediction.predictions[0];
        const isClassification = problemType === "classification";

        predictionsHtml += `
                <div class="prediction-result">
                    <div class="prediction-value">
                        <h4>${
                          isClassification
                            ? "Clase Predicha:"
                            : "Valor Predicho:"
                        } ${
          isClassification ? predValue : predValue.toFixed(4)
        }</h4>
                    </div>
                </div>
            `;
      }
    } else {
      predictionsHtml += `
                <div class="alert alert-warning">
                    No se encontraron resultados de predicción.
                </div>
            `;
    }

    // Mostrar importancia de características si está disponible
    if (results.metadata?.feature_importance) {
      const featureImportance = results.metadata.feature_importance;

      predictionsHtml += `
                <h4 class="mt-4">Importancia de Características</h4>
                <div class="feature-importance-container">
            `;

      // Comprobar el formato de la importancia de características
      if (Array.isArray(featureImportance)) {
        // Si es un array, mostrar como "Característica 1", "Característica 2", etc.
        featureImportance.forEach((importance, index) => {
          const percentage = importance * 100;
          predictionsHtml += `
                    <div class="feature-importance-item">
                        <div class="feature-label">Característica ${index}</div>
                        <div class="feature-bar-container">
                            <div class="feature-bar" style="width: ${percentage}%"></div>
                            <div class="feature-value">${percentage.toFixed(
                              2
                            )}%</div>
                        </div>
                    </div>
                `;
        });
      } else if (typeof featureImportance === "object") {
        // Si es un objeto, mostrar nombre de característica y valor
        for (const [feature, importance] of Object.entries(featureImportance)) {
          const percentage = importance * 100;
          predictionsHtml += `
                    <div class="feature-importance-item">
                        <div class="feature-label">${feature}</div>
                        <div class="feature-bar-container">
                            <div class="feature-bar" style="width: ${percentage}%"></div>
                            <div class="feature-value">${percentage.toFixed(
                              2
                            )}%</div>
                        </div>
                    </div>
                `;
        }
      }

      predictionsHtml += `</div>`;
    }

    predictionDetails.innerHTML = predictionsHtml;
    resultsCard.style.display = "block";
  }
}

/**
 * Formatea un valor para mostrarlo en la tabla
 *
 * @param {any} value - Valor a formatear
 * @returns {string} - Valor formateado
 */
function formatValue(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "number") {
    return value.toFixed(4);
  }

  return value.toString();
}

/**
 * Formatea el nombre del algoritmo para mostrarlo
 *
 * @param {string} algorithm - Nombre del algoritmo
 * @returns {string} - Nombre formateado del algoritmo
 */
function formatAlgorithmName(algorithm) {
  if (!algorithm) return "Desconocido";

  const algorithmMap = {
    svm: "Support Vector Machine (SVM)",
    knn: "k-Nearest Neighbors (k-NN)",
    random_forest: "Random Forest",
    linear_regression: "Regresión Lineal",
  };

  return algorithmMap[algorithm] || algorithm;
}

/**
 * Configura la información del usuario
 */
function setupUserInfo() {
  const user = getCurrentUser();

  if (user) {
    // Inicial del avatar
    const userInitialElement = document.getElementById("user-initial");
    if (userInitialElement && user.username) {
      userInitialElement.textContent = user.username.charAt(0).toUpperCase();
    }

    // Nombre de usuario
    const userInfoElement = document.getElementById("user-info");
    if (userInfoElement) {
      userInfoElement.textContent = user.username;
    }

    // Rol del usuario
    const userRoleElement = document.getElementById("user-role");
    if (userRoleElement && user.roles && user.roles.length > 0) {
      userRoleElement.textContent = user.roles.join(", ");
    }
  }
}
