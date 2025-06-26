/**
 * Funcionalidad para la página de entrenamiento de modelos CNN con datos reales
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
  const fileInput = document.getElementById("file-upload");

  if (trainingForm) {
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

      // Verificar si se seleccionó un archivo
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showAlert(
          "Por favor, seleccione un archivo ZIP con imágenes",
          "danger",
          document.getElementById("alerts-container")
        );
        return;
      }

      const file = fileInput.files[0];

      // Verificar que sea un archivo ZIP
      if (!file.name.endsWith(".zip")) {
        showAlert(
          "El archivo debe ser un ZIP",
          "danger",
          document.getElementById("alerts-container")
        );
        return;
      }

      // Obtener datos del formulario
      const formData = new FormData(trainingForm);

      // Validar datos
      if (!validateTrainingData(formData)) {
        return;
      }

      // Mostrar estado de carga
      const submitButton = trainingForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.classList.add("loading");

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
        // Entrenar modelo con datos reales
        const response = await trainCnnWithRealData(formData);

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

  // Validar número de clases
  const numClasses = parseInt(formData.get("num_classes"));
  if (numClasses < 2) {
    showAlert(
      "El número de clases debe ser al menos 2",
      "danger",
      alertsContainer
    );
    return false;
  }

  // Validar learning rate
  const learningRate = parseFloat(formData.get("learning_rate"));
  if (learningRate <= 0 || learningRate > 0.1) {
    showAlert(
      "El learning rate debe estar entre 0.0001 y 0.1",
      "danger",
      alertsContainer
    );
    return false;
  }

  // Validar dropout rate
  const dropoutRate = parseFloat(formData.get("dropout_rate"));
  if (dropoutRate < 0 || dropoutRate >= 1) {
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
 * Realiza la solicitud para entrenar un modelo CNN con datos reales
 *
 * @param {FormData} formData - Datos del formulario
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function trainCnnWithRealData(formData) {
  try {
    // Obtener token
    const token = localStorage.getItem("accessToken");

    // Enviar solicitud a la API
    const response = await fetch(`${API_BASE_URL}/api/ml/cnn/train/real`, {
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
    console.error("Error en trainCnnWithRealData:", error);
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
                        <td>${results.model_name}</td>
                    </tr>
                    <tr>
                        <th>Arquitectura:</th>
                        <td>${
                          results.evaluation?.model_params?.architecture ||
                          "Personalizada"
                        }</td>
                    </tr>
                    <tr>
                        <th>Precisión:</th>
                        <td>${(results.evaluation.accuracy * 100).toFixed(
                          2
                        )}%</td>
                    </tr>
                    <tr>
                        <th>Pérdida:</th>
                        <td>${results.evaluation.loss.toFixed(4)}</td>
                    </tr>
                </table>
            </div>
        `;

    // Añadir gráfica de entrenamiento si hay historia
    if (results.history && results.history.accuracy) {
      html += `
                <div class="training-history mt-4">
                    <h3>Historia del Entrenamiento</h3>
                    <canvas id="accuracy-chart" width="400" height="200"></canvas>
                </div>
            `;
    }

    // Mostrar resultados
    resultsContainer.innerHTML = html;
    resultsCard.style.display = "block";

    // Crear gráfica si hay datos
    if (results.history && results.history.accuracy) {
      createAccuracyChart(results.history);
    }
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
