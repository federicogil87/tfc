import os
import uuid
import json
import numpy as np
import pandas as pd
import logging
import datetime
import tempfile
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
        
        # Verificar el formato del archivo
        allowed_extensions = current_app.config['ALLOWED_TABULAR_EXTENSIONS']
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                "error": f"Formato de archivo no soportado. Formatos permitidos: {', '.join(allowed_extensions)}"
            }), 400
        
        # Guardar el archivo temporalmente
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, secure_filename(file.filename))
        file.save(temp_path)
        
        # Obtener parámetros del formulario
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
        
        # Obtener columna objetivo y características
        target_column = request.form.get('target_column')
        if not target_column:
            return jsonify({"error": "No se especificó la columna objetivo"}), 400
        
        # Obtener características (columnas a usar)
        features_json = request.form.get('features')
        if not features_json:
            return jsonify({"error": "No se especificaron las características"}), 400
        
        try:
            features = json.loads(features_json)
        except json.JSONDecodeError:
            return jsonify({"error": "Formato JSON inválido para características"}), 400
        
        # Obtener columnas categóricas (opcional)
        categorical_columns = []
        categorical_json = request.form.get('categorical_columns')
        if categorical_json:
            try:
                categorical_columns = json.loads(categorical_json)
            except json.JSONDecodeError:
                return jsonify({"error": "Formato JSON inválido para columnas categóricas"}), 400
        
        # Parámetros para el modelo según el algoritmo
        model_params_json = request.form.get('model_params', '{}')
        try:
            model_params = json.loads(model_params_json)
        except json.JSONDecodeError:
            return jsonify({"error": "Formato JSON inválido para parámetros del modelo"}), 400
        
        # Parámetros para el entrenamiento
        test_size = float(request.form.get('test_size', 0.2))
        if test_size <= 0 or test_size >= 1:
            return jsonify({"error": "test_size debe estar entre 0 y 1"}), 400
        
        try:
            # Cargar el dataset
            df = load_tabular_data(temp_path)
            
            # Verificar que las columnas existen
            missing_columns = [col for col in [target_column] + features if col not in df.columns]
            if missing_columns:
                return jsonify({"error": f"Columnas no encontradas: {', '.join(missing_columns)}"}), 400
            
            # Preparar datos
            X, y, used_features, encoded_columns = prepare_tabular_data(
                df, target_column, features, categorical_columns
            )
            
            # Dividir datos en entrenamiento y prueba
            X_train, X_test, y_train, y_test = split_data(X, y, test_size=test_size)
            
            # Crear el modelo según el algoritmo
            if algorithm == 'svm':
                model = create_svm_model(problem_type=problem_type, **model_params)
            elif algorithm == 'knn':
                model = create_knn_model(problem_type=problem_type, **model_params)
            elif algorithm == 'random_forest':
                model = create_random_forest_model(problem_type=problem_type, **model_params)
            elif algorithm == 'linear_regression':
                model = create_linear_model(problem_type=problem_type, **model_params)
            else:
                return jsonify({"error": f"Algoritmo no soportado: {algorithm}"}), 400
            
            # Entrenar el modelo
            trained_model = train_model(model, X_train, y_train)
            
            # Evaluar el modelo según el tipo de problema
            if problem_type == 'classification':
                evaluation = evaluate_classification_model(trained_model, X_test, y_test)
            else:
                evaluation = evaluate_regression_model(trained_model, X_test, y_test)
            
            # Obtener importancia de características si está disponible
            feature_importance = get_feature_importance(trained_model, used_features)
            
            # Guardar el modelo
            model_name = request.form.get('model_name', f'{algorithm}_{problem_type}_{uuid.uuid4().hex[:8]}')
            
            # Metadatos del modelo
            metadata = {
                'model_name': model_name,
                'algorithm': algorithm,
                'problem_type': problem_type,
                'model_params': model_params,
                'test_size': test_size,
                'target_column': target_column,
                'features': used_features,
                'categorical_columns': categorical_columns,
                'encoded_columns': encoded_columns,
                'evaluation': evaluation,
                'feature_importance': feature_importance,
                'created_by': get_jwt_identity(),
                'data_type': 'real'
            }
            
            # Guardar el modelo
            model_path = save_sklearn_model(
                trained_model, 
                model_name, 
                current_app.config['TABULAR_MODELS_FOLDER'],
                metadata
            )
            
            # Limpiar archivos temporales
            os.remove(temp_path)
            os.rmdir(temp_dir)
            
            # Devolver resultados
            return jsonify({
                'success': True,
                'message': 'Modelo entrenado correctamente',
                'model_name': model_name,
                'model_path': model_path,
                'algorithm': algorithm,
                'problem_type': problem_type,
                'evaluation': evaluation,
                'feature_importance': feature_importance
            }), 200
            
        except Exception as e:
            # Limpiar archivos temporales en caso de error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
            
            logging.exception(f"Error al entrenar modelo tabular con datos reales: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    except Exception as e:
        logging.exception(f"Error general en train_with_real_data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tabular_bp.route('/predict/real', methods=['POST'])
@jwt_required()
@user_required
def predict_with_real_data():
    """Endpoint para predecir con un modelo tabular usando datos reales (Usuario)"""
    try:
        # Obtener datos del JSON
        data = request.get_json()
        
        # Validar parámetros necesarios
        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400
        
        # Obtener el modelo a utilizar
        model_name = data.get('model_name')
        if not model_name:
            return jsonify({"error": "No se proporcionó un nombre de modelo"}), 400
        
        # Obtener características para la predicción
        features_data = data.get('features')
        if not features_data:
            return jsonify({"error": "No se proporcionaron características para la predicción"}), 400
        
        # Listar modelos disponibles
        from ml.common.model_storage import list_models
        models = list_models(current_app.config['TABULAR_MODELS_FOLDER'])
        
        # Buscar el modelo por nombre
        model_info = next((m for m in models if m['id'].startswith(model_name)), None)
        if not model_info:
            return jsonify({"error": f"Modelo '{model_name}' no encontrado"}), 404
        
        # Cargar el modelo
        model_path = model_info['path']
        model, metadata = load_sklearn_model(model_path)
        
        # Verificar que el modelo tiene los metadatos necesarios
        if not metadata or 'features' not in metadata:
            return jsonify({"error": "Modelo incompleto, falta información de características"}), 400
        
        # Obtener características del modelo
        model_features = metadata.get('features', [])
        categorical_columns = metadata.get('categorical_columns', [])
        encoded_columns = metadata.get('encoded_columns', {})
        
        # Verificar que se proporcionaron todas las características necesarias
        missing_features = [feat for feat in model_features if feat not in features_data]
        if missing_features:
            return jsonify({"error": f"Faltan características requeridas: {', '.join(missing_features)}"}), 400
        
        # Preparar datos para la predicción
        X_pred = []
        feature_values = []
        
        for feature in model_features:
            value = features_data.get(feature)
            
            # Codificar columnas categóricas si es necesario
            if feature in categorical_columns and encoded_columns and feature in encoded_columns:
                # Buscar el código correspondiente a la categoría
                category_mappings = encoded_columns[feature]
                if isinstance(category_mappings, dict):
                    # Convertir a entero (código de categoría)
                    found = False
                    for code, category in category_mappings.items():
                        if str(category) == str(value):
                            value = int(code)
                            found = True
                            break
                    
                    if not found:
                        return jsonify({"error": f"Valor '{value}' no reconocido para la característica categórica '{feature}'"}), 400
            
            # Convertir a número si es posible
            if not isinstance(value, (int, float)) and isinstance(value, str):
                try:
                    value = float(value)
                except ValueError:
                    pass  # Mantener como string si no se puede convertir
            
            feature_values.append(value)
        
        # Crear matriz de características
        X_pred.append(feature_values)
        
        # Realizar predicción
        prediction_result = predict(model, np.array(X_pred))
        
        # Devolver resultados
        return jsonify({
            'success': True,
            'model_name': model_name,
            'prediction': prediction_result,
            'metadata': metadata,
            'feature_importance': metadata.get('feature_importance')
        }), 200
    
    except Exception as e:
        logging.exception(f"Error en predict_with_real_data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    
@tabular_bp.route('/preview', methods=['POST'])
@jwt_required()
@user_required
def preview_tabular_data():
    """Endpoint para obtener una vista previa de datos tabulares"""
    try:
        # Verificar si se proporcionó un archivo
        if 'file' not in request.files:
            return jsonify({"error": "No se proporcionó un archivo"}), 400
        
        file = request.files['file']
        
        # Verificar si el archivo tiene un nombre
        if file.filename == '':
            return jsonify({"error": "No se seleccionó un archivo"}), 400
        
        # Verificar el formato del archivo
        allowed_extensions = current_app.config['ALLOWED_TABULAR_EXTENSIONS']
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                "error": f"Formato de archivo no soportado. Debe ser: {', '.join(allowed_extensions)}"
            }), 400
        
        # Crear directorio temporal para guardar el archivo
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, secure_filename(file.filename))
        
        # Guardar archivo
        file.save(temp_path)
        
        # Cargar datos
        df = load_tabular_data(temp_path)
        
        # Obtener muestra para vista previa (primeras 100 filas)
        preview_data = df.head(100).to_dict('records')
        
        # Obtener columnas
        columns = df.columns.tolist()
        
        # Limpiar archivos temporales
        os.remove(temp_path)
        os.rmdir(temp_dir)
        
        return jsonify({
            'success': True,
            'data': preview_data,
            'columns': columns,
            'rows_count': len(df)
        }), 200
        
    except Exception as e:
        logging.exception(f"Error al generar vista previa de datos tabulares: {str(e)}")
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
        logger.exception(f"Error al eliminar modelo tabular: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500