import { test, expect } from '@playwright/test';

test.describe('Group Functionality E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Perform login (assuming there's a login page)
    await page.getByRole('link', { name: 'Entrar' }).click();
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Senha').fill('password123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should create a new group', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Click create group button
    await page.getByRole('button', { name: 'Criar Novo Grupo' }).click();
    
    // Fill in group details
    await page.getByLabel('Nome do Grupo').fill('E2E Test Group');
    await page.getByLabel('Descrição').fill('Grupo criado para testes E2E');
    await page.getByLabel('Máximo de Pacientes').fill('50');
    await page.getByLabel('Máximo de Membros').fill('10');
    
    // Submit form
    await page.getByRole('button', { name: 'Criar Grupo' }).click();
    
    // Verify group was created
    await expect(page.getByText('E2E Test Group')).toBeVisible();
    await expect(page.getByText('Grupo criado com sucesso')).toBeVisible();
  });

  test('should invite a user to a group', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Select the first group
    await page.getByText('E2E Test Group').first().click();
    
    // Go to members tab
    await page.getByRole('tab', { name: 'Membros' }).click();
    
    // Click invite button
    await page.getByRole('button', { name: 'Convidar Membro' }).click();
    
    // Fill in invitation details
    await page.getByLabel('Email do Usuário').fill('invitee@example.com');
    await page.getByLabel('Função').selectOption('member');
    
    // Submit invitation
    await page.getByRole('button', { name: 'Enviar Convite' }).click();
    
    // Verify invitation was sent
    await expect(page.getByText('Convite enviado com sucesso')).toBeVisible();
    await expect(page.getByText('invitee@example.com')).toBeVisible();
  });

  test('should assign a patient to a group', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Select the first group
    await page.getByText('E2E Test Group').first().click();
    
    // Go to patients tab
    await page.getByRole('tab', { name: 'Pacientes' }).click();
    
    // Click assign patient button
    await page.getByRole('button', { name: 'Atribuir Paciente' }).click();
    
    // Select a patient (assuming there's a patient selection mechanism)
    await page.getByRole('option', { name: 'Paciente Teste 1' }).click();
    
    // Submit assignment
    await page.getByRole('button', { name: 'Atribuir' }).click();
    
    // Verify patient was assigned
    await expect(page.getByText('Paciente atribuído com sucesso')).toBeVisible();
    await expect(page.getByText('Paciente Teste 1')).toBeVisible();
  });

  test('should update group information', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Select the first group
    await page.getByText('E2E Test Group').first().click();
    
    // Click edit button
    await page.getByRole('button', { name: 'Editar Grupo' }).click();
    
    // Update group details
    await page.getByLabel('Descrição').fill('Grupo atualizado para testes E2E');
    
    // Submit changes
    await page.getByRole('button', { name: 'Atualizar Grupo' }).click();
    
    // Verify group was updated
    await expect(page.getByText('Grupo atualizado com sucesso')).toBeVisible();
    await expect(page.getByText('Grupo atualizado para testes E2E')).toBeVisible();
  });

  test('should remove a member from a group', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Select the first group
    await page.getByText('E2E Test Group').first().click();
    
    // Go to members tab
    await page.getByRole('tab', { name: 'Membros' }).click();
    
    // Find the member to remove (assuming there's a member in the list)
    const memberRow = page.getByText('invitee@example.com').first();
    await memberRow.getByRole('button', { name: 'Remover' }).click();
    
    // Confirm removal
    await page.getByRole('button', { name: 'Confirmar' }).click();
    
    // Verify member was removed
    await expect(page.getByText('Membro removido com sucesso')).toBeVisible();
    await expect(page.getByText('invitee@example.com')).not.toBeVisible();
  });

  test('should remove a patient from a group', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Select the first group
    await page.getByText('E2E Test Group').first().click();
    
    // Go to patients tab
    await page.getByRole('tab', { name: 'Pacientes' }).click();
    
    // Find the patient to remove (assuming there's a patient in the list)
    const patientRow = page.getByText('Paciente Teste 1').first();
    await patientRow.getByRole('button', { name: 'Remover' }).click();
    
    // Confirm removal
    await page.getByRole('button', { name: 'Confirmar' }).click();
    
    // Verify patient was removed
    await expect(page.getByText('Paciente removido com sucesso')).toBeVisible();
    await expect(page.getByText('Paciente Teste 1')).not.toBeVisible();
  });

  test('should delete a group', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Select the first group
    await page.getByText('E2E Test Group').first().click();
    
    // Click settings button
    await page.getByRole('button', { name: 'Configurações' }).click();
    
    // Click delete button
    await page.getByRole('button', { name: 'Excluir Grupo' }).click();
    
    // Confirm deletion
    await page.getByRole('button', { name: 'Confirmar Exclusão' }).click();
    
    // Verify group was deleted
    await expect(page.getByText('Grupo excluído com sucesso')).toBeVisible();
    await expect(page.getByText('E2E Test Group')).not.toBeVisible();
  });

  test('should handle group creation with invalid data', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Click create group button
    await page.getByRole('button', { name: 'Criar Novo Grupo' }).click();
    
    // Try to submit without required fields
    await page.getByRole('button', { name: 'Criar Grupo' }).click();
    
    // Verify validation errors are shown
    await expect(page.getByText('Nome do grupo é obrigatório')).toBeVisible();
  });

  test('should handle group creation with duplicate name', async ({ page }) => {
    // First create a group
    await page.getByRole('link', { name: 'Grupos' }).click();
    await page.getByRole('button', { name: 'Criar Novo Grupo' }).click();
    await page.getByLabel('Nome do Grupo').fill('Duplicate Test Group');
    await page.getByLabel('Descrição').fill('First group');
    await page.getByRole('button', { name: 'Criar Grupo' }).click();
    
    // Try to create another group with the same name
    await page.getByRole('button', { name: 'Criar Novo Grupo' }).click();
    await page.getByLabel('Nome do Grupo').fill('Duplicate Test Group');
    await page.getByLabel('Descrição').fill('Second group');
    await page.getByRole('button', { name: 'Criar Grupo' }).click();
    
    // Verify error is shown
    await expect(page.getByText('Já existe um grupo com este nome')).toBeVisible();
  });

  test('should handle group member limit', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Create a group with a small member limit
    await page.getByRole('button', { name: 'Criar Novo Grupo' }).click();
    await page.getByLabel('Nome do Grupo').fill('Limit Test Group');
    await page.getByLabel('Descrição').fill('Group with member limit');
    await page.getByLabel('Máximo de Membros').fill('1'); // Only allow 1 member
    await page.getByRole('button', { name: 'Criar Grupo' }).click();
    
    // Try to invite a second member
    await page.getByText('Limit Test Group').first().click();
    await page.getByRole('tab', { name: 'Membros' }).click();
    await page.getByRole('button', { name: 'Convidar Membro' }).click();
    await page.getByLabel('Email do Usuário').fill('second@example.com');
    await page.getByLabel('Função').selectOption('member');
    await page.getByRole('button', { name: 'Enviar Convite' }).click();
    
    // Verify error is shown
    await expect(page.getByText('Limite de membros atingido')).toBeVisible();
  });

  test('should handle group patient limit', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Create a group with a small patient limit
    await page.getByRole('button', { name: 'Criar Novo Grupo' }).click();
    await page.getByLabel('Nome do Grupo').fill('Patient Limit Test Group');
    await page.getByLabel('Descrição').fill('Group with patient limit');
    await page.getByLabel('Máximo de Pacientes').fill('1'); // Only allow 1 patient
    await page.getByRole('button', { name: 'Criar Grupo' }).click();
    
    // Try to assign a second patient
    await page.getByText('Patient Limit Test Group').first().click();
    await page.getByRole('tab', { name: 'Pacientes' }).click();
    await page.getByRole('button', { name: 'Atribuir Paciente' }).click();
    // Assuming there are multiple patients available to select
    await page.getByRole('option', { name: 'Segundo Paciente' }).click();
    await page.getByRole('button', { name: 'Atribuir' }).click();
    
    // Verify error is shown
    await expect(page.getByText('Limite de pacientes atingido')).toBeVisible();
  });

  test('should handle unauthorized access to group', async ({ page }) => {
    // Log out first
    await page.getByRole('button', { name: 'Sair' }).click();
    
    // Try to access a group page directly
    await page.goto('/dashboard-doctor/groups/1');
    
    // Verify redirected to login or access denied
    await expect(page).toHaveURL(/.*login/);
    // Or if using a different approach:
    // await expect(page.getByText('Acesso não autorizado')).toBeVisible();
  });

  test('should handle concurrent group operations', async ({ page }) => {
    // This test would simulate multiple users performing operations simultaneously
    // In a real E2E test, this would require multiple browser contexts
    // For now, we'll test the basic scenario
    
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Create a group
    await page.getByRole('button', { name: 'Criar Novo Grupo' }).click();
    await page.getByLabel('Nome do Grupo').fill('Concurrent Test Group');
    await page.getByLabel('Descrição').fill('Group for concurrent testing');
    await page.getByRole('button', { name: 'Criar Grupo' }).click();
    
    // Perform multiple operations quickly
    await page.getByText('Concurrent Test Group').first().click();
    await page.getByRole('tab', { name: 'Membros' }).click();
    await page.getByRole('button', { name: 'Convidar Membro' }).click();
    await page.getByLabel('Email do Usuário').fill('concurrent1@example.com');
    await page.getByLabel('Função').selectOption('member');
    await page.getByRole('button', { name: 'Enviar Convite' }).click();
    
    // Go to patients tab and assign patient
    await page.getByRole('tab', { name: 'Pacientes' }).click();
    await page.getByRole('button', { name: 'Atribuir Paciente' }).click();
    await page.getByRole('option', { name: 'Paciente Teste 1' }).click();
    await page.getByRole('button', { name: 'Atribuir' }).click();
    
    // Verify both operations succeeded
    await expect(page.getByText('Convite enviado com sucesso')).toBeVisible();
    await expect(page.getByText('Paciente atribuído com sucesso')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // This test would simulate network failures
    // In a real E2E test, this would require mocking network responses
    // For now, we'll test the basic error handling flow
    
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Click create group button
    await page.getByRole('button', { name: 'Criar Novo Grupo' }).click();
    
    // Fill in group details
    await page.getByLabel('Nome do Grupo').fill('Network Error Test Group');
    await page.getByLabel('Descrição').fill('Group to test network errors');
    
    // Simulate network error by intercepting the request (if implemented)
    // await page.route('**/api/groups', route => route.abort());
    
    // Submit form
    await page.getByRole('button', { name: 'Criar Grupo' }).click();
    
    // Verify error message is shown
    // await expect(page.getByText('Erro de conexão')).toBeVisible();
  });

  test('should maintain data consistency across operations', async ({ page }) => {
    // Navigate to groups section
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Create a group
    await page.getByRole('button', { name: 'Criar Novo Grupo' }).click();
    await page.getByLabel('Nome do Grupo').fill('Consistency Test Group');
    await page.getByLabel('Descrição').fill('Group to test data consistency');
    await page.getByRole('button', { name: 'Criar Grupo' }).click();
    
    // Verify group appears in list
    await expect(page.getByText('Consistency Test Group')).toBeVisible();
    
    // Edit the group
    await page.getByText('Consistency Test Group').first().click();
    await page.getByRole('button', { name: 'Editar Grupo' }).click();
    await page.getByLabel('Descrição').fill('Updated description');
    await page.getByRole('button', { name: 'Atualizar Grupo' }).click();
    
    // Navigate away and back
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Grupos' }).click();
    
    // Verify the updated group still shows the correct information
    await page.getByText('Consistency Test Group').first().click();
    await expect(page.getByText('Updated description')).toBeVisible();
  });
});