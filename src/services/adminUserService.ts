import { quickbiteApi, type ApiRole } from '../services/api/quickbiteApi';

export type AdminUserCreateInput = {
  email: string;
  password: string;
  full_name: string;
  role: ApiRole;
  ti?: string;
  student_code?: string;
  relationship?: string;
};

export type AdminUserUpdateInput = AdminUserCreateInput & { id: string };

export type ProtectedCredentialsInput = {
  id: string;
  email: string;
  password?: string;
};

function mapAdminUserError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();
  if (message.includes('forbidden') || message.includes('not_authorized')) return new Error('No tienes permisos de administrador para gestionar usuarios.');
  if (message.includes('already_exists') || message.includes('email_already')) return new Error('El correo electrónico ya está registrado.');
  if (message.includes('invalid_user_payload')) return new Error('Los datos del usuario no son válidos.');
  if (message.includes('protected_account')) return new Error('Esta cuenta requiere la intervención de otro administrador protegido.');
  return new Error(raw || 'No se pudo completar la operación de usuario.');
}

export async function createAdminManagedUser(input: AdminUserCreateInput) {
  if (input.role !== 'admin' && input.role !== 'staff') {
    throw new Error('Las cuentas estudiante y padre se crean mediante sus flujos de registro correspondientes.');
  }
  try {
    const result = await quickbiteApi().createInternalUser({
      email: input.email.trim().toLowerCase(),
      fullName: input.full_name.trim(),
      role: input.role,
      password: input.password,
    });
    return { id: result.user.id, email: result.user.email };
  } catch (error) {
    throw mapAdminUserError(error);
  }
}

export async function updateAdminManagedUser(input: AdminUserUpdateInput) {
  try {
    const result = await quickbiteApi().updateAdminUser({
      id: input.id,
      email: input.email.trim().toLowerCase(),
      fullName: input.full_name.trim(),
      role: input.role,
      password: input.password,
    });
    return { id: result.user.id, email: result.user.email };
  } catch (error) {
    throw mapAdminUserError(error);
  }
}

export async function updateProtectedAdminCredentials(input: ProtectedCredentialsInput) {
  try {
    const result = await quickbiteApi().updateProtectedCredentials({
      id: input.id,
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    return result.user;
  } catch (error) {
    throw mapAdminUserError(error);
  }
}
