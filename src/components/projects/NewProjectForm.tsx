'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  FolderGit2,
  User,
  Calendar,
  Compass,
  DollarSign,
  Sparkles,
  Check,
  Search,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  ListTodo,
  PlusCircle,
  UserCheck,
  X,
} from 'lucide-react'
import { createProjectAction } from '@/lib/actions/projects'
import { startNavigationProgress } from '@/components/layout/NavigationProgressBar'
import { ClientData } from '@/lib/actions/clients'
import ClientMultiSelect from '@/components/projects/ClientMultiSelect'
import TypologySelect from '@/components/projects/TypologySelect'
import { formatAreaOnlyNumbers, maskCEP, ESTADOS_BRASIL, normalizeUF } from '@/lib/formatters-and-validators'
import {
  lookupCepAction,
  searchAddressByTextAction,
  geocodeAddressAction,
  AddressSearchResult,
} from '@/lib/actions/cep'

// Carregamento dinâmico do mapa para evitar SSR issues com Leaflet
const ProjectLocationMap = dynamic(
  () => import('./ProjectLocationMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-600" /> Carregando mapa...
      </div>
    ),
  }
)

export interface TemplateOption {
  id: string
  name: string
  description: string | null
  is_default: boolean
  count?: number
}

interface NominatimPlace {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    pedestrian?: string
    street?: string
    house_number?: string
    house_name?: string
    suburb?: string
    neighbourhood?: string
    city_district?: string
    quarter?: string
    residential?: string
    city?: string
    town?: string
    municipality?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
  }
}

interface NewProjectFormProps {
  organizationId: string
  userEmail?: string
  templates?: TemplateOption[]
  initialClients?: ClientData[]
  initialClientId?: string
}



function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11)
  if (numbers.length <= 2) return numbers ? `(${numbers}` : ''
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

function formatCurrencyBRL(value: string | number): { formatted: string; raw: number } {
  const cleanNumber = typeof value === 'number' ? Math.round(value * 100).toString() : value.replace(/\D/g, '')
  if (!cleanNumber) return { formatted: '', raw: 0 }
  const raw = parseFloat(cleanNumber) / 100
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(raw)
  return { formatted, raw }
}

function formatArea(value: string): { formatted: string; raw: number } {
  // Mantém números e no máximo uma vírgula/ponto
  const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return { formatted: '', raw: 0 }
  return { formatted: `${cleaned} m²`, raw: num }
}

export default function NewProjectForm({
  organizationId,
  templates = [],
  initialClients = [],
  initialClientId = '',
}: NewProjectFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isNavigatingAway, setIsNavigatingAway] = useState(false)

  // 0. Clientes Cadastrados & Vínculo Multi-Clientes
  const [clientsList, setClientsList] = useState<ClientData[]>(initialClients)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    initialClientId ? [initialClientId] : []
  )
  const [clientError, setClientError] = useState<string | null>(null)

  useEffect(() => {
    setClientsList((prev) => {
      const map = new Map<string, ClientData>()
      initialClients.forEach((c) => map.set(c.id, c))
      prev.forEach((c) => map.set(c.id, c))
      return Array.from(map.values())
    })
  }, [initialClients])



  // 1.1 Tipologia do Projeto
  const [typology, setTypology] = useState<string>('Residencial')

  // 2. Área e Orçamento
  const [areaInput, setAreaInput] = useState<string>('')
  const [areaRaw, setAreaRaw] = useState<number | null>(null)
  const [budgetInput, setBudgetInput] = useState<string>('')
  const [budgetRaw, setBudgetRaw] = useState<number | null>(null)

  // 3. Modelo de Tarefas e Cronograma
  const defaultTpl = templates.find((t) => t.is_default) || templates[0]
  const [templateMode, setTemplateMode] = useState<'template' | 'none'>('template')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTpl?.id || '')

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const def = templates.find((t) => t.is_default) || templates[0]
      if (def) setSelectedTemplateId(def.id)
    }
  }, [templates, selectedTemplateId])

  // 4. Endereço e Localização com campos separados
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [isSearchingCep, setIsSearchingCep] = useState(false)
  const [addressSuccessMessage, setAddressSuccessMessage] = useState<string | null>(null)
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [addressRoad, setAddressRoad] = useState<string>('')
  const [addressNumber, setAddressNumber] = useState<string>('')
  const [addressComplement, setAddressComplement] = useState<string>('')
  const [addressNeighborhood, setAddressNeighborhood] = useState<string>('')
  const [addressCity, setAddressCity] = useState<string>('')
  const [addressState, setAddressState] = useState<string>('')
  const [addressPostalCode, setAddressPostalCode] = useState<string>('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  const [numberWarning, setNumberWarning] = useState<string | null>(null)
  const [isGeocodingNumber, setIsGeocodingNumber] = useState(false)
  const numberTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isSelectingAddressRef = useRef(false)
  const numberInputRef = useRef<HTMLInputElement>(null)

  // 5. Estado de Submissão e Erro
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)



  // Fecha dropdown de busca ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Máscara de Orçamento (Moeda)
  const handleBudgetChange = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (!digits) {
      setBudgetInput('')
      setBudgetRaw(null)
      return
    }
    const { formatted, raw } = formatCurrencyBRL(digits)
    setBudgetInput(formatted)
    setBudgetRaw(raw)
  }

  // Formatação de Área
  const handleAreaChange = (val: string) => {
    const { display, raw } = formatAreaOnlyNumbers(val, areaInput)
    setAreaInput(display)
    setAreaRaw(raw)
  }



  // Busca de Endereço Escrito via Server Action
  const handleAddressSearchChange = (query: string) => {
    isSelectingAddressRef.current = false
    setSearchQuery(query)
    setAddressSuccessMessage(null)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (query.trim().length < 3) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      setIsSearchingAddress(false)
      return
    }

    setIsSearchingAddress(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchAddressByTextAction(query.trim())
        if (res.success && res.results) {
          setAddressSuggestions(res.results)
          setShowSuggestions(res.results.length > 0)
        } else {
          setAddressSuggestions([])
        }
      } catch (err) {
        console.error('Erro ao buscar endereço:', err)
        setAddressSuggestions([])
      } finally {
        setIsSearchingAddress(false)
      }
    }, 350)
  }

  // Seleção de Endereço sugerido no dropdown
  const handleSelectSuggestion = (place: AddressSearchResult) => {
    isSelectingAddressRef.current = true
    setIsSearchingAddress(false)
    setShowSuggestions(false)
    setAddressSuggestions([])

    setSearchQuery(place.label)
    if (place.street) setAddressRoad(place.street)
    if (place.number) setAddressNumber(place.number)
    if (place.neighborhood) setAddressNeighborhood(place.neighborhood)
    if (place.city) setAddressCity(place.city)
    if (place.state) setAddressState(normalizeUF(place.state))
    if (place.zipCode) setAddressPostalCode(maskCEP(place.zipCode))

    if (place.lat && place.lng) {
      setLat(place.lat)
      setLng(place.lng)
    }

    setNumberWarning(null)
    setAddressSuccessMessage('Endereço preenchido com sucesso!')
    setTimeout(() => setAddressSuccessMessage(null), 4000)

    if (!place.number) {
      setTimeout(() => {
        numberInputRef.current?.focus()
      }, 100)
    }
  }

  // Handle mudança no logradouro
  const handleRoadChange = (val: string) => {
    setAddressRoad(val)

    if (val.trim() && addressNumber.trim()) {
      setNumberWarning(null)
      if (numberTimeoutRef.current) clearTimeout(numberTimeoutRef.current)
      numberTimeoutRef.current = setTimeout(async () => {
        setIsGeocodingNumber(true)
        try {
          const res = await geocodeAddressAction({
            street: val.trim(),
            number: addressNumber.trim(),
            neighborhood: addressNeighborhood,
            city: addressCity,
            state: addressState,
          })
          if (res.success && res.lat && res.lng) {
            setLat(res.lat)
            setLng(res.lng)
            setAddressSuccessMessage(`Pin atualizado para o nº ${addressNumber.trim()}!`)
            setTimeout(() => setAddressSuccessMessage(null), 3500)
          }
        } catch (err) {
          console.warn('Erro ao atualizar pin para o número:', err)
        } finally {
          setIsGeocodingNumber(false)
        }
      }, 500)
    } else if (!val.trim() && addressNumber.trim()) {
      setNumberWarning('Preencha o logradouro para localizar o endereço completo e posicionar o pin no mapa.')
    } else {
      setNumberWarning(null)
    }
  }

  // Handle mudança no número do endereço
  const handleNumberChange = (val: string) => {
    setAddressNumber(val)
    if (numberTimeoutRef.current) clearTimeout(numberTimeoutRef.current)

    const trimmedNumber = val.trim()

    // Se o número foi apagado, limpa aviso
    if (!trimmedNumber) {
      setNumberWarning(null)
      return
    }

    // Se preencheu só o número e não o endereço (logradouro vazio)
    if (!addressRoad || !addressRoad.trim()) {
      setNumberWarning('Preencha o logradouro para localizar o endereço completo e posicionar o pin no mapa.')
      // NÃO mexe o pin até que complete
      return
    }

    setNumberWarning(null)

    // Debounce de 500ms para atualizar o pin no mapa com o endereço + número
    numberTimeoutRef.current = setTimeout(async () => {
      setIsGeocodingNumber(true)
      try {
        const res = await geocodeAddressAction({
          street: addressRoad.trim(),
          number: trimmedNumber,
          neighborhood: addressNeighborhood,
          city: addressCity,
          state: addressState,
        })
        if (res.success && res.lat && res.lng) {
          setLat(res.lat)
          setLng(res.lng)
          setAddressSuccessMessage(`Pin atualizado para o nº ${trimmedNumber}!`)
          setTimeout(() => setAddressSuccessMessage(null), 3500)
        }
      } catch (err) {
        console.warn('Erro ao atualizar pin para o número:', err)
      } finally {
        setIsGeocodingNumber(false)
      }
    }, 500)
  }

  // Busca automática por CEP
  const triggerCepLookup = async (cepValue: string) => {
    const rawDigits = cepValue.replace(/\D/g, '')
    if (rawDigits.length !== 8) {
      return
    }

    setIsSearchingCep(true)
    setAddressSuccessMessage(null)
    setNumberWarning(null)

    const res = await lookupCepAction(rawDigits)
    setIsSearchingCep(false)

    if (res.success && res.data) {
      // Limpa a busca escrita e o número ao buscar por CEP
      isSelectingAddressRef.current = false
      setSearchQuery('')
      setAddressSuggestions([])
      setShowSuggestions(false)
      setIsSearchingAddress(false)
      setAddressNumber('')
      setNumberWarning(null)

      if (res.data.street) setAddressRoad(res.data.street)
      if (res.data.neighborhood) setAddressNeighborhood(res.data.neighborhood)
      if (res.data.city) setAddressCity(res.data.city)
      if (res.data.state) setAddressState(normalizeUF(res.data.state))

      setAddressSuccessMessage('Endereço preenchido com sucesso!')
      setTimeout(() => setAddressSuccessMessage(null), 4000)

      // Foca automaticamente no campo de número
      setTimeout(() => {
        numberInputRef.current?.focus()
      }, 100)

      // Tenta geocodificar o endereço encontrado para atualizar coordenadas no mapa
      try {
        const queryText = `${res.data.street}, ${res.data.city} - ${res.data.state}, Brasil`
        const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(queryText)}`)
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          if (Array.isArray(geoData) && geoData.length > 0) {
            const pLat = parseFloat(geoData[0].lat)
            const pLng = parseFloat(geoData[0].lon)
            if (!isNaN(pLat) && !isNaN(pLng)) {
              setLat(pLat)
              setLng(pLng)
            }
          }
        }
      } catch (geoErr) {
        console.warn('Geocoding CEP falhou:', geoErr)
      }
    }
  }

  // Handle CEP input com máscara e busca automática em 8 dígitos
  const handleCepChange = (val: string) => {
    const masked = maskCEP(val)
    setAddressPostalCode(masked)

    const rawDigits = masked.replace(/\D/g, '')
    if (rawDigits.length === 8) {
      triggerCepLookup(rawDigits)
    } else {
      setAddressSuccessMessage(null)
    }
  }

  // Callback quando o usuário move o pin ou clica diretamente no mapa
  const handleLocationChange = async (newLat: number, newLng: number) => {
    setLat(newLat)
    setLng(newLng)

    // Dispara reverse geocoding para preencher automaticamente os campos de endereço
    try {
      const response = await fetch(`/api/geocode?lat=${newLat}&lon=${newLng}`)
      if (response.ok) {
        const place: NominatimPlace = await response.json()
        if (place && place.address) {
          const addr = place.address
          const road = addr.road || addr.pedestrian || addr.street || ''
          const houseNumber = addr.house_number || addr.house_name || ''
          const neighborhood =
            addr.suburb ||
            addr.neighbourhood ||
            addr.city_district ||
            addr.quarter ||
            addr.residential ||
            ''
          const city = addr.city || addr.town || addr.municipality || addr.village || ''
          const state = addr.state || ''
          const postcode = addr.postcode || ''

          if (road) setAddressRoad(road)
          if (houseNumber) setAddressNumber(houseNumber)
          if (neighborhood) setAddressNeighborhood(neighborhood)
          if (city) setAddressCity(city)
          if (state) setAddressState(normalizeUF(state))
          if (postcode) setAddressPostalCode(postcode)
        }
      }
    } catch (err) {
      console.error('Erro ao obter endereço a partir das coordenadas:', err)
    }
  }

  // Submissão do Formulário
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    if (selectedClientIds.length === 0) {
      setClientError('Selecione ao menos um cliente cadastrado para vincular ao projeto.')
      setErrorMessage('Por favor, selecione ao menos um cliente para o projeto.')
      return
    }

    setClientError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    // Injeta os valores processados e normalizados
    if (areaRaw !== null) formData.set('areaSqm', areaRaw.toString())
    if (budgetRaw !== null) formData.set('estimatedBudget', budgetRaw.toString())
    if (organizationId) formData.set('organizationId', organizationId)

    // Injeta a lista de IDs de clientes vinculados
    formData.delete('clientIds')
    selectedClientIds.forEach((cid) => formData.append('clientIds', cid))

    // Agrega detalhes completos de endereço e coordenadas
    const addressMain = [
      addressRoad || (formData.get('addressRoad') as string),
      addressNumber ? `Nº ${addressNumber}` : '',
      addressComplement ? addressComplement : '',
    ]
      .filter(Boolean)
      .join(', ')

    const fullAddress = [
      addressMain,
      addressNeighborhood ? `Bairro: ${addressNeighborhood}` : '',
      addressPostalCode ? `CEP: ${addressPostalCode}` : '',
      lat && lng ? `(Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)})` : '',
    ]
      .filter(Boolean)
      .join(' - ')

    if (fullAddress) {
      formData.set('address', fullAddress)
    }
    if (addressCity) {
      formData.set('city', addressCity)
    }
    if (addressState) {
      formData.set('state', addressState)
    }

    // Configuração do Modelo de Tarefas
    if (templateMode === 'none') {
      formData.set('templateOption', 'none')
    } else {
      formData.set('templateOption', selectedTemplateId ? 'custom' : 'default')
      if (selectedTemplateId) {
        formData.set('stageTemplateId', selectedTemplateId)
      }
    }

    startTransition(async () => {
      try {
        const result = await createProjectAction(formData)

        if (result && 'error' in result && result.error) {
          setErrorMessage(result.error)
          return
        }

        setIsNavigatingAway(true)
        startNavigationProgress()

        if (result && 'projectId' in result && result.projectId) {
          router.push(`/app/projetos/${result.projectId}`)
        } else {
          router.push('/app/projetos')
        }
      } catch (err: unknown) {
        console.error('Erro ao submeter projeto:', err)
        const msg = err instanceof Error ? err.message : 'Falha ao salvar projeto no banco.'
        setErrorMessage(msg)
        setIsNavigatingAway(false)
      }
    })
  }

  return (
    <>
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block">Não foi possível criar o projeto</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="hidden" name="organizationId" value={organizationId} />

          {/* Section 1: Identificação */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <FolderGit2 className="w-4 h-4 text-blue-600" /> Identificação do Projeto
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Título do Projeto *
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Residência Alphaville ou Escritório Advocacia"
                className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tipologia
                </label>
                <TypologySelect
                  value={typology}
                  onChange={setTypology}
                  organizationId={organizationId}
                  name="typology"
                />
              </div>

              {/* Ponto 2: Área do Projeto formatada como medida */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Área do Projeto
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="areaSqmDisplay"
                    value={areaInput}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    onBlur={() => {
                      if (areaInput.endsWith(',')) {
                        setAreaInput(areaInput.slice(0, -1))
                      }
                    }}
                    placeholder="0"
                    className="block w-full pl-9 pr-12 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-xs font-bold text-slate-400 select-none bg-slate-100/80 px-2 py-0.5 rounded-md">
                      m²
                    </span>
                  </div>
                </div>
              </div>

              {/* Ponto 3: Orçamento Estimado formatado como moeda em tempo real */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Orçamento Estimado (R$)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="estimatedBudgetDisplay"
                    value={budgetInput}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    placeholder="R$ 850.000,00"
                    className="block w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Vínculo de Clientes (Multi-Clientes) */}
          <div className="pt-4 border-t border-slate-100">
            <ClientMultiSelect
              clients={clientsList}
              selectedClientIds={selectedClientIds}
              onChange={(ids) => {
                setSelectedClientIds(ids)
                if (ids.length > 0) setClientError(null)
              }}
              onClientCreated={(newClient) => {
                setClientsList((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)])
              }}
              organizationId={organizationId}
              error={clientError}
              required
            />
          </div>

          {/* Section 3: Cronograma & Localização */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-blue-600" /> Cronograma Estimado
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Data de Início
                </label>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Prazo Final Estimado
                </label>
                <input
                  type="date"
                  name="deadline"
                  className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Bloco de Endereço & Localização */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" /> Endereço e Localização do Projeto
                </label>
                <div className="flex items-center gap-2">
                  {isSearchingCep && (
                    <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando CEP...
                    </span>
                  )}
                  {isSearchingAddress && (
                    <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando endereço...
                    </span>
                  )}
                  {numberWarning && !isSearchingCep && !isSearchingAddress && (
                    <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 animate-in fade-in duration-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {numberWarning}
                    </span>
                  )}
                  {addressSuccessMessage && !isSearchingCep && !isSearchingAddress && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in duration-200">
                      <Check className="w-4 h-4" /> {addressSuccessMessage}
                    </span>
                  )}
                </div>
              </div>

              {/* Busca por Endereço Escrito com Autocomplete */}
              <div ref={searchContainerRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-blue-600" />
                    Buscar por Endereço
                  </span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleAddressSearchChange(e.target.value)}
                    onFocus={() => {
                      if (!isSelectingAddressRef.current && addressSuggestions.length > 0) {
                        setShowSuggestions(true)
                      }
                    }}
                    placeholder="Ex: Av. Paulista, 1000, Bela Vista, São Paulo..."
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                  <div className="absolute right-3 flex items-center gap-1">
                    {isSearchingAddress && (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    )}
                    {searchQuery && !isSearchingAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          isSelectingAddressRef.current = false
                          setSearchQuery('')
                          setAddressSuggestions([])
                          setShowSuggestions(false)
                          setIsSearchingAddress(false)
                          setAddressSuccessMessage(null)
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                        title="Limpar busca"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdown de Sugestões de Endereço */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {isSearchingAddress ? (
                      <div className="p-3.5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        Buscando sugestões de endereços...
                      </div>
                    ) : addressSuggestions.length > 0 ? (
                      <>
                        <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                          Sugestões Encontradas ({addressSuggestions.length})
                        </div>
                        {addressSuggestions.map((place) => (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(place)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/60 transition-colors flex items-start gap-2.5 group cursor-pointer"
                          >
                            <div className="mt-0.5 p-1 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 shrink-0 transition-colors">
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-900 truncate">
                                {place.street ? `${place.street}${place.number ? ', ' + place.number : ''}` : place.label}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {[
                                  place.neighborhood ? `Bairro ${place.neighborhood}` : '',
                                  place.city && place.state ? `${place.city} - ${place.state}` : place.city || place.state,
                                  place.zipCode ? `CEP: ${place.zipCode}` : '',
                                ]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    ) : searchQuery.trim().length >= 3 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-slate-600 font-medium">
                          Nenhum endereço encontrado para &ldquo;{searchQuery}&rdquo;.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Você pode tentar outro termo ou preencher os campos abaixo diretamente.
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Linha 1: CEP (lado esquerdo) e Logradouro (lado direito) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>CEP</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      name="postalCode"
                      value={addressPostalCode}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="block w-full px-3.5 py-2.5 pr-9 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    <div className="absolute right-2.5 flex items-center">
                      {isSearchingCep ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerCepLookup(addressPostalCode)}
                          title="Buscar endereço por este CEP"
                          className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer transition-colors"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    name="addressRoad"
                    value={addressRoad}
                    onChange={(e) => handleRoadChange(e.target.value)}
                    placeholder="Ex: Av. Paulista, Rua Oscar Freire..."
                    className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Linha 2: Número, Complemento e Bairro */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Número</span>
                    {isGeocodingNumber && (
                      <span className="text-[10px] text-blue-600 font-normal lowercase flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> buscando...
                      </span>
                    )}
                  </label>
                  <input
                    ref={numberInputRef}
                    type="text"
                    name="addressNumber"
                    value={addressNumber}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    placeholder="1000 ou S/N"
                    className={`block w-full px-3.5 py-2.5 bg-slate-50/50 border rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${numberWarning
                      ? 'border-amber-400 focus:ring-amber-500/20 focus:border-amber-500'
                      : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-600'
                      }`}
                  />
                  {numberWarning && (
                    <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-1 animate-in fade-in">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>Preencha o logradouro</span>
                    </p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Complemento <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    name="addressComplement"
                    value={addressComplement}
                    onChange={(e) => setAddressComplement(e.target.value)}
                    placeholder="Apto 52, Bloco B"
                    className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Linha 3: Bairro, Cidade e Estado / UF */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bairro
                  </label>
                  <input
                    type="text"
                    name="addressNeighborhood"
                    value={addressNeighborhood}
                    onChange={(e) => setAddressNeighborhood(e.target.value)}
                    placeholder="Bela Vista"
                    className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="São Paulo"
                    className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    UF - Estado
                  </label>
                  <select
                    name="state"
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    className={`block w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer transition-all ${!addressState ? 'text-slate-400' : 'text-slate-900'
                      }`}
                  >
                    <option value="">UF</option>
                    {ESTADOS_BRASIL.map((uf) => (
                      <option key={uf.sigla} value={uf.sigla} className="text-slate-900">
                        {uf.sigla} - {uf.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ponto 5: Visualização em Mapa Interativo com Pin */}
              <div className="pt-2">
                <ProjectLocationMap
                  lat={lat}
                  lng={lng}
                  addressTitle={
                    [addressRoad, addressNumber ? `Nº ${addressNumber}` : '', addressNeighborhood]
                      .filter(Boolean)
                      .join(', ') || 'Local da Obra'
                  }
                  onLocationChange={handleLocationChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Descrição ou Observações do Projeto
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Detalhes adicionais sobre o terreno, expectativas de programa ou condicionantes..."
                className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Section 4: Modelo de Tarefas e Cronograma */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <ListTodo className="w-4 h-4 text-blue-600" /> Modelo de Tarefas e Cronograma
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Com Template */}
              <div
                onClick={() => setTemplateMode('template')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${templateMode === 'template'
                  ? 'bg-blue-50/40 border-blue-600 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${templateMode === 'template' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      <ListTodo className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Usar Modelo Predefinido</h4>
                      <p className="text-xs text-slate-500">Inicia com etapas e prazos estruturados</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="templateModeRadio"
                    checked={templateMode === 'template'}
                    onChange={() => setTemplateMode('template')}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 mt-1 cursor-pointer"
                  />
                </div>

                {templateMode === 'template' && (
                  <div className="pt-2 border-t border-blue-100 space-y-2 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-xs font-bold text-slate-700">Selecione o Modelo:</label>
                    {templates && templates.length > 0 ? (
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full text-sm font-semibold bg-white border border-blue-200 rounded-xl p-2.5 text-slate-800 outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} {tpl.is_default ? '(Padrão do Sistema)' : ''} {tpl.count ? `• ${tpl.count} tarefas` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-white border border-blue-200 text-xs text-slate-700 font-medium">
                        📋 Modelo Padrão do Sistema (7 etapas essenciais)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: Sem Template (Em Branco) */}
              <div
                onClick={() => setTemplateMode('none')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${templateMode === 'none'
                  ? 'bg-blue-50/40 border-blue-600 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${templateMode === 'none' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Projeto em Branco</h4>
                      <p className="text-xs text-slate-500">Sem tarefas ou etapas pré-cadastradas</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="templateModeRadio"
                    checked={templateMode === 'none'}
                    onChange={() => setTemplateMode('none')}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 mt-1 cursor-pointer"
                  />
                </div>

                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  O projeto começará limpo. Você poderá criar tarefas avulsas personalizadas na página do projeto a qualquer momento.
                </p>
              </div>
            </div>
          </div>

          {/* Botoes de Ação */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/app/projetos"
              className="py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isPending || isNavigatingAway}
              className="py-2.5 px-6 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending || isNavigatingAway ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isNavigatingAway ? 'Abrindo Projeto...' : 'Criando Projeto...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Criar Projeto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
