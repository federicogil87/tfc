/**
 * Funcionalidad para la página de predicción con modelos tabulares
 */
document.addEventListener('DOMContentLoaded', function() {
    // Cargar modelos
    loadTabularModels();
    
    // Configurar formulario
    setupPredictionForm();
    
    // Inicializar componentes de UI
    setupUserInfo();
});

/**
 * Carga los modelos tabulares disponibles
 */
async function loadTabularModels() {
    const container = document.getElementById('models-container');
    
    try {
        // Mostrar spinner de carga
        showSpinner(container, 'Cargando modelos tabulares...');
        
        // Obtener modelos
        const response = await getTabularModels();
        
        if (response && response.success && response.models.length > 0) {
            // Filtrar solo modelos de prueba
            const testModels = response.models.filter(model => model.metadata.data_type === 'test');
            
            if (testModels.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        No hay modelos tabulares de prueba disponibles. Por favor, entrene un modelo primero.
                    </div>
                    <div class="text-center mt-3">
                        <a href="tabular-train.html" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Entrenar Nuevo Modelo
                        </a>
                    </div>
                `;
                return;
            }
            
            // Crear lista de modelos
            const modelsHtml = `
                <div class="models-grid">
                    ${testModels.map(model => `
                        <div class="model-card model-selection" data-model="${model.id}">
                            <div class="model-card-header">
                                <h3 class="model-card-title">${model.metadata.model_name || 'Sin nombre'}</h3>
                                <span class="model-card-type">${model.metadata.algorithm || 'Tabular'}</span>
                            </div>
                            <div class="model-card-info">
                                <p><span class="label">Algoritmo:</span> ${formatAlgorithmName(model.metadata.algorithm)}</p>
                                <p><span class="label">Tipo:</span> ${model.metadata.problem_type === 'classification' ? 'Clasificación' : 'Regresión'}</p>
                                <p><span class="label">Características:</span> ${model.metadata.num_features || '?'}</p>
                                <p><span class="label">Creado:</span> ${formatDate(model.created_at)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Mostrar modelos
            container.innerHTML = modelsHtml;
            
            // Configurar eventos para selección de modelos
            setupModelSelection();
        } else {
            container.innerHTML = `
                <div class="alert alert-info">
                    No hay modelos tabulares disponibles. Por favor, entrene un modelo primero.
                </div>
                <div class="text-center mt-3">
                    <a href="tabular-train.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Entrenar Nuevo Modelo
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar modelos tabulares:', error);
        container.innerHTML = `<div class="alert alert-danger">Error al cargar modelos tabulares: ${error.message}</div>`;
    }
}

/**
 * Configura la selección de modelos
 */
function setupModelSelection() {
    const modelCards = document.querySelectorAll('.model-selection');
    const selectedModelInput = document.getElementById('selected-model');
    const predictBtn = document.getElementById('predict-btn');
    
    if (modelCards.length > 0 && selectedModelInput && predictBtn) {
        modelCards.forEach(card => {
            card.addEventListener('click', function() {
                // Quitar selección anterior
                document.querySelectorAll('.model-selection.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Añadir selección actual
                this.classList.add('selected');
                
                // Actualizar input y habilitar botón
                selectedModelInput.value = this.dataset.model;
                predictBtn.disabled = false;
                
                // Ocultar resultados anteriores
                document.getElementById('prediction-results').style.display = 'none';
            });
        });
    }
}

/**
 * Configura el formulario de predicción
 */
function setupPredictionForm() {
    const predictionForm = document.getElementById('predict-form');
    
    if (predictionForm) {
        predictionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Obtener modelo seleccionado
            const modelName = document.getElementById('selected-model').value;
            
            if (!modelName) {
                showAlert('Por favor, seleccione un modelo', 'warning', document.getElementById('alerts-container'));
                return;
            }
            
            // Mostrar estado de carga
            const predictBtn = document.getElementById('predict-btn');
            predictBtn.disabled = true;
            predictBtn.classList.add('loading');
            
            try {
                // Realizar predicción
                const response = await predictTabularWithTestData(modelName);
                
                // Mostrar resultados
                displayPredictionResults(response);
                
                // Quitar estado de carga
                predictBtn.disabled = false;
                predictBtn.classList.remove('loading');
            } catch (error) {
                console.error('Error al realizar predicción:', error);
                showAlert(`Error al realizar predicción: ${error.message}`, 'danger', document.getElementById('alerts-container'));
                
                // Quitar estado de carga
                predictBtn.disabled = false;
                predictBtn.classList.remove('loading');
            }
        });
    }
}

/**
 * Muestra los resultados de la predicción
 * 
 * @param {Object} results - Resultados de la predicción
 */
function displayPredictionResults(results) {
    const dataContainer = document.getElementById('data-container');
    const predictionDetails = document.getElementById('prediction-details');
    const resultsCard = document.getElementById('prediction-results');
    
    if (dataContainer && predictionDetails && resultsCard && results.data) {
        // Mostrar datos de prueba
        dataContainer.innerHTML = `
            <h3>Datos de Prueba</h3>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${Object.keys(results.data[0]).map(key => `<th>${key}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${results.data.map(row => `
                            <tr>
                                ${Object.values(row).map(value => `<td>${formatValue(value)}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <p class="mt-2 text-muted">Datos generados aleatoriamente para pruebas</p>
        `;
        
        // Mostrar detalles de predicción
        const predictions = results.prediction.predictions;
        const isProbabilistic = results.prediction.probabilities !== undefined;
        const problemType = results.metadata.problem_type || 'classification';
        
        let predictionsHtml = `
            <h3>Predicciones</h3>
            <div class="prediction-summary">
                <p>
                    <strong>Modelo:</strong> ${results.model_name}<br>
                    <strong>Algoritmo:</strong> ${formatAlgorithmName(results.metadata.algorithm)}<br>
                    <strong>Tipo:</strong> ${problemType === 'classification' ? 'Clasificación' : 'Regresión'}<br>
                </p>
            </div>
        `;
        
        // Tabla de predicciones
        predictionsHtml += `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Muestra</th>
                            <th>Predicción</th>
                            ${isProbabilistic ? '<th>Confianza</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (let i = 0; i < predictions.length; i++) {
            const prediction = predictions[i];
            
            if (problemType === 'classification' && isProbabilistic) {
                // Para clasificación con probabilidades
                const probabilities = results.prediction.probabilities[i];
                const maxProbIndex = probabilities.indexOf(Math.max(...probabilities));
                const confidence = probabilities[maxProbIndex] * 100;
                
                predictionsHtml += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>Clase ${prediction}</td>
                        <td>${confidence.toFixed(2)}%</td>
                    </tr>
                `;
            } else {
                // Para regresión o clasificación sin probabilidades
                predictionsHtml += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${problemType === 'classification' ? `Clase ${prediction}` : prediction.toFixed(4)}</td>
                        ${isProbabilistic ? '<td>-</td>' : ''}
                    </tr>
                `;
            }
        }
        
        predictionsHtml += `
                    </tbody>
                </table>
            </div>
        `;
        
        // Mostrar información del modelo
        predictionDetails.innerHTML = predictionsHtml;
        
        // Mostrar resultados
        resultsCard.style.display = 'block';
    }
}

/**
 * Formatea un valor para mostrarlo en la tabla
 * 
 * @param {any} value - Valor a formatear
 * @returns {string} - Valor formateado
 */
function formatValue(value) {
    if (value === null || value === undefined) {
        return '-';
    }
    
    if (typeof value === 'number') {
        return value.toFixed(4);
    }
    
    return value.toString();
}

/**
 * Formatea el nombre del algoritmo para mostrarlo
 * 
 * @param {string} algorithm - Nombre del algoritmo
 * @returns {string} - Nombre formateado del algoritmo
 */
function formatAlgorithmName(algorithm) {
    if (!algorithm) return 'Desconocido';
    
    const algorithmMap = {
        'svm': 'Support Vector Machine (SVM)',
        'knn': 'k-Nearest Neighbors (k-NN)',
        'random_forest': 'Random Forest',
        'linear_regression': 'Regresión Lineal'
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