'use server'

export interface CepAddressResult {
  success: boolean
  data?: {
    street: string
    neighborhood: string
    city: string
    state: string
  }
  error?: string
}

/**
 * Server Action com fallback multi-provedor (ViaCEP -> BrasilAPI -> OpenCEP)
 * Executa no servidor Node.js, imune a bloqueios de CORS, AdBlockers e extensões do navegador.
 */
export async function lookupCepAction(cep: string): Promise<CepAddressResult> {
  const digits = (cep || '').replace(/\D/g, '')

  if (digits.length !== 8) {
    return { success: false, error: 'CEP deve conter exatamente 8 dígitos numéricos.' }
  }

  // 1. Tenta ViaCEP
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4500)

    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Organizeasy-App/1.0',
      },
      cache: 'force-cache',
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      if (!data.erro) {
        return {
          success: true,
          data: {
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: (data.uf || '').toUpperCase(),
          },
        }
      }
    }
  } catch (err) {
    console.warn('[ViaCEP Fallback]', err)
  }

  // 2. Fallback: BrasilAPI
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4500)

    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Organizeasy-App/1.0',
      },
      cache: 'force-cache',
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      if (data.city && data.state) {
        return {
          success: true,
          data: {
            street: data.street || '',
            neighborhood: data.neighborhood || '',
            city: data.city || '',
            state: (data.state || '').toUpperCase(),
          },
        }
      }
    }
  } catch (err) {
    console.warn('[BrasilAPI Fallback]', err)
  }

  // 3. Fallback: OpenCEP
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4500)

    const response = await fetch(`https://opencep.com/v1/${digits}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      cache: 'force-cache',
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      if (data.localidade && data.uf) {
        return {
          success: true,
          data: {
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: (data.uf || '').toUpperCase(),
          },
        }
      }
    }
  } catch (err) {
    console.warn('[OpenCEP Fallback]', err)
  }

  return {
    success: false,
    error: 'Não foi possível localizar o endereço para este CEP. Preencha manualmente os campos abaixo.',
  }
}

export interface AddressSearchResult {
  id: string
  label: string
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  lat?: number
  lng?: number
}

export interface AddressSearchResponse {
  success: boolean
  results?: AddressSearchResult[]
  error?: string
}

const STATE_NAME_TO_UF: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amapá: 'AP', amazonas: 'AM',
  bahia: 'BA', ceara: 'CE', ceará: 'CE', 'distrito federal': 'DF',
  'espirito santo': 'ES', 'espírito santo': 'ES', goias: 'GO', goiás: 'GO',
  maranhao: 'MA', maranhão: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', para: 'PA', pará: 'PA', paraiba: 'PB', paraíba: 'PB',
  parana: 'PR', paraná: 'PR', pernambuco: 'PE', piaui: 'PI', piauí: 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  rondonia: 'RO', rondônia: 'RO', roraima: 'RR', 'santa catarina': 'SC',
  'sao paulo': 'SP', 'são paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
}

function resolveUf(stateRaw?: string, isoRaw?: string): string {
  if (isoRaw && isoRaw.startsWith('BR-')) {
    return isoRaw.replace('BR-', '').trim().toUpperCase()
  }
  if (!stateRaw) return ''
  const trimmed = stateRaw.trim()
  if (trimmed.length === 2) return trimmed.toUpperCase()
  const normalized = trimmed.toLowerCase()
  return STATE_NAME_TO_UF[normalized] || ''
}

function formatCep(raw?: string): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  return ''
}

/**
 * Server Action para busca textual de endereços no Brasil com preenchimento automático.
 * Provedores gratuitos: Nominatim (OpenStreetMap) com fallback para Photon.
 */
export async function searchAddressByTextAction(query: string): Promise<AddressSearchResponse> {
  const cleanQuery = (query || '').trim()

  if (!cleanQuery || cleanQuery.length < 3) {
    return { success: true, results: [] }
  }

  // 1. Tenta Nominatim (OpenStreetMap)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4500)

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      cleanQuery
    )}&format=json&addressdetails=1&countrycodes=br&limit=6`

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Organizeasy-App/1.0',
      },
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        const results: AddressSearchResult[] = data.map((item: any) => {
          const addr = item.address || {}
          const street =
            addr.road ||
            addr.pedestrian ||
            addr.street ||
            addr.avenue ||
            addr.square ||
            addr.cycleway ||
            ''
          const number = addr.house_number || ''
          const neighborhood =
            addr.suburb ||
            addr.neighbourhood ||
            addr.city_district ||
            addr.residential ||
            addr.quarter ||
            ''
          const city =
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.village ||
            ''
          const state = resolveUf(addr.state, addr['ISO3166-2-lvl4'])
          const zipCode = formatCep(addr.postcode)

          const parts = [
            street ? `${street}${number ? ', ' + number : ''}` : '',
            neighborhood,
            city ? (state ? `${city} - ${state}` : city) : state,
          ].filter(Boolean)

          const cepBadge = zipCode ? ` (CEP: ${zipCode})` : ''
          const label = (parts.join(' - ') || item.display_name) + cepBadge

          const parsedLat = parseFloat(item.lat)
          const parsedLng = parseFloat(item.lon)
          const lat = !isNaN(parsedLat) ? parsedLat : undefined
          const lng = !isNaN(parsedLng) ? parsedLng : undefined

          return {
            id: String(item.place_id || Math.random()),
            label,
            street,
            number,
            neighborhood,
            city,
            state,
            zipCode,
            lat,
            lng,
          }
        })

        return { success: true, results }
      }
    }
  } catch (err) {
    console.warn('[Nominatim Search Fallback]', err)
  }

  // 2. Fallback: Photon (Komoot Geocoding)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4500)

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      cleanQuery
    )}&limit=6&lat=-14.235&lon=-51.9253`

    const response = await fetch(photonUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const filtered = data.features.filter((f: any) => {
          const props = f.properties || {}
          return (
            props.countrycode === 'BR' ||
            props.country === 'Brasil' ||
            props.country === 'Brazil' ||
            !props.countrycode
          )
        })

        if (filtered.length > 0) {
          const results: AddressSearchResult[] = filtered.map((f: any, idx: number) => {
            const props = f.properties || {}
            const street = props.street || props.name || ''
            const number = props.housenumber || ''
            const neighborhood = props.district || props.suburb || props.neighbourhood || ''
            const city = props.city || props.town || ''
            const state = resolveUf(props.state)
            const zipCode = formatCep(props.postcode)

            const parts = [
              street ? `${street}${number ? ', ' + number : ''}` : '',
              neighborhood,
              city ? (state ? `${city} - ${state}` : city) : state,
            ].filter(Boolean)

            const cepBadge = zipCode ? ` (CEP: ${zipCode})` : ''
            const label = (parts.join(' - ') || street) + cepBadge

            const coords = f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : []
            const parsedLng = typeof coords[0] === 'number' ? coords[0] : parseFloat(coords[0])
            const parsedLat = typeof coords[1] === 'number' ? coords[1] : parseFloat(coords[1])
            const lat = !isNaN(parsedLat) ? parsedLat : undefined
            const lng = !isNaN(parsedLng) ? parsedLng : undefined

            return {
              id: `photon-${idx}-${props.osm_id || Math.random()}`,
              label,
              street,
              number,
              neighborhood,
              city,
              state,
              zipCode,
              lat,
              lng,
            }
          })

          return { success: true, results }
        }
      }
    }
  } catch (err) {
    console.warn('[Photon Search Fallback]', err)
  }

  return {
    success: true,
    results: [],
  }
}

export interface GeocodeAddressParams {
  street: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
}

export interface GeocodeAddressResponse {
  success: boolean
  lat?: number
  lng?: number
  displayName?: string
  error?: string
}

/**
 * Geocodifica um endereço com número no mapa interativo.
 * Tenta encontrar a localização exata do número e, se não encontrar numeração precisa,
 * utiliza o ponto mais próximo no logradouro informado.
 */
export async function geocodeAddressAction(
  params: GeocodeAddressParams
): Promise<GeocodeAddressResponse> {
  const { street, number, neighborhood, city, state } = params
  const cleanStreet = (street || '').trim()
  if (!cleanStreet) {
    return { success: false, error: 'Logradouro é obrigatório para geocodificação.' }
  }

  const cleanNumber = (number || '').trim()
  const isSn = cleanNumber.toLowerCase() === 's/n' || cleanNumber.toLowerCase() === 'sn'

  // 1. Tenta buscar pelo logradouro + número exato (caso número preenchido e não seja S/N)
  if (cleanNumber && !isSn) {
    const queryParts = [
      cleanStreet,
      cleanNumber,
      (neighborhood || '').trim(),
      (city || '').trim(),
      (state || '').trim(),
      'Brasil',
    ].filter(Boolean)

    const fullQuery = queryParts.join(', ')
    const resWithNumber = await searchAddressByTextAction(fullQuery)
    if (resWithNumber.success && resWithNumber.results && resWithNumber.results.length > 0) {
      const first = resWithNumber.results[0]
      if (first.lat && first.lng) {
        return {
          success: true,
          lat: first.lat,
          lng: first.lng,
          displayName: first.label,
        }
      }
    }
  }

  // 2. Fallback: logradouro + bairro + cidade + estado (sem o número)
  const fallbackParts = [
    cleanStreet,
    (neighborhood || '').trim(),
    (city || '').trim(),
    (state || '').trim(),
    'Brasil',
  ].filter(Boolean)

  const fallbackQuery = fallbackParts.join(', ')
  const resFallback = await searchAddressByTextAction(fallbackQuery)
  if (resFallback.success && resFallback.results && resFallback.results.length > 0) {
    const first = resFallback.results[0]
    if (first.lat && first.lng) {
      return {
        success: true,
        lat: first.lat,
        lng: first.lng,
        displayName: first.label,
      }
    }
  }

  return { success: false, error: 'Endereço não localizado no mapa.' }
}

