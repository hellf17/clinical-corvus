import streamlit as st
from src.auth.google_oauth import GoogleOAuth

def handle_oauth_callback():
    """
    Handle the OAuth callback from Google.
    This needs to be called from a page that receives the OAuth redirect.
    """
    # Initialize session state if needed
    if "authenticated" not in st.session_state:
        st.session_state["authenticated"] = False

    # Check if there's a callback to process
    success = GoogleOAuth.handle_callback()
    
    if success:
        st.success("Authentication successful!")
        # Use st.rerun() for a more Streamlit-native redirect
        st.rerun()
        # The following lines are no longer needed after st.rerun()
        # st.markdown(
        #     f'<meta http-equiv="refresh" content="2;URL=\'{st.session_state.get("app_url", "/")}\'">', 
        #     unsafe_allow_html=True
        # )
        # st.write("Redirecting to app...")
    else:
        # Show the login button again if authentication failed
        # Error message is now shown within handle_callback/process_callback
        st.warning("Authentication process failed or was cancelled.")
        if st.button("Try Login Again"):
            # Redirect to the main page to initiate login
             st.switch_page("main.py") # Requires Streamlit 1.30+
             # For older versions, you might need JS or a different approach 