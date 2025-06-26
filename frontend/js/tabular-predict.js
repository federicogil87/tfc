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
          <div class="text-center mt-3">
            <a href="tabular-train.html" class="btn btn-primary">
              <i class="fas fa-plus"></i> Entrenar Nuevo Modelo
            </a>
          </div>
        `;
        return;
      }

      // Crear lista de modelos con el mismo formato que tabular-predict-real.js
      const modelsHtml = `
        <div class="models-grid">
          ${testModels
            .map(
              model => `
              <div class="model-card model-selection" data-model="${model.id}">
                <div class="model-card-header">
                  <h3 class="model-card-title">${
                    model.metadata?.model_name || "Sin nombre"
                  }</h3>
                  <span class="model-card-type">${formatAlgorithmName(
                    model.metadata?.algorithm || ""
                  )}</span>
                </div>
                <div class="model-card-info">
                  <p><span class="label">Algoritmo:</span> ${formatAlgorithmName(
                    model.metadata?.algorithm || "Desconocido"
                  )}</p>
                  <p><span class="label">Tipo:</span> ${
                    model.metadata?.problem_type === "classification"
                      ? "Clasificación"
                      : "Regresión"
                  }</p>
                  <p><span class="label">Creado:</span> ${formatDate(
                    model.created_at
                  )}</p>
                </div>
              </div>
            `
            )
            .join("")}
        </div>
      `;

      // Mostrar modelos
      container.innerHTML = modelsHtml;

      // Configurar eventos para selección de modelos
      setupModelSelection();
    } else {
      container.innerHTML = `
        <div class="alert alert-info">
          No hay modelos tabulares disponibles. Por favor, entrene un modelo primero.
        </div>
        <div class="text-center mt-3">
          <a href="tabular-train.html" class="btn btn-primary">
            <i class="fas fa-plus"></i> Entrenar Nuevo Modelo
          </a>
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
        // Realizar predicción con datos de prueba
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

/**
 * Configura la selección de modelos
 */
function setupModelSelection() {
  const modelCards = document.querySelectorAll(".model-selection");
  const selectedModelInput = document.getElementById("selected-model");
  const predictBtn = document.getElementById("predict-btn");

  if (modelCards.length > 0 && selectedModelInput && predictBtn) {
    modelCards.forEach(card => {
      card.addEventListener("click", function () {
        // Quitar selección anterior
        document.querySelectorAll(".model-selection.selected").forEach(el => {
          el.classList.remove("selected");
        });

        // Añadir selección actual
        this.classList.add("selected");

        // Obtener información del modelo
        const modelId = this.dataset.model;

        // Actualizar input
        selectedModelInput.value = modelId;

        // Habilitar botón de predicción
        predictBtn.disabled = false;

        // Ocultar resultados anteriores
        document.getElementById("prediction-results").style.display = "none";
      });
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
    // Mostrar datos de características utilizadas
    if (results.features_used) {
      let testDataHtml = `
        <h3>Datos de Prueba Utilizados</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Característica</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(results.features_used)
              .map(
                ([feature, value]) => `
                <tr>
                  <td>${feature}</td>
                  <td>${formatValue(value)}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
        <p class="mt-2 text-muted">
          <i class="fas fa-info-circle"></i> 
          Datos generados aleatoriamente para pruebas
        </p>
      `;

      dataContainer.innerHTML = testDataHtml;
    } else {
      dataContainer.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          No hay información sobre las características utilizadas en la predicción.
        </div>
      `;
    }

    // Mostrar resultado de la predicción
    let predictionHtml = `<h3>Resultados de la Predicción</h3>`;

    if (results.prediction) {
      // Para clasificación con probabilidades
      if (results.prediction.probabilities) {
        predictionHtml += `
          <div class="prediction-summary">
            <p><strong>Clase predicha:</strong> ${
              results.prediction.predictions[0]
            }</p>
            <p><strong>Confianza:</strong> ${(
              Math.max(...results.prediction.probabilities[0]) * 100
            ).toFixed(2)}%</p>
          </div>
          
          <h4 class="mt-3">Probabilidades por Clase</h4>
          <div class="probabilities-list">
        `;

        // Mostrar probabilidades para cada clase
        const probabilities = results.prediction.probabilities[0];
        probabilities.forEach((prob, index) => {
          predictionHtml += `
            <div class="probability-item">
              <div class="probability-label">Clase ${index}</div>
              <div class="probability-bar-container">
                <div class="probability-bar" style="width: ${
                  prob * 100
                }%"></div>
                <div class="probability-value">${(prob * 100).toFixed(2)}%</div>
              </div>
            </div>
          `;
        });

        predictionHtml += `</div>`;
      } else {
        // Para regresión o clasificación sin probabilidades
        const prediction = results.prediction.predictions[0];
        const isProbablyRegression = !Number.isInteger(prediction);

        predictionHtml += `
          <div class="prediction-summary">
            <p><strong>${
              isProbablyRegression ? "Valor predicho:" : "Clase predicha:"
            }</strong> ${formatValue(prediction)}</p>
          </div>
        `;
      }
    } else {
      predictionHtml += `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          No se encontraron resultados de predicción.
        </div>
      `;
    }

    // Mostrar información del modelo
    predictionHtml += `
      <div class="model-info mt-4">
        <h4>Información del Modelo</h4>
        <p><strong>Nombre:</strong> ${results.model_name || "Sin nombre"}</p>
        <p><strong>Algoritmo:</strong> ${formatAlgorithmName(
          results.metadata?.algorithm || ""
        )}</p>
        <p><strong>Tipo:</strong> ${
          results.metadata?.problem_type === "classification"
            ? "Clasificación"
            : "Regresión"
        }</p>
      </div>
    `;

    // Mostrar importancia de características si está disponible
    if (results.metadata?.feature_importance) {
      predictionHtml += `
        <div class="feature-importance mt-4">
          <h4>Importancia de Características</h4>
          <div class="feature-importance-list">
      `;

      // Ordenar características por importancia
      const sortedFeatures = Object.entries(results.metadata.feature_importance)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Mostrar solo las 10 más importantes

      sortedFeatures.forEach(([feature, importance]) => {
        const importancePercent = (importance * 100).toFixed(1);
        predictionHtml += `
          <div class="feature-importance-item">
            <div class="feature-importance-label">${feature}</div>
            <div class="feature-importance-bar-container">
              <div class="feature-importance-bar" style="width: ${importancePercent}%"></div>
              <div class="feature-importance-value">${importancePercent}%</div>
            </div>
          </div>
        `;
      });

      predictionHtml += `
          </div>
        </div>
      `;
    }

    predictionDetails.innerHTML = predictionHtml;

    // Mostrar el contenedor de resultados
    resultsCard.style.display = "block";

    // Hacer scroll hacia los resultados
    resultsCard.scrollIntoView({ behavior: "smooth" });
  }
}
