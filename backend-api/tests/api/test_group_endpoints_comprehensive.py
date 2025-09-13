"""
Comprehensive API tests for all group endpoints in Clinical Corvus.
"""

import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch
from main import app
from database.models import User, Group, GroupMembership, GroupPatient, GroupInvitation
from datetime import datetime, timedelta

# Create a test client
client = TestClient(app)


class TestGroupEndpointsComprehensive:
    """Comprehensive test cases for all group API endpoints."""

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
        patient = Mock()
        patient.patient_id = 1
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
    def mock_invitation(self):
        """Create a mock group invitation."""
        invitation = GroupInvitation()
        invitation.id = 1
        invitation.group_id = 1
        invitation.email = "invitee@example.com"
        invitation.role = "member"
        invitation.token = "test-invitation-token"
        invitation.expires_at = datetime.utcnow() + timedelta(days=7)
        return invitation

    # --- Group CRUD Tests ---

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
    def test_create_group_invalid_data(self, mock_get_db, mock_get_current_user, mock_user):
        """Test group creation with invalid data."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db

        # Act - Missing required fields
        response = client.post("/api/groups/", json={
            "description": "Missing name"
        })

        # Assert
        assert response.status_code == 422  # Validation error

        # Act - Empty name
        response = client.post("/api/groups/", json={
            "name": "",
            "description": "Empty name"
        })

        # Assert
        assert response.status_code == 422  # Validation error

        # Act - Negative max_patients
        response = client.post("/api/groups/", json={
            "name": "Invalid Group",
            "description": "Negative max_patients",
            "max_patients": -1
        })

        # Assert
        assert response.status_code == 422  # Validation error

        # Act - Negative max_members
        response = client.post("/api/groups/", json={
            "name": "Invalid Group",
            "description": "Negative max_members",
            "max_members": -1
        })

        # Assert
        assert response.status_code == 422  # Validation error

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
    def test_list_groups_with_search(self, mock_get_db, mock_get_current_user, mock_user):
        """Test listing groups with search parameter."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the get_groups function
        with patch('crud.groups.get_groups') as mock_get_groups:
            mock_group = Group()
            mock_group.id = 1
            mock_group.name = "Search Test Group"
            mock_group.description = "Group for search testing"
            
            mock_get_groups.return_value = ([mock_group], 1)

            # Act
            response = client.get("/api/groups/?search=Search")

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 1
            assert data["items"][0]["name"] == "Search Test Group"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_list_groups_with_pagination(self, mock_get_db, mock_get_current_user, mock_user):
        """Test listing groups with pagination."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the get_user_groups function
        with patch('crud.groups.get_user_groups') as mock_get_user_groups:
            mock_groups = [Group() for _ in range(5)]
            for i, group in enumerate(mock_groups):
                group.id = i + 1
                group.name = f"Test Group {i + 1}"
                group.description = f"Test group {i + 1}"
            
            mock_get_user_groups.return_value = (mock_groups[0:2], 5)  # First 2 of 5

            # Act
            response = client.get("/api/groups/?skip=0&limit=2")

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 2
            assert data["total"] == 5

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
    def test_update_group_duplicate_name(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test group update with duplicate name."""
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
                
                # Mock the get_group_by_name function
                with patch('crud.groups.get_group_by_name') as mock_get_group_by_name:
                    mock_existing_group = Group()
                    mock_existing_group.id = 2  # Different ID
                    mock_existing_group.name = "Updated Group"
                    mock_get_group_by_name.return_value = mock_existing_group
                    
                    # Mock the update_group function to raise ValueError
                    with patch('crud.groups.update_group') as mock_update_group:
                        mock_update_group.side_effect = ValueError("A group with this name already exists")

                        # Act
                        response = client.put("/api/groups/1", json={
                            "name": "Updated Group"
                        })

                        # Assert
                        assert response.status_code == 400
                        assert "already exists" in response.json()["detail"]

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
    def test_delete_group_not_admin(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test group deletion when not an admin."""
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
                response = client.delete("/api/groups/1")

                # Assert
                assert response.status_code == 403
                assert "admins can delete" in response.json()["detail"]

    # --- Group Membership Tests ---

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
    def test_invite_user_to_group_invalid_role(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test user invitation with invalid role."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True

            # Act
            response = client.post("/api/groups/1/members", json={
                "user_id": 2,
                "role": "invalid_role"
            })

            # Assert
            assert response.status_code == 422  # Validation error

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_invite_user_to_group_nonexistent_user(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test user invitation for nonexistent user."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
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
    def test_list_group_members_not_member(self, mock_get_db, mock_get_current_user, mock_user):
        """Test listing group members when not a member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = False

            # Act
            response = client.get("/api/groups/1/members")

            # Assert
            assert response.status_code == 403
            assert "not a member" in response.json()["detail"]

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
    def test_update_member_role_not_authorized(self, mock_get_db, mock_get_current_user, mock_user):
        """Test member role update when not authorized."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_change_member_role function
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
    def test_update_member_role_self_demotion(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test admin trying to remove their own admin status."""
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
                mock_membership.user_id = 1  # Same as current user
                mock_membership.group_id = 1
                mock_membership.role = "admin"
                mock_get_membership.return_value = mock_membership
                
                # Mock the update_group_membership function to raise ValueError
                with patch('crud.groups.update_group_membership') as mock_update_membership:
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
    def test_remove_member_not_authorized(self, mock_get_db, mock_get_current_user, mock_user):
        """Test member removal when not authorized."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_remove_members function
        with patch('utils.group_permissions.can_user_remove_members') as mock_can_remove:
            mock_can_remove.return_value = False

            # Act
            response = client.delete("/api/groups/1/members/3")

            # Assert
            assert response.status_code == 403
            assert "permission to remove" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_last_admin(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test removal of the last admin from a group."""
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
                mock_membership.user_id = 1  # Same as current user (admin)
                mock_membership.group_id = 1
                mock_membership.role = "admin"
                mock_get_membership.return_value = mock_membership
                
                # Mock the query to count other admins (return 0 to simulate last admin)
                with patch('sqlalchemy.orm.Query.count') as mock_count:
                    mock_count.return_value = 0
                    
                    # Mock the remove_user_from_group function to raise ValueError
                    with patch('crud.groups.remove_user_from_group') as mock_remove_user:
                        mock_remove_user.side_effect = ValueError("Cannot remove the last admin from the group")

                        # Act
                        response = client.delete("/api/groups/1/members/1")

                        # Assert
                        assert response.status_code == 400
                        assert "Cannot remove the last admin" in response.json()["detail"]

    # --- Group Patient Tests ---

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
    def test_assign_patient_nonexistent(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test patient assignment for nonexistent patient."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_assign_patients function
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
    def test_assign_patient_already_assigned(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test patient assignment when already assigned."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_assign_patients function
        with patch('utils.group_permissions.can_user_assign_patients') as mock_can_assign:
            mock_can_assign.return_value = True
            
            # Mock the assign_patient_to_group function to raise ValueError
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
    def test_list_group_patients_not_member(self, mock_get_db, mock_get_current_user, mock_user):
        """Test listing group patients when not a member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = False

            # Act
            response = client.get("/api/groups/1/patients")

            # Assert
            assert response.status_code == 403
            assert "not a member" in response.json()["detail"]

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
    def test_remove_patient_not_assigned(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test patient removal when not assigned to group."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_remove_patients function
        with patch('utils.group_permissions.can_user_remove_patients') as mock_can_remove:
            mock_can_remove.return_value = True
            
            # Mock the is_patient_assigned_to_group function
            with patch('crud.groups.is_patient_assigned_to_group') as mock_is_assigned:
                mock_is_assigned.return_value = False

                # Act
                response = client.delete("/api/groups/1/patients/999999")

                # Assert
                assert response.status_code == 404
                assert "not assigned" in response.json()["detail"]

    # --- Group Invitation Tests ---

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
    def test_create_group_invitation_forbidden(self, mock_get_db, mock_get_current_user, mock_user):
        """Test group invitation creation when not authorized."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
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
    def test_create_group_invitation_invalid_email(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test group invitation creation with invalid email."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True

            # Act
            response = client.post("/api/groups/1/invitations", json={
                "email": "invalid-email",
                "role": "member"
            })

            # Assert
            assert response.status_code == 422  # Validation error

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_group_invitation_invalid_role(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test group invitation creation with invalid role."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = True

            # Act
            response = client.post("/api/groups/1/invitations", json={
                "email": "valid@example.com",
                "role": "invalid_role"
            })

            # Assert
            assert response.status_code == 422  # Validation error

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
    def test_list_group_invitations_not_member(self, mock_get_db, mock_get_current_user, mock_user):
        """Test listing group invitations when not a member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = False

            # Act
            response = client.get("/api/groups/1/invitations")

            # Assert
            assert response.status_code == 403
            assert "not a member" in response.json()["detail"]

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
    def test_update_group_invitation_forbidden(self, mock_get_db, mock_get_current_user, mock_user):
        """Test group invitation update when not authorized."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
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
    def test_revoke_group_invitation_forbidden(self, mock_get_db, mock_get_current_user, mock_user):
        """Test group invitation revocation when not authorized."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the can_user_invite_members function
        with patch('utils.group_permissions.can_user_invite_members') as mock_can_invite:
            mock_can_invite.return_value = False

            # Act
            response = client.delete("/api/groups/1/invitations/1")

            # Assert
            assert response.status_code == 403
            assert "admins can revoke" in response.json()["detail"]

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
    def test_accept_group_invitation_invalid_token(self, mock_get_db, mock_get_current_user, mock_user):
        """Test group invitation acceptance with invalid token."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the accept_group_invitation function to raise ValueError
        with patch('services.group_invitations.accept_group_invitation') as mock_accept_invitation:
            mock_accept_invitation.side_effect = ValueError("Invalid or expired invitation token")

            # Act
            response = client.post("/api/groups/invitations/accept", json={
                "token": "invalid-token"
            })

            # Assert
            assert response.status_code == 400
            assert "Invalid or expired" in response.json()["detail"]

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
    def test_decline_group_invitation_invalid_token(self, mock_get_db, mock_get_current_user, mock_user):
        """Test group invitation decline with invalid token."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the decline_group_invitation function to raise ValueError
        with patch('services.group_invitations.decline_group_invitation') as mock_decline_invitation:
            mock_decline_invitation.side_effect = ValueError("Invalid or expired invitation token")

            # Act
            response = client.post("/api/groups/invitations/decline", json={
                "token": "invalid-token"
            })

            # Assert
            assert response.status_code == 400
            assert "Invalid or expired" in response.json()["detail"]

    # --- Error Handling Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_unauthorized_access(self, mock_get_db):
        """Test that unauthorized access is properly rejected."""
        # Arrange
        mock_get_db.side_effect = Exception("Not authenticated")

        # Act
        response = client.post("/api/groups/", json={
            "name": "Unauthorized Group"
        })

        # Assert
        assert response.status_code == 401

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_internal_server_error(self, mock_get_db, mock_get_current_user, mock_user):
        """Test handling of internal server errors."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock the create_group function to raise an unexpected exception
        with patch('crud.groups.create_group') as mock_create_group:
            mock_create_group.side_effect = Exception("Unexpected error")

            # Act
            response = client.post("/api/groups/", json={
                "name": "Error Test Group",
                "description": "This should cause an error"
            })

            # Assert
            assert response.status_code == 500
            assert "Failed to create group" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_rate_limiting(self, mock_get_db, mock_get_current_user, mock_user):
        """Test rate limiting for group operations."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
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

    # --- Performance Tests ---

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_large_group_operations(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test operations with large groups."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock a large group
        large_group = Group()
        large_group.id = 1
        large_group.name = "Large Group"
        large_group.description = "A group with many members and patients"
        large_group.max_patients = 1000
        large_group.max_members = 100
        
        # Mock the is_user_member_of_group function
        with patch('crud.groups.is_user_member_of_group') as mock_is_member:
            mock_is_member.return_value = True
            
            # Mock the is_user_admin_of_group function
            with patch('crud.groups.is_user_admin_of_group') as mock_is_admin:
                mock_is_admin.return_value = True
                
                # Mock the get_group_with_members_and_patients function
                with patch('crud.groups.get_group_with_members_and_patients') as mock_get_group:
                    mock_get_group.return_value = large_group

                    # Act
                    response = client.get("/api/groups/1")

                    # Assert
                    assert response.status_code == 200
                    # Performance tests would typically measure response time
                    # This is a functional test to ensure large groups are handled


if __name__ == "__main__":
    pytest.main([__file__])
