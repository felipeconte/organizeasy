/**
 * Retorna a URL base da aplicação de forma segura e resiliente.
 * 
 * 1. Prioriza variáveis de ambiente explícitas (NEXT_PUBLIC_APP_URL ou NEXT_PUBLIC_SITE_URL)
 * 2. Em produção, utiliza o domínio oficial 'https://www.organizeasy.com.br' caso nenhuma variável esteja definida
 * 3. Em desenvolvimento local, utiliza 'http://localhost:3000'
 */
export function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://www.organizeasy.com.br'
  }

  return 'http://localhost:3000'
}
