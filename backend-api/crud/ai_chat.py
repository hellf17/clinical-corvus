from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

from database.models import AIChatConversation, AIChatMessage
import schemas.ai_chat as ai_chat_schemas

# Função auxiliar para converter qualquer tipo de ID para string
def safe_id_to_string(id_value):
    if id_value is None:
        return None
    try:
        return str(id_value)
    except Exception:
        return str(id_value) if id_value else None

# Conversation CRUD operations
def get_conversations(
    db: Session, 
    patient_id: Union[UUID, int, str], 
    skip: int = 0,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Get all AI chat conversations for a patient with message count.
    """
    # Handle patient_id type conversion if needed
    if isinstance(patient_id, str):
        try:
            patient_id = UUID(patient_id)
        except ValueError:
            try:
                patient_id = int(patient_id)
            except ValueError:
                pass
    
    # This query gets conversations with a count of messages
    conversations_with_count = db.query(
        AIChatConversation,
        func.count(AIChatMessage.id).label('message_count')
    ).outerjoin(
        AIChatMessage, 
        AIChatConversation.id == AIChatMessage.conversation_id
    ).filter(
        AIChatConversation.patient_id == patient_id
    ).group_by(
        AIChatConversation.id
    ).order_by(
        AIChatConversation.updated_at.desc()
    ).offset(skip).limit(limit).all()
    
    # Convert to a list of dictionaries with conversation and message_count
    result = []
    for conversation, message_count in conversations_with_count:
        conversation_dict = {
            "id": safe_id_to_string(conversation.id),
            "title": conversation.title,
            "patient_id": safe_id_to_string(conversation.patient_id),
            "user_id": safe_id_to_string(conversation.user_id),
            "created_by": safe_id_to_string(conversation.user_id),  # Add created_by for backward compatibility
            "last_message_content": conversation.last_message_content,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
            "message_count": message_count
        }
        result.append(conversation_dict)
    
    return result

def get_conversations_by_user(
    db: Session, 
    user_id: Union[UUID, int, str], 
    skip: int = 0,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Get all AI chat conversations for a user with message count.
    """
    # Handle user_id type conversion if needed
    if isinstance(user_id, str):
        try:
            user_id = UUID(user_id)
        except ValueError:
            try:
                user_id = int(user_id)
            except ValueError:
                pass
    
    # This query gets conversations with a count of messages
    conversations_with_count = db.query(
        AIChatConversation,
        func.count(AIChatMessage.id).label('message_count')
    ).outerjoin(
        AIChatMessage, 
        AIChatConversation.id == AIChatMessage.conversation_id
    ).filter(
        AIChatConversation.user_id == user_id
    ).group_by(
        AIChatConversation.id
    ).order_by(
        AIChatConversation.updated_at.desc()
    ).offset(skip).limit(limit).all()
    
    # Convert to a list of dictionaries with conversation and message_count
    result = []
    for conversation, message_count in conversations_with_count:
        conversation_dict = {
            "id": safe_id_to_string(conversation.id),
            "title": conversation.title,
            "patient_id": safe_id_to_string(conversation.patient_id),
            "user_id": safe_id_to_string(conversation.user_id),
            "created_by": safe_id_to_string(conversation.user_id),  # Add created_by for backward compatibility
            "last_message_content": conversation.last_message_content,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
            "message_count": message_count
        }
        result.append(conversation_dict)
    
    return result

def get_conversation(db: Session, conversation_id: UUID) -> Optional[AIChatConversation]:
    """
    Get a specific conversation by ID.
    """
    return db.query(AIChatConversation).filter(AIChatConversation.id == conversation_id).first()

def get_conversation_with_messages(db: Session, conversation_id: UUID) -> Optional[AIChatConversation]:
    """
    Get a specific conversation by ID with all its messages.
    """
    return db.query(AIChatConversation).options(
        joinedload(AIChatConversation.messages)
    ).filter(
        AIChatConversation.id == conversation_id
    ).first()

def create_conversation(
    db: Session, 
    conversation: ai_chat_schemas.AIChatConversationCreate, 
    user_id: UUID,
    patient_id: Union[UUID, int] = None
) -> AIChatConversation:
    """
    Create a new AI chat conversation.
    
    Args:
        db: Database session
        conversation: Conversation data in Pydantic model
        user_id: User ID of the creator
        patient_id: Optional patient ID (will override the one in conversation)
        
    Returns:
        Created AIChatConversation instance
    """
    # Convert Pydantic model to dict, handle both Pydantic v1 and v2
    try:
        # Try Pydantic v2 approach first
        conversation_data = conversation.model_dump(exclude={"initial_message"})
    except AttributeError:
        # Fall back to Pydantic v1 approach
        conversation_data = conversation.dict(exclude={"initial_message"})
    
    # Add user ID
    conversation_data["user_id"] = user_id
    
    # Override patient_id if provided
    if patient_id is not None:
        conversation_data["patient_id"] = patient_id
    
    # Ensure title is set
    if not conversation_data.get("title"):
        conversation_data["title"] = "New Conversation"
    
    # Create the conversation
    db_conversation = AIChatConversation(**conversation_data)
    
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    
    # If an initial message was provided, create it
    if conversation.initial_message:
        initial_message = AIChatMessage(
            conversation_id=db_conversation.id,
            role="user",
            content=conversation.initial_message
        )
        db.add(initial_message)
        
        # Update the conversation's last message
        db_conversation.last_message_content = conversation.initial_message
        db.commit()
        db.refresh(db_conversation)
    
    return db_conversation

def update_conversation(
    db: Session, 
    conversation_id: UUID, 
    conversation_data: Union[ai_chat_schemas.AIChatConversationUpdate, Dict[str, Any]]
) -> Optional[AIChatConversation]:
    """
    Update an existing AI chat conversation.
    
    Args:
        db: Database session
        conversation_id: ID of the conversation to update
        conversation_data: Either a Pydantic model or a dictionary with fields to update
        
    Returns:
        Updated AIChatConversation instance or None if conversation not found
    """
    # Get the existing conversation
    db_conversation = get_conversation(db, conversation_id=conversation_id)
    
    if db_conversation is None:
        return None
    
    # Extract update data based on input type
    if hasattr(conversation_data, 'model_dump'):
        # Try Pydantic v2 approach first
        try:
            update_data = conversation_data.model_dump(exclude_unset=True)
        except TypeError:
            # Fall back to v2 without exclude_unset if not supported
            update_data = conversation_data.model_dump()
    elif hasattr(conversation_data, 'dict'):
        # Fall back to Pydantic v1 approach
        try:
            update_data = conversation_data.dict(exclude_unset=True)
        except TypeError:
            # Fall back to v1 without exclude_unset if not supported
            update_data = conversation_data.dict()
    else:
        # It's a regular dict
        update_data = conversation_data
    
    # Apply the updates
    for key, value in update_data.items():
        setattr(db_conversation, key, value)
    
    # Update the timestamp
    db_conversation.updated_at = datetime.now()
    
    db.commit()
    db.refresh(db_conversation)
    
    return db_conversation

def delete_conversation(db: Session, conversation_id: UUID) -> bool:
    """
    Delete a conversation.
    Returns True if the conversation was deleted, False if it wasn't found.
    """
    db_conversation = get_conversation(db, conversation_id=conversation_id)
    
    if db_conversation is None:
        return False
    
    db.delete(db_conversation)
    db.commit()
    
    return True

# Message CRUD operations
def get_messages(db: Session, conversation_id: UUID) -> List[AIChatMessage]:
    """
    Get all messages for a conversation.
    """
    return db.query(AIChatMessage).filter(
        AIChatMessage.conversation_id == conversation_id
    ).order_by(AIChatMessage.created_at.asc()).all()

# Alias for backward compatibility
def get_messages_by_conversation(db: Session, conversation_id: UUID) -> List[AIChatMessage]:
    """
    Alias for get_messages, for backward compatibility.
    """
    return get_messages(db, conversation_id)

def create_message(
    db: Session, 
    message: Union[ai_chat_schemas.AIChatMessageCreate, Dict[str, Any]] = None,
    conversation_id: UUID = None,
    message_data: Dict[str, Any] = None
) -> AIChatMessage:
    """
    Create a new AI chat message.
    
    Args:
        db: Database session
        message: AIChatMessageCreate Pydantic model (optional)
        conversation_id: Conversation ID (optional, can be provided in message or directly)
        message_data: Dictionary with message data (optional, alternative to message)
        
    Returns:
        Created AIChatMessage instance
    """
    # Allow multiple ways to provide the message data
    if message is None and message_data is not None:
        # Use the provided message_data dictionary
        data = message_data.copy()
        # Add conversation_id if provided
        if conversation_id is not None:
            data["conversation_id"] = conversation_id
    elif message is not None:
        # Use the Pydantic model - handle both v1 and v2 compatibility
        try:
            # Try Pydantic v2 approach first
            data = message.model_dump()
        except AttributeError:
            # Fall back to Pydantic v1 approach
            data = message.dict()
            
        # Add conversation_id if provided and not in the model
        if conversation_id is not None and "conversation_id" not in data:
            data["conversation_id"] = conversation_id
    else:
        # Neither message nor message_data provided
        data = {"conversation_id": conversation_id, "role": "user", "content": ""}
    
    # Create the message
    db_message = AIChatMessage(**data)
    db.add(db_message)
    
    # Update the conversation's last message content and timestamp
    if "content" in data and data["content"]:
        conversation = get_conversation(db, conversation_id=data["conversation_id"])
        if conversation:
            conversation.last_message_content = data["content"]
            conversation.updated_at = datetime.now()
    
    db.commit()
    db.refresh(db_message)
    
    return db_message

def send_message(
    db: Session,
    conversation_id: UUID,
    message_request: ai_chat_schemas.SendMessageRequest
) -> AIChatMessage:
    """
    Send a message in a conversation.
    """
    # Obter o conteúdo da mensagem
    content = message_request.get_message_content()
    
    # Create a message
    message = ai_chat_schemas.AIChatMessageCreate(
        conversation_id=conversation_id,
        role=message_request.role,
        content=content,
        message_metadata=message_request.message_metadata
    )
    
    return create_message(db, message=message)

def get_conversations_by_patient(db: Session, patient_id: int) -> List[AIChatConversation]:
    """
    Get all AI chat conversations for a specific patient.
    This is an alias for get_conversations to maintain backward compatibility.
    
    Args:
        db: Database session
        patient_id: ID of the patient
        
    Returns:
        List of AIChatConversation objects for the specified patient
    """
    return db.query(AIChatConversation).filter(
        AIChatConversation.patient_id == patient_id
    ).order_by(AIChatConversation.created_at.desc()).all()

def get_message(db: Session, message_id: UUID) -> Optional[AIChatMessage]:
    """
    Get a specific message by ID.
    """
    return db.query(AIChatMessage).filter(AIChatMessage.id == message_id).first()

def delete_message(db: Session, message_id: UUID) -> bool:
    """
    Delete a message.
    
    Returns:
        bool: True if deletion was successful, False if message not found.
    """
    db_message = get_message(db, message_id=message_id)
    
    if db_message:
        db.delete(db_message)
        db.commit()
        return True
    
    return False