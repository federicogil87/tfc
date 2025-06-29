from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from ml.common.model_storage import list_models

# Crear blueprint para rutas del dashboard
dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Endpoint para obtener estadísticas generales del dashboard"""
    try:
        # Obtener todos los modelos
        cnn_models = list_models(current_app.config['CNN_MODELS_FOLDER'])
        tabular_models = list_models(current_app.config['TABULAR_MODELS_FOLDER'])
        
        # Estadísticas generales
        total_models = len(cnn_models) + len(tabular_models)
        total_cnn = len(cnn_models)
        total_tabular = len(tabular_models)
        
        # Calcular mejor precisión
        best_accuracy = 0
        best_model = None
        
        # Revisar modelos CNN
        for model in cnn_models:
            accuracy = model.get('metadata', {}).get('accuracy', 0)
            if accuracy > best_accuracy:
                best_accuracy = accuracy
                best_model = {
                    'name': model.get('metadata', {}).get('model_name', 'Sin nombre'),
                    'type': 'CNN',
                    'id': model.get('id', '')
                }
        
        # Revisar modelos tabulares
        for model in tabular_models:
            evaluation = model.get('metadata', {}).get('evaluation', {})
            accuracy = evaluation.get('accuracy', 0)
            if accuracy > best_accuracy:
                best_accuracy = accuracy
                best_model = {
                    'name': model.get('metadata', {}).get('model_name', 'Sin nombre'),
                    'type': 'Tabular',
                    'id': model.get('id', '')
                }
        
        # Modelos por período
        today = datetime.now()
        
        # Últimos 30 días
        thirty_days_ago = today - timedelta(days=30)
        models_last_30_days = 0
        
        # Últimos 7 días
        seven_days_ago = today - timedelta(days=7)
        models_last_7_days = 0
        
        # Contar modelos por período
        for model_list in [cnn_models, tabular_models]:
            for model in model_list:
                created_at = datetime.fromisoformat(model.get('created_at').replace('Z', '+00:00'))
                if created_at >= thirty_days_ago:
                    models_last_30_days += 1
                    if created_at >= seven_days_ago:
                        models_last_7_days += 1
        
        # Calcular tipos de modelos
        model_types = {}
        
        # Contar arquitecturas CNN
        for model in cnn_models:
            architecture = model.get('metadata', {}).get('model_params', {}).get('architecture', 'custom')
            type_key = f"CNN - {architecture}"
            if type_key not in model_types:
                model_types[type_key] = 0
            model_types[type_key] += 1
        
        # Contar algoritmos tabulares
        for model in tabular_models:
            algorithm = model.get('metadata', {}).get('algorithm', 'unknown')
            if algorithm not in model_types:
                model_types[type_key] = 0
            model_types[algorithm] += 1
        
        # Devolver resultados
        return jsonify({
            'success': True,
            'stats': {
                'total_models': total_models,
                'total_cnn': total_cnn,
                'total_tabular': total_tabular,
                'best_accuracy': best_accuracy,
                'best_model': best_model,
                'models_last_30_days': models_last_30_days,
                'models_last_7_days': models_last_7_days,
                'model_types': model_types
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500