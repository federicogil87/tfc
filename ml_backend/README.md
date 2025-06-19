# ML Backend con Flask

Sistema backend para entrenamiento y predicción de modelos de Machine Learning y Deep Learning, desarrollado con Python y Flask.

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
├── app.py                  # Punto de entrada de la aplicación
├── config.py               # Configuraciones generales
├── requirements.txt        # Dependencias del proyecto
├── .env                    # Variables de entorno (no en control de versiones)
├── .gitignore              # Archivos a ignorar por git
├── README.md               # Documentación general
├── auth/                   # Módulo de autenticación
│   ├── __init__.py
│   ├── models.py           # Modelos de usuario y roles
│   ├── routes.py           # Rutas para autenticación
│   └── utils.py            # Utilidades para autenticación
├── ml/                     # Módulo de machine learning
│   ├── __init__.py
│   ├── cnn/                # Algoritmos CNN para imágenes
│   │   ├── __init__.py
│   │   ├── model.py        # Definición del modelo CNN
│   │   ├── routes.py       # Endpoints para CNN
│   │   └── utils.py        # Utilidades para CNN
│   ├── tabular/            # Algoritmos para datos tabulares
│   │   ├── __init__.py
│   │   ├── models.py       # Definiciones de SVM, k-NN, RandomForest y Regresión
│   │   ├── routes.py       # Endpoints para algoritmos tabulares
│   │   └── utils.py        # Utilidades para datos tabulares
│   └── common/             # Funcionalidades comunes de ML
│       ├── __init__.py
│       ├── data.py         # Funciones de procesamiento de datos
│       └── model_storage.py # Gestión de modelos entrenados
├── uploads/                # Directorio para archivos subidos
│   ├── images/             # Almacenamiento temporal de imágenes
│   └── tabular/            # Almacenamiento temporal de CSV/Excel
└── models/                 # Directorio para guardar modelos entrenados
    ├── cnn/                # Modelos CNN guardados
    └── tabular/            # Modelos tabulares guardados
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

- `POST /auth/login`: Iniciar sesión
- `POST /auth/refresh`: Renovar token de acceso
- `GET /auth/me`: Obtener información del usuario actual

### Administración de usuarios (solo rol Administrador)

- `GET /auth/users`: Listar usuarios
- `POST /auth/users`: Crear usuario
- `GET /auth/users/<id>`: Obtener usuario específico
- `PUT /auth/users/<id>`: Actualizar usuario
- `DELETE /auth/users/<id>`: Eliminar usuario
- `GET /auth/roles`: Listar roles disponibles

### Modelos CNN

- `POST /api/ml/cnn/train/test`: Entrenar CNN con datos de prueba (rol Testing)
- `POST /api/ml/cnn/train/real`: Entrenar CNN con datos reales (rol Usuario)
- `POST /api/ml/cnn/predict/test`: Predecir con CNN usando datos de prueba (rol Testing)
- `POST /api/ml/cnn/predict/real`: Predecir con CNN usando datos reales (rol Usuario)
- `GET /api/ml/cnn/models`: Listar modelos CNN disponibles
- `DELETE /api/ml/cnn/models/<model_name>`: Eliminar un modelo CNN específico (rol Administrador)

### Modelos Tabulares

- `POST /api/ml/tabular/train/test`: Entrenar modelo tabular con datos de prueba (rol Testing)
- `POST /api/ml/tabular/train/real`: Entrenar modelo tabular con datos reales (rol Usuario)
- `POST /api/ml/tabular/predict/test`: Predecir con modelo tabular usando datos de prueba (rol Testing)
- `POST /api/ml/tabular/predict/real`: Predecir con modelo tabular usando datos reales (rol Usuario)
- `GET /api/ml/tabular/models`: Listar modelos tabulares disponibles
- `DELETE /api/ml/tabular/models/<model_name>`: Eliminar un modelo tabular específico (rol Administrador)

## Seguridad

- Las contraseñas se almacenan hasheadas con bcrypt
- Autenticación basada en tokens JWT
- Validación de tipos de archivos y límite de tamaño
- Control de acceso basado en roles
- Nombres de archivos sanitizados

## Consideraciones para producción

- Cambiar las claves secretas en `.env`
- Configurar un servidor WSGI como Gunicorn
- Usar un proxy inverso como Nginx
- Implementar HTTPS
- Utilizar una base de datos más robusta (PostgreSQL, MySQL)
- Configurar almacenamiento persistente para modelos y archivos