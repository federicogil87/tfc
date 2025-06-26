/**
 * Funcionalidad para la página de entrenamiento de modelos CNN
 */
document.addEventListener("DOMContentLoaded", function () {
  // Configurar formulario
  setupArchitectureToggle();
  setupTrainingForm();

  // Inicializar componentes de UI
  setupUserInfo();
});

/**
 * Configura el cambio de opciones según la arquitectura
 */
function setupArchitectureToggle() {
  const architectureSelect = document.getElementById("architecture");
  const customArchOptions = document.getElementById("custom-arch-options");

  if (architectureSelect && customArchOptions) {
    // Mostrar/ocultar opciones de arquitectura personalizada
    function toggleCustomOptions() {
      if (architectureSelect.value === "custom") {
        customArchOptions.style.display = "flex";
      } else {
        customArchOptions.style.display = "none";
      }
    }

    // Configurar evento
    architectureSelect.addEventListener("change", toggleCustomOptions);

    // Ejecutar al cargar
    toggleCustomOptions();
  }
}

/**
 * Configura el formulario de entrenamiento
 */
function setupTrainingForm() {
  const trainingForm = document.getElementById("cnn-train-form");

  if (trainingForm) {
    // Manejar envío del formulario
    trainingForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Verificar si ya hay un entrenamiento en curso
      if (
        window.trainingBlocker &&
        window.trainingBlocker.isTrainingInProgress()
      ) {
        showAlert(
          "Ya hay un entrenamiento en curso. Por favor espere.",
          "warning",
          document.getElementById("alerts-container")
        );
        return;
      }

      // Recopilar datos del formulario
      const formData = new FormData(trainingForm);
      const trainingData = {};

      // Recorrer datos del formulario
      for (const [key, value] of formData.entries()) {
        // Convertir valores numéricos
        if (
          [
            "num_classes",
            "batch_size",
            "epochs",
            "validation_split",
            "input_height",
            "input_width",
          ].includes(key)
        ) {
          trainingData[key] = parseInt(value);
        } else if (["learning_rate", "dropout_rate"].includes(key)) {
          trainingData[key] = parseFloat(value);
        } else if (key === "data_augmentation") {
          trainingData[key] = value === "on";
        } else if (key === "filters") {
          try {
            trainingData[key] = JSON.parse(value);
          } catch (error) {
            console.error("Error al parsear filtros:", error);
            showAlert(
              "Los filtros deben ser un array válido (ejemplo: [32, 64, 128])",
              "danger",
              document.getElementById("alerts-container")
            );
            return;
          }
        } else {
          trainingData[key] = value;
        }
      }

      // Añadir input_shape
      if (trainingData.architecture === "custom") {
        trainingData.input_shape = [
          trainingData.input_height,
          trainingData.input_width,
          3, // Canales RGB
        ];
      }

      // Validar datos
      if (!validateTrainingData(trainingData)) {
        return;
      }

      // Mostrar estado de carga y bloquear navegación
      const submitButton = trainingForm.querySelector('button[type="submit"]');

      // Iniciar bloqueo con el TrainingBlocker
      if (window.trainingBlocker) {
        window.trainingBlocker.startBlock(submitButton);
      } else {
        // Fallback si no está disponible el TrainingBlocker
        submitButton.disabled = true;
        submitButton.classList.add("loading");
      }

      // Ocultar resultados anteriores
      document.getElementById("training-results").style.display = "none";

      try {
        // Entrenar modelo
        const response = await trainCnnWithTestData(trainingData);

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
        // Quitar estado de carga y desbloquear navegación
        if (window.trainingBlocker) {
          window.trainingBlocker.endBlock(submitButton);
        } else {
          // Fallback si no está disponible el TrainingBlocker
          submitButton.disabled = false;
          submitButton.classList.remove("loading");
        }
      }
    });
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

  // Validar número de clases
  if (data.num_classes < 2) {
    showAlert(
      "El número de clases debe ser al menos 2",
      "danger",
      alertsContainer
    );
    return false;
  }

  // Validar learning rate
  if (data.learning_rate <= 0 || data.learning_rate > 0.1) {
    showAlert(
      "El learning rate debe estar entre 0.0001 y 0.1",
      "danger",
      alertsContainer
    );
    return false;
  }

  // Validar dropout rate
  if (data.dropout_rate < 0 || data.dropout_rate >= 1) {
    showAlert(
      "El dropout rate debe estar entre 0 y 0.9",
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
    // Crear HTML para los resultados
    let html = `
            <div class="results-header">
                <h3>Resultados del Entrenamiento</h3>
                <span class="results-timestamp">
                    ${new Date().toLocaleString()}
                </span>
            </div>
            <div class="results-metrics">
                <div class="metric-item">
                    <span class="metric-label">Precisión (Accuracy):</span>
                    <span class="metric-value">${results.accuracy.toFixed(
                      4
                    )}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Pérdida (Loss):</span>
                    <span class="metric-value">${results.loss.toFixed(4)}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Tiempo de Entrenamiento:</span>
                    <span class="metric-value">${results.training_time.toFixed(
                      2
                    )} segundos</span>
                </div>
            </div>
            <div class="results-details">
                <h4>Detalles del Modelo</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Nombre:</span>
                        <span class="detail-value">${results.model_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Arquitectura:</span>
                        <span class="detail-value">${
                          results.architecture
                        }</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Épocas:</span>
                        <span class="detail-value">${results.epochs}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Batch Size:</span>
                        <span class="detail-value">${results.batch_size}</span>
                    </div>
                </div>
            </div>
        `;

    // Si hay un gráfico de historial de entrenamiento
    if (results.history_chart) {
      html += `
                <div class="results-chart">
                    <h4>Historial de Entrenamiento</h4>
                    <img src="data:image/png;base64,${results.history_chart}" alt="Gráfico de historial de entrenamiento" />
                </div>
            `;
    }

    // Actualizar contenido y mostrar
    resultsContainer.innerHTML = html;
    resultsCard.style.display = "block";
  }
}

/**
 * Crea una gráfica de precisión durante el entrenamiento
 *
 * @param {Object} history - Historia del entrenamiento
 */
function createAccuracyChart(history) {
  // Usar Chart.js si está disponible
  if (typeof Chart !== "undefined") {
    const ctx = document.getElementById("accuracy-chart").getContext("2d");

    new Chart(ctx, {
      type: "line",
      data: {
        labels: Array.from(
          { length: history.accuracy.length },
          (_, i) => i + 1
        ),
        datasets: [
          {
            label: "Precisión de Entrenamiento",
            data: history.accuracy,
            borderColor: "rgb(75, 192, 192)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            tension: 0.1,
          },
          {
            label: "Precisión de Validación",
            data: history.val_accuracy || [],
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
          },
        },
      },
    });
  }
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
