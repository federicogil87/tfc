/**
 * Funcionalidad para la página de predicción con modelos tabulares con datos reales
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
 * Variables globales para almacenar datos
 */
let selectedModel = null;
let selectedModelFeatures = [];

/**
 * Carga los modelos tabulares disponibles (entrenados con datos reales)
 */
async function loadTabularModels() {
  const container = document.getElementById("models-container");

  try {
    // Mostrar spinner de carga
    showSpinner(container, "Cargando modelos tabulares...");

    // Obtener todos los modelos
    const response = await getTabularModels();

    if (response && response.success && response.models.length > 0) {
      // Filtrar solo modelos entrenados con datos reales
      const realModels = response.models.filter(
        model => model.metadata && model.metadata.data_type === "real"
      );

      if (realModels.length === 0) {
        container.innerHTML = `
                    <div class="alert alert-info">
                        No hay modelos tabulares entrenados con datos reales disponibles. Por favor, entrene un modelo primero.
                    </div>
                    <div class="text-center mt-3">
                        <a href="tabular-train-real.html" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Entrenar Nuevo Modelo
                        </a>
                    </div>
                `;
        return;
      }

      // Crear lista de modelos
      const modelsHtml = `
                <div class="models-grid">
                    ${realModels
                      .map(
                        model => `
                        <div class="model-card model-selection" data-model="${
                          model.id
                        }" data-features='${JSON.stringify(
                          model.metadata.features || []
                        )}'>
                            <div class="model-card-header">
                                <h3 class="model-card-title">${
                                  model.metadata.model_name || "Sin nombre"
                                }</h3>
                                <span class="model-card-type">${formatAlgorithmName(
                                  model.metadata.algorithm || ""
                                )}</span>
                            </div>
                            <div class="model-card-info">
                                <p><span class="label">Algoritmo:</span> ${formatAlgorithmName(
                                  model.metadata.algorithm || "Desconocido"
                                )}</p>
                                <p><span class="label">Tipo:</span> ${
                                  model.metadata.problem_type ===
                                  "classification"
                                    ? "Clasificación"
                                    : "Regresión"
                                }</p>
                                <p><span class="label">Características:</span> ${
                                  model.metadata.features
                                    ? model.metadata.features.length
                                    : "?"
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
                    <a href="tabular-train-real.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Entrenar Nuevo Modelo
                    </a>
                </div>
            `;
    }
  } catch (error) {
    console.error("Error al cargar modelos tabulares:", error);
    container.innerHTML = `<div class="alert alert-danger">Error al cargar modelos tabulares: ${error.message}</div>`;
  }
}

/**
 * Configura la selección de modelos
 */
function setupModelSelection() {
  const modelCards = document.querySelectorAll(".model-selection");
  const predictionFormContainer = document.getElementById(
    "prediction-form-container"
  );
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
        let features = [];

        try {
          features = JSON.parse(this.dataset.features || "[]");
        } catch (e) {
          console.error("Error al parsear características del modelo:", e);
        }

        // Guardar datos del modelo seleccionado
        selectedModel = modelId;
        selectedModelFeatures = features;

        // Actualizar input
        selectedModelInput.value = modelId;

        // Generar formulario de predicción
        generateFeatureInputs(features);

        // Mostrar formulario
        predictionFormContainer.style.display = "block";

        // Habilitar botón de predicción
        predictBtn.disabled = false;

        // Ocultar resultados anteriores
        document.getElementById("prediction-results").style.display = "none";
      });
    });
  }
}

/**
 * Genera los inputs para cada característica del modelo
 *
 * @param {Array} features - Características del modelo
 */
function generateFeatureInputs(features) {
  const featuresContainer = document.getElementById("features-inputs");

  if (featuresContainer) {
    // Limpiar contenedor
    featuresContainer.innerHTML = "";

    // Si no hay características, mostrar mensaje
    if (!features || features.length === 0) {
      featuresContainer.innerHTML = `
                <div class="alert alert-warning">
                    No se encontraron características para este modelo. Por favor, seleccione otro modelo.
                </div>
            `;
      return;
    }

    // Crear inputs para cada característica
    const inputsHtml = features
      .map(
        feature => `
            <div class="form-group">
                <label for="feature-${feature}">${feature}</label>
                <input 
                    type="text" 
                    id="feature-${feature}" 
                    name="features.${feature}" 
                    placeholder="Valor para ${feature}" 
                    required
                >
            </div>
        `
      )
      .join("");

    featuresContainer.innerHTML = inputsHtml;
  }
}

/**
 * Configura el formulario de predicción
 */
function setupPredictionForm() {
  const predictionForm = document.getElementById("predict-form");

  if (predictionForm) {
    predictionForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Verificar si hay un modelo seleccionado
      if (!selectedModel) {
        showAlert(
          "Por favor, seleccione un modelo",
          "warning",
          document.getElementById("alerts-container")
        );
        return;
      }

      // Obtener valores de características
      const featureValues = {};
      let isValid = true;

      selectedModelFeatures.forEach(feature => {
        const input = document.getElementById(`feature-${feature}`);
        if (input) {
          const value = input.value.trim();

          // Validar que se ingresó un valor
          if (!value) {
            showAlert(
              `Por favor, ingrese un valor para la característica "${feature}"`,
              "danger",
              document.getElementById("alerts-container")
            );
            isValid = false;
            return;
          }

          // Intentar convertir a número si es posible
          const numValue = parseFloat(value);
          featureValues[feature] = isNaN(numValue) ? value : numValue;
        }
      });

      if (!isValid) return;

      // Mostrar estado de carga
      const predictBtn = document.getElementById("predict-btn");
      predictBtn.disabled = true;
      predictBtn.classList.add("loading");

      try {
        // Realizar predicción
        const predictionData = {
          model_name: selectedModel,
          features: featureValues,
        };

        const response = await predictTabularWithRealData(predictionData);

        // Mostrar resultados
        displayPredictionResults(response, featureValues);

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
 * Realiza la solicitud para predecir con un modelo tabular usando datos reales
 *
 * @param {Object} predictionData - Datos para la predicción
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function predictTabularWithRealData(predictionData) {
  try {
    // Obtener token
    const token = localStorage.getItem("accessToken");

    // Enviar solicitud a la API
    const response = await fetch(
      `${API_BASE_URL}/api/ml/tabular/predict/real`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(predictionData),
      }
    );

    // Verificar respuesta
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al realizar predicción");
    }

    // Devolver datos de respuesta
    return await response.json();
  } catch (error) {
    console.error("Error en predictTabularWithRealData:", error);
    throw error;
  }
}

/**
 * Muestra los resultados de la predicción
 *
 * @param {Object} results - Resultados de la predicción
 * @param {Object} inputFeatures - Características ingresadas por el usuario
 */
function displayPredictionResults(results, inputFeatures) {
  const inputDataContainer = document.getElementById("input-data-container");
  const predictionDetails = document.getElementById("prediction-details");
  const additionalResults = document.getElementById("additional-results");
  const resultsCard = document.getElementById("prediction-results");

  if (inputDataContainer && predictionDetails && resultsCard) {
    // Mostrar datos de entrada
    let inputDataHtml = `
            <h3>Datos Ingresados</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Característica</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(inputFeatures)
                      .map(
                        ([feature, value]) => `
                        <tr>
                            <td>${feature}</td>
                            <td>${value}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;

    inputDataContainer.innerHTML = inputDataHtml;

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
                                <div class="probability-value">${(
                                  prob * 100
                                ).toFixed(2)}%</div>
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
                          isProbablyRegression
                            ? "Valor predicho:"
                            : "Clase predicha:"
                        }</strong> ${prediction}</p>
                    </div>
                `;
      }
    }

    // Mostrar información del modelo
    predictionHtml += `
            <div class="model-info mt-4">
                <h4>Información del Modelo</h4>
                <p><strong>Nombre:</strong> ${
                  results.model_name || "Sin nombre"
                }</p>
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

    predictionDetails.innerHTML = predictionHtml;

    // Mostrar resultados adicionales si están disponibles
    if (results.feature_importance) {
      additionalResults.innerHTML = createFeatureImportanceSection(
        results.feature_importance
      );
    } else {
      additionalResults.innerHTML = "";
    }

    // Mostrar resultados
    resultsCard.style.display = "block";

    // Dar estilo a la barra de la clase seleccionada (si es clasificación)
    if (results.prediction && results.prediction.probabilities) {
      const predictedClass = results.prediction.predictions[0];
      const bars = document.querySelectorAll(".probability-bar");
      if (bars.length > predictedClass) {
        bars[predictedClass].style.backgroundColor = "var(--success)";
      }
    }
  }
}

/**
 * Crea HTML para la sección de importancia de características
 *
 * @param {Object} featureImportance - Importancia de características
 * @returns {string} - HTML para la sección de importancia de características
 */
function createFeatureImportanceSection(featureImportance) {
  if (!featureImportance) {
    return "";
  }

  let importances = [];

  // Determinar formato de importancia de características
  if (featureImportance.importances) {
    // Array simple de importancias
    importances = featureImportance.importances.map((value, index) => ({
      feature: `Característica ${index}`,
      importance: value,
    }));
  } else if (featureImportance.coefficients) {
    // Coeficientes para modelos lineales
    importances = featureImportance.coefficients.map((value, index) => ({
      feature: `Característica ${index}`,
      importance: Math.abs(value), // Usar valor absoluto para coeficientes
    }));
  } else {
    // Formato de diccionario
    importances = Object.entries(featureImportance).map(
      ([feature, importance]) => ({
        feature,
        importance:
          typeof importance === "number" ? importance : Math.abs(importance),
      })
    );
  }

  // Ordenar por importancia descendente
  importances.sort((a, b) => b.importance - a.importance);

  // Obtener importancia máxima para normalizar
  const maxImportance = Math.max(...importances.map(item => item.importance));

  // Crear HTML
  let html = `
        <div class="feature-importance mt-4">
            <h3>Importancia de Características</h3>
    `;

  // Crear barras de importancia
  importances.forEach(item => {
    const normalizedValue = item.importance / maxImportance;
    html += `
            <div class="feature-bar">
                <div class="feature-name">${item.feature}</div>
                <div class="feature-value-bar">
                    <div class="feature-value-fill" style="width: ${
                      normalizedValue * 100
                    }%"></div>
                    <span class="feature-value">${item.importance.toFixed(
                      4
                    )}</span>
                </div>
            </div>
        `;
  });

  html += `</div>`;

  return html;
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
