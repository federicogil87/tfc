/**
 * Funcionalidad específica para la página de inicio
 */
document.addEventListener("DOMContentLoaded", function () {
  // Proteger esta página sin requerir roles específicos (todos pueden acceder)
  handleProtectedPage();

  // Mostrar mensaje de acceso denegado si corresponde
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("access") === "denied") {
    document.getElementById("access-denied").style.display = "block";
    document.querySelector(".welcome-message").style.display = "none";
    document.querySelector(".page-buttons-grid").style.display = "none";
    // Ocultar también las tarjetas de bienvenida originales
    const welcomeCards = document.querySelector(".welcome-cards");
    if (welcomeCards) {
      welcomeCards.style.display = "none";
    }
  }

  // Mostrar información del usuario
  const user = getCurrentUser();
  if (user) {
    // Nombre en el mensaje de bienvenida
    const welcomeNameElement = document.getElementById("welcome-name");
    if (welcomeNameElement) {
      welcomeNameElement.textContent = user.username;
    }

    // Inicial del avatar
    const userInitialElement = document.getElementById("user-initial");
    if (userInitialElement && user.username) {
      userInitialElement.textContent = user.username.charAt(0).toUpperCase();
    }

    // Rol del usuario
    const userRoleElement = document.getElementById("user-role");
    if (userRoleElement && user.roles && user.roles.length > 0) {
      userRoleElement.textContent = user.roles.join(", ");
    }

    // Mostrar/ocultar botones según el rol del usuario
    const pageButtons = document.querySelectorAll(".page-button[data-role]");
    pageButtons.forEach(button => {
      const requiredRole = button.getAttribute("data-role");
      if (user.roles.includes(requiredRole)) {
        button.style.display = "flex";
      } else {
        button.style.display = "none";
      }
    });
  }
});
