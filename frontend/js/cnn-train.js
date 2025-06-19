/**
 * Funcionalidad para la página de entrenamiento de modelos CNN
 */
document.addEventListener('DOMContentLoaded', function() {
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
    const architectureSelect = document.getElementById('architecture');
    const customArchOptions = document.getElementById('custom-arch-options');
    
    if (architectureSelect && customArchOptions) {
        // Mostrar/ocultar opciones de arquitectura personalizada
        function toggleCustomOptions() {
            if (architectureSelect.value === 'custom') {
                customArchOptions.style.display = 'flex';
            } else {
                customArchOptions.style.display = 'none';
            }
        }
        
        // Configurar evento
        architectureSelect.addEventListener('change', toggleCustomOptions);
        
        // Ejecutar al cargar
        toggleCustomOptions();
    }
}

/**
 * Configura el formulario de entrenamiento
 */
function setupTrainingForm() {
    const trainingForm = document.getElementById('cnn-train-form');
    
    if (trainingForm) {
        trainingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Obtener datos del formulario
            const formData = new FormData(trainingForm);
            const trainingData = {};
            
            // Convertir FormData a objeto JSON
            for (const [key, value] of formData.entries()) {
                // Convertir valores numéricos
                if (['num_classes', 'num_samples', 'epochs', 'input_height', 'input_width'].includes(key)) {
                    trainingData[key] = parseInt(value);
                } else if (['learning_rate', 'dropout_rate', 'test_size'].includes(key)) {
                    trainingData[key] = parseFloat(value);
                } else if (key === 'data_augmentation') {
                    trainingData[key] = value === 'on';
                } else if (key === 'filters') {
                    try {
                        trainingData[key] = JSON.parse(value);
                    } catch (error) {
                        console.error('Error al parsear filtros:', error);
                        showAlert('Los filtros deben ser un array válido (ejemplo: [32, 64, 128])', 'danger', document.getElementById('alerts-container'));
                        return;
                    }
                } else {
                    trainingData[key] = value;
                }
            }
            
            // Añadir input_shape
            if (trainingData.architecture === 'custom') {
                trainingData.input_shape = [
                    trainingData.input_height, 
                    trainingData.input_width, 
                    3 // Canales RGB
                ];
            }
            
            // Validar datos
            if (!validateTrainingData(trainingData)) {
                return;
            }
            
            // Mostrar estado de carga
            const submitButton = trainingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            
            // Ocultar resultados anteriores
            document.getElementById('training-results').style.display = 'none';
            
            try {
                // Entrenar modelo
                const response = await trainCnnWithTestData(trainingData);
                
                // Mostrar resultados
                displayTrainingResults(response);
                
                // Mostrar mensaje de éxito
                showAlert('Modelo entrenado correctamente', 'success', document.getElementById('alerts-container'));
            } catch (error) {
                console.error('Error al entrenar modelo:', error);
                showAlert(`Error al entrenar modelo: ${error.message}`, 'danger', document.getElementById('alerts-container'));
            } finally {
                // Quitar estado de carga
                submitButton.disabled = false;
                submitButton.classList.remove('loading');
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
    const alertsContainer = document.getElementById('alerts-container');
    
    // Validar nombre del modelo
    if (!data.model_name) {
        showAlert('El nombre del modelo es obligatorio', 'danger', alertsContainer);
        return false;
    }
    
    // Validar número de clases
    if (data.num_classes < 2) {
        showAlert('El número de clases debe ser al menos 2', 'danger', alertsContainer);
        return false;
    }
    
    // Validar learning rate
    if (data.learning_rate <= 0 || data.learning_rate > 0.1) {
        showAlert('El learning rate debe estar entre 0.0001 y 0.1', 'danger', alertsContainer);
        return false;
    }
    
    // Validar dropout rate
    if (data.dropout_rate < 0 || data.dropout_rate >= 1) {
        showAlert('El dropout rate debe estar entre 0 y 0.9', 'danger', alertsContainer);
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
    const resultsContainer = document.getElementById('results-content');
    const resultsCard = document.getElementById('training-results');
    
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
                        <td>${results.evaluation?.model_params?.architecture || 'Personalizada'}</td>
                    </tr>
                    <tr>
                        <th>Precisión:</th>
                        <td>${(results.evaluation.accuracy * 100).toFixed(2)}%</td>
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
        resultsCard.style.display = 'block';
        
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
    if (typeof Chart !== 'undefined') {
        const ctx = document.getElementById('accuracy-chart').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: history.accuracy.length }, (_, i) => i + 1),
                datasets: [
                    {
                        label: 'Precisión de Entrenamiento',
                        data: history.accuracy,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1
                    },
                    {
                        label: 'Precisión de Validación',
                        data: history.val_accuracy || [],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1
                    }
                }
            }
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
        const userInitialElement = document.getElementById('user-initial');
        if (userInitialElement && user.username) {
            userInitialElement.textContent = user.username.charAt(0).toUpperCase();
        }
        
        // Nombre de usuario
        const userInfoElement = document.getElementById('user-info');
        if (userInfoElement) {
            userInfoElement.textContent = user.username;
        }
        
        // Rol del usuario
        const userRoleElement = document.getElementById('user-role');
        if (userRoleElement && user.roles && user.roles.length > 0) {
            userRoleElement.textContent = user.roles.join(', ');
        }
    }
}