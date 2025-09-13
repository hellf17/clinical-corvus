from slowapi import Limiter
from slowapi.util import get_remote_address

# Single Limiter instance reused across app and routers
limiter = Limiter(key_func=get_remote_address)

