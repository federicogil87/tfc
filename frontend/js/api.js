/**
 * Configuración global de la API
 */
const API_BASE_URL = 'http://localhost:5000';

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
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    // Combinar opciones
    const fetchOptions = { ...defaultOptions, ...options };
    
    // Añadir token de autenticación si existe
    const token = localStorage.getItem('accessToken');
    if (token) {
        fetchOptions.headers.Authorization = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(url, fetchOptions);
        
        // Si la respuesta es 401 (Unauthorized), intentar renovar el token
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                // Intentar de nuevo con el nuevo token
                fetchOptions.headers.Authorization = `Bearer ${localStorage.getItem('accessToken')}`;
                return await fetch(url, fetchOptions).then(res => res.json());
            } else {
                // Si no se pudo renovar, redirigir al login
                redirectToLogin();
                throw new Error('Sesión expirada');
            }
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en la petición:', error);
        throw error;
    }
}

/**
 * Redirecciona al login y limpia tokens
 */
function redirectToLogin() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Si estamos en una página que no es index.html, redirigir
    if (!window.location.pathname.includes('index.html') && !window.location.pathname.endsWith('/')) {
        window.location.href = '../index.html';
    }
}

/**
 * Intenta renovar el token de acceso usando el refresh token
 * 
 * @returns {Promise<boolean>} - true si se renovó correctamente, false en caso contrario
 */
async function refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            return false;
        }
        
        const data = await response.json();
        localStorage.setItem('accessToken', data.access_token);
        return true;
    } catch (error) {
        console.error('Error al renovar token:', error);
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
    return apiRequest('/auth/login', {
        method: 'POST',
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
        const response = await apiRequest('/auth/me');
        // Si la petición es exitosa, el token es válido
        // Guardamos la información del usuario
        localStorage.setItem('user', JSON.stringify(response));
        return true;
    } catch (error) {
        console.error('Error al verificar token:', error);
        return false;
    }
}

/**
 * Obtiene la lista de usuarios (solo admin)
 * 
 * @returns {Promise<Array>} - Lista de usuarios
 */
async function getUsers() {
    return apiRequest('/auth/users');
}

/**
 * Crea un nuevo usuario (solo admin)
 * 
 * @param {Object} userData - Datos del usuario a crear
 * @returns {Promise<Object>} - Usuario creado
 */
async function createUser(userData) {
    return apiRequest('/auth/users', {
        method: 'POST',
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
        method: 'PUT',
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
        method: 'DELETE',
    });
}

/**
 * Obtiene la lista de roles disponibles (solo admin)
 * 
 * @returns {Promise<Array>} - Lista de roles
 */
async function getRoles() {
    return apiRequest('/auth/roles');
}

/**
 * Entrena un modelo CNN con datos de prueba (rol Testing)
 * 
 * @param {Object} trainingData - Datos para el entrenamiento
 * @returns {Promise<Object>} - Respuesta con el modelo entrenado
 */
async function trainCnnWithTestData(trainingData) {
    return apiRequest('/api/ml/cnn/train/test', {
        method: 'POST',
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
    return apiRequest('/api/ml/cnn/predict/test', {
        method: 'POST',
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
    return apiRequest('/api/ml/tabular/train/test', {
        method: 'POST',
        body: JSON.stringify(trainingData),
    });
}

/**
 * Predice con un modelo tabular usando datos de prueba (rol Testing)
 * 
 * @param {string} modelName - Nombre del modelo a utilizar
 * @returns {Promise<Object>} - Respuesta con la predicción
 */
async function predictTabularWithTestData(modelName) {
    return apiRequest('/api/ml/tabular/predict/test', {
        method: 'POST',
        body: JSON.stringify({ model_name: modelName }),
    });
}

/**
 * Obtiene la lista de modelos CNN disponibles
 * 
 * @returns {Promise<Array>} - Lista de modelos CNN
 */
async function getCnnModels() {
    return apiRequest('/api/ml/cnn/models');
}

/**
 * Obtiene la lista de modelos tabulares disponibles
 * 
 * @returns {Promise<Array>} - Lista de modelos tabulares
 */
async function getTabularModels() {
    return apiRequest('/api/ml/tabular/models');
}

/**
 * Elimina un modelo CNN (solo admin)
 * 
 * @param {string} modelName - Nombre del modelo a eliminar
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function deleteCnnModel(modelName) {
    return apiRequest(`/api/ml/cnn/models/${modelName}`, {
        method: 'DELETE',
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
        method: 'DELETE',
    });
}

/**
 * Obtiene estadísticas del dashboard
 * 
 * @returns {Promise<Object>} - Estadísticas del dashboard
 */
async function getDashboardStats() {
    return apiRequest('/api/dashboard/stats');
}