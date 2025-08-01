import os
from datetime import timedelta
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Obtener el directorio base del proyecto (ml_backend)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    # Configuración general
    SECRET_KEY = os.environ.get('SECRET_KEY', 'mi_clave_secreta_por_defecto_cambiar_en_produccion')
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    PORT = os.environ.get('PORT', 5000)
    
    # Configuración de la base de datos
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI', 'sqlite:///ml_backend.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuración JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    
    # Directorios de subida de archivos
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    IMAGE_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'images')
    TABULAR_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'tabular')
    
    # Directorios para guardar modelos
    MODELS_FOLDER = os.path.join(BASE_DIR, 'models')
    CNN_MODELS_FOLDER = os.path.join(MODELS_FOLDER, 'cnn')
    TABULAR_MODELS_FOLDER = os.path.join(MODELS_FOLDER, 'tabular')
    
    # Configuración de archivos
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB límite para subidas
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    ALLOWED_TABULAR_EXTENSIONS = {'csv', 'xlsx', 'xls'}
    
    # Datos de prueba
    TEST_IMAGES_FOLDER = os.path.join(BASE_DIR, 'ml', 'cnn', 'test_data')
    TEST_TABULAR_FOLDER = os.path.join(BASE_DIR, 'ml', 'tabular', 'test_data')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')

# Configuración basada en el entorno
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    env = os.environ.get('FLASK_ENV', 'default')
    return config.get(env, config['default'])