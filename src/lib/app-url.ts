/**
 * Retorna a URL base da aplicação de forma segura, resiliente e blindada.
 *
 * Princípios de Blindagem:
 * 1. Cliente (Browser): se executado no navegador, utiliza sempre window.location.origin.
 *    - Se acessado em http://localhost:3000 -> retorna http://localhost:3000
 *    - Se acessado em https://www.organizeasy.com.br -> retorna https://www.organizeasy.com.br
 *    - Se acessado em preview Vercel -> retorna o domínio de preview
 * 
 * 2. Servidor em Produção:
 *    - NUNCA retorna 'localhost' ou '127.0.0.1' sob hipótese alguma.
 *    - Se houver NEXT_PUBLIC_APP_URL ou NEXT_PUBLIC_SITE_URL válido (sem localhost), utiliza-o.
 *    - Caso contrário, utiliza VERCEL_PROJECT_PRODUCTION_URL ou o domínio oficial https://www.organizeasy.com.br.
 *
 * 3. Servidor em Desenvolvimento Local:
 *    - Retorna http://localhost:3000 (ou variável explícita).
 */
export function getAppBaseUrl(): string {
  // 1. Contexto de Navegador (Client-side)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }

  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL === '1'

  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '')
    .trim()
    .replace(/\/$/, '')

  // 2. Contexto de Produção no Servidor (Blindagem estrita anti-localhost)
  if (isProduction) {
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl
    }

    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    }

    return 'https://www.organizeasy.com.br'
  }

  // 3. Contexto de Desenvolvimento Local (Localhost)
  if (envUrl) {
    return envUrl
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}

/**
 * Obtém dinamicamente a URL base a partir dos headers da requisição HTTP (Server Actions / Route Handlers).
 * Permite detectar com 100% de fidelidade se a requisição originou de localhost ou de produção.
 */
export async function getRequestBaseUrl(): Promise<string> {
  // Se estiver no browser, o origin é direto e imediato
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }

  try {
    const { headers } = await import('next/headers')
    const headerList = await headers()

    // 1. Tenta extrair origin ou referer do cliente
    const originHeader = headerList.get('origin')
    if (originHeader && (originHeader.startsWith('http://') || originHeader.startsWith('https://'))) {
      return originHeader.replace(/\/$/, '')
    }

    // 2. Tenta extrair x-forwarded-host ou host
    const forwardedHost = headerList.get('x-forwarded-host') || headerList.get('host')
    if (forwardedHost) {
      const host = forwardedHost.split(',')[0].trim()
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1')
      const proto = headerList.get('x-forwarded-proto') || (isLocal ? 'http' : 'https')
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  } catch {
    // Headers indisponíveis fora de contexto de requisição
  }

  return getAppBaseUrl()
}

/**
 * Retorna uma URL pública com HTTPS para assets em e-mails (como logos e imagens),
 * garantindo que clientes de e-mail (Gmail, Outlook, Apple Mail) consigam carregar
 * as imagens mesmo quando o e-mail for disparado de um ambiente de desenvolvimento local.
 */
export function getEmailAssetBaseUrl(): string {
  const base = getAppBaseUrl()
  if (base.includes('localhost') || base.includes('127.0.0.1')) {
    return 'https://www.organizeasy.com.br'
  }
  return base
}
