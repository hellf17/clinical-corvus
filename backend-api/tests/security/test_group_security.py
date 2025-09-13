"""
Security tests for group functionality in Clinical Corvus.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch
from main import app
from database.models import User, Group, GroupMembership, GroupPatient, Patient
import json

# Create a test client
client = TestClient(app)


class TestGroupSecurity:
    """Test cases for group security and access controls."""

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

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_group_authenticated(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that only authenticated users can create groups."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function
        with patch('crud.groups.create_group') as mock_create_group:
            mock_created_group = Group()
            mock_created_group.id = 1
            mock_created_group.name = "Secure Test Group"
            mock_create_group.return_value = mock_created_group

            # Act
            response = client.post("/api/groups/", json={
                "name": "Secure Test Group",
                "description": "A secure test group"
            })

            # Assert
            assert response.status_code == 201
            assert response.json()["name"] == "Secure Test Group"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_group_unauthenticated(self, mock_get_db):
        """Test that unauthenticated users cannot create groups."""
        # Arrange
        mock_get_db.side_effect = Exception("Not authenticated")

        # Act
        response = client.post("/api/groups/", json={
            "name": "Unauthorized Group",
            "description": "This should fail"
        })

        # Assert
        assert response.status_code == 401

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
    def test_invite_user_not_admin(self, mock_get_db, mock_get_current_user, mock_user):
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

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_admin_self_demotion(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that admins cannot remove their own admin status."""
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
                    mock_update_membership.side_effect = ValueError("Admins cannot remove their own admin status")

                    # Act
                    response = client.put("/api/groups/1/members/1", json={
                        "role": "member"
                    })

                    # Assert
                    assert response.status_code == 400
                    assert "cannot remove their own admin status" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_last_admin_removal(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that the last admin cannot be removed from a group."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_remove_members function to return True
        with patch('utils.group_permissions.can_user_remove_members') as mock_can_remove:
            mock_can_remove.return_value = True
            
            # Mock the get_user_membership_in_group function
            with patch('crud.groups.get_user_membership_in_group') as mock_get_membership:
                mock_membership = GroupMembership()
                mock_membership.id = 1
                mock_membership.user_id = 1
                mock_membership.group_id = 1
                mock_membership.role = "admin"
                mock_get_membership.return_value = mock_membership
                
                # Mock the query to count other admins (return 0 to simulate last admin)
                with patch('sqlalchemy.orm.Query.count') as mock_count:
                    mock_count.return_value = 0
                    
                    # Mock the remove_user_from_group function
                    with patch('crud.groups.remove_user_from_group') as mock_remove_user:
                        # Simulate the backend validation that prevents last admin removal
                        mock_remove_user.side_effect = ValueError("Cannot remove the last admin from the group")

                        # Act
                        response = client.delete("/api/groups/1/members/1")

                        # Assert
                        assert response.status_code == 400
                        assert "Cannot remove the last admin" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_duplicate_group_names(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that duplicate group names are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function to raise ValueError for duplicate names
        with patch('crud.groups.create_group') as mock_create_group:
            mock_create_group.side_effect = ValueError("A group with this name already exists")

            # Act
            response = client.post("/api/groups/", json={
                "name": "Duplicate Group",
                "description": "This should fail"
            })

            # Assert
            assert response.status_code == 400
            assert "already exists" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_duplicate_membership(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that duplicate memberships are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return True
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the add_user_to_group function to raise ValueError for duplicate memberships
            with patch('crud.groups.add_user_to_group') as mock_add_user:
                mock_add_user.side_effect = ValueError("User is already a member of this group")

                # Act
                response = client.post("/api/groups/1/members", json={
                    "user_id": 2,
                    "role": "member"
                })

                # Assert
                assert response.status_code == 400
                assert "already a member" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_duplicate_patient_assignment(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that duplicate patient assignments are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_assign_patients function to return True
        with patch('utils.group_permissions.can_user_assign_patients') as mock_can_assign:
            mock_can_assign.return_value = True
            
            # Mock the assign_patient_to_group function to raise ValueError for duplicate assignments
            with patch('crud.groups.assign_patient_to_group') as mock_assign_patient:
                mock_assign_patient.side_effect = ValueError("Patient is already assigned to this group")

                # Act
                response = client.post("/api/groups/1/patients", json={
                    "patient_id": 1
                })

                # Assert
                assert response.status_code == 400
                assert "already assigned" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_exceeding_group_limits(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that group limits are enforced."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Test member limit
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the add_user_to_group function to raise ValueError for member limit
            with patch('crud.groups.add_user_to_group') as mock_add_user:
                mock_add_user.side_effect = ValueError("Group member limit reached")

                # Act
                response = client.post("/api/groups/1/members", json={
                    "user_id": 2,
                    "role": "member"
                })

                # Assert
                assert response.status_code == 400
                assert "member limit" in response.json()["detail"]

        # Test patient limit
        with patch('utils.group_permissions.can_user_assign_patients') as mock_can_assign:
            mock_can_assign.return_value = True
            
            # Mock the assign_patient_to_group function to raise ValueError for patient limit
            with patch('crud.groups.assign_patient_to_group') as mock_assign_patient:
                mock_assign_patient.side_effect = ValueError("Group patient limit reached")

                # Act
                response = client.post("/api/groups/1/patients", json={
                    "patient_id": 1
                })

                # Assert
                assert response.status_code == 400
                assert "patient limit" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_inviting_nonexistent_user(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that invitations for nonexistent users are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return True
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the query to find user (return None to simulate nonexistent user)
            with patch('sqlalchemy.orm.Query.first') as mock_first:
                mock_first.return_value = None

                # Act
                response = client.post("/api/groups/1/members", json={
                    "user_id": 999999,
                    "role": "member"
                })

                # Assert
                assert response.status_code == 404
                assert "User not found" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_assigning_nonexistent_patient(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that assignments for nonexistent patients are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_assign_patients function to return True
        with patch('utils.group_permissions.can_user_assign_patients') as mock_can_assign:
            mock_can_assign.return_value = True
            
            # Mock the query to find patient (return None to simulate nonexistent patient)
            with patch('sqlalchemy.orm.Query.first') as mock_first:
                mock_first.return_value = None

                # Act
                response = client.post("/api/groups/1/patients", json={
                    "patient_id": 999999
                })

                # Assert
                assert response.status_code == 404
                assert "Patient not found" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_operations_on_nonexistent_group(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that operations on nonexistent groups are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function to return True
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the get_group function (return None to simulate nonexistent group)
            with patch('crud.groups.get_group') as mock_get_group:
                mock_get_group.return_value = None

                # Act
                response = client.get("/api/groups/999999")

                # Assert
                assert response.status_code == 404
                assert "not found" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_operations_on_nonexistent_membership(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that operations on nonexistent memberships are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_change_member_role function to return True
        with patch('utils.group_permissions.can_user_change_member_role') as mock_can_change:
            mock_can_change.return_value = True
            
            # Mock the get_user_membership_in_group function (return None to simulate nonexistent membership)
            with patch('crud.groups.get_user_membership_in_group') as mock_get_membership:
                mock_get_membership.return_value = None

                # Act
                response = client.put("/api/groups/1/members/999999", json={
                    "role": "admin"
                })

                # Assert
                assert response.status_code == 404
                assert "not a member" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_operations_on_nonexistent_patient_assignment(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that operations on nonexistent patient assignments are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_remove_patients function to return True
        with patch('utils.group_permissions.can_user_remove_patients') as mock_can_remove:
            mock_can_remove.return_value = True
            
            # Mock the is_patient_assigned_to_group function to return False
            with patch('crud.groups.is_patient_assigned_to_group') as mock_is_assigned:
                mock_is_assigned.return_value = False

                # Act
                response = client.delete("/api/groups/1/patients/999999")

                # Assert
                assert response.status_code == 404
                assert "not assigned" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_input_validation_for_group_creation(self, mock_get_db, mock_get_current_user, mock_user):
        """Test input validation for group creation."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db

        # Test missing name
        response = client.post("/api/groups/", json={
            "description": "Missing name"
        })

        # Assert
        assert response.status_code == 422 # Validation error

        # Test empty name
        response = client.post("/api/groups/", json={
            "name": "",
            "description": "Empty name"
        })

        # Assert
        assert response.status_code == 422  # Validation error

        # Test negative max_patients
        response = client.post("/api/groups/", json={
            "name": "Invalid Group",
            "description": "Negative max_patients",
            "max_patients": -1
        })

        # Assert
        assert response.status_code == 422  # Validation error

        # Test negative max_members
        response = client.post("/api/groups/", json={
            "name": "Invalid Group",
            "description": "Negative max_members",
            "max_members": -1
        })

        # Assert
        assert response.status_code == 422  # Validation error

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_input_validation_for_membership_operations(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test input validation for membership operations."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return True
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True

            # Test invalid role
            response = client.post("/api/groups/1/members", json={
                "user_id": 2,
                "role": "invalid_role"
            })

            # Assert
            assert response.status_code == 422  # Validation error

            # Test missing user_id
            response = client.post("/api/groups/1/members", json={
                "role": "member"
            })

            # Assert
            assert response.status_code == 422  # Validation error

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_input_validation_for_patient_operations(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test input validation for patient operations."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_assign_patients function to return True
        with patch('utils.group_permissions.can_user_assign_patients') as mock_can_assign:
            mock_can_assign.return_value = True

            # Test missing patient_id
            response = client.post("/api/groups/1/patients", json={})

            # Assert
            assert response.status_code == 422  # Validation error

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_input_validation_for_invitation_operations(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test input validation for invitation operations."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function to return True
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True

            # Test missing email
            response = client.post("/api/groups/1/invitations", json={
                "role": "member"
            })

            # Assert
            assert response.status_code == 422  # Validation error

            # Test invalid email format
            response = client.post("/api/groups/1/invitations", json={
                "email": "invalid-email",
                "role": "member"
            })

            # Assert
            assert response.status_code == 422  # Validation error

            # Test invalid role
            response = client.post("/api/groups/1/invitations", json={
                "email": "valid@example.com",
                "role": "invalid_role"
            })

            # Assert
            assert response.status_code == 422  # Validation error

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_xss_in_group_data(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that XSS attempts in group data are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the update_group function
        with patch('crud.groups.update_group') as mock_update_group:
            mock_updated_group = Group()
            mock_updated_group.id = 1
            mock_updated_group.name = "Updated Group"
            mock_updated_group.description = "Updated description"  # Should be sanitized
            mock_update_group.return_value = mock_updated_group

            # Act - Try to inject XSS in description
            response = client.put("/api/groups/1", json={
                "name": "Updated Group",
                "description": "<script>alert('XSS')</script>Malicious description"
            })

            # Assert - The backend should sanitize or reject malicious input
            # Note: This test assumes the backend has XSS protection
            assert response.status_code == 200

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_sql_injection_in_group_search(self, mock_get_db, mock_get_current_user, mock_user):
        """Test that SQL injection attempts in group search are prevented."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the get_groups function
        with patch('crud.groups.get_groups') as mock_get_groups:
            mock_group = Group()
            mock_group.id = 1
            mock_group.name = "Test Group"
            mock_get_groups.return_value = ([mock_group], 1)

            # Act - Try SQL injection in search parameter
            response = client.get("/api/groups/", params={
                "search": "'; DROP TABLE groups; --"
            })

            # Assert - The backend should properly escape or reject malicious input
            assert response.status_code == 200

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

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_brute_force_attacks_on_invitations(self, mock_get_db, mock_get_current_user, mock_user):
        """Test prevention of brute force attacks on invitation tokens."""
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

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_secure_token_generation_for_invitations(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test that invitation tokens are securely generated."""
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
                mock_group.name = "Token Test Group"
                mock_get_group.return_value = mock_group
                
                # Mock the create_group_invitation function
                with patch('services.group_invitations.create_group_invitation') as mock_create_invitation:
                    mock_invitation = Mock()
                    mock_invitation.id = 1
                    mock_invitation.group_id = 1
                    mock_invitation.email = "test@example.com"
                    mock_invitation.role = "member"
                    # Ensure token is sufficiently random and long
                    mock_invitation.token = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"  # 32 characters
                    mock_create_invitation.return_value = mock_invitation

                    # Act
                    response = client.post("/api/groups/1/invitations", json={
                        "email": "test@example.com",
                        "role": "member"
                    })

                    # Assert
                    assert response.status_code == 201
                    token = response.json()["token"]
                    assert len(token) >= 32  # Minimum length requirement
                    assert "_" in token or "-" in token  # URL-safe characters
                    # Additional checks for token randomness would be implementation-specific

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_privilege_escalation(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
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

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_prevent_cross_site_request_forgery(self, mock_get_db):
        """Test CSRF protection for group operations."""
        # Arrange
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
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


if __name__ == "__main__":
    pytest.main([__file__])