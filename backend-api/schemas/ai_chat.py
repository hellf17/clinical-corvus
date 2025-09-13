from pydantic import BaseModel, Field, UUID4, field_validator, ConfigDict
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from uuid import UUID

class AIChatMessageBase(BaseModel):
    conversation_id: UUID4
    role: str  # 'user', 'assistant', 'system'
    content: str
    message_metadata: Optional[Dict[str, Any]] = None

    @field_validator('message_metadata', mode='before')
    @classmethod
    def convert_message_metadata(cls, v):
        # Convert SQLAlchemy MetaData or any non-dict to a dict
        if v is None:
            return {}
        if not isinstance(v, dict):
            try:
                # Try to convert to dict if it has a to_dict method
                if hasattr(v, 'to_dict'):
                    return v.to_dict()
                # Otherwise try to convert directly to dict
                return dict(v)
            except Exception:
                # If conversion fails, return empty dict
                return {}
        return v

class AIChatMessageCreate(AIChatMessageBase):
    metadata: Optional[Dict[str, Any]] = None

class AIChatMessage(AIChatMessageBase):
    id: UUID4
    conversation_id: UUID4
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None

    @field_validator('metadata', mode='before')
    @classmethod
    def validate_metadata(cls, v):
        # Convert SQLAlchemy MetaData or any non-dict to a dict
        if v is None:
            return {}
        if not isinstance(v, dict):
            try:
                # Try to convert to dict if it has a to_dict method
                if hasattr(v, 'to_dict'):
                    return v.to_dict()
                # Otherwise try to convert directly to dict
                return dict(v)
            except Exception:
                # If conversion fails, return empty dict
                return {}
        return v

    model_config = ConfigDict(from_attributes=True)

class AIChatConversationBase(BaseModel):
    title: str
    patient_id: Union[int, str, UUID4]
    initial_message: Optional[str] = None
    last_message_content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator('metadata', mode='before')
    @classmethod
    def validate_metadata(cls, v):
        # Convert SQLAlchemy MetaData or any non-dict to a dict
        if v is None:
            return {}
        if not isinstance(v, dict):
            try:
                # Try to convert to dict if it has a to_dict method
                if hasattr(v, 'to_dict'):
                    return v.to_dict()
                # Otherwise try to convert directly to dict
                return dict(v)
            except Exception:
                # If conversion fails, return empty dict
                return {}
        return v

class AIChatConversationCreate(AIChatConversationBase):
    pass

class AIChatConversationUpdate(BaseModel):
    title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    last_message_content: Optional[str] = None

class AIChatConversation(AIChatConversationBase):
    id: UUID4
    created_at: datetime
    created_by: Optional[Union[UUID4, int]] = None
    patient_id: Union[UUID4, int]
    user_id: Union[UUID4, int]
    metadata: Optional[Dict[str, Any]] = None
    last_message_content: Optional[str] = None
    messages: List[AIChatMessage] = []

    @field_validator('metadata', mode='before')
    @classmethod
    def validate_metadata(cls, v):
        # Convert SQLAlchemy MetaData or any non-dict to a dict
        if v is None:
            return {}
        if not isinstance(v, dict):
            try:
                # Try to convert to dict if it has a to_dict method
                if hasattr(v, 'to_dict'):
                    return v.to_dict()
                # Otherwise try to convert directly to dict
                return dict(v)
            except Exception:
                # If conversion fails, return empty dict
                return {}
        return v

    model_config = ConfigDict(from_attributes=True)

class AIChatConversationSummary(BaseModel):
    id: UUID4
    title: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    patient_id: Optional[Union[UUID4, int]] = None
    user_id: Optional[Union[UUID4, int]] = None
    created_by: Optional[Union[UUID4, int]] = None
    last_message_content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator('metadata', mode='before')
    @classmethod
    def validate_metadata(cls, v):
        # Convert SQLAlchemy MetaData or any non-dict to a dict
        if v is None:
            return {}
        if not isinstance(v, dict):
            try:
                # Try to convert to dict if it has a to_dict method
                if hasattr(v, 'to_dict'):
                    return v.to_dict()
                # Otherwise try to convert directly to dict
                return dict(v)
            except Exception:
                # If conversion fails, return empty dict
                return {}
        return v

    model_config = ConfigDict(from_attributes=True)

class AIChatConversationList(BaseModel):
    conversations: List[AIChatConversationSummary]
    total: int

class SendMessageRequest(BaseModel):
    message: Optional[str] = None
    content: Optional[str] = None
    conversation_id: Optional[Union[UUID4, str]] = None
    patient_id: Optional[Union[UUID4, str, int]] = None
    patient_context: Optional[Dict[str, Any]] = None
    include_patient_context: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None
    message_metadata: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    title: Optional[str] = None
    role: Optional[str] = "user"
    
    def get_message_content(self) -> str:
        """Return message content from either message or content field"""
        if self.message:
            return self.message
        elif self.content:
            return self.content
        return ""

class MessageWithPatientContextRequest(BaseModel):
    message: str
    conversation_id: Optional[Union[UUID4, str]] = None
    patient_context: Dict[str, Any]
    patient_id: Optional[Union[UUID4, str, int]] = None
    include_patient_context: Optional[bool] = True
    settings: Optional[Dict[str, Any]] = None
    message_metadata: Optional[Dict[str, Any]] = None
    title: Optional[str] = None

class SendMessageResponse(BaseModel):
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    assistant_message: str
    response: Optional[str] = None
    web_results: Optional[List[Dict[str, Any]]] = None


class ChatMessage(BaseModel):
    role: str
    content: str

class QuickChatRequest(BaseModel):
    history: List[ChatMessage]
    patient_id: Optional[int] = None


class QuickChatResponse(BaseModel):
    response: str
    citations: Optional[List[str]] = None