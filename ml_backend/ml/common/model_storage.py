import os
import json
import pickle
import datetime
import numpy as np
from tensorflow import keras
from pathlib import Path
from flask import current_app

class NumpyEncoder(json.JSONEncoder):
    """Clase personalizada para codificar objetos NumPy a JSON"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, datetime.datetime):
            return obj.isoformat()
        return super(NumpyEncoder, self).default(obj)

def check_model_name_exists(model_name, model_dir):
    """
    Verifica si ya existe un modelo con el nombre especificado
    
    Args:
        model_name: Nombre del modelo a verificar
        model_dir: Directorio donde buscar modelos
    
    Returns:
        True si existe un modelo con ese nombre, False en caso contrario
    """
    if not os.path.exists(model_dir):
        return False
    
    # Listar todos los archivos en el directorio y subdirectorios
    model_files = []
    for root, _, files in os.walk(model_dir):
        for file in files:
            if file.endswith('.h5') or file.endswith('.pkl'):
                model_files.append(os.path.join(root, file))
    
    # Verificar si algún nombre de archivo comienza con el nombre del modelo
    for model_file in model_files:
        file_basename = os.path.basename(model_file)
        # Extraer el nombre base sin el timestamp ni la extensión
        # El formato típico es nombre_timestamp.extension
        if '_' in file_basename:
            existing_name = file_basename.split('_', 1)[0]
            if existing_name == model_name:
                return True
    
    return False

def save_model_metadata(model_path, metadata):
    """
    Guarda los metadatos del modelo en un archivo JSON
    
    Args:
        model_path: Ruta del modelo (sin extensión)
        metadata: Diccionario con metadatos del modelo
    """
    metadata_file = f"{model_path}.json"
    
    # Asegurarse de que el directorio existe
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, cls=NumpyEncoder, indent=2)

def load_model_metadata(model_path):
    """
    Carga los metadatos del modelo desde un archivo JSON
    
    Args:
        model_path: Ruta del modelo (sin extensión)
    
    Returns:
        Diccionario con metadatos o None si no existe
    """
    metadata_file = f"{model_path}.json"
    
    if not os.path.exists(metadata_file):
        return None
    
    with open(metadata_file, 'r') as f:
        return json.load(f)

def save_tensorflow_model(model, model_name, model_dir, metadata=None):
    """
    Guarda un modelo de TensorFlow/Keras junto con sus metadatos
    
    Args:
        model: Modelo de TensorFlow/Keras
        model_name: Nombre del modelo
        model_dir: Directorio donde guardar el modelo
        metadata: Diccionario con metadatos adicionales
    
    Returns:
        Ruta donde se guardó el modelo
    
    Raises:
        ValueError: Si ya existe un modelo con el mismo nombre
    """
    # Asegurarse de que el nombre del modelo sea seguro
    safe_name = "".join(c if c.isalnum() or c in "._- " else "_" for c in model_name)
    
    # Verificar si ya existe un modelo con ese nombre
    if check_model_name_exists(safe_name, model_dir):
        raise ValueError(f"Ya existe un modelo con el nombre '{model_name}'. Por favor, elige un nombre diferente.")
    
    # Crear directorio con marca de tiempo para evitar colisiones
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = os.path.join(model_dir, f"{safe_name}_{timestamp}")
    
    # Asegurarse de que el directorio existe
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # Guardar el modelo
    model.save(model_path)
    
    # Guardar metadatos
    if metadata:
        save_model_metadata(model_path, metadata)
    
    return model_path

def load_tensorflow_model(model_path):
    """
    Carga un modelo de TensorFlow/Keras
    
    Args:
        model_path: Ruta del modelo
    
    Returns:
        Modelo cargado y metadatos (si existen)
    """
    # Cargar el modelo
    model = keras.models.load_model(model_path)
    
    # Cargar metadatos si existen
    metadata = load_model_metadata(model_path)
    
    return model, metadata

def save_sklearn_model(model, model_name, model_dir, metadata=None):
    """
    Guarda un modelo de scikit-learn junto con sus metadatos
    
    Args:
        model: Modelo de scikit-learn
        model_name: Nombre del modelo
        model_dir: Directorio donde guardar el modelo
        metadata: Diccionario con metadatos adicionales
    
    Returns:
        Ruta donde se guardó el modelo
        
    Raises:
        ValueError: Si ya existe un modelo con el mismo nombre
    """
    # Asegurarse de que el nombre del modelo sea seguro
    safe_name = "".join(c if c.isalnum() or c in "._- " else "_" for c in model_name)
    
    # Verificar si ya existe un modelo con ese nombre
    if check_model_name_exists(safe_name, model_dir):
        raise ValueError(f"Ya existe un modelo con el nombre '{model_name}'. Por favor, elige un nombre diferente.")
    
    # Crear directorio con marca de tiempo para evitar colisiones
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = os.path.join(model_dir, f"{safe_name}_{timestamp}")
    
    # Asegurarse de que el directorio existe
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # Guardar el modelo
    with open(f"{model_path}.pkl", 'wb') as f:
        pickle.dump(model, f)
    
    # Guardar metadatos
    if metadata:
        save_model_metadata(model_path, metadata)
    
    return model_path

def load_sklearn_model(model_path):
    """
    Carga un modelo de scikit-learn
    
    Args:
        model_path: Ruta base del modelo (sin extensión)
    
    Returns:
        Modelo cargado y metadatos (si existen)
    """
    # Cargar el modelo
    with open(f"{model_path}.pkl", 'rb') as f:
        model = pickle.load(f)
    
    # Cargar metadatos si existen
    metadata = load_model_metadata(model_path)
    
    return model, metadata

def list_models(model_dir, model_type=None):
    """
    Lista todos los modelos guardados de un tipo específico
    
    Args:
        model_dir: Directorio donde buscar modelos
        model_type: Tipo de modelo (opcional)
    
    Returns:
        Lista de modelos con sus metadatos
    """
    if not os.path.exists(model_dir):
        return []
    
    # Determinar la extensión según el tipo de modelo
    extension = ".h5" if model_type == "tensorflow" else ".pkl"
    
    # Encontrar todos los archivos de modelo
    model_files = list(Path(model_dir).rglob(f"*{extension}"))
    
    models = []
    for model_file in model_files:
        # Obtener la ruta base sin extensión
        model_path = str(model_file)[:-len(extension)]
        
        # Cargar metadatos
        metadata = load_model_metadata(model_path)
        if not metadata:
            metadata = {}
        
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
    
    return models

def delete_model(model_path):
    """
    Elimina un modelo y sus metadatos
    
    Args:
        model_path: Ruta base del modelo (sin extensión)
    
    Returns:
        True si se eliminó correctamente, False en caso contrario
    """
    try:
        # Intentar eliminar archivo .h5 (TensorFlow)
        h5_path = f"{model_path}.h5"
        if os.path.exists(h5_path):
            os.remove(h5_path)
        
        # Intentar eliminar archivo .pkl (scikit-learn)
        pkl_path = f"{model_path}.pkl"
        if os.path.exists(pkl_path):
            os.remove(pkl_path)
        
        # Eliminar metadatos
        json_path = f"{model_path}.json"
        if os.path.exists(json_path):
            os.remove(json_path)
        
        return True
    except Exception as e:
        print(f"Error al eliminar modelo: {str(e)}")
        return False