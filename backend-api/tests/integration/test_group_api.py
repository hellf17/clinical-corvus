"""
Integration tests for group API endpoints in Clinical Corvus.
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


class TestGroupAPI:
    """Test cases for group API endpoints."""

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
    def mock_group(self):
        """Create a mock group."""
        group = Group()
        group.id = 1
        group.name = "Test Group"
        group.description = "A test group"
        group.max_patients = 50
        group.max_members = 10
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

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_group_success(self, mock_get_db, mock_get_current_user, mock_user):
        """Test successful group creation."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function
        with patch('crud.groups.create_group') as mock_create_group:
            mock_created_group = Group()
            mock_created_group.id = 1
            mock_created_group.name = "Test Group"
            mock_created_group.description = "A test group"
            mock_created_group.max_patients = 50
            mock_created_group.max_members = 10
            mock_create_group.return_value = mock_created_group

            # Act
            response = client.post("/api/groups/", json={
                "name": "Test Group",
                "description": "A test group",
                "max_patients": 50,
                "max_members": 10
            })

            # Assert
            assert response.status_code == 201
            assert response.json()["name"] == "Test Group"
            assert response.json()["description"] == "A test group"
            assert response.json()["max_patients"] == 50
            assert response.json()["max_members"] == 10

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_group_duplicate_name(self, mock_get_db, mock_get_current_user, mock_user):
        """Test group creation with duplicate name."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function to raise ValueError
        with patch('crud.groups.create_group') as mock_create_group:
            mock_create_group.side_effect = ValueError("A group with this name already exists")

            # Act
            response = client.post("/api/groups/", json={
                "name": "Duplicate Group",
                "description": "A duplicate group"
            })

            # Assert
            assert response.status_code == 400
            assert "already exists" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_list_groups_success(self, mock_get_db, mock_get_current_user, mock_user):
        """Test successful listing of groups."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the get_user_groups function
        with patch('crud.groups.get_user_groups') as mock_get_user_groups:
            mock_group1 = Group()
            mock_group1.id = 1
            mock_group1.name = "Test Group 1"
            mock_group1.description = "First test group"
            
            mock_group2 = Group()
            mock_group2.id = 2
            mock_group2.name = "Test Group 2"
            mock_group2.description = "Second test group"
            
            mock_get_user_groups.return_value = ([mock_group1, mock_group2], 2)

            # Act
            response = client.get("/api/groups/")

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total" in data
            assert len(data["items"]) == 2
            assert data["total"] == 2

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_get_group_success(self, mock_get_db, mock_get_current_user, mock_user, mock_group, mock_admin_membership):
        """Test successful retrieval of a group."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the get_group_with_members_and_patients function
            with patch('crud.groups.get_group_with_members_and_patients') as mock_get_group:
                mock_get_group.return_value = mock_group

                # Act
                response = client.get("/api/groups/1")

                # Assert
                assert response.status_code == 200
                assert response.json()["id"] == 1
                assert response.json()["name"] == "Test Group"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_get_group_not_member(self, mock_get_db, mock_get_current_user, mock_user):
        """Test retrieval of a group when not a member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = False

            # Act
            response = client.get("/api/groups/1")

            # Assert
            assert response.status_code == 403
            assert "not a member" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_get_group_not_found(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test retrieval of a non-existent group."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the get_group_with_members_and_patients function
            with patch('crud.groups.get_group_with_members_and_patients') as mock_get_group:
                mock_get_group.return_value = None

                # Act
                response = client.get("/api/groups/1")

                # Assert
                assert response.status_code == 404
                assert "not found" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_group_success(self, mock_get_db, mock_get_current_user, mock_user, mock_group, mock_admin_membership):
        """Test successful group update."""
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
                    mock_updated_group.name = "Updated Group"
                    mock_updated_group.description = "Updated description"
                    mock_update_group.return_value = mock_updated_group

                    # Act
                    response = client.put("/api/groups/1", json={
                        "name": "Updated Group",
                        "description": "Updated description"
                    })

                    # Assert
                    assert response.status_code == 200
                    assert response.json()["name"] == "Updated Group"
                    assert response.json()["description"] == "Updated description"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_group_not_admin(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test group update when not an admin."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the is_user_admin_of_group function
            with patch('crud.groups.is_user_admin_of_group') as mock_is_admin:
                mock_is_admin.return_value = False

                # Act
                response = client.put("/api/groups/1", json={
                    "name": "Should Fail"
                })

                # Assert
                assert response.status_code == 403
                assert "admins can update" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_delete_group_success(self, mock_get_db, mock_get_current_user, mock_user, mock_group, mock_admin_membership):
        """Test successful group deletion."""
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
                    response = client.delete("/api/groups/1")

                    # Assert
                    assert response.status_code == 204

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_invite_user_to_group_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful user invitation to group."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the add_user_to_group function
            with patch('crud.groups.add_user_to_group') as mock_add_user:
                mock_membership = GroupMembership()
                mock_membership.id = 1
                mock_membership.group_id = 1
                mock_membership.user_id = 2
                mock_membership.role = "member"
                mock_add_user.return_value = mock_membership

                # Act
                response = client.post("/api/groups/1/members", json={
                    "user_id": 2,
                    "role": "member"
                })

                # Assert
                assert response.status_code == 201
                assert response.json()["user_id"] == 2
                assert response.json()["role"] == "member"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_invite_user_to_group_forbidden(self, mock_get_db, mock_get_current_user, mock_user):
        """Test user invitation when not authorized."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
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
    def test_list_group_members_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful listing of group members."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the get_group_memberships function
            with patch('crud.groups.get_group_memberships') as mock_get_memberships:
                mock_membership1 = GroupMembership()
                mock_membership1.id = 1
                mock_membership1.user_id = 1
                mock_membership1.group_id = 1
                mock_membership1.role = "admin"
                
                mock_membership2 = GroupMembership()
                mock_membership2.id = 2
                mock_membership2.user_id = 2
                mock_membership2.group_id = 1
                mock_membership2.role = "member"
                
                mock_get_memberships.return_value = ([mock_membership1, mock_membership2], 2)

                # Act
                response = client.get("/api/groups/1/members")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "items" in data
                assert "total" in data
                assert len(data["items"]) == 2
                assert data["total"] == 2

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_member_role_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful member role update."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_change_member_role function
        with patch('utils.group_permissions.can_user_change_member_role') as mock_can_change:
            mock_can_change.return_value = True
            
            # Mock the get_user_membership_in_group function
            with patch('crud.groups.get_user_membership_in_group') as mock_get_membership:
                mock_membership = GroupMembership()
                mock_membership.id = 1
                mock_membership.user_id = 2
                mock_membership.group_id = 1
                mock_membership.role = "member"
                mock_get_membership.return_value = mock_membership
                
                # Mock the update_group_membership function
                with patch('crud.groups.update_group_membership') as mock_update_membership:
                    mock_updated_membership = GroupMembership()
                    mock_updated_membership.id = 1
                    mock_updated_membership.user_id = 2
                    mock_updated_membership.group_id = 1
                    mock_updated_membership.role = "admin"
                    mock_update_membership.return_value = mock_updated_membership

                    # Act
                    response = client.put("/api/groups/1/members/2", json={
                        "role": "admin"
                    })

                    # Assert
                    assert response.status_code == 200
                    assert response.json()["role"] == "admin"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_member_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful member removal."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_remove_members function
        with patch('utils.group_permissions.can_user_remove_members') as mock_can_remove:
            mock_can_remove.return_value = True
            
            # Mock the get_user_membership_in_group function
            with patch('crud.groups.get_user_membership_in_group') as mock_get_membership:
                mock_membership = GroupMembership()
                mock_membership.id = 1
                mock_membership.user_id = 2
                mock_membership.group_id = 1
                mock_get_membership.return_value = mock_membership
                
                # Mock the remove_user_from_group function
                with patch('crud.groups.remove_user_from_group') as mock_remove_user:
                    mock_remove_user.return_value = True

                    # Act
                    response = client.delete("/api/groups/1/members/2")

                    # Assert
                    assert response.status_code == 204

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_assign_patient_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful patient assignment to group."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_assign_patients function
        with patch('utils.group_permissions.can_user_assign_patients') as mock_can_assign:
            mock_can_assign.return_value = True
            
            # Mock the assign_patient_to_group function
            with patch('crud.groups.assign_patient_to_group') as mock_assign_patient:
                mock_assignment = GroupPatient()
                mock_assignment.id = 1
                mock_assignment.group_id = 1
                mock_assignment.patient_id = 1
                mock_assign_patient.return_value = mock_assignment

                # Act
                response = client.post("/api/groups/1/patients", json={
                    "patient_id": 1
                })

                # Assert
                assert response.status_code == 201
                assert response.json()["patient_id"] == 1

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_assign_patient_forbidden(self, mock_get_db, mock_get_current_user, mock_user):
        """Test patient assignment when not authorized."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_assign_patients function
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
    def test_list_group_patients_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful listing of group patients."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the get_group_patients function
            with patch('crud.groups.get_group_patients') as mock_get_patients:
                mock_assignment1 = GroupPatient()
                mock_assignment1.id = 1
                mock_assignment1.group_id = 1
                mock_assignment1.patient_id = 1
                
                mock_assignment2 = GroupPatient()
                mock_assignment2.id = 2
                mock_assignment2.group_id = 1
                mock_assignment2.patient_id = 2
                
                mock_get_patients.return_value = ([mock_assignment1, mock_assignment2], 2)

                # Act
                response = client.get("/api/groups/1/patients")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "items" in data
                assert "total" in data
                assert len(data["items"]) == 2
                assert data["total"] == 2

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_patient_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful patient removal from group."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_remove_patients function
        with patch('utils.group_permissions.can_user_remove_patients') as mock_can_remove:
            mock_can_remove.return_value = True
            
            # Mock the is_patient_assigned_to_group function
            with patch('crud.groups.is_patient_assigned_to_group') as mock_is_assigned:
                mock_is_assigned.return_value = True
                
                # Mock the remove_patient_from_group function
                with patch('crud.groups.remove_patient_from_group') as mock_remove_patient:
                    mock_remove_patient.return_value = True

                    # Act
                    response = client.delete("/api/groups/1/patients/1")

                    # Assert
                    assert response.status_code == 204

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_patient_forbidden(self, mock_get_db, mock_get_current_user, mock_user):
        """Test patient removal when not authorized."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_remove_patients function
        with patch('utils.group_permissions.can_user_remove_patients') as mock_can_remove:
            mock_can_remove.return_value = False

            # Act
            response = client.delete("/api/groups/1/patients/1")

            # Assert
            assert response.status_code == 403
            assert "admins can remove" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_group_invitation_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful group invitation creation."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the get_group function
            with patch('crud.groups.get_group') as mock_get_group:
                mock_group = Group()
                mock_group.id = 1
                mock_group.name = "Test Group"
                mock_get_group.return_value = mock_group
                
                # Mock the create_group_invitation function
                with patch('services.group_invitations.create_group_invitation') as mock_create_invitation:
                    mock_invitation = Mock()
                    mock_invitation.id = 1
                    mock_invitation.group_id = 1
                    mock_invitation.email = "invitee@example.com"
                    mock_invitation.role = "member"
                    mock_create_invitation.return_value = mock_invitation

                    # Act
                    response = client.post("/api/groups/1/invitations", json={
                        "email": "invitee@example.com",
                        "role": "member"
                    })

                    # Assert
                    assert response.status_code == 201
                    assert response.json()["email"] == "invitee@example.com"
                    assert response.json()["role"] == "member"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_list_group_invitations_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful listing of group invitations."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the get_group_invitations function
            with patch('services.group_invitations.get_group_invitations') as mock_get_invitations:
                mock_invitation1 = Mock()
                mock_invitation1.id = 1
                mock_invitation1.group_id = 1
                mock_invitation1.email = "invitee1@example.com"
                mock_invitation1.role = "member"
                
                mock_invitation2 = Mock()
                mock_invitation2.id = 2
                mock_invitation2.group_id = 1
                mock_invitation2.email = "invitee2@example.com"
                mock_invitation2.role = "admin"
                
                mock_get_invitations.return_value = ([mock_invitation1, mock_invitation2], 2)

                # Act
                response = client.get("/api/groups/1/invitations")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "items" in data
                assert "total" in data
                assert len(data["items"]) == 2
                assert data["total"] == 2

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_group_invitation_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful group invitation update."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the get_group function
            with patch('crud.groups.get_group') as mock_get_group:
                mock_group = Group()
                mock_group.id = 1
                mock_group.name = "Test Group"
                mock_get_group.return_value = mock_group
                
                # Mock the update_group_invitation function
                with patch('services.group_invitations.update_group_invitation') as mock_update_invitation:
                    mock_updated_invitation = Mock()
                    mock_updated_invitation.id = 1
                    mock_updated_invitation.group_id = 1
                    mock_updated_invitation.email = "invitee@example.com"
                    mock_updated_invitation.role = "admin"
                    mock_update_invitation.return_value = mock_updated_invitation

                    # Act
                    response = client.put("/api/groups/1/invitations/1", json={
                        "role": "admin"
                    })

                    # Assert
                    assert response.status_code == 200
                    assert response.json()["role"] == "admin"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_revoke_group_invitation_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful group invitation revocation."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True
            
            # Mock the get_group function
            with patch('crud.groups.get_group') as mock_get_group:
                mock_group = Group()
                mock_group.id = 1
                mock_group.name = "Test Group"
                mock_get_group.return_value = mock_group
                
                # Mock the revoke_group_invitation function
                with patch('services.group_invitations.revoke_group_invitation') as mock_revoke_invitation:
                    mock_revoke_invitation.return_value = Mock()

                    # Act
                    response = client.delete("/api/groups/1/invitations/1")

                    # Assert
                    assert response.status_code == 204

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_accept_group_invitation_success(self, mock_get_db, mock_get_current_user, mock_user):
        """Test successful group invitation acceptance."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the accept_group_invitation function
        with patch('services.group_invitations.accept_group_invitation') as mock_accept_invitation:
            mock_accepted_invitation = Mock()
            mock_accepted_invitation.id = 1
            mock_accepted_invitation.group_id = 1
            mock_accepted_invitation.email = "test@example.com"
            mock_accepted_invitation.role = "member"
            mock_accept_invitation.return_value = mock_accepted_invitation
            
            # Mock the invalidate_user_group_cache function
            with patch('utils.group_authorization.invalidate_user_group_cache') as mock_invalidate_cache:
                mock_invalidate_cache.return_value = None

                # Act
                response = client.post("/api/groups/invitations/accept", json={
                    "token": "test-token"
                })

                # Assert
                assert response.status_code == 200
                assert response.json()["id"] == 1

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_decline_group_invitation_success(self, mock_get_db, mock_get_current_user, mock_user):
        """Test successful group invitation decline."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the decline_group_invitation function
        with patch('services.group_invitations.decline_group_invitation') as mock_decline_invitation:
            mock_declined_invitation = Mock()
            mock_declined_invitation.id = 1
            mock_declined_invitation.group_id = 1
            mock_declined_invitation.email = "test@example.com"
            mock_declined_invitation.role = "member"
            mock_decline_invitation.return_value = mock_declined_invitation

            # Act
            response = client.post("/api/groups/invitations/decline", json={
                "token": "test-token"
            })

            # Assert
            assert response.status_code == 200
            assert response.json()["id"] == 1

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_unauthorized_access(self, mock_get_db, mock_get_current_user):
        """Test that unauthorized access is properly rejected."""
        # Arrange
        mock_get_current_user.side_effect = Exception("Not authenticated")
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db

        # Act
        response = client.post("/api/groups/", json={
            "name": "Unauthorized Group"
        })

        # Assert
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__])
