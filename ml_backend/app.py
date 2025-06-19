import os
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from config import get_config
from auth.models import db, bcrypt, create_initial_data
from auth.routes import auth_bp
from ml.cnn.routes import cnn_bp
from ml.tabular.routes import tabular_bp

def create_app(config=None):
    """
    Crea y configura la aplicación Flask
    
    Args:
        config: Configuración personalizada (opcional)
    
    Returns:
        Aplicación Flask configurada
    """
    # Crear la aplicación Flask
    app = Flask(__name__)
    
    # Cargar configuración
    if config is None:
        app.config.from_object(get_config())
    else:
        app.config.from_object(config)
    
    # Configurar CORS
    CORS(app)
    
    # Configurar JWT
    jwt = JWTManager(app)
    
    # Inicializar SQLAlchemy
    db.init_app(app)
    
    # Inicializar Bcrypt
    bcrypt.init_app(app)
    
    # Crear directorios necesarios
    os.makedirs(app.config['IMAGE_UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['TABULAR_UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['CNN_MODELS_FOLDER'], exist_ok=True)
    os.makedirs(app.config['TABULAR_MODELS_FOLDER'], exist_ok=True)
    
    # Registrar blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(cnn_bp)
    app.register_blueprint(tabular_bp)
    
    # Ruta de prueba
    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            'message': 'API de ML Backend',
            'version': '1.0.0'
        })
    
    # Manejador de errores 404
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Ruta no encontrada'}), 404
    
    # Manejador de errores 500
    @app.errorhandler(500)
    def server_error(error):
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    # Crear tablas y datos iniciales
    with app.app_context():
        db.create_all()
        create_initial_data()
    
    return app

if __name__ == '__main__':
    # Crear y ejecutar la aplicación
    app = create_app()
    
    # Obtener el puerto del entorno o usar 5000 por defecto
    port = int(os.environ.get('PORT', 5000))
    
    # Ejecutar la aplicación
    app.run(host='0.0.0.0', port=port)