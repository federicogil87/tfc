from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

# Tabla de asociación para la relación muchos-a-muchos entre usuarios y roles
user_roles = db.Table('user_roles',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True)
)

class Role(db.Model):
    __tablename__ = 'roles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    
    def __init__(self, name, description=None):
        self.name = name
        self.description = description
    
    def __repr__(self):
        return f'<Role {self.name}>'

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(100), unique=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relación con roles
    roles = db.relationship('Role', secondary=user_roles, 
                            backref=db.backref('users', lazy='dynamic'))
    
    def __init__(self, username, password, email=None):
        self.username = username
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        self.email = email
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def has_role(self, role_name):
        """Verifica si el usuario tiene un rol específico"""
        return any(role.name == role_name for role in self.roles)
    
    def to_dict(self):
        """Convierte el usuario a un diccionario (sin incluir la contraseña)"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_active': self.is_active,
            'roles': [role.name for role in self.roles],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# Función para crear roles y usuarios iniciales
def create_initial_data():
    """Crea roles y usuarios predeterminados si no existen"""
    # Crear roles si no existen
    admin_role = Role.query.filter_by(name='Administrador').first()
    if not admin_role:
        admin_role = Role(name='Administrador', 
                         description='Acceso completo a la administración de usuarios')
        db.session.add(admin_role)
    
    testing_role = Role.query.filter_by(name='Testing').first()
    if not testing_role:
        testing_role = Role(name='Testing', 
                           description='Acceso a entrenamiento y predicción con datos de prueba')
        db.session.add(testing_role)
    
    user_role = Role.query.filter_by(name='Usuario').first()
    if not user_role:
        user_role = Role(name='Usuario', 
                        description='Acceso a entrenamiento y predicción con datos reales')
        db.session.add(user_role)
    
    # Confirmar cambios para que los roles estén disponibles
    db.session.commit()
    
    # Crear usuarios si no existen
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        admin_user = User(username='admin', password='123456', email='admin@example.com')
        admin_user.roles.append(admin_role)
        db.session.add(admin_user)
    
    test_user = User.query.filter_by(username='test').first()
    if not test_user:
        test_user = User(username='test', password='123456', email='test@example.com')
        test_user.roles.append(testing_role)
        db.session.add(test_user)
    
    normal_user = User.query.filter_by(username='usuario').first()
    if not normal_user:
        normal_user = User(username='usuario', password='123456', email='usuario@example.com')
        normal_user.roles.append(user_role)
        db.session.add(normal_user)
    
    db.session.commit()