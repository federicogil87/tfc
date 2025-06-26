# Sistema de Detección de Cáncer

Plataforma web para entrenamiento y utilización de modelos de Machine Learning y Deep Learning orientados a la detección de cáncer. El sistema integra modelos de redes neuronales convolucionales (CNN) para análisis de imágenes y algoritmos de machine learning para datos tabulares.

## Características principales

- **Interfaz web intuitiva**: Aplicación web con diseño responsive para facilitar la interacción con los modelos de ML.
- **Múltiples algoritmos**: Integración de diversos algoritmos tanto para imágenes (CNN) como para datos tabulares (SVM, kNN, Random Forest, Regresión Lineal).
- **Sistema de roles**: Diferentes niveles de acceso según el perfil del usuario (Administrador, Testing, Usuario).
- **Dashboard interactivo**: Visualización de rendimiento y métricas de los modelos entrenados.
- **API RESTful**: Backend robusto con endpoints para todas las operaciones del sistema.

## Arquitectura del sistema

El proyecto se divide en dos componentes principales:

### Backend (ml_backend)

Desarrollado con Python y Flask, proporciona una API RESTful para todas las operaciones del sistema.

- **Autenticación**: Sistema de usuarios con JWT para autenticación segura.
- **Algoritmos de ML**:
  - **CNN** para análisis de imágenes
  - **SVM**, **k-NN**, **RandomForest** y **Regresión Lineal** para datos tabulares
- **Almacenamiento**: Gestión de modelos entrenados y archivos temporales.

### Frontend

Interfaz de usuario desarrollada con HTML5, CSS3 y JavaScript vanilla.

- **Interfaz responsive**: Diseño adaptable a dispositivos móviles y desktop.
- **Visualizaciones**: Gráficos interactivos para análisis de resultados con Chart.js.
- **Control de acceso**: Restricción de funcionalidades según el rol del usuario.

## Flujo de trabajo

1. **Entrenamiento de modelos**:

   - Modelos CNN con imágenes para la detección de patrones en imágenes médicas
   - Modelos tabulares para el análisis de datos estructurados (análisis clínicos, demográficos, etc.)

2. **Evaluación y monitoreo**:

   - Dashboard para visualizar métricas de rendimiento
   - Comparación entre modelos entrenados

3. **Predicción**:
   - Utilización de modelos entrenados para realizar predicciones con nuevos datos
   - Visualización de resultados y explicaciones

## Tecnologías utilizadas

### Backend

- Python 3.9+
- Flask (Framework web)
- SQLAlchemy (ORM)
- JWT (Autenticación)
- TensorFlow/Keras (Deep Learning)
- Scikit-learn (Machine Learning)
- Pandas (Manipulación de datos)
- NumPy (Operaciones numéricas)

### Frontend

- HTML5 / CSS3
- JavaScript (ES6+)
- Chart.js (Visualizaciones)
- Font Awesome (Iconografía)

## Estructura del proyecto

### Backend (ml_backend)

```
ml_backend/
├── app.py                  # Punto de entrada de la aplicación
├── config.py               # Configuraciones generales
├── requirements.txt        # Dependencias del proyecto
├── .env                    # Variables de entorno (no en control de versiones)
├── auth/                   # Módulo de autenticación
│   ├── models.py           # Modelos de usuario y roles
│   ├── routes.py           # Rutas para autenticación
│   └── utils.py            # Utilidades para autenticación
├── ml/                     # Módulo de machine learning
│   ├── cnn/                # Algoritmos CNN para imágenes
│   │   ├── model.py        # Definición del modelo CNN
│   │   ├── routes.py       # Endpoints para CNN
│   │   └── utils.py        # Utilidades para CNN
│   ├── tabular/            # Algoritmos para datos tabulares
│   │   ├── models.py       # Algoritmos (SVM, k-NN, RandomForest, Regresión)
│   │   ├── routes.py       # Endpoints para algoritmos tabulares
│   │   └── utils.py        # Utilidades para datos tabulares
│   └── common/             # Funcionalidades comunes de ML
│       ├── data.py         # Procesamiento de datos
│       └── model_storage.py # Gestión de modelos entrenados
├── uploads/                # Directorio para archivos subidos
└── models/                 # Directorio para guardar modelos entrenados
```

### Frontend

```
frontend/
├── index.html              # Página de login
├── css/
│   ├── style.css           # Estilos globales
│   ├── dashboard.css       # Estilos para el dashboard
│   └── login.css           # Estilos para la página de login
├── js/
│   ├── api.js              # Funciones para comunicación con la API
│   ├── auth.js             # Funcionalidad de autenticación
│   ├── dashboard.js        # Funcionalidad general del dashboard
│   ├── cnn-train.js        # Entrenamiento de modelos CNN
│   ├── cnn-predict.js      # Predicción con modelos CNN
│   ├── tabular-train.js    # Entrenamiento de modelos tabulares
│   ├── tabular-predict.js  # Predicción con modelos tabulares
│   └── admin.js            # Funcionalidad de administración
└── pages/
    ├── home.html           # Página principal
    ├── dashboard.html      # Dashboard de modelos
    ├── admin.html          # Panel de administración
    ├── cnn-train.html      # Entrenamiento CNN (prueba)
    ├── cnn-predict.html    # Predicción CNN (prueba)
    ├── cnn-train-real.html # Entrenamiento CNN (real)
    ├── cnn-predict-real.html # Predicción CNN (real)
    ├── tabular-train.html  # Entrenamiento tabular (prueba)
    ├── tabular-predict.html # Predicción tabular (prueba)
    ├── tabular-train-real.html # Entrenamiento tabular (real)
    └── tabular-predict-real.html # Predicción tabular (real)
```

## Instalación y configuración

### Requisitos previos

- Python 3.9 o superior
- Node.js y npm (opcional, para herramientas de desarrollo)
- Navegador web moderno (Chrome, Firefox, Edge)

### Backend

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/tu-usuario/sistema-deteccion-cancer.git
   cd sistema-deteccion-cancer/ml_backend
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

### Frontend

1. Navegar a la carpeta frontend:

   ```bash
   cd ../frontend
   ```

2. Abrir el archivo index.html en un navegador, o utilizar un servidor web local:

   ```bash
   # Ejemplo con Python
   python -m http.server 8000
   ```

3. Acceder a la aplicación en http://localhost:8000

## Usuarios predeterminados

El sistema crea automáticamente tres usuarios:

- **admin**: Rol Administrador (acceso a gestión de usuarios)
- **test**: Rol Testing (acceso a entrenamiento y predicción con datos de prueba)
- **usuario**: Rol Usuario (acceso a entrenamiento y predicción con datos reales)

La contraseña para todos los usuarios es `123456`.

## Roles y permisos

- **Administrador**:

  - Gestión de usuarios (creación, edición, eliminación)
  - Acceso a todas las funcionalidades
  - Eliminación de modelos

- **Testing**:

  - Entrenamiento y predicción con datos de prueba generados automáticamente
  - Visualización del dashboard

- **Usuario**:
  - Entrenamiento y predicción con datos reales
  - Visualización del dashboard

## Problemas conocidos y soluciones

### Compatibilidad con navegadores

- La aplicación está optimizada para navegadores modernos
- En caso de problemas con navegadores antiguos, actualizar a las últimas versiones

## Consideraciones para producción

- Cambiar las claves secretas en `.env`
- Configurar un servidor WSGI como Gunicorn
- Usar un proxy inverso como Nginx
- Implementar HTTPS
- Utilizar una base de datos más robusta (PostgreSQL, MySQL)
- Configurar almacenamiento persistente para modelos y archivos

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un nuevo Pull Request

## Licencia

Este proyecto está licenciado bajo [MIT License](LICENSE).

## Contacto

Para soporte o consultas, contactar a través de [correo electrónico](mailto:soporte@deteccioncancer.com).
