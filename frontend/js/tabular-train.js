/**
 * Funcionalidad para la página de entrenamiento de modelos tabulares
 */
document.addEventListener("DOMContentLoaded", function () {
  // Configurar formulario
  setupAlgorithmToggle();
  setupTrainingForm();

  // Inicializar componentes de UI
  setupUserInfo();
});

/**
 * Configura el cambio de opciones según el algoritmo
 */
function setupAlgorithmToggle() {
  const algorithmSelect = document.getElementById("algorithm");
  const problemTypeSelect = document.getElementById("problem-type");

  if (algorithmSelect) {
    // Mostrar/ocultar opciones de algoritmo
    function toggleAlgorithmOptions() {
      // Ocultar todos los parámetros
      document.querySelectorAll(".algorithm-info").forEach(el => {
        el.classList.remove("active");
      });

      // Mostrar parámetros del algoritmo seleccionado
      const selectedAlgorithm = algorithmSelect.value;
      let paramsElement;

      switch (selectedAlgorithm) {
        case "svm":
          paramsElement = document.getElementById("svm-params");
          break;
        case "knn":
          paramsElement = document.getElementById("knn-params");
          break;
        case "random_forest":
          paramsElement = document.getElementById("random-forest-params");
          break;
        case "linear_regression":
          paramsElement = document.getElementById("linear-regression-params");
          break;
      }

      if (paramsElement) {
        paramsElement.classList.add("active");
      }

      // Si es regresión lineal, cambiar a tipo de problema 'regresión'
      if (selectedAlgorithm === "linear_regression" && problemTypeSelect) {
        problemTypeSelect.value = "regression";
      }
    }

    // Configurar eventos
    algorithmSelect.addEventListener("change", toggleAlgorithmOptions);

    // Ejecutar al cargar
    toggleAlgorithmOptions();
  }
}

/**
 * Configura el formulario de entrenamiento
 */
function setupTrainingForm() {
  const trainingForm = document.getElementById("tabular-train-form");

  if (trainingForm) {
    trainingForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Mostrar estado de carga
      const submitButton = trainingForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.classList.add("loading");

      // Ocultar resultados anteriores
      const resultsElement = document.getElementById("training-results");
      if (resultsElement) {
        resultsElement.style.display = "none";
      }

      try {
        // Obtener datos del formulario
        const formData = new FormData(trainingForm);
        const trainingData = {};

        // Obtener el algoritmo seleccionado - esto es importante para filtrar parámetros
        const selectedAlgorithm = formData.get("algorithm");
        console.log(`Algoritmo seleccionado: ${selectedAlgorithm}`);

        // Obtener parámetros generales (no específicos de algoritmo)
        for (const [key, value] of formData.entries()) {
          // Ignorar parámetros de modelo por ahora
          if (!key.startsWith("model_params.")) {
            // Convertir valores numéricos
            if (["num_samples", "num_features", "num_classes"].includes(key)) {
              trainingData[key] = parseInt(value);
            } else if (key === "test_size") {
              trainingData[key] = parseFloat(value);
            } else {
              trainingData[key] = value;
            }
          }
        }

        // Inicializar parámetros del modelo con un objeto vacío
        const modelParams = {};

        // Filtrar y agregar solo los parámetros relevantes para el algoritmo seleccionado
        for (const [key, value] of formData.entries()) {
          if (key.startsWith("model_params.")) {
            const paramName = key.replace("model_params.", "");

            // Filtrar parámetros según el algoritmo
            let includeParam = false;

            switch (selectedAlgorithm) {
              case "svm":
                // Parámetros relevantes para SVM
                includeParam = ["kernel", "C", "gamma"].includes(paramName);
                break;
              case "knn":
                // Parámetros relevantes para k-NN
                includeParam = ["n_neighbors", "weights", "algorithm"].includes(
                  paramName
                );
                break;
              case "random_forest":
                // Parámetros relevantes para Random Forest
                includeParam = [
                  "n_estimators",
                  "max_depth",
                  "min_samples_split",
                ].includes(paramName);
                break;
              case "linear_regression":
                // Parámetros relevantes para Regresión Lineal
                includeParam = ["model_type", "alpha"].includes(paramName);
                break;
              default:
                // Si no se reconoce el algoritmo, incluir todos los parámetros
                includeParam = true;
            }

            // Si el parámetro es relevante para el algoritmo, agregarlo
            if (includeParam) {
              console.log(
                `Incluyendo parámetro ${paramName} para ${selectedAlgorithm}`
              );

              // Convertir valores numéricos
              if (
                [
                  "n_estimators",
                  "max_depth",
                  "min_samples_split",
                  "n_neighbors",
                ].includes(paramName)
              ) {
                modelParams[paramName] = parseInt(value);
              } else if (["C", "alpha"].includes(paramName)) {
                modelParams[paramName] = parseFloat(value);
              } else {
                modelParams[paramName] = value;
              }
            } else {
              console.log(
                `Ignorando parámetro ${paramName} para ${selectedAlgorithm}`
              );
            }
          }
        }

        // Añadir parámetros del modelo
        trainingData.model_params = modelParams;

        // Para clasificación, añadir número de clases
        if (trainingData.problem_type === "classification") {
          trainingData.num_classes = trainingData.num_classes || 2; // Por defecto binaria
        }

        // Validar datos
        if (!validateTrainingData(trainingData)) {
          // Quitar estado de carga
          submitButton.disabled = false;
          submitButton.classList.remove("loading");
          return;
        }

        console.log("Enviando datos al servidor:", trainingData);

        // Entrenar modelo
        const response = await trainTabularWithTestData(trainingData);

        console.log("Respuesta del servidor:", response);

        // Mostrar resultados
        displayTrainingResults(response);

        // Mostrar mensaje de éxito
        showAlert(
          "Modelo entrenado correctamente",
          "success",
          document.getElementById("alerts-container")
        );
      } catch (error) {
        console.error("Error al entrenar modelo:", error);
        showAlert(
          `Error al entrenar modelo: ${error.message}`,
          "danger",
          document.getElementById("alerts-container")
        );
      } finally {
        // Quitar estado de carga
        submitButton.disabled = false;
        submitButton.classList.remove("loading");
      }
    });
  } else {
    console.error(
      "No se encontró el formulario de entrenamiento (tabular-train-form)"
    );
  }
}

/**
 * Valida los datos de entrenamiento
 *
 * @param {Object} data - Datos de entrenamiento
 * @returns {boolean} - true si los datos son válidos, false en caso contrario
 */
function validateTrainingData(data) {
  const alertsContainer = document.getElementById("alerts-container");

  // Validar nombre del modelo
  if (!data.model_name) {
    showAlert("El nombre del modelo es obligatorio", "danger", alertsContainer);
    return false;
  }

  // Validar número de muestras
  if (data.num_samples < 50) {
    showAlert(
      "El número de muestras debe ser al menos 50",
      "danger",
      alertsContainer
    );
    return false;
  }

  // Validar número de características
  if (data.num_features < 2) {
    showAlert(
      "El número de características debe ser al menos 2",
      "danger",
      alertsContainer
    );
    return false;
  }

  // Validar proporción de test
  if (data.test_size < 0.1 || data.test_size > 0.5) {
    showAlert(
      "La proporción de test debe estar entre 0.1 y 0.5",
      "danger",
      alertsContainer
    );
    return false;
  }

  return true;
}

/**
 * Muestra los resultados del entrenamiento
 *
 * @param {Object} results - Resultados del entrenamiento
 */
function displayTrainingResults(results) {
  const resultsContainer = document.getElementById("results-content");
  const resultsCard = document.getElementById("training-results");

  if (resultsContainer && resultsCard) {
    console.log("Mostrando resultados del entrenamiento:", results);

    // Crear HTML para los resultados
    let html = `
            <div class="results-summary">
                <h3>Resumen del Modelo</h3>
                <table>
                    <tr>
                        <th>Nombre del modelo:</th>
                        <td>${results.model_name || "Sin nombre"}</td>
                    </tr>
                    <tr>
                        <th>Algoritmo:</th>
                        <td>${formatAlgorithmName(results.model_path)}</td>
                    </tr>
                    <tr>
                        <th>Tipo de problema:</th>
                        <td>${
                          results.evaluation?.problem_type === "classification"
                            ? "Clasificación"
                            : "Regresión"
                        }</td>
                    </tr>
                </table>
            </div>
        `;

    // Mostrar métricas según el tipo de problema
    if (results.evaluation) {
      html += `<div class="metrics-section mt-4">`;

      if (results.evaluation.accuracy !== undefined) {
        // Métricas de clasificación
        html += `
                    <h3>Métricas de Clasificación</h3>
                    <table>
                        <tr>
                            <th>Precisión:</th>
                            <td>${(results.evaluation.accuracy * 100).toFixed(
                              2
                            )}%</td>
                        </tr>
                        ${
                          results.evaluation.precision
                            ? `
                        <tr>
                            <th>Precision:</th>
                            <td>${(results.evaluation.precision * 100).toFixed(
                              2
                            )}%</td>
                        </tr>
                        `
                            : ""
                        }
                        ${
                          results.evaluation.recall
                            ? `
                        <tr>
                            <th>Recall:</th>
                            <td>${(results.evaluation.recall * 100).toFixed(
                              2
                            )}%</td>
                        </tr>
                        `
                            : ""
                        }
                        ${
                          results.evaluation.f1
                            ? `
                        <tr>
                            <th>F1 Score:</th>
                            <td>${(results.evaluation.f1 * 100).toFixed(
                              2
                            )}%</td>
                        </tr>
                        `
                            : ""
                        }
                    </table>
                `;

        // Matriz de confusión si está disponible
        if (results.evaluation.confusion_matrix) {
          html += createConfusionMatrix(results.evaluation.confusion_matrix);
        }
      } else if (results.evaluation.r2 !== undefined) {
        // Métricas de regresión
        html += `
                    <h3>Métricas de Regresión</h3>
                    <table>
                        <tr>
                            <th>R²:</th>
                            <td>${results.evaluation.r2.toFixed(4)}</td>
                        </tr>
                        <tr>
                            <th>Error Cuadrático Medio (MSE):</th>
                            <td>${results.evaluation.mse.toFixed(4)}</td>
                        </tr>
                        <tr>
                            <th>Raíz del Error Cuadrático Medio (RMSE):</th>
                            <td>${results.evaluation.rmse.toFixed(4)}</td>
                        </tr>
                        <tr>
                            <th>Error Absoluto Medio (MAE):</th>
                            <td>${results.evaluation.mae.toFixed(4)}</td>
                        </tr>
                    </table>
                `;
      }

      html += `</div>`;
    }

    // Mostrar importancia de características si está disponible
    if (results.feature_importance) {
      html += createFeatureImportanceSection(results.feature_importance);
    }

    // Mostrar resultados
    resultsContainer.innerHTML = html;
    resultsCard.style.display = "block";
  } else {
    console.error("No se encontró el contenedor de resultados");
  }
}

/**
 * Crea HTML para la matriz de confusión
 *
 * @param {Array} confusionMatrix - Matriz de confusión
 * @returns {string} - HTML para la matriz de confusión
 */
function createConfusionMatrix(confusionMatrix) {
  if (
    !confusionMatrix ||
    !Array.isArray(confusionMatrix) ||
    confusionMatrix.length === 0
  ) {
    return "";
  }

  const numClasses = confusionMatrix.length;

  // Crear encabezados
  let html = `
        <div class="confusion-matrix mt-4">
            <h3>Matriz de Confusión</h3>
            <table>
                <tr>
                    <th></th>
                    ${Array.from(
                      { length: numClasses },
                      (_, i) => `<th>Pred ${i}</th>`
                    ).join("")}
                </tr>
    `;

  // Crear filas
  for (let i = 0; i < numClasses; i++) {
    html += `<tr><th>Real ${i}</th>`;

    for (let j = 0; j < numClasses; j++) {
      // Determinar clase para celdas diagonales (valores correctos)
      const cellClass = i === j ? "diagonal" : "";
      html += `<td class="${cellClass}">${confusionMatrix[i][j]}</td>`;
    }

    html += `</tr>`;
  }

  html += `</table></div>`;

  return html;
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
 * @param {string} path - Ruta del modelo
 * @returns {string} - Nombre formateado del algoritmo
 */
function formatAlgorithmName(path) {
  if (!path) return "Desconocido";

  const algorithmMap = {
    svm: "Support Vector Machine (SVM)",
    knn: "k-Nearest Neighbors (k-NN)",
    random_forest: "Random Forest",
    linear_regression: "Regresión Lineal",
  };

  // Intentar extraer el algoritmo de la ruta
  for (const [key, value] of Object.entries(algorithmMap)) {
    if (path.includes(key)) {
      return value;
    }
  }

  return "Tabular";
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
