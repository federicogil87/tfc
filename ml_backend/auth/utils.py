from functools import wraps
from flask import jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

def role_required(role_names):
    """
    Decorador para verificar si el usuario tiene uno de los roles especificados
    
    Args:
        role_names: Un rol o lista de roles permitidos
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Verificar token JWT
            verify_jwt_in_request()
            
            # Obtener identidad del usuario del token
            current_user_id = get_jwt_identity()
            
            # Importar modelos aquí para evitar importaciones circulares
            from .models import User
            
            # Buscar el usuario en la base de datos
            user = User.query.get(current_user_id)
            if not user:
                return jsonify({"msg": "Usuario no encontrado"}), 404
            
            # Convertir role_names a lista si es un string
            roles = [role_names] if isinstance(role_names, str) else role_names
            
            # Verificar si el usuario tiene al menos uno de los roles requeridos
            if not any(user.has_role(role) for role in roles):
                return jsonify({
                    "msg": "Acceso denegado. Se requiere uno de los siguientes roles: " + 
                           ", ".join(roles)
                }), 403
            
            # Si el usuario tiene los roles adecuados, continuar con la función
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def admin_required(fn):
    """Decorador para requerir rol de administrador"""
    return role_required('Administrador')(fn)

def testing_required(fn):
    """Decorador para requerir rol de testing"""
    return role_required('Testing')(fn)

def user_required(fn):
    """Decorador para requerir rol de usuario"""
    return role_required('Usuario')(fn)

def validate_file_extension(filename, allowed_extensions):
    """Valida que la extensión del archivo sea permitida"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def secure_filename(filename):
    """
    Asegura que el nombre del archivo sea seguro eliminando caracteres peligrosos
    y limitando la longitud
    """
    # Eliminamos caracteres potencialmente peligrosos
    import re
    import uuid
    from werkzeug.utils import secure_filename as werkzeug_secure_filename
    
    # Primero utilizamos la función de Werkzeug
    secure_name = werkzeug_secure_filename(filename)
    
    # Agregamos un UUID para evitar colisiones
    name_parts = secure_name.rsplit('.', 1)
    if len(name_parts) > 1:
        # Si tiene extensión
        base_name, extension = name_parts
        new_name = f"{base_name}_{uuid.uuid4().hex[:8]}.{extension}"
    else:
        # Si no tiene extensión
        new_name = f"{secure_name}_{uuid.uuid4().hex[:8]}"
    
    return new_name