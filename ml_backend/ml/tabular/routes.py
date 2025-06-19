import os
import io
import uuid
import json
import numpy as np
import pandas as pd
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
    if algorithm == 'svm':
        return create_svm_model(problem_type=problem_type, **params)
    elif algorithm == 'knn':
        return create_knn_model(problem_type=problem_type, **params)
    elif algorithm == 'random_forest':
        return create_random_forest_model(problem_type=problem_type, **params)
    elif algorithm == 'linear_regression':
        return create_linear_model(problem_type=problem_type, **params)
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
        
        # Validar parámetros necesarios
        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400
        
        # Obtener el algoritmo a utilizar
        algorithm = data.get('algorithm')
        if not algorithm:
            return jsonify({"error": "No se especificó el algoritmo"}), 400
        
        # Validar algoritmo
        valid_algorithms = ['svm', 'knn', 'random_forest', 'linear_regression']
        if algorithm not in valid_algorithms:
            return jsonify({"error": f"Algoritmo no válido. Opciones: {', '.join(valid_algorithms)}"}), 400
        
        # Obtener el tipo de problema
        problem_type = data.get('problem_type', 'classification')
        if problem_type not in ['classification', 'regression']:
            return jsonify({"error": "Tipo de problema no válido. Opciones: classification, regression"}), 400
        
        # Parámetros para el modelo según el algoritmo
        model_params = data.get('model_params', {})
        
        # Parámetros para el entrenamiento
        test_size = float(data.get('test_size', 0.2))
        if test_size <= 0 or test_size >= 1:
            return jsonify({"error": "test_size debe estar entre 0 y 1"}), 400
        
        # Generar datos de prueba según el tipo de problema
        num_samples = int(data.get('num_samples', 100))
        num_features = int(data.get('num_features', 5))
        
        # Crear datos de prueba aleatorios
        X = np.random.rand(num_samples, num_features)
        
        # Etiquetas según el tipo de problema
        if problem_type == 'classification':
            num_classes = int(data.get('num_classes', 2))
            y = np.random.randint(0, num_classes, size=num_samples)
        else:  # regression
            # Para regresión, crear una relación lineal simple con ruido
            coefficients = np.random.rand(num_features)
            y = np.dot(X, coefficients) + np.random.normal(0, 0.1, num_samples)
        
        # Dividir datos en entrenamiento y prueba
        X_train, X_test, y_train, y_test = split_data(X, y, test_size=test_size)
        
        # Crear el modelo según el algoritmo
        model = get_model_by_algorithm(algorithm, model_params, problem_type)
        
        # Entrenar el modelo
        trained_model = train_model(model, X_train, y_train)
        
        # Evaluar el modelo según el tipo de problema
        if problem_type == 'classification':
            evaluation = evaluate_classification_model(trained_model, X_test, y_test)
        else:
            evaluation = evaluate_regression_model(trained_model, X_test, y_test)
        
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
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Rutas para entrenamiento con datos reales (rol Usuario)
@tabular_bp.route('/train/real', methods=['POST'])
@jwt_required()
@user_required
def train_with_real_data():
    """Endpoint para entrenar un modelo tabular con datos reales (Usuario)"""
    try:
        # Verificar si se proporcionó un archivo
        if 'file' not in request.files:
            return jsonify({"error": "No se proporcionó un archivo"}), 400
        
        file = request.files['file']
        
        # Verificar si el archivo tiene un nombre
        if file.filename == '':
            return jsonify({"error": "No se seleccionó un archivo"}), 400
        
        # Verificar si es un archivo CSV o Excel
        if not validate_file_extension(file.filename, current_app.config['ALLOWED_TABULAR_EXTENSIONS']):
            return jsonify({"error": "El archivo debe ser CSV o Excel"}), 400
        
        # Guardar el archivo temporalmente
        temp_file_path = os.path.join(current_app.config['TABULAR_UPLOAD_FOLDER'], secure_filename(file.filename))
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
        file.save(temp_file_path)
        
        # Cargar datos del archivo
        df = load_tabular_data(temp_file_path)
        
        # Obtener parámetros para el procesamiento y entrenamiento desde form-data
        target_column = request.form.get('target_column')
        if not target_column or target_column not in df.columns:
            return jsonify({"error": f"Columna objetivo '{target_column}' no encontrada en el archivo"}), 400
        
        # Obtener características a utilizar (opcional)
        features = request.form.get('features')
        if features:
            try:
                features = json.loads(features)
                # Verificar que todas las características existen
                missing_features = [col for col in features if col not in df.columns]
                if missing_features:
                    return jsonify({"error": f"Columnas no encontradas: {missing_features}"}), 400
            except:
                return jsonify({"error": "El formato de 'features' es inválido. Debe ser un array JSON"}), 400
        else:
            features = None
        
        # Columnas categóricas (opcional)
        categorical_columns = request.form.get('categorical_columns')
        if categorical_columns:
            try:
                categorical_columns = json.loads(categorical_columns)
            except:
                return jsonify({"error": "El formato de 'categorical_columns' es inválido. Debe ser un array JSON"}), 400
        else:
            categorical_columns = None
        
        # Obtener el algoritmo a utilizar
        algorithm = request.form.get('algorithm')
        if not algorithm:
            return jsonify({"error": "No se especificó el algoritmo"}), 400
        
        # Validar algoritmo
        valid_algorithms = ['svm', 'knn', 'random_forest', 'linear_regression']
        if algorithm not in valid_algorithms:
            return jsonify({"error": f"Algoritmo no válido. Opciones: {', '.join(valid_algorithms)}"}), 400
        
        # Obtener el tipo de problema
        problem_type = request.form.get('problem_type', 'classification')
        if problem_type not in ['classification', 'regression']:
            return jsonify({"error": "Tipo de problema no válido. Opciones: classification, regression"}), 400
        
        # Parámetros para el modelo según el algoritmo
        model_params_json = request.form.get('model_params', '{}')
        try:
            model_params = json.loads(model_params_json)
        except:
            return jsonify({"error": "El formato de 'model_params' es inválido. Debe ser un objeto JSON"}), 400
        
        # Parámetros para el entrenamiento
        test_size = float(request.form.get('test_size', 0.2))
        if test_size <= 0 or test_size >= 1:
            return jsonify({"error": "test_size debe estar entre 0 y 1"}), 400
        
        # Preparar los datos
        try:
            X, y, feature_names, encoded_columns = prepare_tabular_data(
                df, target_column, features, categorical_columns
            )
        except Exception as e:
            return jsonify({"error": f"Error al preparar los datos: {str(e)}"}), 400
        
        # Dividir datos en entrenamiento y prueba
        X_train, X_test, y_train, y_test = split_data(X, y, test_size=test_size)
        
        # Crear el modelo según el algoritmo
        model = get_model_by_algorithm(algorithm, model_params, problem_type)
        
        # Entrenar el modelo
        trained_model = train_model(model, X_train, y_train)
        
        # Evaluar el modelo según el tipo de problema
        if problem_type == 'classification':
            evaluation = evaluate_classification_model(trained_model, X_test, y_test)
        else:
            evaluation = evaluate_regression_model(trained_model, X_test, y_test)
        
        # Obtener importancia de características si está disponible
        feature_importance = get_feature_importance(trained_model, feature_names)
        
        # Guardar el modelo si se proporciona un nombre
        model_name = request.form.get('model_name', f'{algorithm}_{problem_type}_{uuid.uuid4().hex[:8]}')
        
        # Metadatos del modelo
        metadata = {
            'model_name': model_name,
            'algorithm': algorithm,
            'problem_type': problem_type,
            'model_params': model_params,
            'test_size': test_size,
            'feature_names': feature_names,
            'encoded_columns': encoded_columns,
            'target_column': target_column,
            'evaluation': evaluation,
            'feature_importance': feature_importance,
            'created_by': get_jwt_identity(),
            'data_type': 'real',
            'file_name': file.filename
        }
        
        try:
            # Guardar el modelo
            model_path = save_sklearn_model(
                trained_model, 
                model_name, 
                current_app.config['TABULAR_MODELS_FOLDER'],
                metadata
            )
            
            # Limpiar archivo temporal
            try:
                os.remove(temp_file_path)
            except:
                pass
            
            # Devolver resultados
            return jsonify({
                'success': True,
                'message': 'Modelo entrenado correctamente',
                'model_name': model_name,
                'model_path': model_path,
                'evaluation': evaluation,
                'feature_importance': feature_importance,
                'feature_names': feature_names
            }), 200
        except ValueError as e:
            # Limpiar archivo temporal en caso de error
            try:
                os.remove(temp_file_path)
            except:
                pass
            
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Rutas para predicción con datos de prueba (rol Testing)
@tabular_bp.route('/predict/test', methods=['POST'])
@jwt_required()
@testing_required
def predict_with_test_data():
    """Endpoint para predecir con un modelo tabular usando datos de prueba (Testing)"""
    try:
        # Obtener parámetros del JSON
        data = request.get_json()
        
        # Validar parámetros necesarios
        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400
        
        # Obtener el modelo a utilizar
        model_name = data.get('model_name')
        if not model_name:
            return jsonify({"error": "No se proporcionó un nombre de modelo"}), 400
        
        # Listar modelos disponibles
        models = list_models(current_app.config['TABULAR_MODELS_FOLDER'])
        
        # Buscar el modelo por nombre
        model_info = next((m for m in models if m['id'].startswith(model_name)), None)
        if not model_info:
            return jsonify({"error": f"Modelo '{model_name}' no encontrado"}), 404
        
        # Cargar el modelo
        model_path = model_info['path']
        model, metadata = load_sklearn_model(model_path)
        
        # Crear datos de prueba aleatorios
        num_features = len(metadata.get('feature_names', []))
        if num_features == 0:
            num_features = metadata.get('num_features', 5)
        
        # Generar un ejemplo aleatorio
        X_test = np.random.rand(1, num_features)
        
        # Realizar predicción
        prediction = predict(model, X_test)
        
        # Devolver resultados
        return jsonify({
            'success': True,
            'model_name': model_name,
            'prediction': prediction,
            'data': X_test.tolist(),  # Incluir los datos utilizados
            'metadata': metadata
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Rutas para predicción con datos reales (rol Usuario)
@tabular_bp.route('/predict/real', methods=['POST'])
@jwt_required()
@user_required
def predict_with_real_data():
    """Endpoint para predecir con un modelo tabular usando datos reales (Usuario)"""
    try:
        # Verificar si se proporcionó un archivo
        if 'file' not in request.files:
            return jsonify({"error": "No se proporcionó un archivo"}), 400
        
        file = request.files['file']
        
        # Verificar si el archivo tiene un nombre
        if file.filename == '':
            return jsonify({"error": "No se seleccionó un archivo"}), 400
        
        # Verificar si es un archivo CSV o Excel
        if not validate_file_extension(file.filename, current_app.config['ALLOWED_TABULAR_EXTENSIONS']):
            return jsonify({"error": "El archivo debe ser CSV o Excel"}), 400
        
        # Obtener el modelo a utilizar
        model_name = request.form.get('model_name')
        if not model_name:
            return jsonify({"error": "No se proporcionó un nombre de modelo"}), 400
        
        # Listar modelos disponibles
        models = list_models(current_app.config['TABULAR_MODELS_FOLDER'])
        
        # Buscar el modelo por nombre
        model_info = next((m for m in models if m['id'].startswith(model_name)), None)
        if not model_info:
            return jsonify({"error": f"Modelo '{model_name}' no encontrado"}), 404
        
        # Cargar el modelo
        model_path = model_info['path']
        model, metadata = load_sklearn_model(model_path)
        
        # Guardar el archivo temporalmente
        temp_file_path = os.path.join(current_app.config['TABULAR_UPLOAD_FOLDER'], secure_filename(file.filename))
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
        file.save(temp_file_path)
        
        # Cargar datos del archivo
        df = load_tabular_data(temp_file_path)
        
        # Verificar si el archivo tiene las columnas esperadas
        feature_names = metadata.get('feature_names', [])
        missing_columns = [col for col in feature_names if col not in df.columns]
        if missing_columns:
            return jsonify({
                "error": f"El archivo no contiene todas las columnas necesarias. Faltantes: {missing_columns}"
            }), 400
        
        # Preparar los datos para predicción
        X = df[feature_names].values
        
        # Realizar predicción
        prediction = predict(model, X)
        
        # Limpiar archivo temporal
        try:
            os.remove(temp_file_path)
        except:
            pass
        
        # Devolver resultados con los datos utilizados
        return jsonify({
            'success': True,
            'model_name': model_name,
            'prediction': prediction,
            'data': df.to_dict(orient='records'),  # Incluir los datos utilizados
            'metadata': metadata
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Ruta para listar modelos tabulares disponibles
@tabular_bp.route('/models', methods=['GET'])
@jwt_required()
def list_tabular_models():
    """Endpoint para listar modelos tabulares disponibles"""
    try:
        # Listar modelos
        models = list_models(current_app.config['TABULAR_MODELS_FOLDER'])
        
        return jsonify({
            'success': True,
            'models': models
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Ruta para eliminar un modelo tabular específico
@tabular_bp.route('/models/<model_name>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_tabular_model(model_name):
    """Endpoint para eliminar un modelo tabular específico (solo administradores)"""
    try:
        # Listar modelos disponibles
        models = list_models(current_app.config['TABULAR_MODELS_FOLDER'])
        
        # Buscar el modelo por nombre
        model_info = next((m for m in models if m['id'].startswith(model_name)), None)
        if not model_info:
            return jsonify({"error": f"Modelo '{model_name}' no encontrado"}), 404
        
        # Eliminar el modelo
        model_path = model_info['path']
        result = delete_model(model_path)
        
        if result:
            return jsonify({
                'success': True,
                'message': f"Modelo '{model_name}' eliminado correctamente"
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': f"Error al eliminar el modelo '{model_name}'"
            }), 500
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500