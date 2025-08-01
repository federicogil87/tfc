import os
from flask import Flask, jsonify, redirect, send_from_directory, request
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from config import get_config
from auth.models import db, bcrypt, create_initial_data
from auth.routes import auth_bp
from ml.cnn.routes import cnn_bp
from ml.tabular.routes import tabular_bp
from dashboard.routes import dashboard_bp

def create_app(config=None):
    """
    Crea y configura la aplicación Flask
    
    Args:
        config: Configuración personalizada (opcional)
    
    Returns:
        Aplicación Flask configurada
    """
    # Crear la aplicación Flask
    app = Flask(__name__, static_folder='../frontend')
    
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
    app.register_blueprint(dashboard_bp)
    
    # Ruta raíz redirige al frontend
    @app.route('/', methods=['GET'])
    def index():
        return redirect('/index.html')
    
    # Servir archivos estáticos del frontend
    @app.route('/<path:path>')
    def serve_frontend(path):
        return send_from_directory('../frontend', path)
    
    # Ruta de API para verificar el estado
    @app.route('/api/status', methods=['GET'])
    def api_status():
        return jsonify({
            'message': 'API de ML Backend',
            'version': '1.0.0',
            'status': 'operational'
        })
    
    # Manejador de errores 404
    @app.errorhandler(404)
    def not_found(error):
        # Si la URL comienza con /api, devolver JSON
        if request.path.startswith('/api'):
            return jsonify({'error': 'Ruta no encontrada'}), 404
        # Para otras URLs, redirigir al frontend
        return redirect('/index.html')
    
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
    
    # Obtener el puerto del entorno
    port = app.config['PORT']
    
    # Ejecutar la aplicación
    app.run(host='0.0.0.0', port=port)