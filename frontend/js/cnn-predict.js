/**
 * Funcionalidad para la página de predicción con modelos CNN
 */
document.addEventListener('DOMContentLoaded', function() {
    // Cargar modelos
    loadCnnModels();
    
    // Configurar formulario
    setupPredictionForm();
    
    // Inicializar componentes de UI
    setupUserInfo();
});

/**
 * Carga los modelos CNN disponibles
 */
async function loadCnnModels() {
    const container = document.getElementById('models-container');
    
    try {
        // Mostrar spinner de carga
        showSpinner(container, 'Cargando modelos CNN...');
        
        // Obtener modelos
        const response = await getCnnModels();
        
        if (response && response.success && response.models.length > 0) {
            // Filtrar solo modelos de prueba
            const testModels = response.models.filter(model => model.metadata.data_type === 'test');
            
            if (testModels.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        No hay modelos CNN de prueba disponibles. Por favor, entrene un modelo primero.
                    </div>
                    <div class="text-center mt-3">
                        <a href="cnn-train.html" class="btn btn-primary">
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
                                <span class="model-card-type">CNN</span>
                            </div>
                            <div class="model-card-info">
                                <p><span class="label">Arquitectura:</span> ${model.metadata.model_params?.architecture || 'Personalizada'}</p>
                                <p><span class="label">Precisión:</span> ${(model.metadata.accuracy * 100).toFixed(2)}%</p>
                                <p><span class="label">Clases:</span> ${model.metadata.model_params?.num_classes || '?'}</p>
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
                    No hay modelos CNN disponibles. Por favor, entrene un modelo primero.
                </div>
                <div class="text-center mt-3">
                    <a href="cnn-train.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Entrenar Nuevo Modelo
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar modelos CNN:', error);
        container.innerHTML = `<div class="alert alert-danger">Error al cargar modelos CNN: ${error.message}</div>`;
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
                const response = await predictCnnWithTestData(modelName);
                
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
    const imageContainer = document.getElementById('image-container');
    const predictionDetails = document.getElementById('prediction-details');
    const resultsCard = document.getElementById('prediction-results');
    
    if (imageContainer && predictionDetails && resultsCard) {
        // Mostrar imagen
        const imageData = results.image;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Configurar tamaño del canvas
        const imgHeight = imageData.length;
        const imgWidth = imageData[0].length;
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        
        // Crear imagen
        const imgData = ctx.createImageData(imgWidth, imgHeight);
        let pixelIndex = 0;
        
        for (let y = 0; y < imgHeight; y++) {
            for (let x = 0; x < imgWidth; x++) {
                // Convertir valores [0,1] a [0,255]
                const r = Math.floor(imageData[y][x][0] * 255);
                const g = Math.floor(imageData[y][x][1] * 255);
                const b = Math.floor(imageData[y][x][2] * 255);
                
                imgData.data[pixelIndex++] = r;
                imgData.data[pixelIndex++] = g;
                imgData.data[pixelIndex++] = b;
                imgData.data[pixelIndex++] = 255; // Alpha
            }
        }
        
        // Pintar imagen en canvas
        ctx.putImageData(imgData, 0, 0);
        
        // Mostrar canvas
        imageContainer.innerHTML = `
            <h3>Imagen de Prueba</h3>
            <div class="image-preview">
                ${canvas.outerHTML}
            </div>
            <p class="mt-2">Imagen generada aleatoriamente para pruebas</p>
        `;
        
        // Mostrar detalles de predicción
        const prediction = results.prediction;
        const numClasses = prediction.probabilities.length;
        
        predictionDetails.innerHTML = `
            <h3>Predicción</h3>
            <div class="prediction-summary">
                <p><strong>Clase predicha:</strong> Clase ${prediction.class}</p>
                <p><strong>Confianza:</strong> ${(prediction.confidence * 100).toFixed(2)}%</p>
            </div>
            
            <h4 class="mt-3">Probabilidades por Clase</h4>
            <div class="probabilities-list">
                ${prediction.probabilities.map((prob, index) => `
                    <div class="probability-item">
                        <div class="probability-label">Clase ${index}</div>
                        <div class="probability-bar-container">
                            <div class="probability-bar" style="width: ${prob * 100}%"></div>
                            <div class="probability-value">${(prob * 100).toFixed(2)}%</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="model-info mt-4">
                <h4>Información del Modelo</h4>
                <p><strong>Nombre:</strong> ${results.model_name}</p>
                <p><strong>Arquitectura:</strong> ${results.metadata.model_params?.architecture || 'Personalizada'}</p>
                <p><strong>Precisión:</strong> ${(results.metadata.accuracy * 100).toFixed(2)}%</p>
            </div>
        `;
        
        // Mostrar resultados
        resultsCard.style.display = 'block';
        
        // Dar estilo a la barra de la clase seleccionada
        const bars = document.querySelectorAll('.probability-bar');
        if (bars.length > prediction.class) {
            bars[prediction.class].style.backgroundColor = 'var(--success)';
        }
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