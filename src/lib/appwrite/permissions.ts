import { Permission, Role } from 'appwrite'

/**
 * Gera as permissões padrão para um documento criado pelo usuário.
 * Cada documento fica acessível apenas ao usuário que o criou.
 * Equivale ao RLS do Postgres/Supabase.
 */
export function userPermissions(userId: string) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

/**
 * Permissões somente leitura para o usuário.
 * Útil para documentos gerados pelo sistema (ex: análises de IA).
 */
export function userReadOnlyPermissions(userId: string) {
  return [
    Permission.read(Role.user(userId)),
  ]
}
