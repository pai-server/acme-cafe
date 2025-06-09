'use server';

export async function inviteTeamMember(formData: FormData) {
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  
  // TODO: Implementar lógica de invitación
  console.log('Inviting team member:', { email, role });
  
  // Por ahora solo mostramos un alert
  // En una implementación real, aquí enviarías un email de invitación
}

export async function savePreferences(formData: FormData) {
  const roastType = formData.get('roastType') as string;
  const deliveryFrequency = formData.get('deliveryFrequency') as string;
  
  // TODO: Guardar preferencias en la base de datos
  console.log('Saving preferences:', { roastType, deliveryFrequency });
  
  // En una implementación real, aquí guardarías las preferencias del usuario
} 