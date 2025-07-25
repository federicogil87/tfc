/**
 * Configuración global de la API
 */
const API_BASE_URL = "http://localhost:5000";

/**
 * Función para hacer peticiones a la API
 *
 * @param {string} endpoint - Endpoint a llamar
 * @param {Object} options - Opciones para la petición (método, body, etc.)
 * @returns {Promise<any>} - Respuesta de la API
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Opciones por defecto
  const defaultOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  // Combinar opciones
  const fetchOptions = { ...defaultOptions, ...options };

  // Añadir token de autenticación si existe
  const token = localStorage.getItem("accessToken");
  if (token) {
    fetchOptions.headers.Authorization = `Bearer ${token}`;
  }

  try {
    console.log(`Realizando petición a ${url}`, fetchOptions);

    const response = await fetch(url, fetchOptions);

    // Log para depuración
    console.log(`Respuesta del servidor (${url}):`, {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      let errorMessage = `Error HTTP: ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.msg || errorData.error || errorMessage;
      } catch (e) {
        // Si no se puede parsear como JSON, usar mensaje por defecto
        console.error("Error al parsear respuesta de error:", e);
      }

      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json();

        // Si el mensaje indica cuenta desactivada, cerrar sesión
        if (errorData.msg && errorData.msg.includes("desactivada")) {
          logout();
          window.location.href = "/index.html";
          throw new Error(
            "Tu cuenta ha sido desactivada. Contacta al administrador."
          );
        }

        // Si es un error de token, intentar refresh
        if (errorData.msg && errorData.msg.includes("token")) {
          const refreshed = await refreshToken();
          if (refreshed) {
            // Reintentar la petición original con el nuevo token
            const newToken = getAuthToken();
            requestOptions.headers["Authorization"] = `Bearer ${newToken}`;
            const retryResponse = await fetch(
              `${API_BASE_URL}${url}`,
              requestOptions
            );

            if (!retryResponse.ok) {
              throw new Error(`Error HTTP: ${retryResponse.status}`);
            }

            return await retryResponse.json();
          } else {
            logout();
            window.location.href = "/index.html";
            throw new Error(
              "Sesión expirada. Por favor, inicia sesión nuevamente."
            );
          }
        }
      }
    }

    // Log del cuerpo de la respuesta para depuración
    const respText = await response.text();
    let respJson;
    try {
      respJson = JSON.parse(respText);
      console.log("Cuerpo de la respuesta:", respJson);
    } catch (e) {
      console.error("Error al parsear respuesta JSON:", e);
      console.log("Respuesta de texto:", respText);
      throw new Error(`Error al parsear respuesta: ${respText}`);
    }

    return respJson;
  } catch (error) {
    console.error("Error en la petición:", error);
    throw error;
  }
}

/**
 * Redirecciona al login y limpia tokens
 */
function redirectToLogin() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");

  // Si estamos en una página que no es index.html, redirigir
  if (
    !window.location.pathname.includes("index.html") &&
    !window.location.pathname.endsWith("/")
  ) {
    window.location.href = "../index.html";
  }
}

/**
 * Intenta renovar el token de acceso usando el refresh token
 *
 * @returns {Promise<boolean>} - true si se renovó correctamente, false en caso contrario
 */
async function refreshToken() {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("authToken", data.access_token);
      return true;
    } else {
      // ✅ CORRECCIÓN: Verificar si el usuario fue desactivado
      const errorData = await response.json();
      if (errorData.msg && errorData.msg.includes("inactivo")) {
        logout();
        alert("Tu cuenta ha sido desactivada. Contacta al administrador.");
        window.location.href = "/index.html";
      }
      return false;
    }
  } catch (error) {
    console.error("Error al renovar token:", error);
    return false;
  }
}

/**
 * Hace login en la API
 *
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function login(username, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

/**
 * Verifica si el token actual es válido
 *
 * @returns {Promise<boolean>} - true si el token es válido, false en caso contrario
 */
async function verifyToken() {
  try {
    const response = await apiRequest("/auth/me");
    // Si la petición es exitosa, el token es válido
    // Guardamos la información del usuario
    localStorage.setItem("user", JSON.stringify(response));
    return true;
  } catch (error) {
    console.error("Error al verificar token:", error);
    return false;
  }
}

/**
 * Obtiene la lista de usuarios (solo admin)
 *
 * @returns {Promise<Array>} - Lista de usuarios
 */
async function getUsers() {
  return apiRequest("/auth/users");
}

/**
 * Crea un nuevo usuario (solo admin)
 *
 * @param {Object} userData - Datos del usuario a crear
 * @returns {Promise<Object>} - Usuario creado
 */
async function createUser(userData) {
  return apiRequest("/auth/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

/**
 * Actualiza un usuario existente (solo admin)
 *
 * @param {number} userId - ID del usuario a actualizar
 * @param {Object} userData - Nuevos datos del usuario
 * @returns {Promise<Object>} - Usuario actualizado
 */
async function updateUser(userId, userData) {
  return apiRequest(`/auth/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
}

/**
 * Elimina un usuario (solo admin)
 *
 * @param {number} userId - ID del usuario a eliminar
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function deleteUser(userId) {
  return apiRequest(`/auth/users/${userId}`, {
    method: "DELETE",
  });
}

/**
 * Obtiene la lista de roles disponibles (solo admin)
 *
 * @returns {Promise<Array>} - Lista de roles
 */
async function getRoles() {
  return apiRequest("/auth/roles");
}

/**
 * Entrena un modelo CNN con datos de prueba (rol Testing)
 *
 * @param {Object} trainingData - Datos para el entrenamiento
 * @returns {Promise<Object>} - Respuesta con el modelo entrenado
 */
async function trainCnnWithTestData(trainingData) {
  return apiRequest("/api/ml/cnn/train/test", {
    method: "POST",
    body: JSON.stringify(trainingData),
  });
}

/**
 * Predice con un modelo CNN usando datos de prueba (rol Testing)
 *
 * @param {string} modelName - Nombre del modelo a utilizar
 * @returns {Promise<Object>} - Respuesta con la predicción
 */
async function predictCnnWithTestData(modelName) {
  return apiRequest("/api/ml/cnn/predict/test", {
    method: "POST",
    body: JSON.stringify({ model_name: modelName }),
  });
}

/**
 * Entrena un modelo con datos tabulares de prueba (rol Testing)
 *
 * @param {Object} trainingData - Datos para el entrenamiento
 * @returns {Promise<Object>} - Respuesta con el modelo entrenado
 */
async function trainTabularWithTestData(trainingData) {
  console.log("Enviando solicitud de entrenamiento tabular:", trainingData);

  try {
    const response = await apiRequest("/api/ml/tabular/train/test", {
      method: "POST",
      body: JSON.stringify(trainingData),
    });

    console.log("Respuesta del servidor (trainTabularWithTestData):", response);

    if (!response.success) {
      throw new Error(
        response.error || "Error desconocido al entrenar el modelo"
      );
    }

    return response;
  } catch (error) {
    console.error("Error en trainTabularWithTestData:", error);
    throw error;
  }
}

/**
 * Predice con un modelo tabular usando datos de prueba (rol Testing)
 *
 * @param {string} modelName - Nombre del modelo a utilizar
 * @returns {Promise<Object>} - Respuesta con la predicción
 */
async function predictTabularWithTestData(modelName) {
  return apiRequest("/api/ml/tabular/predict/test", {
    method: "POST",
    body: JSON.stringify({ model_name: modelName }),
  });
}

/**
 * Obtiene la lista de modelos CNN disponibles
 *
 * @returns {Promise<Array>} - Lista de modelos CNN
 */
async function getCnnModels() {
  return apiRequest("/api/ml/cnn/models");
}

/**
 * Obtiene la lista de modelos tabulares disponibles
 *
 * @returns {Promise<Array>} - Lista de modelos tabulares
 */
async function getTabularModels() {
  return apiRequest("/api/ml/tabular/models");
}

/**
 * Elimina un modelo CNN (solo admin)
 *
 * @param {string} modelName - Nombre del modelo a eliminar
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function deleteCnnModel(modelName) {
  return apiRequest(`/api/ml/cnn/models/${modelName}`, {
    method: "DELETE",
  });
}

/**
 * Elimina un modelo tabular (solo admin)
 *
 * @param {string} modelName - Nombre del modelo a eliminar
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function deleteTabularModel(modelName) {
  return apiRequest(`/api/ml/tabular/models/${modelName}`, {
    method: "DELETE",
  });
}

/**
 * Obtiene estadísticas del dashboard
 *
 * @returns {Promise<Object>} - Estadísticas del dashboard
 */
async function getDashboardStats() {
  return apiRequest("/api/dashboard/stats");
}

/**
 * Funciones para agregar al archivo api.js existente
 * Añadir estas funciones al final del archivo api.js
 */

/**
 * Entrena un modelo CNN con datos reales
 *
 * @param {FormData} formData - Datos para el entrenamiento, incluyendo el archivo ZIP
 * @returns {Promise<Object>} - Respuesta con el modelo entrenado
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
 * Predice con un modelo CNN usando datos reales
 *
 * @param {FormData} formData - Datos para la predicción, incluyendo la imagen
 * @returns {Promise<Object>} - Respuesta con la predicción
 */
async function predictCnnWithRealData(formData) {
  try {
    // Obtener token
    const token = localStorage.getItem("accessToken");

    // Enviar solicitud a la API
    const response = await fetch(`${API_BASE_URL}/api/ml/cnn/predict/real`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    // Verificar respuesta
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al realizar predicción");
    }

    // Devolver datos de respuesta
    return await response.json();
  } catch (error) {
    console.error("Error en predictCnnWithRealData:", error);
    throw error;
  }
}

/**
 * Realiza la solicitud para obtener una vista previa de un archivo tabular
 *
 * @param {FormData} formData - Datos del formulario con el archivo
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function previewTabularFile(formData) {
  try {
    // Obtener token
    const token = localStorage.getItem("accessToken");

    // Enviar solicitud a la API
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
      throw new Error(
        errorData.error || "Error al obtener vista previa del archivo"
      );
    }

    // Devolver datos de respuesta
    return await response.json();
  } catch (error) {
    console.error("Error en previewTabularFile:", error);
    throw error;
  }
}

/**
 * Entrena un modelo tabular con datos reales
 *
 * @param {FormData} formData - Datos para el entrenamiento, incluyendo el archivo
 * @returns {Promise<Object>} - Respuesta con el modelo entrenado
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
 * Predice con un modelo tabular usando datos reales
 *
 * @param {Object} predictionData - Datos para la predicción
 * @returns {Promise<Object>} - Respuesta con la predicción
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
 * Predice con un modelo tabular usando datos de prueba (rol Testing)
 *
 * @param {string} modelName - Nombre del modelo a utilizar
 * @returns {Promise<Object>} - Respuesta con la predicción
 */
async function predictTabularWithTestData(modelName) {
  try {
    // Obtener token
    const token = localStorage.getItem("accessToken");

    // Enviar solicitud a la API
    const response = await fetch(
      `${API_BASE_URL}/api/ml/tabular/predict/test`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model_name: modelName }),
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
    console.error("Error en predictTabularWithTestData:", error);
    throw error;
  }
}
