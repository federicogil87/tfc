# ML Backend con Flask

Backend para entrenamiento y predicción de modelos de Machine Learning y Deep Learning, desarrollado con Python y Flask.

## Características

- **Autenticación y autorización**: Sistema de usuarios con roles (Administrador, Testing, Usuario)
- **Seguridad**: Contraseñas hasheadas, protección de rutas por rol, validación de entradas
- **Algoritmos de Machine Learning**:
  - **CNN** (Redes Neuronales Convolucionales) para análisis de imágenes
  - **SVM** (Support Vector Machines) para clasificación/regresión
  - **k-NN** (k-Nearest Neighbors) para clasificación/regresión
  - **RandomForest** para clasificación/regresión
  - **Regresión Lineal** (simple y múltiple) para predicción de valores continuos
- **Entrenamiento y predicción** con datos de prueba y reales
- **Gestión de modelos**: Guardado y carga de modelos entrenados

## Tecnologías utilizadas

- **Backend**: Flask, SQLAlchemy, JWT
- **Machine Learning**: TensorFlow, Keras, Scikit-learn
- **Base de datos**: SQLite (configurable para PostgreSQL u otras)

## Estructura del Proyecto

```
ml_backend/
├── app.py                    # Punto de entrada de la aplicación
├── config.py                 # Configuraciones generales
├── requirements.txt          # Dependencias del proyecto
├── .env                      # Variables de entorno (no en control de versiones)
├── .gitignore                # Archivos a ignorar por git
├── README.md                 # Documentación general
├── auth/                     # Módulo de autenticación
│   ├── __init__.py
│   ├── models.py             # Modelos de usuario y roles
│   ├── routes.py             # Rutas para autenticación
│   └── utils.py              # Utilidades para autenticación
├── ml/                       # Módulo de machine learning
│   ├── __init__.py
│   ├── cnn/                  # Algoritmos CNN para imágenes
│   │   ├── __init__.py
│   │   ├── model.py          # Definición del modelo CNN
│   │   ├── routes.py         # Endpoints para CNN
│   │   └── utils.py          # Utilidades para CNN
│   ├── tabular/              # Algoritmos para datos tabulares
│   │   ├── __init__.py
│   │   ├── models.py         # Definiciones de SVM, k-NN, RandomForest y Regresión
│   │   ├── routes.py         # Endpoints para algoritmos tabulares
│   │   └── utils.py          # Utilidades para datos tabulares
│   └── common/               # Funcionalidades comunes de ML
│       ├── __init__.py
│       ├── data.py           # Funciones de procesamiento de datos
│       └── model_storage.py  # Gestión de modelos entrenados
├── uploads/                  # Directorio para archivos subidos
│   ├── images/               # Almacenamiento temporal de imágenes
│   └── tabular/              # Almacenamiento temporal de CSV/Excel
└── models/                   # Directorio para guardar modelos entrenados
    ├── cnn/                  # Modelos CNN guardados
    └── tabular/              # Modelos tabulares guardados
```

## Instalación

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/tu-usuario/ml-backend.git
   cd ml-backend
   ```

2. Crear un entorno virtual e instalar dependencias:

   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Configurar el entorno:

   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones
   ```

4. Ejecutar la aplicación:
   ```bash
   python app.py
   ```

## Usuarios predeterminados

El sistema crea automáticamente tres usuarios:

- **admin**: Rol Administrador (acceso a gestión de usuarios)
- **test**: Rol Testing (acceso a entrenamiento y predicción con datos de prueba)
- **usuario**: Rol Usuario (acceso a entrenamiento y predicción con datos reales)

La contraseña para todos los usuarios es `123456`.

## API Endpoints

### Autenticación

#### Iniciar sesión

- **URL**: `POST /auth/login`
- **Acceso**: Público
- **Descripción**: Inicia sesión y obtiene tokens de acceso y refresco
- **Parámetros**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "access_token": "string",
    "refresh_token": "string",
    "user": {
      "id": "integer",
      "username": "string",
      "roles": ["string"]
    }
  }
  ```

#### Renovar token

- **URL**: `POST /auth/refresh`
- **Acceso**: Usuario autenticado
- **Descripción**: Renueva el token de acceso usando el token de refresco
- **Headers**: `Authorization: Bearer {refresh_token}`
- **Respuesta exitosa**:
  ```json
  {
    "access_token": "string"
  }
  ```

#### Obtener información del usuario actual

- **URL**: `GET /auth/me`
- **Acceso**: Usuario autenticado
- **Descripción**: Obtiene información del usuario autenticado
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**:
  ```json
  {
    "id": "integer",
    "username": "string",
    "roles": ["string"],
    "created_at": "datetime"
  }
  ```

### Administración de usuarios (solo rol Administrador)

#### Listar usuarios

- **URL**: `GET /auth/users`
- **Acceso**: Rol Administrador
- **Descripción**: Obtiene lista de todos los usuarios registrados
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**:
  ```json
  [
    {
      "id": "integer",
      "username": "string",
      "roles": ["string"],
      "created_at": "datetime"
    }
  ]
  ```

#### Crear usuario

- **URL**: `POST /auth/users`
- **Acceso**: Rol Administrador
- **Descripción**: Crea un nuevo usuario
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**:
  ```json
  {
    "username": "string",
    "password": "string",
    "roles": ["string"]
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "id": "integer",
    "username": "string",
    "roles": ["string"],
    "created_at": "datetime"
  }
  ```

#### Obtener usuario específico

- **URL**: `GET /auth/users/<id>`
- **Acceso**: Rol Administrador
- **Descripción**: Obtiene información de un usuario específico
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**:
  ```json
  {
    "id": "integer",
    "username": "string",
    "roles": ["string"],
    "created_at": "datetime"
  }
  ```

#### Actualizar usuario

- **URL**: `PUT /auth/users/<id>`
- **Acceso**: Rol Administrador
- **Descripción**: Actualiza información de un usuario existente
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**:
  ```json
  {
    "username": "string",
    "password": "string", // Opcional
    "roles": ["string"]
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "id": "integer",
    "username": "string",
    "roles": ["string"],
    "created_at": "datetime"
  }
  ```

#### Eliminar usuario

- **URL**: `DELETE /auth/users/<id>`
- **Acceso**: Rol Administrador
- **Descripción**: Elimina un usuario del sistema
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Usuario eliminado correctamente"
  }
  ```

#### Listar roles disponibles

- **URL**: `GET /auth/roles`
- **Acceso**: Rol Administrador
- **Descripción**: Obtiene lista de todos los roles disponibles
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**:
  ```json
  [
    {
      "id": "integer",
      "name": "string"
    }
  ]
  ```

### Modelos CNN

#### Entrenar CNN con datos de prueba

- **URL**: `POST /api/ml/cnn/train/test`
- **Acceso**: Rol Testing
- **Descripción**: Entrena un modelo CNN con datos de prueba generados automáticamente
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**:
  ```json
  {
    "model_name": "string",
    "architecture": "string", // "simple", "medium", "complex" o "custom"
    "num_classes": "integer",
    "batch_size": "integer",
    "epochs": "integer",
    "learning_rate": "float",
    "dropout_rate": "float",
    "data_augmentation": "boolean",
    "validation_split": "float",
    "filters": "array", // Solo para architecture="custom", ej: [32, 64, 128]
    "input_height": "integer", // Solo para architecture="custom"
    "input_width": "integer" // Solo para architecture="custom"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Modelo entrenado correctamente",
    "model_name": "string",
    "model_path": "string",
    "evaluation": {
      "accuracy": "float",
      "loss": "float"
    },
    "history": {
      "accuracy": ["float"],
      "loss": ["float"],
      "val_accuracy": ["float"],
      "val_loss": ["float"]
    }
  }
  ```

#### Entrenar CNN con datos reales

- **URL**: `POST /api/ml/cnn/train/real`
- **Acceso**: Rol Usuario
- **Descripción**: Entrena un modelo CNN con datos reales (imágenes)
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**: Formulario multipart
  - `model_name`: string
  - `architecture`: string ("simple", "medium", "complex" o "custom")
  - `num_classes`: integer
  - `batch_size`: integer
  - `epochs`: integer
  - `learning_rate`: float
  - `dropout_rate`: float
  - `data_augmentation`: boolean
  - `validation_split`: float
  - `file`: archivo ZIP con imágenes organizadas en carpetas por clase
  - `filters`: array (solo para architecture="custom")
  - `input_height`: integer (solo para architecture="custom")
  - `input_width`: integer (solo para architecture="custom")
- **Respuesta exitosa**: Similar a la respuesta de entrenamiento con datos de prueba

#### Predecir con CNN usando datos de prueba

- **URL**: `POST /api/ml/cnn/predict/test`
- **Acceso**: Rol Testing
- **Descripción**: Realiza predicción con modelo CNN usando imágenes de prueba generadas
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**:
  ```json
  {
    "model_name": "string"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "model_name": "string",
    "prediction": {
      "class": "integer",
      "confidence": "float",
      "probabilities": ["float"]
    },
    "image": "array", // Representación de la imagen utilizada
    "metadata": "object" // Metadatos del modelo
  }
  ```

#### Predecir con CNN usando datos reales

- **URL**: `POST /api/ml/cnn/predict/real`
- **Acceso**: Rol Usuario
- **Descripción**: Realiza predicción con modelo CNN usando una imagen real
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**: Formulario multipart
  - `model_name`: string
  - `file`: archivo de imagen (PNG, JPG, JPEG)
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "model_name": "string",
    "prediction": {
      "class": "integer",
      "confidence": "float",
      "probabilities": ["float"]
    },
    "metadata": "object" // Metadatos del modelo
  }
  ```

#### Listar modelos CNN disponibles

- **URL**: `GET /api/ml/cnn/models`
- **Acceso**: Usuarios autenticados
- **Descripción**: Lista todos los modelos CNN disponibles
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "models": [
      {
        "id": "string",
        "path": "string",
        "created_at": "datetime",
        "metadata": {
          "model_name": "string",
          "model_type": "string",
          "model_params": "object",
          "accuracy": "float",
          "data_type": "string" // "test" o "real"
        }
      }
    ]
  }
  ```

#### Eliminar modelo CNN

- **URL**: `DELETE /api/ml/cnn/models/<model_name>`
- **Acceso**: Rol Administrador
- **Descripción**: Elimina un modelo CNN específico
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Modelo eliminado correctamente"
  }
  ```

### Modelos Tabulares

#### Entrenar modelo tabular con datos de prueba

- **URL**: `POST /api/ml/tabular/train/test`
- **Acceso**: Rol Testing
- **Descripción**: Entrena un modelo tabular con datos de prueba generados automáticamente
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**:
  ```json
  {
    "model_name": "string",
    "algorithm": "string", // "svm", "knn", "random_forest" o "linear_regression"
    "problem_type": "string", // "classification" o "regression"
    "num_samples": "integer",
    "num_features": "integer",
    "test_size": "float",
    "model_params": {
      // Parámetros específicos del algoritmo
    }
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Modelo entrenado correctamente",
    "model_name": "string",
    "model_path": "string",
    "algorithm": "string",
    "problem_type": "string",
    "evaluation": "object", // Métricas de evaluación
    "feature_importance": "object" // Importancia de características (si aplica)
  }
  ```

#### Entrenar modelo tabular con datos reales

- **URL**: `POST /api/ml/tabular/train/real`
- **Acceso**: Rol Usuario
- **Descripción**: Entrena un modelo tabular con datos reales (CSV/Excel)
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**: Formulario multipart
  - `model_name`: string
  - `algorithm`: string ("svm", "knn", "random_forest" o "linear_regression")
  - `problem_type`: string ("classification" o "regression")
  - `target_column`: string (nombre de la columna objetivo)
  - `test_size`: float
  - `file`: archivo CSV o Excel
  - `model_params`: JSON con parámetros específicos del algoritmo
- **Respuesta exitosa**: Similar a la respuesta de entrenamiento con datos de prueba

#### Predecir con modelo tabular usando datos de prueba

- **URL**: `POST /api/ml/tabular/predict/test`
- **Acceso**: Rol Testing
- **Descripción**: Realiza predicción con modelo tabular usando datos generados automáticamente
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**:
  ```json
  {
    "model_name": "string"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "model_name": "string",
    "prediction": {
      "predictions": ["float" or "integer"],
      "probabilities": ["float"] // Solo para clasificación
    },
    "features_used": "object", // Valores de características usados
    "metadata": "object" // Metadatos del modelo
  }
  ```

#### Predecir con modelo tabular usando datos reales

- **URL**: `POST /api/ml/tabular/predict/real`
- **Acceso**: Rol Usuario
- **Descripción**: Realiza predicción con modelo tabular usando datos reales
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**:
  ```json
  {
    "model_name": "string",
    "features": {
      "feature1": "value1",
      "feature2": "value2"
      // ...
    }
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "model_name": "string",
    "prediction": {
      "predictions": ["float" or "integer"],
      "probabilities": ["float"] // Solo para clasificación
    },
    "metadata": "object", // Metadatos del modelo
    "feature_importance": "object" // Importancia de características (si aplica)
  }
  ```

#### Listar modelos tabulares disponibles

- **URL**: `GET /api/ml/tabular/models`
- **Acceso**: Usuarios autenticados
- **Descripción**: Lista todos los modelos tabulares disponibles
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**: Similar a la respuesta de listar modelos CNN

#### Eliminar modelo tabular

- **URL**: `DELETE /api/ml/tabular/models/<model_name>`
- **Acceso**: Rol Administrador
- **Descripción**: Elimina un modelo tabular específico
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Modelo eliminado correctamente"
  }
  ```

#### Vista previa de datos tabulares

- **URL**: `POST /api/ml/tabular/preview`
- **Acceso**: Rol Usuario
- **Descripción**: Genera una vista previa de un archivo tabular (CSV/Excel)
- **Headers**: `Authorization: Bearer {access_token}`
- **Parámetros**: Formulario multipart
  - `file`: archivo CSV o Excel
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "columns": ["string"],
    "data": [
      {
        "column1": "value1",
        "column2": "value2"
        // ...
      }
    ],
    "rows_count": "integer",
    "preview_count": "integer"
  }
  ```

### Dashboard

#### Obtener estadísticas del dashboard

- **URL**: `GET /api/dashboard/stats`
- **Acceso**: Usuarios autenticados
- **Descripción**: Obtiene estadísticas generales para el dashboard
- **Headers**: `Authorization: Bearer {access_token}`
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "model_count": {
      "total": "integer",
      "cnn": "integer",
      "tabular": "integer"
    },
    "accuracy_stats": {
      "avg": "float",
      "max": "float",
      "min": "float"
    },
    "models_by_type": {
      "cnn": "integer",
      "svm": "integer",
      "knn": "integer",
      "random_forest": "integer",
      "linear_regression": "integer"
    },
    "recent_models": [
      {
        "id": "string",
        "type": "string",
        "name": "string",
        "accuracy": "float",
        "created_at": "datetime"
      }
    ]
  }
  ```

## Códigos de respuesta HTTP

- **200 OK**: Solicitud exitosa
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Parámetros de solicitud incorrectos
- **401 Unauthorized**: Credenciales de autenticación faltantes o inválidas
- **403 Forbidden**: El usuario no tiene permisos suficientes
- **404 Not Found**: Recurso no encontrado
- **500 Internal Server Error**: Error interno del servidor

## Consideraciones para producción

- Cambiar las claves secretas en `.env`
- Implementar HTTPS
- Utilizar una base de datos más robusta (PostgreSQL, MySQL)
- Configurar almacenamiento persistente para modelos y archivos
- Implementar rate limiting para prevenir abusos
- Configurar logs más detallados
