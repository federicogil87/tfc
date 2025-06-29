from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, 
    jwt_required, get_jwt_identity
)
from .models import User, Role, db
from .utils import admin_required

# Crear blueprint para rutas de autenticación
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """Endpoint para inicio de sesión"""
    if not request.is_json:
        return jsonify({"msg": "Falta JSON en la solicitud"}), 400
    
    data = request.get_json()
    username = data.get('username', None)
    password = data.get('password', None)
    
    if not username or not password:
        return jsonify({"msg": "Falta usuario o contraseña"}), 400
    
    # Verificar credenciales
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({"msg": "Credenciales incorrectas"}), 401
    
    if not user.is_active:
        return jsonify({"msg": "Cuenta desactivada. Contacte al administrador"}), 403
    
    # Crear tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    # Devolver información del usuario y tokens
    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict()
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Endpoint para renovar el token de acceso"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.is_active:
        return jsonify({"msg": "Usuario no encontrado o inactivo"}), 401
    
    new_access_token = create_access_token(identity=current_user_id)
    return jsonify({"access_token": new_access_token}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Obtener información del usuario actual"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    
    return jsonify(user.to_dict()), 200

# Rutas para administración de usuarios (solo para administradores)

@auth_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Obtener lista de usuarios (solo administradores)"""
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@auth_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """Obtener un usuario específico (solo administradores)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    
    return jsonify(user.to_dict()), 200

@auth_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """Crear un nuevo usuario (solo administradores)"""
    if not request.is_json:
        return jsonify({"msg": "Falta JSON en la solicitud"}), 400
    
    data = request.get_json()
    
    # Validar datos requeridos
    required_fields = ['username', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({"msg": f"Falta el campo '{field}'"}), 400
    
    # Verificar si el usuario ya existe
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"msg": "El nombre de usuario ya está en uso"}), 409
    
    if data.get('email') and User.query.filter_by(email=data['email']).first():
        return jsonify({"msg": "El correo electrónico ya está en uso"}), 409
    
    # Crear el nuevo usuario
    new_user = User(
        username=data['username'],
        password=data['password'],
        email=data.get('email')
    )
    
    # Asignar roles si se proporcionan
    if 'roles' in data and isinstance(data['roles'], list):
        for role_name in data['roles']:
            role = Role.query.filter_by(name=role_name).first()
            if role:
                new_user.roles.append(role)
    
    db.session.add(new_user)
    
    try:
        db.session.commit()
        return jsonify(new_user.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Error al crear el usuario: {str(e)}"}), 500

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Actualizar un usuario existente (solo administradores)"""
    if not request.is_json:
        return jsonify({"msg": "Falta JSON en la solicitud"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    
    data = request.get_json()
    
    # Actualizar campos si se proporcionan
    if 'username' in data and data['username'] != user.username:
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"msg": "El nombre de usuario ya está en uso"}), 409
        user.username = data['username']
    
    if 'email' in data and data['email'] != user.email:
        if data['email'] and User.query.filter_by(email=data['email']).first():
            return jsonify({"msg": "El correo electrónico ya está en uso"}), 409
        user.email = data['email']
    
    if 'password' in data:
        user.set_password(data['password'])
    
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    
    # Actualizar roles si se proporcionan
    if 'roles' in data and isinstance(data['roles'], list):
        # Eliminar roles actuales
        user.roles = []
        
        # Asignar nuevos roles
        for role_name in data['roles']:
            role = Role.query.filter_by(name=role_name).first()
            if role:
                user.roles.append(role)
    
    try:
        db.session.commit()
        return jsonify(user.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Error al actualizar el usuario: {str(e)}"}), 500

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Eliminar un usuario (solo administradores)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "Usuario eliminado correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Error al eliminar el usuario: {str(e)}"}), 500

@auth_bp.route('/roles', methods=['GET'])
@admin_required
def get_roles():
    """Obtener lista de roles (solo administradores)"""
    roles = Role.query.all()
    return jsonify([{
        'id': role.id,
        'name': role.name,
        'description': role.description
    } for role in roles]), 200