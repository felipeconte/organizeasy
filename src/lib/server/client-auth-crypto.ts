import crypto from 'crypto'

export interface ClientPortalSessionData {
  cpf: string // 11 dígitos limpos
  name: string
  email?: string | null
  exp: number // timestamp em ms
}

const SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'organizeasy-client-portal-secure-salt-key-2026'

/**
 * Gera uma senha aleatória de exatamente 10 caracteres contendo:
 * - Apenas letras MAIÚSCULAS (A-Z)
 * - Números (0-9)
 * - Caracteres especiais (@, #, $, %, &, *, !)
 * Exemplo: "K8@M9$W2#P"
 */
export function generateSecureClientPassword(): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const specials = '@#$%&*!'
  const allChars = uppers + digits + specials

  // Garante ao menos 1 maiúscula, 1 número e 1 caractere especial
  const passwordChars: string[] = [
    uppers[crypto.randomInt(0, uppers.length)],
    digits[crypto.randomInt(0, digits.length)],
    specials[crypto.randomInt(0, specials.length)],
  ]

  // Preenche os 7 caracteres restantes para totalizar exatamente 10 caracteres
  for (let i = 0; i < 7; i++) {
    passwordChars.push(allChars[crypto.randomInt(0, allChars.length)])
  }

  // Embaralha aleatoriamente (Fisher-Yates seguro)
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1)
    const temp = passwordChars[i]
    passwordChars[i] = passwordChars[j]
    passwordChars[j] = temp
  }

  return passwordChars.join('')
}

/**
 * Cria hash PBKDF2 com Salt seguro
 */
export function hashClientPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verifica se a senha corresponde ao hash PBKDF2
 */
export function verifyClientPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false
  const [salt, originalHash] = storedHash.split(':')
  if (!salt || !originalHash) return false

  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'))
}

/**
 * Assina e cria um token seguro para a sessão do cliente (cookie)
 */
export function signClientPortalSession(data: Omit<ClientPortalSessionData, 'exp'>): string {
  const payload: ClientPortalSessionData = {
    ...data,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 dias de validade
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadBase64)
    .digest('base64url')

  return `${payloadBase64}.${signature}`
}

/**
 * Valida e extrai os dados da sessão do cookie do cliente
 */
export function verifyClientPortalSession(token: string): ClientPortalSessionData | null {
  if (!token || !token.includes('.')) return null
  const [payloadBase64, signature] = token.split('.')
  if (!payloadBase64 || !signature) return null

  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadBase64)
    .digest('base64url')

  if (signature !== expectedSignature) {
    return null
  }

  try {
    const json = Buffer.from(payloadBase64, 'base64url').toString('utf-8')
    const payload = JSON.parse(json) as ClientPortalSessionData

    if (!payload.exp || Date.now() > payload.exp) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Gera código de acesso alfanumérico aleatório de 6 caracteres em caixa alta (ex: "K7X9B2").
 * Exclui caracteres ambíguos (0/O e 1/I) para evitar confusão visual do cliente.
 */
export function generateClientAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars[crypto.randomInt(0, chars.length)]
  }
  return result
}

/**
 * Gera um token único de portal seguro para URL
 */
export function generateClientPortalToken(): string {
  return `cp_${crypto.randomBytes(16).toString('hex')}`
}

/**
 * Gera um código OTP numérico de 6 dígitos para confirmação de aprovação por e-mail (ex: "481920")
 */
export function generateApprovalOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

export interface ClientPortalAccessCookieData {
  portalToken: string
  clientId: string
  organizationId: string
  exp: number
}

/**
 * Assina e cria um cookie seguro autorizando o acesso ao portal geral de um cliente
 */
export function signClientPortalAccessCookie(data: {
  portalToken: string
  clientId: string
  organizationId: string
}): string {
  const payload: ClientPortalAccessCookieData = {
    portalToken: data.portalToken,
    clientId: data.clientId,
    organizationId: data.organizationId,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 dias
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadBase64)
    .digest('base64url')

  return `${payloadBase64}.${signature}`
}

/**
 * Valida o cookie de acesso do portal e confirma se corresponde ao portalToken esperado
 */
export function verifyClientPortalAccessCookie(
  token: string,
  expectedPortalToken: string
): ClientPortalAccessCookieData | null {
  if (!token || !token.includes('.')) return null
  const [payloadBase64, signature] = token.split('.')
  if (!payloadBase64 || !signature) return null

  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadBase64)
    .digest('base64url')

  if (signature !== expectedSignature) {
    return null
  }

  try {
    const json = Buffer.from(payloadBase64, 'base64url').toString('utf-8')
    const payload = JSON.parse(json) as ClientPortalAccessCookieData

    if (!payload.exp || Date.now() > payload.exp) {
      return null
    }

    if (payload.portalToken !== expectedPortalToken) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

