/**
 * Funcionalidad para el dashboard y la interfaz principal
 */
document.addEventListener("DOMContentLoaded", function () {
  // Manejar el toggle de la barra lateral en dispositivos móviles
  setupSidebarToggle();

  // Activar el enlace de navegación actual
  highlightCurrentNavLink();

  // Inicializar componentes de UI
  setupUserInfo();
});

/**
 * Configura el toggle de la barra lateral para dispositivos móviles
 */
function setupSidebarToggle() {
  const sidebarToggles = document.querySelectorAll(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");

  // Si hay botones de toggle y existe la barra lateral
  if (sidebarToggles.length > 0 && sidebar) {
    sidebarToggles.forEach(toggle => {
      toggle.addEventListener("click", function () {
        sidebar.classList.toggle("active");
      });
    });

    // Cerrar la barra lateral al hacer clic en un enlace (en móvil)
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
      link.addEventListener("click", function () {
        if (window.innerWidth < 992) {
          sidebar.classList.remove("active");
        }
      });
    });

    // Cerrar la barra lateral al hacer clic fuera de ella (en móvil)
    document.addEventListener("click", function (e) {
      if (
        window.innerWidth < 992 &&
        !sidebar.contains(e.target) &&
        !Array.from(sidebarToggles).some(toggle => toggle.contains(e.target))
      ) {
        sidebar.classList.remove("active");
      }
    });
  }
}

/**
 * Resalta el enlace de navegación correspondiente a la página actual
 */
function highlightCurrentNavLink() {
  const navLinks = document.querySelectorAll(".nav-link");
  const currentPage = window.location.pathname.split("/").pop();

  navLinks.forEach(link => {
    // Quitar clase active de todos los enlaces
    link.classList.remove("active");

    // Añadir clase active al enlace de la página actual
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.classList.add("active");
    }
  });
}

/**
 * Muestra un mensaje de alerta
 *
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de alerta (success, danger, warning, info)
 * @param {HTMLElement} container - Contenedor donde mostrar la alerta
 * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
 */
function showAlert(message, type = "info", container, duration = 5000) {
  // Crear elemento de alerta
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.innerHTML = message;

  // Añadir botón de cierre
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "close";
  closeButton.innerHTML = "&times;";
  closeButton.style.position = "absolute";
  closeButton.style.right = "10px";
  closeButton.style.top = "10px";
  closeButton.addEventListener("click", () => {
    alert.remove();
  });

  alert.style.position = "relative";
  alert.appendChild(closeButton);

  // Añadir alerta al contenedor
  container.prepend(alert);

  // Configurar autoclose si la duración es mayor a 0
  if (duration > 0) {
    setTimeout(() => {
      // Añadir clase de fade out
      alert.style.opacity = "0";
      alert.style.transition = "opacity 0.5s";

      // Eliminar después de la transición
      setTimeout(() => {
        alert.remove();
      }, 500);
    }, duration);
  }

  return alert;
}

/**
 * Muestra un spinner de carga
 *
 * @param {HTMLElement} container - Contenedor donde mostrar el spinner
 * @param {string} message - Mensaje opcional
 * @returns {HTMLElement} - Elemento del spinner
 */
function showSpinner(container, message = "Cargando...") {
  const spinnerContainer = document.createElement("div");
  spinnerContainer.className = "loading-container";

  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  spinnerContainer.appendChild(spinner);

  if (message) {
    const messageElement = document.createElement("p");
    messageElement.textContent = message;
    messageElement.style.marginLeft = "15px";
    spinnerContainer.appendChild(messageElement);
  }

  // Limpiar contenedor y añadir spinner
  container.innerHTML = "";
  container.appendChild(spinnerContainer);

  return spinnerContainer;
}

/**
 * Formatea una fecha ISO en formato legible
 *
 * @param {string} isoDate - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
function formatDate(isoDate) {
  if (!isoDate) return "";

  const date = new Date(isoDate);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Trunca un texto si es demasiado largo
 *
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto truncado
 */
function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
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
