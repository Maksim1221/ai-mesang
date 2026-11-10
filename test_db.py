from database import *
from auth import AuthManager

auth = AuthManager()
init_db()
print('DB OK')

uid = create_user('', 'testuser', auth.hash_password('test123'))
print(f'Created: {uid}')

u = get_user_by_username('testuser')
print(f'User: {dict(u)}')
