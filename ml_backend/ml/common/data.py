import os
import numpy as np
import pandas as pd
import zipfile
import random
from sklearn.model_selection import train_test_split
from tensorflow.keras.preprocessing.image import ImageDataGenerator, load_img, img_to_array

def split_data(X, y, test_size=0.2, random_state=None):
    """
    Divide los datos en conjuntos de entrenamiento y prueba
    
    Args:
        X: Características
        y: Etiquetas
        test_size: Proporción de datos para prueba (0-1)
        random_state: Semilla para reproducibilidad
    
    Returns:
        X_train, X_test, y_train, y_test
    """
    return train_test_split(X, y, test_size=test_size, random_state=random_state)

def load_tabular_data(file_path):
    """
    Carga datos tabulares desde un archivo CSV o Excel
    
    Args:
        file_path: Ruta al archivo
    
    Returns:
        DataFrame de pandas con los datos
    """
    # Determinar el tipo de archivo por la extensión
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    elif file_path.endswith(('.xlsx', '.xls')):
        return pd.read_excel(file_path)
    else:
        raise ValueError(f"Formato de archivo no soportado: {file_path}")

def prepare_tabular_data(df, target_column, features=None, categorical_columns=None):
    """
    Prepara datos tabulares para el entrenamiento
    
    Args:
        df: DataFrame con los datos
        target_column: Nombre de la columna objetivo
        features: Lista de columnas a usar como características (None para usar todas)
        categorical_columns: Lista de columnas categóricas para codificar
    
    Returns:
        X, y, columnas utilizadas, columnas categóricas codificadas
    """
    # Verificar que la columna objetivo existe
    if target_column not in df.columns:
        raise ValueError(f"La columna objetivo '{target_column}' no existe en el DataFrame")
    
    # Determinar características a utilizar
    if features is None:
        features = [col for col in df.columns if col != target_column]
    
    # Verificar que todas las características existen
    missing_features = [col for col in features if col not in df.columns]
    if missing_features:
        raise ValueError(f"Las siguientes columnas no existen en el DataFrame: {missing_features}")
    
    # Crear copia del DataFrame para no modificar el original
    df_copy = df[features + [target_column]].copy()
    
    # Tratar valores faltantes
    for col in df_copy.columns:
        if df_copy[col].dtype == 'object' or df_copy[col].dtype.name == 'category':
            # Para columnas categóricas, reemplazar con la moda
            df_copy[col] = df_copy[col].fillna(df_copy[col].mode()[0])
        else:
            # Para columnas numéricas, reemplazar con la mediana
            df_copy[col] = df_copy[col].fillna(df_copy[col].median())
    
    # Procesar columnas categóricas
    encoded_columns = {}
    if categorical_columns:
        for col in categorical_columns:
            if col in df_copy.columns:
                # Convertir a tipo categórico para obtener códigos
                df_copy[col] = df_copy[col].astype('category')
                # Guardar mapeo de categorías para interpretación posterior
                encoded_columns[col] = dict(enumerate(df_copy[col].cat.categories))
                # Usar códigos numéricos
                df_copy[col] = df_copy[col].cat.codes
    
    # Separar características y objetivo
    X = df_copy[features].values
    y = df_copy[target_column].values
    
    return X, y, features, encoded_columns

def extract_zip_images(zip_path, extract_dir):
    """
    Extrae imágenes de un archivo ZIP en un directorio específico
    
    Args:
        zip_path: Ruta al archivo ZIP
        extract_dir: Directorio donde extraer las imágenes
    
    Returns:
        Lista de rutas a las imágenes extraídas
    """
    # Crear directorio si no existe
    os.makedirs(extract_dir, exist_ok=True)
    
    # Lista para almacenar las rutas de las imágenes
    image_paths = []
    
    # Extraer archivos del ZIP
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        # Obtener lista de archivos en el ZIP
        file_list = zip_ref.namelist()
        
        # Filtrar solo archivos de imagen
        allowed_extensions = {'.jpg', '.jpeg', '.png'}
        image_files = [f for f in file_list if os.path.splitext(f.lower())[1] in allowed_extensions]
        
        # Extraer solo las imágenes
        for file in image_files:
            zip_ref.extract(file, extract_dir)
            image_paths.append(os.path.join(extract_dir, file))
    
    return image_paths

def prepare_image_data(image_paths, img_height, img_width, labels=None):
    """
    Prepara datos de imágenes para el entrenamiento
    
    Args:
        image_paths: Lista de rutas a las imágenes
        img_height: Altura objetivo de las imágenes
        img_width: Anchura objetivo de las imágenes
        labels: Etiquetas correspondientes a las imágenes (opcional)
    
    Returns:
        X, y (si se proporcionaron etiquetas)
    """
    # Preparar contenedor para imágenes
    X = np.zeros((len(image_paths), img_height, img_width, 3), dtype='float32')
    
    # Cargar y preprocesar cada imagen
    for i, path in enumerate(image_paths):
        try:
            # Cargar imagen y redimensionar
            img = load_img(path, target_size=(img_height, img_width))
            # Convertir a array y normalizar a [0,1]
            img_array = img_to_array(img) / 255.0
            # Almacenar en el arreglo
            X[i] = img_array
        except Exception as e:
            print(f"Error al procesar imagen {path}: {str(e)}")
            # En caso de error, usar una imagen en negro
            X[i] = np.zeros((img_height, img_width, 3))
    
    # Si se proporcionaron etiquetas, devolverlas junto con las imágenes
    if labels is not None:
        return X, np.array(labels)
    
    return X, None

def create_image_data_generator(
    rotation_range=20, 
    width_shift_range=0.2, 
    height_shift_range=0.2,
    shear_range=0.2, 
    zoom_range=0.2, 
    horizontal_flip=True, 
    fill_mode='nearest'
):
    """
    Crea un generador de datos para aumentación de imágenes
    
    Args:
        Varios parámetros de aumento de datos
    
    Returns:
        Generador de datos configurado
    """
    return ImageDataGenerator(
        rotation_range=rotation_range,
        width_shift_range=width_shift_range,
        height_shift_range=height_shift_range,
        shear_range=shear_range,
        zoom_range=zoom_range,
        horizontal_flip=horizontal_flip,
        fill_mode=fill_mode,
        rescale=1./255
    )

def create_test_image_labels(num_images, num_classes):
    """
    Crea etiquetas aleatorias para imágenes de prueba
    
    Args:
        num_images: Número de imágenes
        num_classes: Número de clases
    
    Returns:
        Array de etiquetas
    """
    return np.random.randint(0, num_classes, size=num_images)