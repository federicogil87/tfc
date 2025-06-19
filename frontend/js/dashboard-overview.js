/**
 * Funcionalidad para la página de dashboard de modelos
 */
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes
    setupUserInfo();
    
    // Cargar datos
    loadDashboardData();
});

/**
 * Carga los datos para el dashboard
 */
async function loadDashboardData() {
    try {
        // Cargar modelos CNN y tabulares
        const [cnnResponse, tabularResponse] = await Promise.all([
            getCnnModels(),
            getTabularModels()
        ]);
        
        // Procesar datos
        if (cnnResponse && cnnResponse.success && tabularResponse && tabularResponse.success) {
            const cnnModels = cnnResponse.models || [];
            const tabularModels = tabularResponse.models || [];
            
            // Actualizar estadísticas
            updateStatistics(cnnModels, tabularModels);
            
            // Crear gráficos
            createCnnComparisonChart(cnnModels);
            createTabularComparisonChart(tabularModels);
            createModelTypeChart(cnnModels, tabularModels);
            
            // Mostrar modelos recientes
            displayRecentModels(cnnModels, tabularModels);
        }
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        showAlert(`Error al cargar datos: ${error.message}`, 'danger', document.getElementById('alerts-container'));
    }
}

/**
 * Actualiza las estadísticas del dashboard
 * 
 * @param {Array} cnnModels - Modelos CNN
 * @param {Array} tabularModels - Modelos tabulares
 */
function updateStatistics(cnnModels, tabularModels) {
    // Total de modelos CNN
    document.getElementById('total-cnn-models').textContent = cnnModels.length;
    
    // Total de modelos tabulares
    document.getElementById('total-tabular-models').textContent = tabularModels.length;
    
    // Mejor precisión
    let bestAccuracy = 0;
    
    // Revisar modelos CNN
    cnnModels.forEach(model => {
        const accuracy = model.metadata.accuracy || 0;
        if (accuracy > bestAccuracy) {
            bestAccuracy = accuracy;
        }
    });
    
    // Revisar modelos tabulares
    tabularModels.forEach(model => {
        const evaluation = model.metadata.evaluation || {};
        const accuracy = evaluation.accuracy || 0;
        if (accuracy > bestAccuracy) {
            bestAccuracy = accuracy;
        }
    });
    
    // Actualizar mejor precisión
    document.getElementById('best-accuracy').textContent = `${(bestAccuracy * 100).toFixed(2)}%`;
    
    // Modelos este mes
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let modelsThisMonth = 0;
    
    // Contar modelos CNN de este mes
    cnnModels.forEach(model => {
        const createdDate = new Date(model.created_at);
        if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
            modelsThisMonth++;
        }
    });
    
    // Contar modelos tabulares de este mes
    tabularModels.forEach(model => {
        const createdDate = new Date(model.created_at);
        if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
            modelsThisMonth++;
        }
    });
    
    // Actualizar modelos este mes
    document.getElementById('models-this-month').textContent = modelsThisMonth;
}

/**
 * Crea un gráfico de comparación de modelos CNN
 * 
 * @param {Array} models - Modelos CNN
 */
function createCnnComparisonChart(models) {
    const container = document.getElementById('cnn-comparison-chart');
    const noDataMessage = document.getElementById('cnn-no-data');
    
    // Verificar si hay modelos
    if (!models || models.length === 0) {
        container.style.display = 'none';
        noDataMessage.style.display = 'flex';
        return;
    }
    
    // Mostrar canvas y ocultar mensaje
    container.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    // Limitar a los 10 modelos más recientes
    const recentModels = models.slice(0, 10);
    
    // Preparar datos para el gráfico
    const labels = recentModels.map(model => truncateText(model.metadata.model_name || 'Sin nombre', 15));
    const accuracyData = recentModels.map(model => (model.metadata.accuracy || 0) * 100);
    const lossData = recentModels.map(model => model.metadata.loss || 0);
    
    // Crear gráfico
    const ctx = container.getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.cnnChart) {
        window.cnnChart.destroy();
    }
    
    // Crear nuevo gráfico
    window.cnnChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Precisión (%)',
                    data: accuracyData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Pérdida',
                    data: lossData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Precisión y Pérdida de Modelos CNN'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Precisión (%)'
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Pérdida'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    suggestedMin: 0
                }
            }
        }
    });
}

/**
 * Crea un gráfico de comparación de modelos tabulares
 * 
 * @param {Array} models - Modelos tabulares
 */
function createTabularComparisonChart(models) {
    const container = document.getElementById('tabular-comparison-chart');
    const noDataMessage = document.getElementById('tabular-no-data');
    
    // Verificar si hay modelos
    if (!models || models.length === 0) {
        container.style.display = 'none';
        noDataMessage.style.display = 'flex';
        return;
    }
    
    // Mostrar canvas y ocultar mensaje
    container.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    // Limitar a los 10 modelos más recientes
    const recentModels = models.slice(0, 10);
    
    // Preparar datos para el gráfico
    const labels = recentModels.map(model => truncateText(model.metadata.model_name || 'Sin nombre', 15));
    const accuracyData = recentModels.map(model => {
        const evaluation = model.metadata.evaluation || {};
        return (evaluation.accuracy || 0) * 100;
    });
    
    // Determinar el tipo de modelo para color
    const backgroundColors = recentModels.map(model => {
        const algorithm = model.metadata.algorithm || '';
        switch (algorithm) {
            case 'svm':
                return 'rgba(255, 159, 64, 0.5)'; // Naranja
            case 'knn':
                return 'rgba(75, 192, 192, 0.5)'; // Verde azulado
            case 'random_forest':
                return 'rgba(153, 102, 255, 0.5)'; // Púrpura
            case 'linear_regression':
                return 'rgba(255, 205, 86, 0.5)'; // Amarillo
            default:
                return 'rgba(201, 203, 207, 0.5)'; // Gris
        }
    });
    
    const borderColors = recentModels.map(model => {
        const algorithm = model.metadata.algorithm || '';
        switch (algorithm) {
            case 'svm':
                return 'rgba(255, 159, 64, 1)';
            case 'knn':
                return 'rgba(75, 192, 192, 1)';
            case 'random_forest':
                return 'rgba(153, 102, 255, 1)';
            case 'linear_regression':
                return 'rgba(255, 205, 86, 1)';
            default:
                return 'rgba(201, 203, 207, 1)';
        }
    });
    
    // Crear gráfico
    const ctx = container.getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.tabularChart) {
        window.tabularChart.destroy();
    }
    
    // Crear nuevo gráfico
    window.tabularChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Precisión (%)',
                    data: accuracyData,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Precisión de Modelos Tabulares'
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const model = recentModels[context.dataIndex];
                            return `Algoritmo: ${formatAlgorithmName(model.metadata.algorithm)}`;
                        }
                    }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Precisión (%)'
                    },
                    suggestedMax: 100
                }
            }
        }
    });
}

/**
 * Crea un gráfico de rendimiento por tipo de modelo
 * 
 * @param {Array} cnnModels - Modelos CNN
 * @param {Array} tabularModels - Modelos tabulares
 */
function createModelTypeChart(cnnModels, tabularModels) {
    const container = document.getElementById('model-type-chart');
    const noDataMessage = document.getElementById('type-no-data');
    
    // Verificar si hay modelos
    if ((!cnnModels || cnnModels.length === 0) && (!tabularModels || tabularModels.length === 0)) {
        container.style.display = 'none';
        noDataMessage.style.display = 'flex';
        return;
    }
    
    // Mostrar canvas y ocultar mensaje
    container.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    // Obtener promedios por tipo de modelo
    const algorithmData = {};
    
    // Agregar modelos CNN por arquitectura
    cnnModels.forEach(model => {
        const architecture = model.metadata.model_params?.architecture || 'custom';
        const accuracy = model.metadata.accuracy || 0;
        
        if (!algorithmData[`CNN - ${architecture}`]) {
            algorithmData[`CNN - ${architecture}`] = {
                count: 0,
                sumAccuracy: 0
            };
        }
        
        algorithmData[`CNN - ${architecture}`].count++;
        algorithmData[`CNN - ${architecture}`].sumAccuracy += accuracy;
    });
    
    // Agregar modelos tabulares por algoritmo
    tabularModels.forEach(model => {
        const algorithm = model.metadata.algorithm || 'unknown';
        const evaluation = model.metadata.evaluation || {};
        const accuracy = evaluation.accuracy || 0;
        
        if (!algorithmData[formatAlgorithmName(algorithm)]) {
            algorithmData[formatAlgorithmName(algorithm)] = {
                count: 0,
                sumAccuracy: 0
            };
        }
        
        algorithmData[formatAlgorithmName(algorithm)].count++;
        algorithmData[formatAlgorithmName(algorithm)].sumAccuracy += accuracy;
    });
    
    // Calcular promedios
    const labels = [];
    const data = [];
    const backgroundColors = [];
    
    for (const [algorithm, stats] of Object.entries(algorithmData)) {
        if (stats.count > 0) {
            labels.push(algorithm);
            data.push((stats.sumAccuracy / stats.count) * 100);
            
            // Asignar colores según el tipo
            if (algorithm.startsWith('CNN')) {
                backgroundColors.push('rgba(54, 162, 235, 0.5)');
            } else if (algorithm.includes('SVM')) {
                backgroundColors.push('rgba(255, 159, 64, 0.5)');
            } else if (algorithm.includes('k-NN')) {
                backgroundColors.push('rgba(75, 192, 192, 0.5)');
            } else if (algorithm.includes('Random Forest')) {
                backgroundColors.push('rgba(153, 102, 255, 0.5)');
            } else if (algorithm.includes('Regresión')) {
                backgroundColors.push('rgba(255, 205, 86, 0.5)');
            } else {
                backgroundColors.push('rgba(201, 203, 207, 0.5)');
            }
        }
    }
    
    // Crear gráfico
    const ctx = container.getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.typeChart) {
        window.typeChart.destroy();
    }
    
    // Crear nuevo gráfico
    window.typeChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Precisión Promedio (%)',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    pointBackgroundColor: backgroundColors,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Precisión Promedio por Tipo de Modelo'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(2)}%`;
                        },
                        afterLabel: function(context) {
                            const algorithm = labels[context.dataIndex];
                            const count = algorithmData[algorithm].count;
                            return `Modelos: ${count}`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}

/**
 * Muestra los modelos más recientes en una tabla
 * 
 * @param {Array} cnnModels - Modelos CNN
 * @param {Array} tabularModels - Modelos tabulares
 */
function displayRecentModels(cnnModels, tabularModels) {
    const tableBody = document.getElementById('recent-models-table');
    const noDataMessage = document.getElementById('recent-no-data');
    
    // Combinar modelos
    const allModels = [
        ...cnnModels.map(model => ({
            ...model,
            type: 'CNN',
            accuracy: model.metadata.accuracy || 0
        })),
        ...tabularModels.map(model => ({
            ...model,
            type: 'Tabular',
            accuracy: model.metadata.evaluation?.accuracy || 0
        }))
    ];
    
    // Ordenar por fecha (más recientes primero)
    allModels.sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
    });
    
    // Limitar a los 10 más recientes
    const recentModels = allModels.slice(0, 10);
    
    // Verificar si hay modelos
    if (recentModels.length === 0) {
        tableBody.innerHTML = '';
        noDataMessage.style.display = 'flex';
        return;
    }
    
    // Mostrar tabla y ocultar mensaje
    noDataMessage.style.display = 'none';
    
    // Crear filas de la tabla
    let tableHtml = '';
    
    recentModels.forEach(model => {
        const modelName = model.metadata.model_name || 'Sin nombre';
        const accuracy = (model.accuracy * 100).toFixed(2);
        const date = formatDate(model.created_at);
        const modelId = model.id;
        
        // Determinar tipo de algoritmo para modelos tabulares
        let typeDisplay = model.type;
        if (model.type === 'Tabular' && model.metadata.algorithm) {
            typeDisplay = formatAlgorithmName(model.metadata.algorithm);
        } else if (model.type === 'CNN' && model.metadata.model_params?.architecture) {
            typeDisplay = `CNN - ${model.metadata.model_params.architecture}`;
        }
        
        tableHtml += `
            <tr>
                <td>${modelName}</td>
                <td>${typeDisplay}</td>
                <td>${accuracy}%</td>
                <td>${date}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn" onclick="viewModelDetails('${model.type.toLowerCase()}', '${modelId}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>