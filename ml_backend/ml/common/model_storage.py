import os
import json
import pickle
import datetime
import numpy as np
from tensorflow import keras
from pathlib import Path
from flask import current_app
import logging

# Configurar logging para depuración
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
    logger.info(f"Verificando si existe el modelo '{model_name}' en '{model_dir}'")
    
    if not os.path.exists(model_dir):
        logger.info(f"El directorio '{model_dir}' no existe")
        return False
    
    # Listar todos los archivos en el directorio y subdirectorios
    model_files = []
    for root, _, files in os.walk(model_dir):
        for file in files:
            if file.endswith('.h5') or file.endswith('.pkl'):
                model_files.append(os.path.join(root, file))
    
    logger.info(f"Archivos de modelos encontrados: {len(model_files)}")
    
    # Verificar si algún nombre de archivo comienza con el nombre del modelo
    for model_file in model_files:
        file_basename = os.path.basename(model_file)
        # Extraer el nombre base sin el timestamp ni la extensión
        # El formato típico es nombre_timestamp.extension
        if '_' in file_basename:
            existing_name = file_basename.split('_', 1)[0]
            if existing_name == model_name:
                logger.info(f"El modelo '{model_name}' ya existe: {model_file}")
                return True
    
    logger.info(f"El modelo '{model_name}' no existe")
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
    
    logger.info(f"Guardando metadatos en '{metadata_file}'")
    
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
        logger.warning(f"No se encontró el archivo de metadatos: '{metadata_file}'")
        return None
    
    logger.info(f"Cargando metadatos desde '{metadata_file}'")
    
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
    
    logger.info(f"Guardando modelo TensorFlow '{safe_name}' en '{model_dir}'")
    
    # Verificar si ya existe un modelo con ese nombre
    if check_model_name_exists(safe_name, model_dir):
        raise ValueError(f"Ya existe un modelo con el nombre '{model_name}'. Por favor, elige un nombre diferente.")
    
    # Crear directorio con marca de tiempo para evitar colisiones
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = os.path.join(model_dir, f"{safe_name}_{timestamp}")
    
    # Asegurarse de que el directorio existe
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # Guardar el modelo
    try:
        model_file = f"{model_path}.h5"
        logger.info(f"Guardando modelo en '{model_file}'")
        model.save(model_file)
    except Exception as e:
        logger.error(f"Error al guardar el modelo: {str(e)}")
        raise
    
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
    logger.info(f"Cargando modelo TensorFlow desde '{model_path}'")
    
    # Determinar la ruta completa del archivo .h5
    h5_path = f"{model_path}.h5"
    if not os.path.exists(h5_path):
        logger.error(f"No se encontró el archivo del modelo: '{h5_path}'")
        raise FileNotFoundError(f"No se encontró el archivo del modelo: '{h5_path}'")
    
    # Cargar el modelo
    try:
        model = keras.models.load_model(h5_path)
        logger.info(f"Modelo cargado correctamente desde '{h5_path}'")
    except Exception as e:
        logger.error(f"Error al cargar el modelo: {str(e)}")
        raise
    
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
    
    logger.info(f"Guardando modelo scikit-learn '{safe_name}' en '{model_dir}'")
    
    # Verificar si ya existe un modelo con ese nombre
    if check_model_name_exists(safe_name, model_dir):
        raise ValueError(f"Ya existe un modelo con el nombre '{model_name}'. Por favor, elige un nombre diferente.")
    
    # Crear directorio con marca de tiempo para evitar colisiones
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = os.path.join(model_dir, f"{safe_name}_{timestamp}")
    
    # Asegurarse de que el directorio existe
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # Guardar el modelo
    try:
        model_file = f"{model_path}.pkl"
        logger.info(f"Guardando modelo en '{model_file}'")
        with open(model_file, 'wb') as f:
            pickle.dump(model, f)
    except Exception as e:
        logger.error(f"Error al guardar el modelo: {str(e)}")
        raise
    
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
    logger.info(f"Cargando modelo scikit-learn desde '{model_path}'")
    
    # Determinar la ruta completa del archivo .pkl
    pkl_path = f"{model_path}.pkl"
    if not os.path.exists(pkl_path):
        logger.error(f"No se encontró el archivo del modelo: '{pkl_path}'")
        raise FileNotFoundError(f"No se encontró el archivo del modelo: '{pkl_path}'")
    
    # Cargar el modelo
    try:
        with open(pkl_path, 'rb') as f:
            model = pickle.load(f)
        logger.info(f"Modelo cargado correctamente desde '{pkl_path}'")
    except Exception as e:
        logger.error(f"Error al cargar el modelo: {str(e)}")
        raise
    
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
    logger.info(f"Listando modelos en '{model_dir}', tipo: {model_type}")
    
    if not os.path.exists(model_dir):
        logger.warning(f"El directorio '{model_dir}' no existe")
        return []
    
    # Determinar la extensión según el tipo de modelo
    extension = None
    if model_type == "tensorflow":
        extension = ".h5"
    elif model_type == "sklearn":
        extension = ".pkl"
    
    # Encontrar todos los archivos de modelo
    model_files = []
    if extension:
        # Si se especificó un tipo, buscar archivos con esa extensión
        model_files = list(Path(model_dir).glob(f"**/*{extension}"))
        logger.info(f"Encontrados {len(model_files)} archivos con extensión '{extension}'")
    else:
        # Si no se especificó un tipo, buscar archivos .h5 y .pkl
        h5_files = list(Path(model_dir).glob("**/*.h5"))
        pkl_files = list(Path(model_dir).glob("**/*.pkl"))
        model_files = h5_files + pkl_files
        logger.info(f"Encontrados {len(h5_files)} archivos .h5 y {len(pkl_files)} archivos .pkl")
    
    models = []
    for model_file in model_files:
        # Obtener la ruta base sin extensión
        model_path = str(model_file).rsplit('.', 1)[0]
        
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
    
    logger.info(f"Total de modelos encontrados: {len(models)}")
    return models

def delete_model(model_path):
    """
    Elimina un modelo y sus metadatos
    
    Args:
        model_path: Ruta base del modelo (sin extensión)
    
    Returns:
        True si se eliminó correctamente, False en caso contrario
    """
    logger.info(f"Eliminando modelo: '{model_path}'")
    
    try:
        # Intentar eliminar archivo .h5 (TensorFlow)
        h5_path = f"{model_path}.h5"
        if os.path.exists(h5_path):
            logger.info(f"Eliminando archivo: '{h5_path}'")
            os.remove(h5_path)
        
        # Intentar eliminar archivo .pkl (scikit-learn)
        pkl_path = f"{model_path}.pkl"
        if os.path.exists(pkl_path):
            logger.info(f"Eliminando archivo: '{pkl_path}'")
            os.remove(pkl_path)
        
        # Eliminar metadatos
        json_path = f"{model_path}.json"
        if os.path.exists(json_path):
            logger.info(f"Eliminando archivo: '{json_path}'")
            os.remove(json_path)
        
        return True
    except Exception as e:
        logger.error(f"Error al eliminar modelo: {str(e)}")
        return False