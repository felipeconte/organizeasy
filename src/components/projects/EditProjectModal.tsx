'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  FolderGit2,
  Compass,
  Calendar,
  DollarSign,
  Search,
  MapPin,
  X,
  Loader2,
  Check,
  Copy,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { updateProjectAction } from '@/lib/actions/projects'
import { ClientData } from '@/lib/actions/clients'
import ClientMultiSelect from '@/components/projects/ClientMultiSelect'
import TypologySelect from '@/components/projects/TypologySelect'
import { ProjectItem } from '@/components/projects/ProjectsManagerClient'
import { formatAreaOnlyNumbers, maskCEP, ESTADOS_BRASIL, normalizeUF } from '@/lib/formatters-and-validators'
import {
  lookupCepAction,
  searchAddressByTextAction,
  geocodeAddressAction,
  AddressSearchResult,
} from '@/lib/actions/cep'

const ProjectLocationMap = dynamic(
  () => import('./ProjectLocationMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-600" /> Carregando mapa...
      </div>
    ),
  }
)

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
    suburb?: string
    neighbourhood?: string
    quarter?: string
    city?: string
    town?: string
    municipality?: string
    village?: string
    state?: string
    postcode?: string
  }
}

function formatCurrencyBRL(value: string | number): { formatted: string; raw: number } {
  let raw = 0

  if (typeof value === 'number') {
    raw = value
  } else {
    const cleanNumber = value.replace(/\D/g, '')
    if (!cleanNumber) return { formatted: '', raw: 0 }
    raw = parseFloat(cleanNumber) / 100
  }

  if (isNaN(raw) || raw < 0) return { formatted: '', raw: 0 }

  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(raw)

  return { formatted, raw }
}

export interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: ProjectItem | null
  clients?: ClientData[]
  organizationId: string
  onSaved?: (updatedProject: ProjectItem) => void
}

export default function EditProjectModal({
  isOpen,
  onClose,
  project,
  clients = [],
  organizationId,
  onSaved,
}: EditProjectModalProps) {
  const [currentClients, setCurrentClients] = useState<ClientData[]>(clients)

  useEffect(() => {
    setCurrentClients((prev) => {
      const map = new Map<string, ClientData>()
      clients.forEach((c) => map.set(c.id, c))
      prev.forEach((c) => map.set(c.id, c))
      return Array.from(map.values())
    })
  }, [clients])

  const [editTitle, setEditTitle] = useState('')
  const [editStatus, setEditStatus] = useState('ativo')
  const [editTypology, setEditTypology] = useState('Residencial')
  const [editAreaInput, setEditAreaInput] = useState('')
  const [editAreaRaw, setEditAreaRaw] = useState<number | null>(null)
  const [editBudgetInput, setEditBudgetInput] = useState('')
  const [editBudgetRaw, setEditBudgetRaw] = useState<number | null>(null)
  const [editClientIds, setEditClientIds] = useState<string[]>([])
  const [editClientError, setEditClientError] = useState<string | null>(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  // Endereço e Localização
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [isSearchingCep, setIsSearchingCep] = useState(false)
  const [addressSuccessMessage, setAddressSuccessMessage] = useState<string | null>(null)
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [addressRoad, setAddressRoad] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [addressComplement, setAddressComplement] = useState('')
  const [addressNeighborhood, setAddressNeighborhood] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressPostalCode, setAddressPostalCode] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  const [numberWarning, setNumberWarning] = useState<string | null>(null)
  const [isGeocodingNumber, setIsGeocodingNumber] = useState(false)
  const numberTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isSelectingAddressRef = useRef(false)
  const numberInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Inicializa dados quando o projeto ou o modal abrem
  useEffect(() => {
    if (isOpen && project) {
      setEditTitle(project.title || '')
      setEditStatus(project.status || 'ativo')
      setEditTypology(project.typology || 'Residencial')
      setEditAreaInput(
        project.area_sqm !== null && project.area_sqm !== undefined
          ? formatAreaOnlyNumbers(project.area_sqm).display
          : ''
      )
      setEditAreaRaw(project.area_sqm || null)
      const budgetNum =
        project.estimated_budget !== null && project.estimated_budget !== undefined
          ? Number(project.estimated_budget)
          : null

      if (budgetNum !== null && !isNaN(budgetNum) && budgetNum > 0) {
        setEditBudgetInput(formatCurrencyBRL(budgetNum).formatted)
        setEditBudgetRaw(budgetNum)
      } else {
        setEditBudgetInput('')
        setEditBudgetRaw(null)
      }
      setEditClientIds(
        project.client_ids || (project.client_id ? [project.client_id] : [])
      )
      setEditClientError(null)
      setEditStartDate(project.start_date || '')
      setEditDeadline(project.deadline || '')
      setEditDescription(project.description || '')
      setCopiedCode(false)
      setSearchQuery('')
      setAddressSuggestions([])
      setShowSuggestions(false)
      setIsSearchingAddress(false)
      setIsSearchingCep(false)
      setAddressSuccessMessage(null)
      setNumberWarning(null)
      isSelectingAddressRef.current = false
      setErrorMsg(null)

      // Parse coordenadas e partes do endereço
      let rawAddress = project.address || ''
      const coordMatch = rawAddress.match(/\(Coordenadas:\s*([-\d.]+)[,\s]+([-\d.]+)\)/i)
      if (coordMatch) {
        setLat(parseFloat(coordMatch[1]))
        setLng(parseFloat(coordMatch[2]))
        rawAddress = rawAddress.replace(coordMatch[0], '').trim().replace(/-\s*$/, '').trim()
      } else {
        setLat(null)
        setLng(null)
      }

      const cepMatch = rawAddress.match(/CEP:\s*([\d-]+)/i)
      if (cepMatch) {
        setAddressPostalCode(cepMatch[1])
        rawAddress = rawAddress.replace(cepMatch[0], '').trim().replace(/-\s*$/, '').trim()
      } else {
        setAddressPostalCode('')
      }

      const bairroMatch = rawAddress.match(/Bairro:\s*([^ -]+)/i)
      if (bairroMatch) {
        setAddressNeighborhood(bairroMatch[1])
        rawAddress = rawAddress.replace(bairroMatch[0], '').trim().replace(/-\s*$/, '').trim()
      } else {
        setAddressNeighborhood('')
      }

      const numMatch = rawAddress.match(/Nº\s*([^\s,]+)/i)
      if (numMatch) {
        setAddressNumber(numMatch[1])
        rawAddress = rawAddress.replace(numMatch[0], '').trim()
      } else {
        setAddressNumber('')
      }

      const cleanRoad = rawAddress
        .replace(/^,\s*/, '')
        .replace(/,\s*$/, '')
        .replace(/\s*-\s*$/, '')
        .trim()
      setAddressRoad(cleanRoad)
      setAddressCity(project.city || '')
      setAddressState(normalizeUF(project.state))
    }
  }, [isOpen, project])

  // Fecha dropdown de busca ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Trava scroll de fundo quando modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  const handleBudgetChange = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (!digits) {
      setEditBudgetInput('')
      setEditBudgetRaw(null)
      return
    }
    const { formatted, raw } = formatCurrencyBRL(digits)
    setEditBudgetInput(formatted)
    setEditBudgetRaw(raw)
  }

  const handleAreaChange = (val: string) => {
    const { display, raw } = formatAreaOnlyNumbers(val, editAreaInput)
    setEditAreaInput(display)
    setEditAreaRaw(raw)
  }

  const handleCopyCode = () => {
    if (!project?.code) return
    navigator.clipboard.writeText(project.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat)
    setLng(newLng)
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !editTitle.trim()) return

    if (editClientIds.length === 0) {
      setEditClientError('Selecione ao menos um cliente cadastrado para o projeto.')
      return
    }

    setEditClientError(null)
    setLoading(true)
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('title', editTitle.trim())
    editClientIds.forEach((cid) => formData.append('clientIds', cid))
    formData.append('typology', editTypology)
    if (editAreaRaw !== null) formData.append('areaSqm', editAreaRaw.toString())
    if (editBudgetRaw !== null) formData.append('estimatedBudget', editBudgetRaw.toString())
    formData.append('startDate', editStartDate)
    formData.append('deadline', editDeadline)
    formData.append('status', editStatus)
    formData.append('description', editDescription.trim())

    // Agrega detalhes completos de endereço e coordenadas
    const addressMain = [
      addressRoad.trim(),
      addressNumber.trim() ? `Nº ${addressNumber.trim()}` : '',
      addressComplement.trim() ? addressComplement.trim() : '',
    ]
      .filter(Boolean)
      .join(', ')

    const fullAddress = [
      addressMain,
      addressNeighborhood.trim() ? `Bairro: ${addressNeighborhood.trim()}` : '',
      addressPostalCode.trim() ? `CEP: ${addressPostalCode.trim()}` : '',
      lat && lng ? `(Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)})` : '',
    ]
      .filter(Boolean)
      .join(' - ')

    if (fullAddress) {
      formData.append('address', fullAddress)
    }
    if (addressCity.trim()) {
      formData.append('city', addressCity.trim())
    }
    if (addressState.trim()) {
      formData.append('state', addressState.trim())
    }

    try {
      const res = await updateProjectAction(project.id, formData)
      setLoading(false)

      if (res.success) {
        const linkedClients = currentClients.filter((c) => editClientIds.includes(c.id))
        const updatedClientName =
          linkedClients.length > 0
            ? linkedClients.map((c) => c.name).join(', ')
            : project.client_name
        const updatedClientEmail = linkedClients[0]?.email || null
        const updatedClientPhone = linkedClients[0]?.phone || null

        const updatedProject: ProjectItem = {
          ...project,
          title: editTitle.trim(),
          client_name: updatedClientName,
          client_email: updatedClientEmail,
          client_phone: updatedClientPhone,
          client_ids: editClientIds,
          typology: editTypology,
          area_sqm: editAreaRaw,
          estimated_budget: editBudgetRaw,
          start_date: editStartDate || null,
          deadline: editDeadline || null,
          status: editStatus,
          description: editDescription.trim() || null,
          address: fullAddress || null,
          city: addressCity.trim() || null,
          state: addressState.trim() || null,
        }

        onSaved?.(updatedProject)
        onClose()
      } else {
        setErrorMsg(res.error || 'Erro ao atualizar dados do projeto.')
      }
    } catch (err: any) {
      setLoading(false)
      setErrorMsg(err?.message || 'Erro inesperado ao salvar alterações.')
    }
  }

  if (!isOpen || !project) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-mono font-medium bg-slate-100 text-slate-500 rounded-md">
                {project.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Copiado!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </span>
                )}
              </button>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Editar Dados do Projeto
            </h3>
            <p className="text-sm text-slate-500">
              Atualize as informações cadastrais, contato do cliente e localização da obra.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSaveEdit} className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Section 1: Identificação */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <FolderGit2 className="w-4 h-4 text-blue-600" /> Identificação do Projeto
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Título do Projeto *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ex: Residência Alphaville ou Escritório Advocacia"
                  className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Status do Projeto
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                >
                  <option value="ativo">🟢 Ativo</option>
                  <option value="em_producao">⚡ Em Andamento</option>
                  <option value="pausado">🟡 Pausado</option>
                  <option value="concluido">✅ Concluído</option>
                  <option value="cancelado">🔴 Cancelado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Tipologia
                </label>
                <TypologySelect
                  value={editTypology}
                  onChange={setEditTypology}
                  organizationId={project.organization_id || organizationId}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Área do Projeto
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editAreaInput}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    onBlur={() => {
                      if (editAreaInput.endsWith(',')) {
                        setEditAreaInput(editAreaInput.slice(0, -1))
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

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Orçamento Estimado (R$)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={editBudgetInput}
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
              clients={currentClients}
              selectedClientIds={editClientIds}
              onChange={(ids) => {
                setEditClientIds(ids)
                if (ids.length > 0) setEditClientError(null)
              }}
              onClientCreated={(newClient) => {
                setCurrentClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)])
              }}
              organizationId={organizationId}
              error={editClientError}
              required
            />
          </div>

          {/* Section 3: Cronograma & Localização */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-blue-600" /> Cronograma Estimado
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Prazo Final Estimado
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Busca por Endereço Escrito com Autocomplete */}
            <div className="space-y-3">
              {numberWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium rounded-xl flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-amber-950">Atenção ao endereço</strong>
                    <p className="text-[11px] text-amber-800 mt-0.5">{numberWarning}</p>
                  </div>
                </div>
              )}
              {addressSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{addressSuccessMessage}</span>
                </div>
              )}

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

              {/* Mapa Interativo */}
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Descrição ou Observações do Projeto
              </label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Detalhes adicionais sobre o terreno, expectativas de programa ou condicionantes..."
                className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !editTitle.trim() || editClientIds.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Alterações</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
