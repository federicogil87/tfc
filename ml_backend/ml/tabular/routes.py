import os
import io
import uuid
import json
import numpy as np
import pandas as pd
import logging
import datetime
from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity

from auth.models import User
from auth.utils import testing_required, user_required, admin_required, validate_file_extension
from ml.common.data import load_tabular_data, prepare_tabular_data, split_data
from ml.common.model_storage import save_sklearn_model, load_sklearn_model, list_models, delete_model
from .models import (
    create_svm_model, create_knn_model, create_random_forest_model, create_linear_model,
    train_model, evaluate_classification_model, evaluate_regression_model, predict,
    get_feature_importance
)

# Configurar logging para depuración
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Crear blueprint para rutas de algoritmos tabulares
tabular_bp = Blueprint('tabular', __name__, url_prefix='/api/ml/tabular')

# Función auxiliar para crear el modelo según el algoritmo
def get_model_by_algorithm(algorithm, params, problem_type):
    """
    Crea un modelo según el algoritmo especificado
    
    Args:
        algorithm: Nombre del algoritmo ('svm', 'knn', 'random_forest', 'linear_regression')
        params: Parámetros para el modelo
        problem_type: Tipo de problema ('classification' o 'regression')
    
    Returns:
        Modelo creado
    """
    logger.info(f"Creando modelo {algorithm} para problema de {problem_type}")
    logger.info(f"Parámetros recibidos: {params}")
    
    # Filtrar parámetros según el algoritmo
    filtered_params = {}
    
    if algorithm == 'svm':
        # Parámetros válidos para SVM
        valid_params = ['kernel', 'C', 'gamma']
        for param in valid_params:
            if param in params:
                filtered_params[param] = params[param]
                
        logger.info(f"Parámetros filtrados para SVM: {filtered_params}")
        return create_svm_model(problem_type=problem_type, **filtered_params)
        
    elif algorithm == 'knn':
        # Parámetros válidos para k-NN
        valid_params = ['n_neighbors', 'weights', 'algorithm']
        for param in valid_params:
            if param in params:
                filtered_params[param] = params[param]
                
        logger.info(f"Parámetros filtrados para k-NN: {filtered_params}")
        return create_knn_model(problem_type=problem_type, **filtered_params)
        
    elif algorithm == 'random_forest':
        # Parámetros válidos para Random Forest
        valid_params = ['n_estimators', 'max_depth', 'min_samples_split', 'min_samples_leaf']
        for param in valid_params:
            if param in params:
                filtered_params[param] = params[param]
                
        logger.info(f"Parámetros filtrados para Random Forest: {filtered_params}")
        return create_random_forest_model(problem_type=problem_type, **filtered_params)
        
    elif algorithm == 'linear_regression':
        # Parámetros válidos para Regresión Lineal
        valid_params = ['model_type', 'alpha']
        for param in valid_params:
            if param in params:
                filtered_params[param] = params[param]
                
        logger.info(f"Parámetros filtrados para Regresión Lineal: {filtered_params}")
        return create_linear_model(problem_type=problem_type, **filtered_params)
        
    else:
        raise ValueError(f"Algoritmo no soportado: {algorithm}")

# Rutas para entrenamiento con datos de prueba (rol Testing)
@tabular_bp.route('/train/test', methods=['POST'])
@jwt_required()
@testing_required
def train_with_test_data():
    """Endpoint para entrenar un modelo tabular con datos de prueba (Testing)"""
    try:
        # Obtener parámetros del JSON
        data = request.get_json()
        
        logger.info(f"Recibida solicitud para entrenar modelo tabular con datos de prueba: {data}")
        
        # Validar parámetros necesarios
        if not data:
            logger.error("No se proporcionaron datos")
            return jsonify({"error": "No se proporcionaron datos"}), 400
        
        # Obtener el algoritmo a utilizar
        algorithm = data.get('algorithm')
        if not algorithm:
            logger.error("No se especificó el algoritmo")
            return jsonify({"error": "No se especificó el algoritmo"}), 400
        
        # Validar algoritmo
        valid_algorithms = ['svm', 'knn', 'random_forest', 'linear_regression']
        if algorithm not in valid_algorithms:
            logger.error(f"Algoritmo no válido: {algorithm}")
            return jsonify({"error": f"Algoritmo no válido. Opciones: {', '.join(valid_algorithms)}"}), 400
        
        # Obtener el tipo de problema
        problem_type = data.get('problem_type', 'classification')
        if problem_type not in ['classification', 'regression']:
            logger.error(f"Tipo de problema no válido: {problem_type}")
            return jsonify({"error": "Tipo de problema no válido. Opciones: classification, regression"}), 400
        
        # Parámetros para el modelo según el algoritmo
        model_params = data.get('model_params', {})
        
        # Parámetros para el entrenamiento
        test_size = float(data.get('test_size', 0.2))
        if test_size <= 0 or test_size >= 1:
            logger.error(f"test_size debe estar entre 0 y 1: {test_size}")
            return jsonify({"error": "test_size debe estar entre 0 y 1"}), 400
        
        # Generar datos de prueba según el tipo de problema
        num_samples = int(data.get('num_samples', 100))
        num_features = int(data.get('num_features', 5))
        
        logger.info(f"Generando datos de prueba: {num_samples} muestras, {num_features} características")
        
        # Crear datos de prueba aleatorios
        X = np.random.rand(num_samples, num_features)
        
        # Etiquetas según el tipo de problema
        if problem_type == 'classification':
            num_classes = int(data.get('num_classes', 2))
            y = np.random.randint(0, num_classes, size=num_samples)
            logger.info(f"Generadas etiquetas de clasificación con {num_classes} clases")
        else:  # regression
            # Para regresión, crear una relación lineal simple con ruido
            coefficients = np.random.rand(num_features)
            y = np.dot(X, coefficients) + np.random.normal(0, 0.1, num_samples)
            logger.info("Generadas etiquetas de regresión")
        
        # Dividir datos en entrenamiento y prueba
        X_train, X_test, y_train, y_test = split_data(X, y, test_size=test_size)
        logger.info(f"Datos divididos: {X_train.shape[0]} muestras de entrenamiento, {X_test.shape[0]} muestras de prueba")
        
        # Crear el modelo según el algoritmo
        model = get_model_by_algorithm(algorithm, model_params, problem_type)
        
        # Entrenar el modelo
        trained_model = train_model(model, X_train, y_train)
        logger.info("Modelo entrenado correctamente")
        
        # Evaluar el modelo según el tipo de problema
        if problem_type == 'classification':
            evaluation = evaluate_classification_model(trained_model, X_test, y_test)
            logger.info(f"Evaluación de clasificación: Precisión = {evaluation['accuracy']}")
        else:
            evaluation = evaluate_regression_model(trained_model, X_test, y_test)
            logger.info(f"Evaluación de regresión: R² = {evaluation['r2']}")
        
        # Obtener importancia de características si está disponible
        feature_importance = get_feature_importance(trained_model)
        
        # Guardar el modelo si se proporciona un nombre
        model_name = data.get('model_name', f'{algorithm}_{problem_type}_{uuid.uuid4().hex[:8]}')
        
        # Metadatos del modelo
        metadata = {
            'model_name': model_name,
            'algorithm': algorithm,
            'problem_type': problem_type,
            'model_params': model_params,
            'test_size': test_size,
            'num_samples': num_samples,
            'num_features': num_features,
            'evaluation': evaluation,
            'feature_importance': feature_importance,
            'created_by': get_jwt_identity(),
            'data_type': 'test'
        }
        
        try:
            # Guardar el modelo
            model_path = save_sklearn_model(
                trained_model, 
                model_name, 
                current_app.config['TABULAR_MODELS_FOLDER'],
                metadata
            )
            
            logger.info(f"Modelo guardado en: {model_path}")
            
            # Devolver resultados
            return jsonify({
                'success': True,
                'message': 'Modelo entrenado correctamente',
                'model_name': model_name,
                'model_path': model_path,
                'evaluation': evaluation,
                'feature_importance': feature_importance
            }), 200
        except ValueError as e:
            logger.error(f"Error al guardar el modelo: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
    
    except Exception as e:
        logger.exception(f"Error al entrenar modelo: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Función adaptada para list_models que hace el mismo trabajo que en model_storage.py pero con más logs
@tabular_bp.route('/models', methods=['GET'])
@jwt_required()
def list_tabular_models():
    """Endpoint para listar modelos tabulares disponibles"""
    try:
        # Obtener directorio de modelos
        model_dir = current_app.config['TABULAR_MODELS_FOLDER']
        
        logger.info(f"Listando modelos tabulares en: {model_dir}")
        
        # Verificar si el directorio existe
        if not os.path.exists(model_dir):
            logger.warning(f"El directorio de modelos tabulares no existe: {model_dir}")
            return jsonify({
                'success': True,
                'models': []
            }), 200
        
        # Buscar archivos .pkl
        pkl_files = []
        for root, _, files in os.walk(model_dir):
            for file in files:
                if file.endswith('.pkl'):
                    pkl_files.append(os.path.join(root, file))
        
        logger.info(f"Encontrados {len(pkl_files)} archivos .pkl")
        
        # Construir lista de modelos
        models = []
        for model_file in pkl_files:
            # Obtener la ruta base sin extensión
            model_path = model_file.rsplit('.', 1)[0]
            
            # Cargar metadatos
            metadata_file = f"{model_path}.json"
            
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
            else:
                metadata = {}
                logger.warning(f"No se encontraron metadatos para: {model_file}")
            
            # Extraer el nombre del archivo
            file_name = os.path.basename(model_path)
            
            models.append({
                "id": file_name,
                "path": model_path,
                "created_at": datetime.datetime.fromtimestamp(os.path.getctime(model_file)).isoformat(),
                "metadata": metadata
            })
        
        # Ordenar por fecha de creación (más reciente primero)
        models.sort(key=lambda x: x["created_at"], reverse=True)
        
        logger.info(f"Total de modelos tabulares listados: {len(models)}")
        
        return jsonify({
            'success': True,
            'models': models
        }), 200
    
    except Exception as e:
        logger.exception(f"Error al listar modelos tabulares: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500