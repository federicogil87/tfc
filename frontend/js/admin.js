/**
 * Funcionalidad para la página de administración
 */
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes
    initTabs();
    initModals();
    
    // Cargar datos
    loadUsers();
    loadRoles();
    loadCnnModels();
    loadTabularModels();
    
    // Configurar eventos
    setupUserEvents();
    setupModelEvents();
});

/**
 * Inicializa las pestañas
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.nav-link[data-tab]');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Desactivar todas las pestañas
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Activar la pestaña seleccionada
            this.classList.add('active');
            const tabId = this.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Inicializa las modales
 */
function initModals() {
    // Configurar cerrado de modales
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            closeModal(this.closest('.modal').id);
        });
    });
    
    // Cerrar modal al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
}

/**
 * Abre una modal
 * 
 * @param {string} modalId - ID de la modal a abrir
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Cierra una modal
 * 
 * @param {string} modalId - ID de la modal a cerrar
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Configura eventos para la gestión de usuarios
 */
function setupUserEvents() {
    // Botón para añadir usuario
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            // Resetear formulario
            document.getElementById('user-form').reset();
            document.getElementById('user-id').value = '';
            document.getElementById('modal-title').textContent = 'Añadir Usuario';
            document.getElementById('password-help').style.display = 'none';
            
            // Abrir modal
            openModal('user-modal');
        });
    }
    
    // Botón para guardar usuario
    const saveUserBtn = document.getElementById('save-user-btn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', function() {
            saveUser();
        });
    }
}

/**
 * Configura eventos para la gestión de modelos
 */
function setupModelEvents() {
    // Eventos delegados para botones de eliminar modelos
    document.addEventListener('click', function(e) {
        // Botón para eliminar modelo CNN
        if (e.target.closest('.delete-cnn-model')) {
            const modelName = e.target.closest('.delete-cnn-model').dataset.model;
            confirmDeleteModel('CNN', modelName);
        }
        
        // Botón para eliminar modelo tabular
        if (e.target.closest('.delete-tabular-model')) {
            const modelName = e.target.closest('.delete-tabular-model').dataset.model;
            confirmDeleteModel('Tabular', modelName);
        }
    });
    
    // Botón de confirmación de eliminación
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', function() {
            const action = this.dataset.action;
            const modelType = this.dataset.modelType;
            const modelName = this.dataset.modelName;
            
            if (action === 'delete-model') {
                deleteModel(modelType, modelName);
            }
        });
    }
}

/**
 * Carga la lista de usuarios
 */
async function loadUsers() {
    const container = document.getElementById('users-table-container');
    
    try {
        // Mostrar spinner de carga
        showSpinner(container, 'Cargando usuarios...');
        
        // Obtener usuarios
        const response = await getUsers();
        
        if (response && response.length >= 0) {
            // Crear tabla de usuarios
            const tableHtml = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuario</th>
                                <th>Email</th>
                                <th>Roles</th>
                                <th>Estado</th>
                                <th>Creado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            ${response.map(user => `
                                <tr>
                                    <td>${user.id}</td>
                                    <td>${user.username}</td>
                                    <td>${user.email || '-'}</td>
                                    <td>${user.roles.join(', ')}</td>
                                    <td>
                                        <span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">
                                            ${user.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>${formatDate(user.created_at)}</td>
                                    <td>
                                        <div class="table-actions">
                                            <button class="action-btn edit edit-user" data-id="${user.id}">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete delete-user" data-id="${user.id}">
                                                <i class="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            // Mostrar tabla
            container.innerHTML = tableHtml;
            
            // Configurar eventos para editar y eliminar usuarios
            setupUserTableEvents();
        } else {
            container.innerHTML = '<p>No se encontraron usuarios.</p>';
        }
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        container.innerHTML = `<div class="alert alert-danger">Error al cargar usuarios: ${error.message}</div>`;
    }
}

/**
 * Configura eventos para los botones de la tabla de usuarios
 */
function setupUserTableEvents() {
    // Botones para editar usuario
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', async function() {
            const userId = this.dataset.id;
            await loadUserForEdit(userId);
        });
    });
    
    // Botones para eliminar usuario
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.id;
            confirmDeleteUser(userId);
        });
    });
}

/**
 * Carga los datos de un usuario para edición
 * 
 * @param {string} userId - ID del usuario a editar
 */
async function loadUserForEdit(userId) {
    try {
        // Obtener todos los usuarios
        const response = await getUsers();
        
        // Encontrar el usuario a editar
        const user = response.find(u => u.id.toString() === userId.toString());
        
        if (user) {
            // Rellenar formulario
            document.getElementById('user-id').value = user.id;
            document.getElementById('username').value = user.username;
            document.getElementById('email').value = user.email || '';
            document.getElementById('password').value = '';
            document.getElementById('is-active').checked = user.is_active;
            
            // Mostrar ayuda para contraseña en modo edición
            document.getElementById('password-help').style.display = 'block';
            
            // Marcar roles del usuario
            const userRoles = user.roles || [];
            document.querySelectorAll('input[name="roles"]').forEach(checkbox => {
                checkbox.checked = userRoles.includes(checkbox.value);
            });
            
            // Actualizar título de la modal
            document.getElementById('modal-title').textContent = 'Editar Usuario';
            
            // Abrir modal
            openModal('user-modal');
        } else {
            showAlert('Usuario no encontrado.', 'danger', document.getElementById('alerts-container'));
        }
    } catch (error) {
        console.error('Error al cargar usuario para editar:', error);
        showAlert(`Error al cargar usuario: ${error.message}`, 'danger', document.getElementById('alerts-container'));
    }
}

/**
 * Confirma la eliminación de un usuario
 * 
 * @param {string} userId - ID del usuario a eliminar
 */
function confirmDeleteUser(userId) {
    const confirmBtn = document.getElementById('confirm-action-btn');
    
    // Configurar botón de confirmación
    confirmBtn.dataset.action = 'delete-user';
    confirmBtn.dataset.userId = userId;
    
    // Actualizar título y mensaje
    document.getElementById('confirm-title').textContent = 'Eliminar Usuario';
    document.getElementById('confirm-message').textContent = '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.';
    
    // Asignar evento
    confirmBtn.onclick = function() {
        deleteUser(userId);
        closeModal('confirm-modal');
    };
    
    // Abrir modal
    openModal('confirm-modal');
}

/**
 * Elimina un usuario
 * 
 * @param {string} userId - ID del usuario a eliminar
 */
async function deleteUser(userId) {
    try {
        // Llamar a API para eliminar usuario
        await deleteUser(userId);
        
        // Mostrar mensaje de éxito
        showAlert('Usuario eliminado correctamente.', 'success', document.getElementById('alerts-container'));
        
        // Recargar lista de usuarios
        loadUsers();
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        showAlert(`Error al eliminar usuario: ${error.message}`, 'danger', document.getElementById('alerts-container'));
    }
}

/**
 * Guarda un usuario (nuevo o editado)
 */
async function saveUser() {
    try {
        // Obtener datos del formulario
        const userId = document.getElementById('user-id').value;
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const isActive = document.getElementById('is-active').checked;
        
        // Obtener roles seleccionados
        const roles = [];
        document.querySelectorAll('input[name="roles"]:checked').forEach(checkbox => {
            roles.push(checkbox.value);
        });
        
        // Validar datos
        if (!username) {
            showAlert('El nombre de usuario es obligatorio.', 'danger', document.querySelector('.modal-body'));
            return;
        }
        
        if (!userId && !password) {
            showAlert('La contraseña es obligatoria para nuevos usuarios.', 'danger', document.querySelector('.modal-body'));
            return;
        }
        
        // Preparar datos
        const userData = {
            username,
            email: email || null,
            is_active: isActive,
            roles
        };
        
        // Añadir contraseña si no está vacía
        if (password) {
            userData.password = password;
        }
        
        // Llamar a API para crear o actualizar usuario
        let response;
        if (userId) {
            response = await updateUser(userId, userData);
        } else {
            response = await createUser(userData);
        }
        
        // Cerrar modal
        closeModal('user-modal');
        
        // Mostrar mensaje de éxito
        showAlert(`Usuario ${userId ? 'actualizado' : 'creado'} correctamente.`, 'success', document.getElementById('alerts-container'));
        
        // Recargar lista de usuarios
        loadUsers();
    } catch (error) {
        console.error('Error al guardar usuario:', error);
        showAlert(`Error al guardar usuario: ${error.message}`, 'danger', document.querySelector('.modal-body'));
    }
}

/**
 * Carga los roles disponibles
 */
async function loadRoles() {
    try {
        // Obtener roles
        const response = await getRoles();
        
        if (response && response.length > 0) {
            // Generar HTML para checkboxes de roles
            const rolesContainer = document.getElementById('roles-container');
            
            if (rolesContainer) {
                const rolesHtml = response.map(role => `
                    <div class="form-check">
                        <input type="checkbox" id="role-${role.id}" name="roles" value="${role.name}">
                        <label for="role-${role.id}">${role.name}</label>
                    </div>
                `).join('');
                
                rolesContainer.innerHTML = rolesHtml;
            }
        }
    } catch (error) {
        console.error('Error al cargar roles:', error);
    }
}

/**
 * Carga los modelos CNN
 */
async function loadCnnModels() {
    const container = document.getElementById('cnn-models-container');
    
    try {
        // Mostrar spinner de carga
        showSpinner(container, 'Cargando modelos CNN...');
        
        // Obtener modelos
        const response = await getCnnModels();
        
        if (response && response.success && response.models.length > 0) {
            // Crear grid de modelos
            const modelsHtml = `
                <div class="models-grid">
                    ${response.models.map(model => `
                        <div class="model-card">
                            <div class="model-card-header">
                                <h3 class="model-card-title">${model.metadata.model_name || 'Sin nombre'}</h3>
                                <span class="model-card-type">CNN</span>
                            </div>
                            <div class="model-card-info">
                                <p><span class="label">Arquitectura:</span> ${model.metadata.model_params?.architecture || 'Personalizada'}</p>
                                <p><span class="label">Precisión:</span> ${(model.metadata.accuracy * 100).toFixed(2)}%</p>
                                <p><span class="label">Tipo de datos:</span> ${model.metadata.data_type === 'test' ? 'Prueba' : 'Real'}</p>
                                <p><span class="label">Creado por:</span> ${model.metadata.created_by || 'Desconocido'}</p>
                            </div>
                            <div class="model-card-footer">
                                <span class="model-card-date">${formatDate(model.created_at)}</span>
                                <button class="btn btn-danger btn-sm delete-cnn-model" data-model="${model.id}">
                                    <i class="fas fa-trash-alt"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Mostrar modelos
            container.innerHTML = modelsHtml;
        } else {
            // Mostrar estado vacío
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-brain"></i>
                    <h3>No hay modelos CNN</h3>
                    <p>Aún no se han entrenado modelos CNN.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar modelos CNN:', error);
        container.innerHTML = `<div class="alert alert-danger">Error al cargar modelos CNN: ${error.message}</div>`;
    }
}

/**
 * Carga los modelos tabulares
 */
async function loadTabularModels() {
    const container = document.getElementById('tabular-models-container');
    
    try {
        // Mostrar spinner de carga
        showSpinner(container, 'Cargando modelos tabulares...');
        
        // Obtener modelos
        const response = await getTabularModels();
        
        if (response && response.success && response.models.length > 0) {
            // Crear grid de modelos
            const modelsHtml = `
                <div class="models-grid">
                    ${response.models.map(model => `
                        <div class="model-card">
                            <div class="model-card-header">
                                <h3 class="model-card-title">${model.metadata.model_name || 'Sin nombre'}</h3>
                                <span class="model-card-type">${model.metadata.algorithm || 'Tabular'}</span>
                            </div>
                            <div class="model-card-info">
                                <p><span class="label">Algoritmo:</span> ${model.metadata.algorithm || 'Desconocido'}</p>
                                <p><span class="label">Tipo:</span> ${model.metadata.problem_type === 'classification' ? 'Clasificación' : 'Regresión'}</p>
                                <p><span class="label">Tipo de datos:</span> ${model.metadata.data_type === 'test' ? 'Prueba' : 'Real'}</p>
                                <p><span class="label">Creado por:</span> ${model.metadata.created_by || 'Desconocido'}</p>
                            </div>
                            <div class="model-card-footer">
                                <span class="model-card-date">${formatDate(model.created_at)}</span>
                                <button class="btn btn-danger btn-sm delete-tabular-model" data-model="${model.id}">
                                    <i class="fas fa-trash-alt"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Mostrar modelos
            container.innerHTML = modelsHtml;
        } else {
            // Mostrar estado vacío
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-table"></i>
                    <h3>No hay modelos tabulares</h3>
                    <p>Aún no se han entrenado modelos tabulares.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar modelos tabulares:', error);
        container.innerHTML = `<div class="alert alert-danger">Error al cargar modelos tabulares: ${error.message}</div>`;
    }
}

/**
 * Confirma la eliminación de un modelo
 * 
 * @param {string} modelType - Tipo de modelo (CNN o Tabular)
 * @param {string} modelName - Nombre del modelo a eliminar
 */
function confirmDeleteModel(modelType, modelName) {
    const confirmBtn = document.getElementById('confirm-action-btn');
    
    // Configurar botón de confirmación
    confirmBtn.dataset.action = 'delete-model';
    confirmBtn.dataset.modelType = modelType;
    confirmBtn.dataset.modelName = modelName;
    
    // Actualizar título y mensaje
    document.getElementById('confirm-title').textContent = `Eliminar Modelo ${modelType}`;
    document.getElementById('confirm-message').textContent = `¿Estás seguro de que deseas eliminar el modelo "${modelName}"? Esta acción no se puede deshacer.`;
    
    // Abrir modal
    openModal('confirm-modal');
}

/**
 * Elimina un modelo
 * 
 * @param {string} modelType - Tipo de modelo (CNN o Tabular)
 * @param {string} modelName - Nombre del modelo a eliminar
 */
async function deleteModel(modelType, modelName) {
    try {
        // Llamar a API para eliminar modelo
        if (modelType === 'CNN') {
            await deleteCnnModel(modelName);
        } else if (modelType === 'Tabular') {
            await deleteTabularModel(modelName);
        }
        
        // Mostrar mensaje de éxito
        showAlert(`Modelo ${modelType} eliminado correctamente.`, 'success', document.getElementById('alerts-container'));
        
        // Recargar lista de modelos
        if (modelType === 'CNN') {
            loadCnnModels();
        } else if (modelType === 'Tabular') {
            loadTabularModels();
        }
    } catch (error) {
        console.error(`Error al eliminar modelo ${modelType}:`, error);
        showAlert(`Error al eliminar modelo: ${error.message}`, 'danger', document.getElementById('alerts-container'));
    }
}