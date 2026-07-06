import { Client, Account, Databases, Storage, Users } from 'node-appwrite'

/**
 * Cria um client administrativo com API Key — para uso em API routes,
 * middleware e qualquer operação server-side que não depende de sessão de usuário.
 */
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '')

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
  }
}

/**
 * Cria um client com a sessão do usuário — para validar sessão no middleware
 * e fazer operações no contexto do usuário server-side.
 */
export function createSessionClient(session: string) {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
    .setJWT(session)

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
  }
}
