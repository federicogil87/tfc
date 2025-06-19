import numpy as np
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso, LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    mean_squared_error, mean_absolute_error, r2_score, 
    classification_report, confusion_matrix
)

def create_svm_model(
    problem_type='classification',
    kernel='rbf',
    C=1.0,
    gamma='scale',
    **kwargs
):
    """
    Crea un modelo SVM (Support Vector Machine)
    
    Args:
        problem_type: 'classification' o 'regression'
        kernel: 'linear', 'poly', 'rbf', 'sigmoid'
        C: Parámetro de regularización
        gamma: Coeficiente del kernel
        **kwargs: Parámetros adicionales para SVC/SVR
    
    Returns:
        Modelo SVM
    """
    if problem_type == 'classification':
        return SVC(
            kernel=kernel,
            C=C,
            gamma=gamma,
            probability=True,
            **kwargs
        )
    else:
        return SVR(
            kernel=kernel,
            C=C,
            gamma=gamma,
            **kwargs
        )

def create_knn_model(
    problem_type='classification',
    n_neighbors=5,
    weights='uniform',
    algorithm='auto',
    **kwargs
):
    """
    Crea un modelo k-NN (k-Nearest Neighbors)
    
    Args:
        problem_type: 'classification' o 'regression'
        n_neighbors: Número de vecinos
        weights: 'uniform' o 'distance'
        algorithm: 'auto', 'ball_tree', 'kd_tree', o 'brute'
        **kwargs: Parámetros adicionales para KNeighborsClassifier/KNeighborsRegressor
    
    Returns:
        Modelo k-NN
    """
    if problem_type == 'classification':
        return KNeighborsClassifier(
            n_neighbors=n_neighbors,
            weights=weights,
            algorithm=algorithm,
            **kwargs
        )
    else:
        return KNeighborsRegressor(
            n_neighbors=n_neighbors,
            weights=weights,
            algorithm=algorithm,
            **kwargs
        )

def create_random_forest_model(
    problem_type='classification',
    n_estimators=100,
    max_depth=None,
    min_samples_split=2,
    min_samples_leaf=1,
    **kwargs
):
    """
    Crea un modelo Random Forest
    
    Args:
        problem_type: 'classification' o 'regression'
        n_estimators: Número de árboles
        max_depth: Profundidad máxima de los árboles
        min_samples_split: Mínimo de muestras para dividir un nodo
        min_samples_leaf: Mínimo de muestras en cada hoja
        **kwargs: Parámetros adicionales para RandomForestClassifier/RandomForestRegressor
    
    Returns:
        Modelo Random Forest
    """
    if problem_type == 'classification':
        return RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            min_samples_leaf=min_samples_leaf,
            **kwargs
        )
    else:
        return RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            min_samples_leaf=min_samples_leaf,
            **kwargs
        )

def create_linear_model(
    problem_type='regression',
    model_type='simple',
    alpha=1.0,
    **kwargs
):
    """
    Crea un modelo de regresión lineal
    
    Args:
        problem_type: 'regression' o 'classification'
        model_type: 'simple', 'ridge', 'lasso'
        alpha: Parámetro de regularización para Ridge y Lasso
        **kwargs: Parámetros adicionales
    
    Returns:
        Modelo de regresión lineal
    """
    if problem_type == 'regression':
        if model_type == 'ridge':
            return Ridge(alpha=alpha, **kwargs)
        elif model_type == 'lasso':
            return Lasso(alpha=alpha, **kwargs)
        else:  # simple
            return LinearRegression(**kwargs)
    else:  # classification
        return LogisticRegression(C=1/alpha if alpha > 0 else 1.0, **kwargs)

def train_model(model, X_train, y_train):
    """
    Entrena un modelo con los datos proporcionados
    
    Args:
        model: Modelo a entrenar
        X_train: Datos de entrenamiento
        y_train: Etiquetas de entrenamiento
    
    Returns:
        Modelo entrenado
    """
    model.fit(X_train, y_train)
    return model

def evaluate_classification_model(model, X_test, y_test):
    """
    Evalúa un modelo de clasificación
    
    Args:
        model: Modelo entrenado
        X_test: Datos de prueba
        y_test: Etiquetas de prueba
    
    Returns:
        Diccionario con métricas de evaluación
    """
    # Hacer predicciones
    y_pred = model.predict(X_test)
    
    # Calcular métricas
    accuracy = accuracy_score(y_test, y_pred)
    
    # Intentar calcular precision, recall y f1
    try:
        precision = precision_score(y_test, y_pred, average='weighted')
        recall = recall_score(y_test, y_pred, average='weighted')
        f1 = f1_score(y_test, y_pred, average='weighted')
    except:
        # En caso de error (por ejemplo, para regresión)
        precision = recall = f1 = None
    
    # Crear informe de clasificación
    class_report = classification_report(y_test, y_pred, output_dict=True)
    
    # Crear matriz de confusión
    conf_matrix = confusion_matrix(y_test, y_pred)
    
    return {
        'accuracy': float(accuracy),
        'precision': float(precision) if precision is not None else None,
        'recall': float(recall) if recall is not None else None,
        'f1': float(f1) if f1 is not None else None,
        'classification_report': class_report,
        'confusion_matrix': conf_matrix.tolist()
    }

def evaluate_regression_model(model, X_test, y_test):
    """
    Evalúa un modelo de regresión
    
    Args:
        model: Modelo entrenado
        X_test: Datos de prueba
        y_test: Etiquetas de prueba
    
    Returns:
        Diccionario con métricas de evaluación
    """
    # Hacer predicciones
    y_pred = model.predict(X_test)
    
    # Calcular métricas
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    return {
        'mse': float(mse),
        'rmse': float(rmse),
        'mae': float(mae),
        'r2': float(r2)
    }

def predict(model, X):
    """
    Realiza predicciones con un modelo entrenado
    
    Args:
        model: Modelo entrenado
        X: Datos para predecir
    
    Returns:
        Predicciones
    """
    # Verificar si el modelo tiene el método predict_proba (para clasificación)
    if hasattr(model, 'predict_proba'):
        try:
            # Intentar obtener probabilidades
            probs = model.predict_proba(X)
            return {
                'predictions': model.predict(X).tolist(),
                'probabilities': probs.tolist()
            }
        except:
            # Si falla, solo devolver predicciones
            return {
                'predictions': model.predict(X).tolist()
            }
    else:
        # Para modelos de regresión
        return {
            'predictions': model.predict(X).tolist()
        }

def get_feature_importance(model, feature_names=None):
    """
    Obtiene la importancia de las características de un modelo, si está disponible
    
    Args:
        model: Modelo entrenado
        feature_names: Nombres de las características
    
    Returns:
        Diccionario con importancias o None si no está disponible
    """
    # Modelos que tienen importancia de características
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        
        if feature_names is not None and len(feature_names) == len(importances):
            return dict(zip(feature_names, importances.tolist()))
        else:
            return {'importances': importances.tolist()}
    
    # Modelos lineales con coeficientes
    elif hasattr(model, 'coef_'):
        coefs = model.coef_
        
        # Manejar diferentes formas de coeficientes
        if len(coefs.shape) > 1 and coefs.shape[0] == 1:
            coefs = coefs[0]  # Para modelos como Ridge que tienen forma (1, n_features)
        
        if feature_names is not None and len(feature_names) == len(coefs):
            return dict(zip(feature_names, coefs.tolist()))
        else:
            return {'coefficients': coefs.tolist()}
    
    # Si el modelo no proporciona importancia de características
    return None