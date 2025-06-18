import os
import streamlit as st
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import pickle
from pathlib import Path
import logging

# Set up logging (add this near the top imports)
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

# OAuth scopes required for the application
SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
]

def create_flow(redirect_uri=None):
    """Create OAuth flow with proper configuration."""
    client_config = {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri] if redirect_uri else []
        }
    }
    
    # Create the flow using the client config
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    return flow

def get_auth_url():
    """Generate the authorization URL for Google OAuth."""
    # Get the base URL from Streamlit or environment
    if os.getenv("STREAMLIT_BASE_URL"):
        base_url = os.getenv("STREAMLIT_BASE_URL")
    else:
        # For local development - always use localhost instead of 0.0.0.0
        base_url = "http://localhost:8501"
    
    # Construct the redirect URI
    redirect_uri = f"{base_url}/callback"
    
    # Create the OAuth flow
    flow = create_flow(redirect_uri)
    
    # Generate the authorization URL
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    return auth_url, redirect_uri

def get_user_info(credentials):
    """Get user information from Google API."""
    user_info_service = build('oauth2', 'v2', credentials=credentials)
    user_info = user_info_service.userinfo().get().execute()
    return user_info

def process_callback(code, redirect_uri):
    """Process the callback from Google OAuth."""
    # Log the received code immediately upon entry
    logger.debug(f"process_callback received code (full): {code}") 
    logger.info(f"Processing callback with redirect_uri: {redirect_uri}")
    try:
        # Create the flow with the redirect URI
        logger.info("Creating flow for token exchange...")
        flow = create_flow(redirect_uri)
        logger.info("Flow created successfully.")
        
        # Exchange the authorization code for credentials
        logger.info("Attempting to fetch token...")
        # logger.debug(f"Using authorization code (full): {code}") # Keep this too for comparison
        flow.fetch_token(code=code)
        logger.info("Token fetched successfully.")
        
        # Get the credentials
        credentials = flow.credentials
        logger.info("Credentials obtained.")
        
        # Get user info
        logger.info("Fetching user info...")
        user_info = get_user_info(credentials)
        logger.info(f"User info fetched: {user_info.get('email')}")
        
        # Store the credentials in session state
        st.session_state["google_oauth_credentials"] = credentials.to_json()
        st.session_state["user"] = user_info
        st.session_state["authenticated"] = True
        st.session_state["email"] = user_info.get("email")
        st.session_state["name"] = user_info.get("name")
        logger.info("Session state updated successfully.")
        
        return True, user_info
        
    except Exception as e:
        logger.error(f"Error during token exchange or user info fetch: {e}", exc_info=True)
        return False, str(e)

class GoogleOAuth:
    """Main class for Google OAuth authentication in Streamlit."""
    
    @staticmethod
    def login_button(text="Login with Google", key="google_login"):
        """Display a Google login button."""
        # Generate the authorization URL
        auth_url, redirect_uri = get_auth_url()
        
        # Store the redirect URI in session state for the callback
        st.session_state["redirect_uri"] = redirect_uri
        
        # Create the login button
        login_clicked = st.button(text, key=key)
        
        if login_clicked:
            # Redirect the user to the Google authorization URL
            st.markdown(f'<meta http-equiv="refresh" content="0;URL=\'{auth_url}\'">', unsafe_allow_html=True)
    
    @staticmethod
    def handle_callback():
        """Handle the OAuth callback."""
        logger.info("Handling OAuth callback...")
        # Get the query parameters using the new method
        query_params = st.query_params
        logger.info(f"Query parameters received: {query_params}")
        
        # Check if there's an authorization code
        if "code" in query_params:
            # Based on logs, query_params["code"] seems to be the string directly
            raw_code = query_params["code"] 
            logger.debug(f"Type of query_params['code'] (raw_code): {type(raw_code)}, Value: {raw_code}")
            
            if isinstance(raw_code, str):
                # Explicitly clean the code string
                code = raw_code.strip() # Ensure it's a string and remove whitespace
                logger.info(f"Authorization code found and cleaned: {code[:10]}..." if code else "Code key exists but is empty")
            else:
                # Log an error if it's not a string as expected from logs
                logger.error(f"Unexpected type for query_params['code']: {type(raw_code)}. Value: {raw_code}")
                code = None # Set code to None if type is wrong

            # Recalculate the redirect_uri instead of relying on session state
            _, redirect_uri = get_auth_url() # Use the function to get the expected URI
            logger.info(f"Recalculated Redirect URI for callback: {redirect_uri}")
            
            if redirect_uri and code: # Make sure code is not None and is a non-empty string
                # Process the callback
                logger.debug(f"Code value JUST BEFORE calling process_callback: {code}") 
                logger.info("Calling process_callback...")
                success, user_info_or_error = process_callback(code, redirect_uri)
                
                if success:
                    logger.info("process_callback successful. Clearing query parameters.")
                    # Clear the query parameters to avoid reprocessing
                    st.query_params.clear()
                    logger.info("handle_callback returning True.")
                    return True
                else:
                    logger.error(f"process_callback failed: {user_info_or_error}")
                    # Display error on the callback page itself
                    st.error(f"Authentication processing failed: {user_info_or_error}") 
            else:
                # This case should theoretically not happen now
                logger.error("Failed to recalculate Redirect URI during callback.")
                st.error("Internal error: Could not determine Redirect URI.")
        else:
            # Log if other error parameters are present
            if "error" in query_params:
                error_code = query_params.get("error", ["Unknown"])[0]
                error_desc = query_params.get("error_description", ["No description"])[0]
                logger.error(f"OAuth error received from Google in query parameters: {error_code} - {error_desc}")
                st.error(f"OAuth Error: {error_code} - {error_desc}")
            else:
                 logger.warning("Authorization code ('code') not found in query parameters.")
                 # Might happen if user cancels the auth
                 st.warning("Login process cancelled or incomplete.") 
        
        logger.warning("handle_callback returning False.")
        # Add a button to retry login from the callback page if it fails
        st.button("Voltar para Login") # This button doesn't do much on its own, 
                                       # but gives the user an action if stuck here.
                                       # A better approach might be redirecting back to main.
        return False
    
    @staticmethod
    def is_authenticated():
        """Check if the user is authenticated."""
        return st.session_state.get("authenticated", False)
    
    @staticmethod
    def logout():
        """Log out the user."""
        if "google_oauth_credentials" in st.session_state:
            del st.session_state["google_oauth_credentials"]
        if "user" in st.session_state:
            del st.session_state["user"]
        if "authenticated" in st.session_state:
            del st.session_state["authenticated"]
        if "email" in st.session_state:
            del st.session_state["email"]
        if "name" in st.session_state:
            del st.session_state["name"]
        if "redirect_uri" in st.session_state:
            del st.session_state["redirect_uri"] 