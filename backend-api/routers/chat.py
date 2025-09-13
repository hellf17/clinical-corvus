from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database import get_db
from security import get_current_user_required
from database.models import User as UserModel
from crud import ai_chat, patients, crud_lab_result, is_doctor_assigned_to_patient
from crud import medication, clinical_note
import schemas.ai_chat as ai_chat_schemas

router = APIRouter()

@router.get("/conversations", response_model=ai_chat_schemas.AIChatConversationList)
async def get_conversations(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Get all conversations for the current user.
    """
    try:
        conversations = ai_chat.get_conversations_by_user(
            db=db, 
            user_id=current_user.user_id, 
            skip=skip, 
            limit=limit
        )
        
        return ai_chat_schemas.AIChatConversationList(
            conversations=conversations,
            total=len(conversations)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch conversations: {str(e)}"
        )

@router.post("/conversations", response_model=ai_chat_schemas.AIChatConversation, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation: ai_chat_schemas.AIChatConversationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Create a new conversation.
    """
    try:
        db_conversation = ai_chat.create_conversation(
            db=db,
            conversation=conversation,
            user_id=current_user.user_id
        )
        
        # Convert to response model
        return ai_chat_schemas.AIChatConversation(
            id=db_conversation.id,
            title=db_conversation.title,
            patient_id=db_conversation.patient_id,
            user_id=db_conversation.user_id,
            created_by=db_conversation.created_by,
            last_message_content=db_conversation.last_message_content,
            created_at=db_conversation.created_at,
            updated_at=db_conversation.updated_at,
            metadata=db_conversation.metadata,
            messages=[]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )

@router.get("/conversations/{conversation_id}", response_model=ai_chat_schemas.AIChatConversation)
async def get_conversation(
    conversation_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Get a specific conversation by ID.
    """
    try:
        db_conversation = ai_chat.get_conversation_with_messages(db, conversation_id)
        
        if not db_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user has access to this conversation
        if db_conversation.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Convert messages to response format
        messages = []
        for msg in db_conversation.messages:
            messages.append(ai_chat_schemas.AIChatMessage(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                message_metadata=msg.message_metadata,
                created_at=msg.created_at
            ))
        
        return ai_chat_schemas.AIChatConversation(
            id=db_conversation.id,
            title=db_conversation.title,
            patient_id=db_conversation.patient_id,
            user_id=db_conversation.user_id,
            created_by=db_conversation.created_by,
            last_message_content=db_conversation.last_message_content,
            created_at=db_conversation.created_at,
            updated_at=db_conversation.updated_at,
            metadata=db_conversation.metadata,
            messages=messages
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch conversation: {str(e)}"
        )

@router.patch("/conversations/{conversation_id}", response_model=ai_chat_schemas.AIChatConversation)
async def update_conversation(
    conversation_id: UUID,
    conversation_update: ai_chat_schemas.AIChatConversationUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Update an existing conversation.
    """
    try:
        # Check if user has access to this conversation
        db_conversation = ai_chat.get_conversation(db, conversation_id)
        if not db_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        if db_conversation.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        updated_conversation = ai_chat.update_conversation(
            db=db,
            conversation_id=conversation_id,
            conversation_data=conversation_update
        )
        
        if not updated_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return ai_chat_schemas.AIChatConversation(
            id=updated_conversation.id,
            title=updated_conversation.title,
            patient_id=updated_conversation.patient_id,
            user_id=updated_conversation.user_id,
            created_by=updated_conversation.created_by,
            last_message_content=updated_conversation.last_message_content,
            created_at=updated_conversation.created_at,
            updated_at=updated_conversation.updated_at,
            metadata=updated_conversation.metadata,
            messages=[]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update conversation: {str(e)}"
        )

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Delete a conversation.
    """
    try:
        # Check if user has access to this conversation
        db_conversation = ai_chat.get_conversation(db, conversation_id)
        if not db_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        if db_conversation.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        success = ai_chat.delete_conversation(db, conversation_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}"
        )

@router.post("/conversations/{conversation_id}/messages", response_model=ai_chat_schemas.SendMessageResponse)
async def send_message(
    conversation_id: UUID,
    message_request: ai_chat_schemas.SendMessageRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Send a message in a conversation.
    """
    try:
        # Check if user has access to this conversation
        db_conversation = ai_chat.get_conversation(db, conversation_id)
        if not db_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        if db_conversation.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Create and send the message
        message = ai_chat.send_message(
            db=db,
            conversation_id=conversation_id,
            message_request=message_request
        )
        
        return ai_chat_schemas.SendMessageResponse(
            conversation_id=str(conversation_id),
            message_id=str(message.id),
            assistant_message="Message received and processed.",
            response="Message sent successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )

@router.get("/conversations/{conversation_id}/messages", response_model=List[ai_chat_schemas.AIChatMessage])
async def get_messages(
    conversation_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Get all messages for a conversation.
    """
    try:
        # Check if user has access to this conversation
        db_conversation = ai_chat.get_conversation(db, conversation_id)
        if not db_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        if db_conversation.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        messages = ai_chat.get_messages(db, conversation_id)
        
        # Convert to response format
        response_messages = []
        for msg in messages:
            response_messages.append(ai_chat_schemas.AIChatMessage(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                message_metadata=msg.message_metadata,
                created_at=msg.created_at
            ))
        
        return response_messages
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch messages: {str(e)}"
        )


@router.post("/quick", response_model=ai_chat_schemas.QuickChatResponse)
async def quick_chat(
    chat_request: ai_chat_schemas.QuickChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Quick chat endpoint for clinical assistance.
    Accepts conversation history and optional patient_id to provide context-aware responses.
    """
    try:
        context = None
        
        if chat_request.patient_id:
            patient = patients.get_patient(db, chat_request.patient_id)
            if not patient:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
            
            if not is_doctor_assigned_to_patient(db, current_user.user_id, chat_request.patient_id):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to patient data")
            
            lab_results, _ = crud_lab_result.get_lab_results_for_patient(db, chat_request.patient_id)
            lab_str = "\n".join([f"{lr.test_name}: {lr.value_numeric} {lr.unit}" for lr in lab_results if lr.value_numeric])
            
            meds = medication.get_medications(db, chat_request.patient_id)
            med_str = "\n".join([f"{med.name} ({med.dosage}, {med.frequency})" for med in meds])
            
            notes = clinical_note.get_notes(db, chat_request.patient_id)
            notes_str = "\n".join([f"{note.title}: {note.content}" for note in notes])
            
            context = {
                "diagnosis": patient.primary_diagnosis or "N/A",
                "labs": lab_str or "N/A",
                "medications": med_str or "N/A",
                "notes": notes_str or "N/A"
            }

        try:
            from baml_client import b
            from baml_client.types import Message
            
            # Convert Pydantic models to BAML models
            history_for_baml = [Message(role=msg.role, content=msg.content) for msg in chat_request.history]

            baml_response = await b.QuickClinicalChat(
                history=history_for_baml,
                context=context
            )
            
            response_message = baml_response.message
            response_citations = getattr(baml_response, 'citations', []) or []
            
        except ImportError:
            response_message = "BAML client not found. Please check installation."
            response_citations = []
        except Exception as baml_error:
            response_message = f"An error occurred during AI processing: {baml_error}"
            response_citations = []

        return ai_chat_schemas.QuickChatResponse(
            response=response_message,
            citations=response_citations
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process quick chat: {str(e)}"
        )