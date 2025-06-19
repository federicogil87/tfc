/**
 * Manejador para el formulario de login
 */
document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Obtener datos del formulario
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      // Mostrar estado de carga
      const loginButton = loginForm.querySelector('button[type="submit"]');
      loginButton.classList.add("loading");
      loginButton.disabled = true;

      // Ocultar mensajes de error previos
      const errorMessage = document.getElementById("login-error");
      errorMessage.textContent = "";
      errorMessage.classList.remove("visible");

      try {
        // Intentar login
        const response = await login(username, password);

        // Guardar tokens y datos de usuario
        localStorage.setItem("accessToken", response.access_token);
        localStorage.setItem("refreshToken", response.refresh_token);
        localStorage.setItem("user", JSON.stringify(response.user));

        // Redirigir al dashboard
        window.location.href = "pages/home.html";
      } catch (error) {
        // Mostrar mensaje de error
        errorMessage.textContent = "Usuario o contraseña incorrectos";
        errorMessage.classList.add("visible");

        // Quitar estado de carga
        loginButton.classList.remove("loading");
        loginButton.disabled = false;
      }
    });
  }
});

/**
 * Verifica si el usuario está autenticado y tiene los roles necesarios
 *
 * @param {Array<string>} requiredRoles - Roles requeridos para acceder a la página
 * @returns {boolean} - true si tiene acceso, false en caso contrario
 */
function checkAccess(requiredRoles = []) {
  // Verificar si hay un token
  const token = localStorage.getItem("accessToken");
  if (!token) {
    redirectToLogin();
    return false;
  }

  // Verificar si hay datos de usuario
  const userJson = localStorage.getItem("user");
  if (!userJson) {
    redirectToLogin();
    return false;
  }

  // Verificar roles si es necesario
  if (requiredRoles.length > 0) {
    const user = JSON.parse(userJson);
    const userRoles = user.roles || [];

    // Verificar si el usuario tiene alguno de los roles requeridos
    const hasRequiredRole = requiredRoles.some(role =>
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      // Redirigir al dashboard sin acceso
      window.location.href = "home.html?access=denied";
      return false;
    }
  }

  return true;
}

/**
 * Cierra la sesión del usuario
 */
function logout() {
  // Limpiar datos de sesión
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");

  // Redirigir al login
  window.location.href = "../index.html";
}

/**
 * Obtiene el usuario actual
 *
 * @returns {Object|null} - Datos del usuario o null si no hay usuario
 */
function getCurrentUser() {
  const userJson = localStorage.getItem("user");
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Verifica si el usuario actual tiene un rol específico
 *
 * @param {string} role - Rol a verificar
 * @returns {boolean} - true si tiene el rol, false en caso contrario
 */
function hasRole(role) {
  const user = getCurrentUser();
  if (!user || !user.roles) {
    return false;
  }

  return user.roles.includes(role);
}

/**
 * Maneja el acceso a páginas protegidas
 *
 * @param {Array<string>} requiredRoles - Roles requeridos para acceder a la página
 */
function handleProtectedPage(requiredRoles = []) {
  document.addEventListener("DOMContentLoaded", function () {
    // Verificar acceso
    if (!checkAccess(requiredRoles)) {
      return;
    }

    // Configurar botón de logout si existe
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
      logoutButton.addEventListener("click", function (e) {
        e.preventDefault();
        logout();
      });
    }

    // Mostrar información del usuario si existe el elemento
    const currentUser = getCurrentUser();
    const userInfoElement = document.getElementById("user-info");
    if (userInfoElement && currentUser) {
      userInfoElement.textContent = currentUser.username;
    }

    // Ocultar elementos según roles
    document.querySelectorAll("[data-role]").forEach(element => {
      const requiredRole = element.dataset.role;
      if (!hasRole(requiredRole)) {
        element.style.display = "none";
      }
    });
  });
}
