/**
 * Funcionalidad para la página de entrenamiento de modelos tabulares con datos reales
 */
document.addEventListener("DOMContentLoaded", function () {
  // Configurar formulario de subida de archivo
  setupFileUploadForm();

  // Configurar formulario de entrenamiento
  setupAlgorithmToggle();
  setupTrainingForm();

  // Inicializar componentes de UI
  setupUserInfo();
});

/**
 * Variables globales para almacenar datos
 */
let fileData = null;
let columns = [];
let dataPreview = null;

/**
 * Configura el formulario de subida de archivo
 */
function setupFileUploadForm() {
  const uploadForm = document.getElementById("file-upload-form");
  const fileInput = document.getElementById("tabular-file");

  if (uploadForm && fileInput) {
    uploadForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Verificar si se seleccionó un archivo
      if (!fileInput.files || fileInput.files.length === 0) {
        showAlert(
          "Por favor, seleccione un archivo CSV o Excel",
          "danger",
          document.getElementById("alerts-container")
        );
        return;
      }

      const file = fileInput.files[0];

      // Verificar el formato del archivo
      const validExtensions = ["csv", "xlsx", "xls"];
      const fileExtension = file.name.split(".").pop().toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        showAlert(
          "Por favor, seleccione un archivo válido (CSV, XLSX, XLS)",
          "danger",
          document.getElementById("alerts-container")
        );
        return;
      }

      // Mostrar estado de carga
      const submitButton = uploadForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.classList.add("loading");

      try {
        // Procesar el archivo
        await processFile(file);

        // Mostrar mensaje de éxito
        showAlert(
          "Archivo cargado correctamente",
          "success",
          document.getElementById("alerts-container")
        );

        // Mostrar sección de vista previa y configuración
        document.getElementById("data-preview-card").style.display = "block";
        document.getElementById("model-config-card").style.display = "block";
      } catch (error) {
        console.error("Error al procesar archivo:", error);
        showAlert(
          `Error al procesar archivo: ${error.message}`,
          "danger",
          document.getElementById("alerts-container")
        );
      } finally {
        // Quitar estado de carga
        submitButton.disabled = false;
        submitButton.classList.remove("loading");
      }
    });
  }
}

/**
 * Procesa el archivo subido
 *
 * @param {File} file - Archivo subido
 * @returns {Promise<void>}
 */
async function processFile(file) {
  // Crear FormData para enviar el archivo
  const formData = new FormData();
  formData.append("file", file);

  // Obtener token
  const token = localStorage.getItem("accessToken");

  // Enviar archivo al servidor para procesamiento
  const response = await fetch(`${API_BASE_URL}/api/ml/tabular/preview`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  // Verificar respuesta
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al procesar archivo");
  }

  // Obtener datos de respuesta
  const data = await response.json();

  // Si no se implementó el endpoint de preview, usamos FileReader para leer localmente
  if (!data.success) {
    await processFileLocally(file);
    return;
  }

  // Guardar datos
  fileData = data.data;
  columns = data.columns;

  // Generar vista previa
  displayDataPreview(fileData, columns);

  // Configurar selección de columnas
  setupColumnSelection(columns);
}

/**
 * Procesa el archivo localmente (alternativa si no hay endpoint)
 *
 * @param {File} file - Archivo subido
 * @returns {Promise<void>}
 */
async function processFileLocally(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        let data = [];
        let cols = [];

        // Procesar según tipo de archivo
        const fileExtension = file.name.split(".").pop().toLowerCase();

        if (fileExtension === "csv") {
          // Procesar CSV
          const content = e.target.result;
          const lines = content.split("\n");

          // Obtener cabeceras
          cols = lines[0].split(",").map(col => col.trim());

          // Obtener datos (limitar a 100 filas para la vista previa)
          const previewLines = Math.min(lines.length, 101);
          for (let i = 1; i < previewLines; i++) {
            if (lines[i].trim() === "") continue;

            const row = {};
            const values = lines[i].split(",");

            cols.forEach((col, index) => {
              row[col] = values[index] ? values[index].trim() : "";
            });

            data.push(row);
          }
        } else {
          // Para Excel, mostramos mensaje de que se requiere el endpoint
          showAlert(
            "La vista previa de archivos Excel requiere implementación del endpoint en el servidor. Se continuará con el entrenamiento, pero no se mostrará la vista previa.",
            "warning",
            document.getElementById("alerts-container")
          );

          // Crear columnas y datos de ejemplo
          cols = ["Columna1", "Columna2", "Columna3"];
          data = [
            { Columna1: "Ejemplo", Columna2: "Ejemplo", Columna3: "Ejemplo" },
          ];
        }

        // Guardar datos
        fileData = data;
        columns = cols;

        // Generar vista previa
        displayDataPreview(data, cols);

        // Configurar selección de columnas
        setupColumnSelection(cols);

        resolve();
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function () {
      reject(new Error("Error al leer el archivo"));
    };

    // Leer el archivo
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      // Para Excel, solo simular lectura
      reader.onload({ target: { result: "" } });
    }
  });
}

/**
 * Muestra una vista previa de los datos
 *
 * @param {Array} data - Datos del archivo
 * @param {Array} columns - Columnas del archivo
 */
function displayDataPreview(data, columns) {
  const dataInfoContainer = document.getElementById("data-info");
  const dataPreviewContainer = document.getElementById("data-preview");

  if (dataInfoContainer && dataPreviewContainer) {
    // Guardar datos para uso posterior
    dataPreview = data;

    // Mostrar información del archivo
    dataInfoContainer.innerHTML = `
            <p><strong>Número de columnas:</strong> ${columns.length}</p>
            <p><strong>Número de filas:</strong> ${data.length}</p>
        `;

    // Crear tabla de vista previa (mostrar solo las primeras 10 filas)
    const previewData = data.slice(0, 10);

    let tableHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${previewData
                      .map(
                        row => `
                        <tr>
                            ${columns
                              .map(
                                col =>
                                  `<td>${
                                    row[col] !== undefined ? row[col] : ""
                                  }</td>`
                              )
                              .join("")}
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;

    dataPreviewContainer.innerHTML = tableHtml;
  }
}

/**
 * Configura la selección de columnas
 *
 * @param {Array} columns - Columnas disponibles
 */
function setupColumnSelection(columns) {
  const targetColumnSelect = document.getElementById("target-column");
  const featureColumnsContainer = document.getElementById("feature-columns");
  const categoricalColumnsContainer = document.getElementById(
    "categorical-columns"
  );

  if (
    targetColumnSelect &&
    featureColumnsContainer &&
    categoricalColumnsContainer
  ) {
    // Limpiar contenedores
    targetColumnSelect.innerHTML =
      '<option value="">-- Seleccione la columna objetivo --</option>';
    featureColumnsContainer.innerHTML = "";
    categoricalColumnsContainer.innerHTML = "";

    // Agregar opciones de columnas objetivo
    columns.forEach(column => {
      targetColumnSelect.innerHTML += `<option value="${column}">${column}</option>`;
    });

    // Agregar checkboxes para columnas de características
    columns.forEach(column => {
      const checkboxHtml = `
                <div class="form-check">
                    <input type="checkbox" id="feature-${column}" name="feature-columns" value="${column}" checked>
                    <label for="feature-${column}">${column}</label>
                </div>
            `;
      featureColumnsContainer.innerHTML += checkboxHtml;
    });

    // Agregar checkboxes para columnas categóricas
    columns.forEach(column => {
      // Detectar si la columna parece ser categórica
      const isCategorical = detectCategoricalColumn(column, dataPreview);

      const checkboxHtml = `
                <div class="form-check">
                    <input type="checkbox" id="categorical-${column}" name="categorical-columns" value="${column}" ${
        isCategorical ? "checked" : ""
      }>
                    <label for="categorical-${column}">${column}</label>
                </div>
            `;
      categoricalColumnsContainer.innerHTML += checkboxHtml;
    });

    // Configurar evento al seleccionar columna objetivo
    targetColumnSelect.addEventListener("change", function () {
      const selectedColumn = this.value;

      // Desmarcar la columna objetivo de las características
      const featureCheckbox = document.getElementById(
        `feature-${selectedColumn}`
      );
      if (featureCheckbox) {
        featureCheckbox.checked = false;
      }
    });
  }
}

/**
 * Detecta si una columna parece ser categórica
 *
 * @param {string} column - Nombre de la columna
 * @param {Array} data - Datos para analizar
 * @returns {boolean} - true si parece categórica, false en caso contrario
 */
function detectCategoricalColumn(column, data) {
  if (!data || data.length === 0) return false;

  // Obtener valores únicos (limitar a 20 primeros elementos para eficiencia)
  const sampleData = data.slice(0, 20);
  const values = sampleData.map(row => row[column]);
  const uniqueValues = [...new Set(values)];

  // Si todos los valores son numéricos, probablemente no es categórica
  const allNumeric = uniqueValues.every(value => {
    return (
      !isNaN(value) && value !== "" && value !== null && value !== undefined
    );
  });

  // Si hay pocos valores únicos en proporción a la muestra, probablemente es categórica
  const uniqueRatio = uniqueValues.length / sampleData.length;

  // Criterios para considerar una columna como categórica:
  // 1. No todos los valores son numéricos, o
  // 2. Pocos valores únicos en proporción a la muestra
  return !allNumeric || uniqueRatio < 0.3;
}

/**
 * Configura el cambio de opciones según el algoritmo
 */
function setupAlgorithmToggle() {
  const algorithmSelect = document.getElementById("algorithm");

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
      const problemTypeSelect = document.getElementById("problem-type");
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

      // Obtener datos del formulario
      const formData = new FormData(trainingForm);

      // Verificar selección de columnas
      const targetColumn = document.getElementById("target-column").value;
      if (!targetColumn) {
        showAlert(
          "Por favor, seleccione una columna objetivo",
          "danger",
          document.getElementById("alerts-container")
        );
        return;
      }

      // Obtener columnas de características seleccionadas
      const featureColumns = [];
      document
        .querySelectorAll('input[name="feature-columns"]:checked')
        .forEach(checkbox => {
          featureColumns.push(checkbox.value);
        });

      if (featureColumns.length === 0) {
        showAlert(
          "Por favor, seleccione al menos una columna de características",
          "danger",
          document.getElementById("alerts-container")
        );
        return;
      }

      // Obtener columnas categóricas seleccionadas
      const categoricalColumns = [];
      document
        .querySelectorAll('input[name="categorical-columns"]:checked')
        .forEach(checkbox => {
          categoricalColumns.push(checkbox.value);
        });

      // Actualizar campos ocultos
      document.getElementById("target-column-hidden").value = targetColumn;
      document.getElementById("feature-columns-hidden").value =
        JSON.stringify(featureColumns);
      document.getElementById("categorical-columns-hidden").value =
        JSON.stringify(categoricalColumns);

      // Agregar campos a formData
      formData.set("target_column", targetColumn);
      formData.set("features", JSON.stringify(featureColumns));
      formData.set("categorical_columns", JSON.stringify(categoricalColumns));

      // Preparar parámetros del modelo
      const modelParams = {};

      // Obtener el algoritmo seleccionado
      const selectedAlgorithm = formData.get("algorithm");

      // Filtrar parámetros según el algoritmo
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("model_params.")) {
          const paramName = key.replace("model_params.", "");

          // Filtrar parámetros según el algoritmo
          let includeParam = false;

          switch (selectedAlgorithm) {
            case "svm":
              includeParam = ["kernel", "C", "gamma"].includes(paramName);
              break;
            case "knn":
              includeParam = ["n_neighbors", "weights", "algorithm"].includes(
                paramName
              );
              break;
            case "random_forest":
              includeParam = [
                "n_estimators",
                "max_depth",
                "min_samples_split",
              ].includes(paramName);
              break;
            case "linear_regression":
              includeParam = ["model_type", "alpha"].includes(paramName);
              break;
            default:
              includeParam = true;
          }

          // Si el parámetro es relevante para el algoritmo, agregarlo
          if (includeParam) {
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
          }
        }
      }

      // Agregar parámetros del modelo
      formData.set("model_params", JSON.stringify(modelParams));

      // Validar datos
      if (!validateTrainingData(formData)) {
        return;
      }

      // Mostrar estado de carga
      const submitButton = trainingForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.classList.add("loading");

      // Ocultar resultados anteriores
      document.getElementById("training-results").style.display = "none";

      try {
        // Entrenar modelo
        const fileInput = document.getElementById("tabular-file");
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
          throw new Error("No se encontró el archivo subido");
        }

        // Agregar archivo al formData
        formData.set("file", fileInput.files[0]);

        // Entrenar modelo con datos reales
        const response = await trainTabularWithRealData(formData);

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
  }
}

/**
 * Valida los datos de entrenamiento
 *
 * @param {FormData} formData - Datos del formulario
 * @returns {boolean} - true si los datos son válidos, false en caso contrario
 */
function validateTrainingData(formData) {
  const alertsContainer = document.getElementById("alerts-container");

  // Validar nombre del modelo
  if (!formData.get("model_name")) {
    showAlert("El nombre del modelo es obligatorio", "danger", alertsContainer);
    return false;
  }

  // Validar proporción de test
  const testSize = parseFloat(formData.get("test_size"));
  if (testSize < 0.1 || testSize > 0.5) {
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
 * Realiza la solicitud para entrenar un modelo tabular con datos reales
 *
 * @param {FormData} formData - Datos del formulario
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function trainTabularWithRealData(formData) {
  try {
    // Obtener token
    const token = localStorage.getItem("accessToken");

    // Enviar solicitud a la API
    const response = await fetch(`${API_BASE_URL}/api/ml/tabular/train/real`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    // Verificar respuesta
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al entrenar modelo");
    }

    // Devolver datos de respuesta
    return await response.json();
  } catch (error) {
    console.error("Error en trainTabularWithRealData:", error);
    throw error;
  }
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
                        <td>${formatAlgorithmName(results.algorithm || "")}</td>
                    </tr>
                    <tr>
                        <th>Tipo de problema:</th>
                        <td>${
                          results.problem_type === "classification"
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

      if (results.problem_type === "classification") {
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
      } else {
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
