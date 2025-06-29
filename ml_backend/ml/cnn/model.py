import numpy as np
from keras import layers, models, optimizers
from keras.applications import MobileNetV2, VGG16, ResNet50
from keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, confusion_matrix

def create_cnn_model(
    input_shape=(224, 224, 3),
    num_classes=10,
    architecture='custom',
    dropout_rate=0.5,
    filters=(32, 64, 128),
    kernel_size=(3, 3),
    pool_size=(2, 2),
    dense_units=128,
    learning_rate=0.001
):
    """
    Crea un modelo CNN basado en los parámetros proporcionados
    
    Args:
        input_shape: Forma de las imágenes de entrada (altura, anchura, canales)
        num_classes: Número de clases a predecir
        architecture: 'custom', 'mobilenet', 'vgg16' o 'resnet50'
        dropout_rate: Tasa de dropout para regularización
        filters: Tupla con número de filtros para cada capa convolucional
        kernel_size: Tamaño del kernel para convoluciones
        pool_size: Tamaño de la ventana para pooling
        dense_units: Número de unidades en la capa densa
        learning_rate: Tasa de aprendizaje para el optimizador
    
    Returns:
        Modelo de Keras compilado
    """
    # Opciones de arquitectura
    if architecture == 'mobilenet':
        # Usar MobileNetV2 preentrenado
        base_model = MobileNetV2(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet'
        )
        base_model.trainable = False  # Congelar pesos para transfer learning
        
        model = models.Sequential([
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dense(dense_units, activation='relu'),
            layers.Dropout(dropout_rate),
            layers.Dense(num_classes, activation='softmax')
        ])
    
    elif architecture == 'vgg16':
        # Usar VGG16 preentrenado
        base_model = VGG16(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet'
        )
        base_model.trainable = False  # Congelar pesos para transfer learning
        
        model = models.Sequential([
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dense(dense_units, activation='relu'),
            layers.Dropout(dropout_rate),
            layers.Dense(num_classes, activation='softmax')
        ])
    
    elif architecture == 'resnet50':
        # Usar ResNet50 preentrenado
        base_model = ResNet50(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet'
        )
        base_model.trainable = False  # Congelar pesos para transfer learning
        
        model = models.Sequential([
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dense(dense_units, activation='relu'),
            layers.Dropout(dropout_rate),
            layers.Dense(num_classes, activation='softmax')
        ])
    
    else:  # Arquitectura personalizada
        model = models.Sequential()
        
        # Primera capa convolucional
        model.add(layers.Conv2D(filters[0], kernel_size, activation='relu', input_shape=input_shape))
        model.add(layers.MaxPooling2D(pool_size=pool_size))
        
        # Segunda capa convolucional (si hay suficientes filtros)
        if len(filters) > 1:
            model.add(layers.Conv2D(filters[1], kernel_size, activation='relu'))
            model.add(layers.MaxPooling2D(pool_size=pool_size))
        
        # Tercera capa convolucional (si hay suficientes filtros)
        if len(filters) > 2:
            model.add(layers.Conv2D(filters[2], kernel_size, activation='relu'))
            model.add(layers.MaxPooling2D(pool_size=pool_size))
        
        # Aplanar y capas densas
        model.add(layers.Flatten())
        model.add(layers.Dense(dense_units, activation='relu'))
        model.add(layers.Dropout(dropout_rate))
        model.add(layers.Dense(num_classes, activation='softmax'))
    
    # Compilar el modelo
    optimizer = optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def train_cnn_model(
    model,
    X_train,
    y_train,
    X_val=None,
    y_val=None,
    batch_size=32,
    epochs=10,
    data_augmentation=True,
    callbacks=None
):
    """
    Entrena un modelo CNN con los datos proporcionados
    
    Args:
        model: Modelo de Keras a entrenar
        X_train: Datos de entrenamiento
        y_train: Etiquetas de entrenamiento
        X_val: Datos de validación (opcional)
        y_val: Etiquetas de validación (opcional)
        batch_size: Tamaño del lote para entrenamiento
        epochs: Número de épocas para entrenar
        data_augmentation: Si se debe usar aumento de datos
        callbacks: Lista de callbacks para el entrenamiento
    
    Returns:
        Historial de entrenamiento
    """
    # Determinar si usar validación
    validation_data = None
    if X_val is not None and y_val is not None:
        validation_data = (X_val, y_val)
    
    # Configurar aumento de datos si está habilitado
    if data_augmentation:
        datagen = ImageDataGenerator(
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.2,
            zoom_range=0.2,
            horizontal_flip=True,
            fill_mode='nearest'
        )
        datagen.fit(X_train)
        
        # Entrenar con generador de datos
        history = model.fit(
            datagen.flow(X_train, y_train, batch_size=batch_size),
            epochs=epochs,
            validation_data=validation_data,
            callbacks=callbacks
        )
    else:
        # Entrenar sin aumento de datos
        history = model.fit(
            X_train, y_train,
            batch_size=batch_size,
            epochs=epochs,
            validation_data=validation_data,
            callbacks=callbacks
        )
    
    return history

def evaluate_cnn_model(model, X_test, y_test):
    """
    Evalúa un modelo CNN en datos de prueba
    
    Args:
        model: Modelo de Keras entrenado
        X_test: Datos de prueba
        y_test: Etiquetas de prueba
    
    Returns:
        Diccionario con métricas de evaluación
    """
    # Evaluar el modelo
    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    
    # Hacer predicciones
    y_pred = model.predict(X_test)
    y_pred_classes = np.argmax(y_pred, axis=1)
    
    # Calcular métricas adicionales
    class_report = classification_report(y_test, y_pred_classes, output_dict=True)
    conf_matrix = confusion_matrix(y_test, y_pred_classes)
    
    return {
        'loss': float(loss),
        'accuracy': float(accuracy),
        'classification_report': class_report,
        'confusion_matrix': conf_matrix.tolist()
    }

def predict_image(model, image, preprocess_func=None):
    """
    Realiza una predicción en una imagen
    
    Args:
        model: Modelo CNN entrenado
        image: Imagen a predecir (ya preprocesada)
        preprocess_func: Función de preprocesamiento opcional
    
    Returns:
        Predicción (probabilidades para cada clase)
    """
    # Asegurarse de que la imagen tiene la forma correcta
    if len(image.shape) == 3:
        # Añadir dimensión de lote si no está presente
        image = np.expand_dims(image, axis=0)
    
    # Aplicar preprocesamiento si se proporciona
    if preprocess_func is not None:
        image = preprocess_func(image)
    
    # Realizar predicción
    prediction = model.predict(image)
    
    return prediction