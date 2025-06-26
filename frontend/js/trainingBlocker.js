/**
 * trainingBlocker.js
 * Módulo para bloquear la navegación y refresco de página durante el entrenamiento de modelos
 * Debe ser incluido en todas las páginas de entrenamiento
 */

/**
 * Clase TrainingBlocker para gestionar el bloqueo durante el entrenamiento
 */
class TrainingBlocker {
  constructor() {
    this.isTraining = false;
    this.blockOverlay = null;
    this.originalBeforeUnloadHandler = null;

    // Crear overlay de bloqueo al inicializar
    this.createBlockOverlay();
  }

  /**
   * Crea el overlay de bloqueo en el DOM
   */
  createBlockOverlay() {
    // Si ya existe, no crear otro
    if (document.getElementById("training-block-overlay")) {
      this.blockOverlay = document.getElementById("training-block-overlay");
      return;
    }

    // Crear elementos del overlay
    this.blockOverlay = document.createElement("div");
    this.blockOverlay.id = "training-block-overlay";
    this.blockOverlay.classList.add("training-block-overlay");

    const messageContainer = document.createElement("div");
    messageContainer.classList.add("training-block-message");

    const spinner = document.createElement("div");
    spinner.classList.add("training-spinner");

    const message = document.createElement("p");
    message.innerText =
      "Entrenamiento en progreso. Por favor no cierre ni refresque la página.";

    // Añadir elementos al DOM
    messageContainer.appendChild(spinner);
    messageContainer.appendChild(message);
    this.blockOverlay.appendChild(messageContainer);
    document.body.appendChild(this.blockOverlay);

    // Aplicar estilos
    const style = document.createElement("style");
    style.textContent = `
      .training-block-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
      }
      
      .training-block-overlay.active {
        opacity: 1;
        visibility: visible;
      }
      
      .training-block-message {
        background-color: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }
      
      .training-spinner {
        display: inline-block;
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        margin-bottom: 20px;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Establece el controlador de evento beforeunload
   */
  setBeforeUnloadHandler() {
    // Guardar el controlador original si existe
    this.originalBeforeUnloadHandler = window.onbeforeunload;

    // Establecer nuevo controlador
    window.onbeforeunload = e => {
      if (this.isTraining) {
        // Mensaje para navegadores modernos
        e.preventDefault();
        e.returnValue =
          "El entrenamiento está en progreso. Si sales ahora, se perderá el progreso.";
        return e.returnValue;
      }
    };
  }

  /**
   * Restaura el controlador original de beforeunload
   */
  restoreBeforeUnloadHandler() {
    window.onbeforeunload = this.originalBeforeUnloadHandler;
  }

  /**
   * Inicia el bloqueo durante el entrenamiento
   *
   * @param {HTMLElement} submitButton - Botón de envío del formulario
   * @returns {Boolean} - true si se inició el bloqueo, false si ya estaba bloqueado
   */
  startBlock(submitButton) {
    // Verificar si ya está en entrenamiento
    if (this.isTraining) {
      return false;
    }

    // Marcar como en entrenamiento
    this.isTraining = true;

    // Deshabilitar botón de envío
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add("loading");
    }

    // Mostrar overlay
    this.blockOverlay.classList.add("active");

    // Configurar controlador de beforeunload
    this.setBeforeUnloadHandler();

    return true;
  }

  /**
   * Finaliza el bloqueo después del entrenamiento
   *
   * @param {HTMLElement} submitButton - Botón de envío del formulario
   */
  endBlock(submitButton) {
    // Verificar si estaba en entrenamiento
    if (!this.isTraining) {
      return;
    }

    // Marcar como no en entrenamiento
    this.isTraining = false;

    // Habilitar botón de envío
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("loading");
    }

    // Ocultar overlay
    this.blockOverlay.classList.remove("active");

    // Restaurar controlador original de beforeunload
    this.restoreBeforeUnloadHandler();
  }

  /**
   * Verifica si hay un entrenamiento en curso
   *
   * @returns {Boolean} - true si hay entrenamiento en curso, false en caso contrario
   */
  isTrainingInProgress() {
    return this.isTraining;
  }
}

// Crear instancia única
const trainingBlocker = new TrainingBlocker();

// Exportar instancia
window.trainingBlocker = trainingBlocker;
