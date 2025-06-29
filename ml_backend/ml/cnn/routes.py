import os
import uuid
import json
import numpy as np
import logging
import base64
import shutil
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity

from auth.models import User
from auth.utils import testing_required, user_required, admin_required, validate_file_extension
from ml.common.data import extract_zip_images_with_classes, prepare_image_data, split_data
from ml.common.model_storage import save_tensorflow_model, load_tensorflow_model, list_models, delete_model
from .model import create_cnn_model, train_cnn_model, evaluate_cnn_model, predict_image

# Crear blueprint para rutas de CNN
cnn_bp = Blueprint('cnn', __name__, url_prefix='/api/ml/cnn')

# Rutas para entrenamiento con datos de prueba (rol Testing)
@cnn_bp.route('/train/test', methods=['POST'])
@jwt_required()
@testing_required
def train_with_test_data():
    """Endpoint para entrenar un modelo CNN con datos de prueba (Testing)"""
    try:
        # Obtener parámetros del JSON
        data = request.get_json()
        
        # Validar parámetros necesarios
        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400
        
        # Parámetros para el entrenamiento
        test_size = float(data.get('test_size', 0.2))
        if test_size <= 0 or test_size >= 1:
            return jsonify({"error": "test_size debe estar entre 0 y 1"}), 400
        
        # Obtener hiperparámetros para el modelo
        model_params = {
            'input_shape': data.get('input_shape', (224, 224, 3)),
            'num_classes': int(data.get('num_classes', 10)),
            'architecture': data.get('architecture', 'custom'),
            'dropout_rate': float(data.get('dropout_rate', 0.5)),
            'filters': data.get('filters', [32, 64, 128]),
            'kernel_size': data.get('kernel_size', (3, 3)),
            'pool_size': data.get('pool_size', (2, 2)),
            'dense_units': int(data.get('dense_units', 128)),
            'learning_rate': float(data.get('learning_rate', 0.001))
        }
        
        # Parámetros para el entrenamiento
        train_params = {
            'batch_size': int(data.get('batch_size', 32)),
            'epochs': int(data.get('epochs', 10)),
            'data_augmentation': bool(data.get('data_augmentation', True))
        }
        
        # Cargar datos de prueba (simular imágenes y etiquetas)
        num_samples = int(data.get('num_samples', 100))
        img_height, img_width = model_params['input_shape'][:2]
        
        # Crear datos de prueba aleatorios
        X = np.random.rand(num_samples, img_height, img_width, 3)
        y = np.random.randint(0, model_params['num_classes'], size=num_samples)
        
        # Dividir datos en entrenamiento y prueba
        X_train, X_test, y_train, y_test = split_data(X, y, test_size=test_size)
        
        # Crear y compilar el modelo
        model = create_cnn_model(**model_params)
        
        # Entrenar el modelo
        history = train_cnn_model(
            model, X_train, y_train, X_test, y_test, **train_params
        )
        
        # Evaluar el modelo
        evaluation = evaluate_cnn_model(model, X_test, y_test)
        
        # Guardar el modelo si se proporciona un nombre
        model_name = data.get('model_name', f'cnn_test_{uuid.uuid4().hex[:8]}')
        
        # Metadatos del modelo
        metadata = {
            'model_name': model_name,
            'model_type': 'cnn',
            'model_params': model_params,
            'train_params': train_params,
            'test_size': test_size,
            'accuracy': float(evaluation['accuracy']),
            'loss': float(evaluation['loss']),
            'created_by': get_jwt_identity(),
            'data_type': 'test'
        }
        
        try:
            # Guardar el modelo
            model_path = save_tensorflow_model(
                model, 
                model_name, 
                current_app.config['CNN_MODELS_FOLDER'],
                metadata
            )
            
            # Devolver resultados
            return jsonify({
                'success': True,
                'message': 'Modelo entrenado correctamente',
                'model_name': model_name,
                'model_path': model_path,
                'evaluation': evaluation,
                'history': {
                    'accuracy': [float(acc) for acc in history.history['accuracy']],
                    'loss': [float(loss) for loss in history.history['loss']],
                    'val_accuracy': [float(acc) for acc in history.history.get('val_accuracy', [])],
                    'val_loss': [float(loss) for loss in history.history.get('val_loss', [])]
                }
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
@cnn_bp.route('/train/real', methods=['POST'])
@jwt_required()
@user_required
def train_with_real_data():
    """Endpoint para entrenar un modelo CNN con datos reales (Usuario)"""
    try:
        # Verificar si se proporcionó un archivo
        if 'file' not in request.files:
            return jsonify({"error": "No se proporcionó un archivo"}), 400
        
        file = request.files['file']
        
        # Verificar si el archivo tiene un nombre
        if file.filename == '':
            return jsonify({"error": "No se seleccionó un archivo"}), 400
        
        # Verificar si es un archivo ZIP
        if not file.filename.endswith('.zip'):
            return jsonify({"error": "El archivo debe ser un ZIP"}), 400
        
        # Guardar el archivo temporalmente
        temp_zip_path = os.path.join(current_app.config['IMAGE_UPLOAD_FOLDER'], secure_filename(file.filename))
        os.makedirs(os.path.dirname(temp_zip_path), exist_ok=True)
        file.save(temp_zip_path)
        
        # Extraer imágenes del ZIP con detección de clases
        extract_dir = os.path.join(current_app.config['IMAGE_UPLOAD_FOLDER'], f'extract_{uuid.uuid4().hex}')
        image_paths, labels, class_mapping = extract_zip_images_with_classes(temp_zip_path, extract_dir)
        
        # Verificar si se extrajeron imágenes
        if not image_paths:
            return jsonify({"error": "No se encontraron imágenes en el archivo ZIP"}), 400
        
        # Verificar que el número de clases coincida con el parámetro (opcional)
        num_classes_detected = len(class_mapping)
        num_classes_param = int(request.form.get('num_classes', num_classes_detected))
        
        # Si el usuario especificó un número diferente de clases, usar el detectado
        if num_classes_param != num_classes_detected:
            logger = logging.getLogger(__name__)
            logger.warning(f"Número de clases especificado ({num_classes_param}) difiere del detectado ({num_classes_detected}). Usando el detectado.")
            num_classes_param = num_classes_detected
        
        # Obtener nombres personalizados de clases si se proporcionan
        custom_class_names = {}
        for i in range(num_classes_detected):
            custom_name = request.form.get(f'class_name_{i}')
            if custom_name and custom_name.strip():
                custom_class_names[i] = custom_name.strip()
        
        # Actualizar el mapeo de clases con nombres personalizados
        for idx, custom_name in custom_class_names.items():
            if idx in class_mapping:
                class_mapping[idx] = custom_name
        
        
        # Obtener parámetros de entrenamiento
        # Los parámetros pueden venir en form-data junto con el archivo
        test_size = float(request.form.get('test_size', 0.2))
        if test_size <= 0 or test_size >= 1:
            return jsonify({"error": "test_size debe estar entre 0 y 1"}), 400
        
        # Obtener hiperparámetros para el modelo
        # Intentar obtener desde form-data, o usar valores predeterminados
        input_height = int(request.form.get('input_height', 224))
        input_width = int(request.form.get('input_width', 224))
        
        model_params = {
            'input_shape': (input_height, input_width, 3),
            'num_classes': int(request.form.get('num_classes', 2)),
            'architecture': request.form.get('architecture', 'custom'),
            'dropout_rate': float(request.form.get('dropout_rate', 0.5)),
            'filters': json.loads(request.form.get('filters', '[32, 64, 128]')),
            'kernel_size': tuple(json.loads(request.form.get('kernel_size', '[3, 3]'))),
            'pool_size': tuple(json.loads(request.form.get('pool_size', '[2, 2]'))),
            'dense_units': int(request.form.get('dense_units', 128)),
            'learning_rate': float(request.form.get('learning_rate', 0.001)),
            'num_classes': num_classes_detected
        }
        
        # Parámetros para el entrenamiento
        train_params = {
            'batch_size': int(request.form.get('batch_size', 32)),
            'epochs': int(request.form.get('epochs', 10)),
            'data_augmentation': request.form.get('data_augmentation', 'true').lower() == 'true'
        }
        
        # Simular etiquetas para las imágenes (en un caso real vendrían con los datos)
        # Aquí asumimos un problema de clasificación binaria por simplicidad
        num_classes = model_params['num_classes']
        labels = np.random.randint(0, num_classes, size=len(image_paths))
        
        # Preparar datos de imágenes
        X, y = prepare_image_data(
            image_paths, 
            input_height, 
            input_width, 
            labels
        )
        
        # Dividir datos en entrenamiento y prueba
        X_train, X_test, y_train, y_test = split_data(X, y, test_size=test_size)
        
        # Crear y compilar el modelo
        model = create_cnn_model(**model_params)
        
        # Entrenar el modelo
        history = train_cnn_model(
            model, X_train, y_train, X_test, y_test, **train_params
        )
        
        # Evaluar el modelo
        evaluation = evaluate_cnn_model(model, X_test, y_test)
        
        # Guardar el modelo si se proporciona un nombre
        model_name = request.form.get('model_name', f'cnn_real_{uuid.uuid4().hex[:8]}')
        
        # Metadatos del modelo
        metadata = {
            'model_name': model_name,
            'model_type': 'cnn',
            'model_params': model_params,
            'train_params': train_params,
            'test_size': test_size,
            'accuracy': float(evaluation['accuracy']),
            'loss': float(evaluation['loss']),
            'created_by': get_jwt_identity(),
            'data_type': 'real',
            'num_images': len(image_paths),
            'class_mapping': class_mapping,
            'class_names': list(class_mapping.values())
        }
        
        try:
            # Guardar el modelo
            model_path = save_tensorflow_model(
                model, 
                model_name, 
                current_app.config['CNN_MODELS_FOLDER'],
                metadata
            )
            
            # Limpiar archivos temporales
            try:
                os.remove(temp_zip_path)
                shutil.rmtree(extract_dir)
            except:
                pass
            
            # Devolver resultados
            return jsonify({
                'success': True,
                'message': 'Modelo entrenado correctamente',
                'model_name': model_name,
                'model_path': model_path,
                'evaluation': evaluation,
                'history': {
                    'accuracy': [float(acc) for acc in history.history['accuracy']],
                    'loss': [float(loss) for loss in history.history['loss']],
                    'val_accuracy': [float(acc) for acc in history.history.get('val_accuracy', [])],
                    'val_loss': [float(loss) for loss in history.history.get('val_loss', [])]
                }
            }), 200
        except ValueError as e:
            # Limpiar archivos temporales en caso de error
            try:
                os.remove(temp_zip_path)
                
                shutil.rmtree(extract_dir)
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
@cnn_bp.route('/predict/test', methods=['POST'])
@jwt_required()
@testing_required
def predict_with_test_data():
    """Endpoint para predecir con un modelo CNN usando datos de prueba (Testing)"""
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
        models = list_models(current_app.config['CNN_MODELS_FOLDER'])
        
        # Buscar el modelo por nombre
        model_info = next((m for m in models if m['id'].startswith(model_name)), None)
        if not model_info:
            return jsonify({"error": f"Modelo '{model_name}' no encontrado"}), 404
        
        # Cargar el modelo
        model_path = model_info['path']
        model, metadata = load_tensorflow_model(model_path)
        
        # Crear una imagen de prueba aleatoria
        img_height, img_width = metadata.get('model_params', {}).get('input_shape', (224, 224, 3))[:2]
        test_image = np.random.rand(1, img_height, img_width, 3)
        
        # Realizar predicción
        prediction = predict_image(model, test_image[0])
        
        # Obtener la clase con mayor probabilidad
        predicted_class = int(np.argmax(prediction[0]))
        confidence = float(prediction[0][predicted_class])
        
        # Devolver resultados
        return jsonify({
            'success': True,
            'model_name': model_name,
            'prediction': {
                'class': predicted_class,
                'confidence': confidence,
                'probabilities': prediction[0].tolist()
            },
            'image': test_image[0].tolist(),  # Incluir la imagen utilizada
            'metadata': metadata
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Rutas para predicción con datos reales (rol Usuario)
@cnn_bp.route('/predict/real', methods=['POST'])
@jwt_required()
@user_required
def predict_with_real_data():
    """Endpoint para predecir con un modelo CNN usando datos reales (Usuario)"""
    try:
        # Verificar si se proporcionó un archivo
        if 'file' not in request.files:
            return jsonify({"error": "No se proporcionó un archivo"}), 400
        
        file = request.files['file']
        
        # Verificar si el archivo tiene un nombre
        if file.filename == '':
            return jsonify({"error": "No se seleccionó un archivo"}), 400
        
        # Verificar si es una imagen
        if not validate_file_extension(file.filename, current_app.config['ALLOWED_IMAGE_EXTENSIONS']):
            return jsonify({"error": "El archivo debe ser una imagen (PNG, JPG, JPEG)"}), 400
        
        # Obtener el modelo a utilizar
        model_name = request.form.get('model_name')
        if not model_name:
            return jsonify({"error": "No se proporcionó un nombre de modelo"}), 400
        
        # Listar modelos disponibles
        models = list_models(current_app.config['CNN_MODELS_FOLDER'])
        
        # Buscar el modelo por nombre
        model_info = next((m for m in models if m['id'].startswith(model_name)), None)
        if not model_info:
            return jsonify({"error": f"Modelo '{model_name}' no encontrado"}), 404
        
        # Cargar el modelo
        model_path = model_info['path']
        model, metadata = load_tensorflow_model(model_path)

        # Obtener mapeo de clases si está disponible
        class_mapping = metadata.get('class_mapping', {})
        
        # Guardar la imagen temporalmente
        temp_img_path = os.path.join(current_app.config['IMAGE_UPLOAD_FOLDER'], secure_filename(file.filename))
        os.makedirs(os.path.dirname(temp_img_path), exist_ok=True)
        file.save(temp_img_path)
        
        # Cargar y preprocesar la imagen
        img_height, img_width = metadata.get('model_params', {}).get('input_shape', (224, 224, 3))[:2]
        image_paths = [temp_img_path]
        X, _ = prepare_image_data(image_paths, img_height, img_width)
        
        # Realizar predicción
        prediction = predict_image(model, X[0])
        
        # Obtener la clase con mayor probabilidad
        predicted_class = int(np.argmax(prediction[0]))
        confidence = float(prediction[0][predicted_class])

        # Obtener nombre de la clase desde el mapeo
        class_name = class_mapping.get(str(predicted_class), f"Clase {predicted_class}")
        
        # Codificar la imagen para devolverla como parte de la respuesta
        
        with open(temp_img_path, "rb") as img_file:
            image_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        # Limpiar archivo temporal
        try:
            os.remove(temp_img_path)
        except:
            pass
        
        # Devolver resultados
        return jsonify({
            'success': True,
            'model_name': model_name,
            'prediction': {
                'class': predicted_class,
                'class_name': class_name,
                'confidence': confidence,
                'probabilities': prediction[0].tolist()
            },
            'image': image_base64,  # Incluir la imagen codificada en base64
            'metadata': metadata
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Ruta para listar modelos CNN disponibles
@cnn_bp.route('/models', methods=['GET'])
@jwt_required()
def list_cnn_models():
    """Endpoint para listar modelos CNN disponibles"""
    try:
        # Listar modelos
        models = list_models(current_app.config['CNN_MODELS_FOLDER'])
        
        return jsonify({
            'success': True,
            'models': models
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Ruta para eliminar un modelo CNN específico
@cnn_bp.route('/models/<model_name>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_cnn_model(model_name):
    """Endpoint para eliminar un modelo CNN específico (solo administradores)"""
    try:
        # Listar modelos disponibles
        models = list_models(current_app.config['CNN_MODELS_FOLDER'])
        
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