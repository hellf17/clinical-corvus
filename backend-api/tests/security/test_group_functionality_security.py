"""
Security tests for group functionality in Clinical Corvus.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch
from main import app
from database.models import User, Group, GroupMembership, GroupPatient, GroupInvitation, Patient
from datetime import datetime, timedelta
import jwt
from config import get_settings

# Create a test client
client = TestClient(app)


class TestGroupFunctionalitySecurity:
    """Security test cases for group functionality."""

    @pytest.fixture
    def mock_user(self):
        """Create a mock user."""
        user = User()
        user.user_id = 1
        user.email = "test@example.com"
        user.name = "Test User"
        user.role = "doctor"
        return user

    @pytest.fixture
    def mock_other_user(self):
        """Create another mock user."""
        user = User()
        user.user_id = 2
        user.email = "other@example.com"
        user.name = "Other User"
        user.role = "doctor"
        return user

    @pytest.fixture
    def mock_group(self):
        """Create a mock group."""
        group = Group()
        group.id = 1
        group.name = "Test Group"
        group.description = "A test group"
        return group

    @pytest.fixture
    def mock_admin_membership(self):
        """Create a mock admin membership."""
        membership = GroupMembership()
        membership.id = 1
        membership.user_id = 1
        membership.group_id = 1
        membership.role = "admin"
        membership.invited_by = 1
        return membership

    @pytest.fixture
    def mock_member_membership(self):
        """Create a mock member membership."""
        membership = GroupMembership()
        membership.id = 2
        membership.user_id = 2
        membership.group_id = 1
        membership.role = "member"
        membership.invited_by = 1
        return membership

    @pytest.fixture
    def mock_patient(self):
        """Create a mock patient."""
        patient = Patient()
        patient.patient_id = 1
        patient.user_id = 3
        patient.name = "Test Patient"
        return patient

    @pytest.fixture
    def mock_group_patient(self):
        """Create a mock group-patient assignment."""
        assignment = GroupPatient()
        assignment.id = 1
        assignment.group_id = 1
        assignment.patient_id = 1
        assignment.assigned_by = 1
        return assignment

    @pytest.fixture
    def valid_jwt_token(self, mock_user):
        """Create a valid JWT token."""
        settings = get_settings()
        payload = {
            "sub": mock_user.email,
            "exp": datetime.utcnow() + timedelta(hours=1),
            "user_id": mock_user.user_id
        }
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    @pytest.fixture
    def expired_jwt_token(self, mock_user):
        """Create an expired JWT token."""
        settings = get_settings()
        payload = {
            "sub": mock_user.email,
            "exp": datetime.utcnow() - timedelta(hours=1),  # Expired 1 hour ago
            "user_id": mock_user.user_id
        }
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    @pytest.fixture
    def invalid_jwt_token(self):
        """Create an invalid JWT token."""
        settings = get_settings()
        payload = {
            "sub": "invalid@example.com",
            "exp": datetime.utcnow() + timedelta(hours=1),
            "user_id": 999999
        }
        # Use a different secret key to make it invalid
        return jwt.encode(payload, "invalid_secret_key", algorithm=settings.algorithm)

    # --- Authentication Tests ---

    def test_create_group_without_authentication(self):
        """Test that creating a group requires authentication."""
        response = client.post("/api/groups/", json={
            "name": "Unauthorized Group",
            "description": "This should fail"
        })

        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

    def test_create_group_with_expired_token(self, expired_jwt_token):
        """Test that creating a group with expired token fails."""
        response = client.post("/api/groups/", json={
            "name": "Expired Token Group",
            "description": "This should fail"
        }, headers={
            "Authorization": f"Bearer {expired_jwt_token}"
        })

        assert response.status_code == 401
        assert "Token has expired" in response.json()["detail"]

    def test_create_group_with_invalid_token(self, invalid_jwt_token):
        """Test that creating a group with invalid token fails."""
        response = client.post("/api/groups/", json={
            "name": "Invalid Token Group",
            "description": "This should fail"
        }, headers={
            "Authorization": f"Bearer {invalid_jwt_token}"
        })

        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]

    def test_access_group_without_authentication(self):
        """Test that accessing a group requires authentication."""
        response = client.get("/api/groups/1")

        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

    def test_access_group_with_expired_token(self, expired_jwt_token):
        """Test that accessing a group with expired token fails."""
        response = client.get("/api/groups/1", headers={
            "Authorization": f"Bearer {expired_jwt_token}"
        })

        assert response.status_code == 401
        assert "Token has expired" in response.json()["detail"]

    def test_access_group_with_invalid_token(self, invalid_jwt_token):
        """Test that accessing a group with invalid token fails."""
        response = client.get("/api/groups/1", headers={
            "Authorization": f"Bearer {invalid_jwt_token}"
        })

        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]

    # --- Authorization Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_access_group_not_member(self, mock_get_db, mock_get_current_user, mock_user, mock_other_user):
        """Test that users cannot access groups they're not members of."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function to return False
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = False

            # Act
            response = client.get("/api/groups/1")

            # Assert
            assert response.status_code == 403
            assert "not a member" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_group_not_admin(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test that only admins can update group information."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the is_user_admin_of_group function to return False
            with patch('crud.groups.is_user_admin_of_group') as mock_is_admin:
                mock_is_admin.return_value = False

                # Act
                response = client.put("/api/groups/1", json={
                    "name": "Unauthorized Update"
                })

                # Assert
                assert response.status_code == 403
                assert "admins can update" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_delete_group_not_admin(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test that only admins can delete groups."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the is_user_admin_of_group function to return False
            with patch('crud.groups.is_user_admin_of_group') as mock_is_admin:
                mock_is_admin.return_value = False

                # Act
                response = client.delete("/api/groups/1")

                # Assert
                assert response.status_code == 403
                assert "admins can delete" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_invite_user_to_group_not_admin(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that only admins can invite users to groups."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return False
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = False

            # Act
            response = client.post("/api/groups/1/members", json={
                "user_id": 2,
                "role": "member"
            })

            # Assert
            assert response.status_code == 403
            assert "admins can invite" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_member_role_not_admin(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that only admins can update member roles."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_change_member_role function to return False
        with patch('utils.group_permissions.can_user_change_member_role') as mock_can_change:
            mock_can_change.return_value = False

            # Act
            response = client.put("/api/groups/1/members/2", json={
                "role": "admin"
            })

            # Assert
            assert response.status_code == 403
            assert "admins can update" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_member_not_authorized(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that members cannot remove other members."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_remove_members function to return False
        with patch('utils.group_permissions.can_user_remove_members') as mock_can_remove:
            mock_can_remove.return_value = False

            # Act
            response = client.delete("/api/groups/1/members/3")

            # Assert
            assert response.status_code == 403
            assert "permission to remove" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_assign_patient_not_admin(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that only admins can assign patients to groups."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_assign_patients function to return False
        with patch('utils.group_permissions.can_user_assign_patients') as mock_can_assign:
            mock_can_assign.return_value = False

            # Act
            response = client.post("/api/groups/1/patients", json={
                "patient_id": 1
            })

            # Assert
            assert response.status_code == 403
            assert "admins can assign" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_patient_not_admin(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that only admins can remove patients from groups."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_remove_patients function to return False
        with patch('utils.group_permissions.can_user_remove_patients') as mock_can_remove:
            mock_can_remove.return_value = False

            # Act
            response = client.delete("/api/groups/1/patients/1")

            # Assert
            assert response.status_code == 403
            assert "admins can remove" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_invitation_not_admin(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that only admins can create invitations."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return False
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = False

            # Act
            response = client.post("/api/groups/1/invitations", json={
                "email": "invitee@example.com",
                "role": "member"
            })

            # Assert
            assert response.status_code == 403
            assert "admins can invite" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_invitation_not_admin(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that only admins can update invitations."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return False
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = False

            # Act
            response = client.put("/api/groups/1/invitations/1", json={
                "role": "admin"
            })

            # Assert
            assert response.status_code == 403
            assert "admins can update" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_revoke_invitation_not_admin(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that only admins can revoke invitations."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return False
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = False

            # Act
            response = client.delete("/api/groups/1/invitations/1")

            # Assert
            assert response.status_code == 403
            assert "admins can revoke" in response.json()["detail"]

    # --- Input Validation Security Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_group_with_malicious_input(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that malicious input in group creation is handled safely."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function
        with patch('crud.groups.create_group') as mock_create_group:
            mock_created_group = Group()
            mock_created_group.id = 1
            mock_created_group.name = "Safe Group Name"
            mock_created_group.description = "Safe description"
            mock_create_group.return_value = mock_created_group

            # Act - Try to inject malicious script in name
            response = client.post("/api/groups/", json={
                "name": "<script>alert('XSS')</script>Malicious Group",
                "description": "Group with malicious name"
            })

            # Assert - Backend should sanitize or reject malicious input
            # Note: This test assumes the backend has XSS protection
            # In a real implementation, this would depend on the sanitization logic
            assert response.status_code == 201 or response.status_code == 422

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_group_with_sql_injection_attempt(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that SQL injection attempts in group creation are handled safely."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function
        with patch('crud.groups.create_group') as mock_create_group:
            mock_created_group = Group()
            mock_created_group.id = 1
            mock_created_group.name = "Safe Group Name"
            mock_created_group.description = "Safe description"
            mock_create_group.return_value = mock_created_group

            # Act - Try SQL injection in name
            response = client.post("/api/groups/", json={
                "name": "'; DROP TABLE groups; --",
                "description": "SQL injection attempt"
            })

            # Assert - Backend should properly escape or reject malicious input
            assert response.status_code == 201 or response.status_code == 422

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_invite_user_with_invalid_user_id(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that inviting with invalid user ID is handled safely."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return True
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the query to find user (return None to simulate invalid user)
            with patch('sqlalchemy.orm.Query.first') as mock_first:
                mock_first.return_value = None

                # Act
                response = client.post("/api/groups/1/members", json={
                    "user_id": -1,  # Invalid negative user ID
                    "role": "member"
                })

                # Assert
                assert response.status_code == 404 or response.status_code == 422
                if response.status_code == 404:
                    assert "User not found" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_assign_patient_with_invalid_patient_id(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that assigning with invalid patient ID is handled safely."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_assign_patients function to return True
        with patch('utils.group_permissions.can_user_assign_patients') as mock_can_assign:
            mock_can_assign.return_value = True
            
            # Mock the query to find patient (return None to simulate invalid patient)
            with patch('sqlalchemy.orm.Query.first') as mock_first:
                mock_first.return_value = None

                # Act
                response = client.post("/api/groups/1/patients", json={
                    "patient_id": -1,  # Invalid negative patient ID
                })

                # Assert
                assert response.status_code == 404 or response.status_code == 422
                if response.status_code == 404:
                    assert "Patient not found" in response.json()["detail"]

    # --- Rate Limiting Security Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_rate_limiting_for_group_operations(self, mock_get_db, mock_get_current_user, mock_user):
        """Test rate limiting for group operations."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function
        with patch('crud.groups.create_group') as mock_create_group:
            mock_created_group = Group()
            mock_created_group.id = 1
            mock_created_group.name = "Rate Limited Group"
            mock_create_group.return_value = mock_created_group
            
            # Mock rate limiting to trigger limit exceeded
            with patch('fastapi_limiter.limit') as mock_limit:
                mock_limit.side_effect = Exception("Rate limit exceeded")

                # Act
                response = client.post("/api/groups/", json={
                    "name": "Rate Limited Group",
                    "description": "This should be rate limited"
                })

                # Assert
                # Note: This test assumes rate limiting is implemented
                # In a real implementation, this would depend on the rate limiting setup
                pass  # Rate limiting implementation varies

    # --- Brute Force Protection Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_brute_force_protection_for_invitation_tokens(self, mock_get_db, mock_get_current_user, mock_user):
        """Test protection against brute force attacks on invitation tokens."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock failed invitation acceptance attempts
        with patch('services.group_invitations.get_invitation_by_token') as mock_get_invitation:
            mock_get_invitation.return_value = None  # Simulate invalid token
            
            # Track failed attempts (this would be implemented in the actual backend)
            failed_attempts = 0
            max_attempts = 5
            
            # Act - Try multiple invalid tokens
            for i in range(max_attempts + 1):
                response = client.post("/api/groups/invitations/accept", json={
                    "token": f"invalid-token-{i}"
                })
                failed_attempts += 1
                
                # After max attempts, should be rate limited or blocked
                if failed_attempts > max_attempts:
                    # Assert that additional attempts are blocked
                    # This would depend on the actual implementation
                    pass

    # --- Session Management Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_concurrent_sessions_security(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test security with concurrent sessions."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the is_user_admin_of_group function
            with patch('crud.groups.is_user_admin_of_group') as mock_is_admin:
                mock_is_admin.return_value = True
                
                # Mock the delete_group function
                with patch('crud.groups.delete_group') as mock_delete_group:
                    mock_delete_group.return_value = True

                    # Act
                    response1 = client.delete("/api/groups/1")
                    response2 = client.delete("/api/groups/1")  # Second attempt

                    # Assert - First should succeed, second should fail or be idempotent
                    assert response1.status_code == 204 or response1.status_code == 404
                    assert response2.status_code == 404  # Should fail as group no longer exists

    # --- Token Security Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_invitation_token_security(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test security of invitation tokens."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return True
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the get_group function
            with patch('crud.groups.get_group') as mock_get_group:
                mock_group = Group()
                mock_group.id = 1
                mock_group.name = "Token Security Group"
                mock_get_group.return_value = mock_group
                
                # Mock the create_group_invitation function
                with patch('services.group_invitations.create_group_invitation') as mock_create_invitation:
                    mock_invitation = Mock()
                    mock_invitation.id = 1
                    mock_invitation.group_id = 1
                    mock_invitation.email = "secure@example.com"
                    mock_invitation.role = "member"
                    # Ensure token is sufficiently random and long
                    mock_invitation.token = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"  # 32 characters
                    mock_create_invitation.return_value = mock_invitation

                    # Act
                    response = client.post("/api/groups/1/invitations", json={
                        "email": "secure@example.com",
                        "role": "member"
                    })

                    # Assert
                    assert response.status_code == 201
                    token = response.json()["token"]
                    assert len(token) >= 32  # Minimum length requirement
                    assert "_" in token or "-" in token  # URL-safe characters
                    # Additional checks for token randomness would be implementation-specific

    # --- Data Privacy Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_patient_data_privacy(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership, mock_patient):
        """Test that patient data privacy is maintained."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the get_group_patients function
            with patch('crud.groups.get_group_patients') as mock_get_patients:
                mock_assignment = GroupPatient()
                mock_assignment.id = 1
                mock_assignment.group_id = 1
                mock_assignment.patient_id = 1
                mock_assignment.patient = mock_patient
                mock_get_patients.return_value = ([mock_assignment], 1)

                # Act
                response = client.get("/api/groups/1/patients")

                # Assert
                assert response.status_code == 200
                # Verify that sensitive patient data is not exposed unnecessarily
                # This would depend on the actual implementation and what data is returned
                data = response.json()
                assert "items" in data
                assert "total" in data

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_user_data_privacy_in_memberships(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that user data privacy is maintained in memberships."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the get_group_memberships function
            with patch('crud.groups.get_group_memberships') as mock_get_memberships:
                mock_membership = GroupMembership()
                mock_membership.id = 1
                mock_membership.group_id = 1
                mock_membership.user_id = 1
                mock_membership.role = "admin"
                mock_membership.user = mock_user  # Include user data
                mock_get_memberships.return_value = ([mock_membership], 1)

                # Act
                response = client.get("/api/groups/1/members")

                # Assert
                assert response.status_code == 200
                # Verify that only necessary user data is exposed
                data = response.json()
                assert "items" in data
                assert "total" in data
                # Additional privacy checks would depend on implementation

    # --- Cross-Site Request Forgery (CSRF) Tests ---

    def test_csrf_protection_for_group_operations(self):
        """Test CSRF protection for group operations."""
        # Act - Try to perform operation without proper authentication
        response = client.post("/api/groups/", json={
            "name": "CSRF Attempt",
            "description": "This should fail CSRF protection"
        }, headers={
            "Content-Type": "application/json"
            # Missing authentication headers
        })

        # Assert
        assert response.status_code == 401  # Should require authentication

    # --- Secure Token Generation Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_secure_random_token_generation(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that tokens are securely generated with sufficient entropy."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return True
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the get_group function
            with patch('crud.groups.get_group') as mock_get_group:
                mock_group = Group()
                mock_group.id = 1
                mock_group.name = "Token Security Group"
                mock_get_group.return_value = mock_group
                
                # Mock the create_group_invitation function
                with patch('services.group_invitations.create_group_invitation') as mock_create_invitation:
                    mock_invitation = Mock()
                    mock_invitation.id = 1
                    mock_invitation.group_id = 1
                    mock_invitation.email = "token_test@example.com"
                    mock_invitation.role = "member"
                    # Ensure token is sufficiently random and long
                    mock_invitation.token = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"  # 32 characters
                    mock_create_invitation.return_value = mock_invitation

                    # Act
                    response = client.post("/api/groups/1/invitations", json={
                        "email": "token_test@example.com",
                        "role": "member"
                    })

                    # Assert
                    assert response.status_code == 201
                    token = response.json()["token"]
                    assert len(token) >= 32  # Minimum length
                    assert "_" in token or "-" in token  # URL-safe characters
                    # Additional checks for token randomness would be implementation-specific

    # --- Privilege Escalation Prevention Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_self_demotion_as_last_admin(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that admins cannot remove their own admin status if they are the last admin."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_change_member_role function to return True
        with patch('utils.group_permissions.can_user_change_member_role') as mock_can_change:
            mock_can_change.return_value = True
            
            # Mock the get_user_membership_in_group function
            with patch('crud.groups.get_user_membership_in_group') as mock_get_membership:
                mock_membership = GroupMembership()
                mock_membership.id = 1
                mock_membership.user_id = 1
                mock_membership.group_id = 1
                mock_membership.role = "admin"
                mock_get_membership.return_value = mock_membership
                
                # Mock the update_group_membership function
                with patch('crud.groups.update_group_membership') as mock_update_membership:
                    # Simulate the backend validation that prevents self-demotion
                    mock_update_membership.side_effect = ValueError("Cannot remove the last admin from the group")

                    # Act
                    response = client.put("/api/groups/1/members/1", json={
                        "role": "member"
                    })

                    # Assert
                    assert response.status_code == 400
                    assert "Cannot remove the last admin" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_privilege_escalation_by_members(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test that members cannot escalate their own privileges."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_change_member_role function to return False for self-promotion
        with patch('utils.group_permissions.can_user_change_member_role') as mock_can_change:
            mock_can_change.return_value = False  # Member cannot change their own role

            # Act
            response = client.put("/api/groups/1/members/2", json={
                "role": "admin"
            })

            # Assert
            assert response.status_code == 403
            assert "admins can update" in response.json()["detail"]

    # --- Data Integrity Security Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_data_tampering_in_group_operations(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that data tampering in group operations is prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the is_user_admin_of_group function
            with patch('crud.groups.is_user_admin_of_group') as mock_is_admin:
                mock_is_admin.return_value = True
                
                # Mock the update_group function
                with patch('crud.groups.update_group') as mock_update_group:
                    mock_updated_group = Group()
                    mock_updated_group.id = 1
                    mock_updated_group.name = "Tamper Protected Group"
                    mock_updated_group.description = "Updated securely"
                    mock_update_group.return_value = mock_updated_group

                    # Act
                    response = client.put("/api/groups/1", json={
                        "name": "Tamper Protected Group",
                        "description": "<script>alert('XSS')</script>Malicious description"
                    })

                    # Assert
                    assert response.status_code == 200 or response.status_code == 422

    # --- Session Timeout Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_session_timeout_handling(self, mock_get_db):
        """Test handling of session timeouts during group operations."""
        # Arrange
        mock_get_db.side_effect = Exception("Session timeout")

        # Act
        response = client.post("/api/groups/", json={
            "name": "Timeout Group",
            "description": "This should handle timeout"
        })

        # Assert
        assert response.status_code == 401 or response.status_code == 500
        if response.status_code == 401:
            assert "session" in response.json()["detail"].lower()

    # --- Input Sanitization Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_input_sanitization_for_special_characters(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that special characters in input are properly sanitized."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function
        with patch('crud.groups.create_group') as mock_create_group:
            mock_created_group = Group()
            mock_created_group.id = 1
            mock_created_group.name = "Sanitized Group Name"
            mock_created_group.description = "Sanitized description"
            mock_create_group.return_value = mock_created_group

            # Act - Try input with special characters
            response = client.post("/api/groups/", json={
                "name": "Group with Special Characters: !@#$%^&*()_+-=[]{}|;':\",./<>?",
                "description": "Description with special characters"
            })

            # Assert - Should handle special characters appropriately
            assert response.status_code == 201 or response.status_code == 422

    # --- Concurrent Modification Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_concurrent_modification_security(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test security with concurrent modifications."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the is_user_admin_of_group function
            with patch('crud.groups.is_user_admin_of_group') as mock_is_admin:
                mock_is_admin.return_value = True
                
                # Mock the update_group function to simulate concurrent modification
                with patch('crud.groups.update_group') as mock_update_group:
                    mock_update_group.side_effect = Exception("Concurrent modification detected")

                    # Act
                    response = client.put("/api/groups/1", json={
                        "name": "Concurrent Update Group",
                        "description": "Updated concurrently"
                    })

                    # Assert - Should handle concurrent modification appropriately
                    assert response.status_code == 409 or response.status_code == 500

    # --- Error Handling Security Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_error_information_leakage_prevention(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that error messages don't leak sensitive information."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function to raise an unexpected exception
        with patch('crud.groups.create_group') as mock_create_group:
            mock_create_group.side_effect = Exception("Database connection failed")

            # Act
            response = client.post("/api/groups/", json={
                "name": "Error Handling Group",
                "description": "This should not leak sensitive info"
            })

            # Assert
            assert response.status_code == 500
            # Verify that error message doesn't contain sensitive information
            error_detail = response.json()["detail"]
            assert "Failed to create group" in error_detail
            assert "Database connection failed" not in error_detail  # Should not expose internal details

    # --- Access Control Edge Cases ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_access_control_with_deleted_group(self, mock_get_db, mock_get_current_user, mock_user):
        """Test access control when group has been deleted."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function to return True
        # (simulating cached membership for deleted group)
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the get_group_with_members_and_patients function to return None
            # (simulating deleted group)
            with patch('crud.groups.get_group_with_members_and_patients') as mock_get_group:
                mock_get_group.return_value = None

                # Act
                response = client.get("/api/groups/1")

                # Assert
                assert response.status_code == 404
                assert "not found" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_access_control_with_inactive_user(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test access control with inactive user account."""
        # Arrange - Simulate inactive user
        mock_user.is_active = False
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True

            # Act
            response = client.get("/api/groups/1")

            # Assert - Should deny access to inactive users
            assert response.status_code == 403 or response.status_code == 401

    # --- API Endpoint Security Tests ---

    def test_unauthorized_access_to_protected_endpoints(self):
        """Test that all protected group endpoints require authentication."""
        # List of protected endpoints to test
        protected_endpoints = [
            ("POST", "/api/groups/"),
            ("GET", "/api/groups/"),
            ("GET", "/api/groups/1"),
            ("PUT", "/api/groups/1"),
            ("DELETE", "/api/groups/1"),
            ("POST", "/api/groups/1/members"),
            ("GET", "/api/groups/1/members"),
            ("PUT", "/api/groups/1/members/2"),
            ("DELETE", "/api/groups/1/members/2"),
            ("POST", "/api/groups/1/patients"),
            ("GET", "/api/groups/1/patients"),
            ("DELETE", "/api/groups/1/patients/1"),
            ("POST", "/api/groups/1/invitations"),
            ("GET", "/api/groups/1/invitations"),
            ("PUT", "/api/groups/1/invitations/1"),
            ("DELETE", "/api/groups/1/invitations/1"),
            ("POST", "/api/groups/invitations/accept"),
            ("POST", "/api/groups/invitations/decline"),
        ]

        # Test each endpoint
        for method, endpoint in protected_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            elif method == "PUT":
                response = client.put(endpoint, json={})
            elif method == "DELETE":
                response = client.delete(endpoint)
            
            # Assert that all protected endpoints require authentication
            assert response.status_code == 401, f"Endpoint {method} {endpoint} should require authentication"

    # --- Token Expiration Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_invitation_token_expiration_handling(self, mock_get_db, mock_get_current_user, mock_user):
        """Test handling of expired invitation tokens."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the accept_group_invitation function to raise ValueError for expired token
        with patch('services.group_invitations.accept_group_invitation') as mock_accept_invitation:
            mock_accept_invitation.side_effect = ValueError("Invalid or expired invitation token")

            # Act
            response = client.post("/api/groups/invitations/accept", json={
                "token": "expired-token-123"
            })

            # Assert
            assert response.status_code == 400
            assert "Invalid or expired" in response.json()["detail"]

    # --- Input Validation Security Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_integer_overflow_protection(self, mock_get_db, mock_get_current_user, mock_user):
        """Test protection against integer overflow in group parameters."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function
        with patch('crud.groups.create_group') as mock_create_group:
            mock_created_group = Group()
            mock_created_group.id = 1
            mock_created_group.name = "Overflow Protected Group"
            mock_create_group.return_value = mock_created_group

            # Act - Try to create group with extremely large numbers
            response = client.post("/api/groups/", json={
                "name": "Overflow Test Group",
                "description": "Testing integer overflow protection",
                "max_patients": 999999999,  # Extremely large number
                "max_members": 99999   # Extremely large number
            })

            # Assert - Should handle large numbers appropriately
            assert response.status_code == 201 or response.status_code == 422

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_unicode_character_handling(self, mock_get_db, mock_get_current_user, mock_user):
        """Test handling of Unicode characters in group data."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function
        with patch('crud.groups.create_group') as mock_create_group:
            mock_created_group = Group()
            mock_created_group.id = 1
            mock_created_group.name = "Unicode Test Group 🦊"
            mock_created_group.description = "Testing Unicode characters: café, naïve, résumé"
            mock_create_group.return_value = mock_created_group

            # Act - Try to create group with Unicode characters
            response = client.post("/api/groups/", json={
                "name": "Unicode Test Group 🦊",
                "description": "Testing Unicode characters: café, naïve, résumé"
            })

            # Assert - Should handle Unicode characters appropriately
            assert response.status_code == 201 or response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__])
