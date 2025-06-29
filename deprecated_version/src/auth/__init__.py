"""
Authentication module for Clinical Helper.
Provides functions for user authentication using Google OAuth.
"""

import streamlit as st
from src.auth.google_oauth import GoogleOAuth
from src.auth.callback_handler import handle_oauth_callback
import logging

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

__all__ = [
    'GoogleOAuth',
    'handle_oauth_callback'
]

def initialize_auth():
    """Initialize the OAuth2 component for Google authentication."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.environ.get("REDIRECT_URI", "http://localhost:8501/")
    
    if not client_id or not client_secret:
        logger.warning("Google OAuth credentials not found in environment variables.")
        return None
    
    # Google OAuth endpoints
    authorize_endpoint = "https://accounts.google.com/o/oauth2/v2/auth"
    access_token_endpoint = "https://oauth2.googleapis.com/token"
    refresh_token_endpoint = "https://oauth2.googleapis.com/token"
    revoke_endpoint = "https://oauth2.googleapis.com/revoke"
    
    # Create the OAuth2 client with auth methods
    oauth2_client = OAuth2(
        client_id=client_id,
        client_secret=client_secret,
        authorize_endpoint=authorize_endpoint,
        access_token_endpoint=access_token_endpoint,
        refresh_token_endpoint=refresh_token_endpoint,
        revoke_token_endpoint=revoke_endpoint,
        token_endpoint_auth_method="client_secret_post",
        revocation_endpoint_auth_method="client_secret_post"
    )
    
    # Initialize OAuth2 component with the OAuth2 client
    oauth2 = OAuth2Component(
        client_id,
        client_secret,
        authorize_endpoint,
        access_token_endpoint,
        refresh_token_endpoint,
        revoke_token_endpoint=revoke_endpoint,
        client=oauth2_client
    )
    
    return oauth2

def setup_auth_state():
    """Set up authentication state in Streamlit session."""
    if 'token' not in st.session_state:
        st.session_state.token = None
    if 'user_info' not in st.session_state:
        st.session_state.user_info = None
    if 'user_id' not in st.session_state:
        st.session_state.user_id = None
    if 'is_authenticated' not in st.session_state:
        st.session_state.is_authenticated = False
    if 'token_expiry' not in st.session_state:
        st.session_state.token_expiry = None

def handle_authentication(oauth2):
    """Handle the authentication flow with Google OAuth."""
    if not oauth2:
        st.error("Serviço de autenticação não está disponível. Verifique a configuração.")
        return False
    
    # Check if token is expired
    if st.session_state.token and st.session_state.token_expiry:
        if datetime.now() > st.session_state.token_expiry:
            # Token is expired, clear the authentication state
            logout()
    
    # If already authenticated, return
    if st.session_state.is_authenticated and st.session_state.user_info:
        return True
    
    redirect_uri = os.environ.get("REDIRECT_URI", "http://localhost:8501/")
    
    # Display login button and handle authentication flow
    authorization_result = oauth2.authorize_button(
        name="Login com Google",
        redirect_uri=redirect_uri,
        scope="openid profile email"
    )
    
    if authorization_result:
        if "token" in authorization_result:
            # Store token and set expiry (1 hour from now)
            st.session_state.token = authorization_result["token"]
            st.session_state.token_expiry = datetime.now() + timedelta(hours=1)
            
            # Get user info
            user_info = get_user_info(authorization_result["token"])
            if user_info and "email" in user_info:
                st.session_state.user_info = user_info
                st.session_state.is_authenticated = True
                logger.info(f"User authenticated: {user_info['email']}")
                st.rerun()
            else:
                st.error("Falha ao obter informações do usuário.")
                return False
        else:
            st.error("Falha na autenticação.")
            return False
    
    return False

def get_user_info(token):
    """Get user information from Google using the access token."""
    access_token = token
    if not access_token:
        logger.error("No access token found")
        return None
        
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    try:
        response = requests.get(
            "https://www.googleapis.com/oauth2/v1/userinfo",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to get user info: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error in user info request: {str(e)}")
        return None

def logout():
    """Log out the user by clearing session state."""
    if 'token' in st.session_state:
        del st.session_state.token
    if 'user_info' in st.session_state:
        del st.session_state.user_info
    if 'user_id' in st.session_state:
        del st.session_state.user_id
    if 'token_expiry' in st.session_state:
        del st.session_state.token_expiry
    
    st.session_state.is_authenticated = False
    
    logger.info("User logged out.") 