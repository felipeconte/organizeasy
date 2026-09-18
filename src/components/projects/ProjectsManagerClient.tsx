'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  FolderGit2,
  Plus,
  ArrowRight,
  Compass,
  Calendar,
  User,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  ExternalLink,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  X,
  Loader2,
  Check,
  Copy,
  Lock,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { updateProjectAction, deleteProjectAction } from '@/lib/actions/projects'
import { ClientData } from '@/lib/actions/clients'
import ClientMultiSelect from '@/components/projects/ClientMultiSelect'
import TypologySelect from '@/components/projects/TypologySelect'
import { useAlert } from '@/components/ui/ConfirmDialog'
import {
  formatProjectClientDisplay,
  formatAreaOnlyNumbers,
  formatNumberBRL,
  maskCEP,
  ESTADOS_BRASIL,
  normalizeUF,
} from '@/lib/formatters-and-validators'
import {
  lookupCepAction,
  searchAddressByTextAction,
  geocodeAddressAction,
  AddressSearchResult,
} from '@/lib/actions/cep'
import { usePermissions } from '@/contexts/PermissionsContext'
import { ProfilePermissions } from '@/types/profiles'

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

export interface ProjectItem {
  id: string
  organization_id: string
  code: string
  title: string
  description: string | null
  client_id?: string | null
  client_name: string
  client_email: string | null
  client_phone: string | null
  client_ids?: string[]
  typology: string | null
  area_sqm: number | null
  estimated_budget: number | null
  address: string | null
  city: string | null
  state: string | null
  start_date: string | null
  deadline: string | null
  status: string
  created_at: string
}

export interface ProjectsManagerClientProps {
  initialProjects: ProjectItem[]
  initialClients?: ClientData[]
  organizationId?: string
  isOwner?: boolean
  userPermissions?: ProfilePermissions
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  ativo: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Ativo' },
  em_producao: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Em Andamento' },
  pausado: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pausado' },
  concluido: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Concluído' },
  cancelado: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Cancelado' },
}

export default function ProjectsManagerClient({
  initialProjects,
  initialClients = [],
  organizationId,
  isOwner: propIsOwner,
  userPermissions: propPermissions,
}: ProjectsManagerClientProps) {
  const showAlert = useAlert()
  const { can, isOwner: contextIsOwner } = usePermissions()
  const effectiveIsOwner = propIsOwner !== undefined ? propIsOwner : contextIsOwner
  const canCreate = effectiveIsOwner || can('projects_create')
  const canEdit = effectiveIsOwner || can('projects_edit')
  const canDelete = effectiveIsOwner || can('projects_delete')

  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Edit Modal State
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null)
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

  const isSelectingAddressRef = useRef(false)
  const numberInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Delete Modal State
  const [deletingProject, setDeletingProject] = useState<ProjectItem | null>(null)

  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

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

  // Trava scroll de fundo quando modal de edição ou exclusão estiver aberto
  useEffect(() => {
    if (editingProject || deletingProject) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [editingProject, deletingProject])

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
    if (!editingProject?.code) return
    navigator.clipboard.writeText(editingProject.code)
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

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        search.trim() === '' ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.client_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.typology && p.typology.toLowerCase().includes(search.toLowerCase())) ||
        (p.city && p.city.toLowerCase().includes(search.toLowerCase()))

      const matchStatus = statusFilter === 'todos' || p.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [projects, search, statusFilter])

  // Open Edit Modal
  const handleOpenEdit = (p: ProjectItem) => {
    setEditingProject(p)
    setEditTitle(p.title || '')
    setEditStatus(p.status || 'ativo')
    setEditTypology(p.typology || 'Residencial')
    setEditAreaInput(
      p.area_sqm !== null && p.area_sqm !== undefined
        ? formatAreaOnlyNumbers(p.area_sqm).display
        : ''
    )
    setEditAreaRaw(p.area_sqm || null)
    setEditBudgetInput(p.estimated_budget ? formatCurrencyBRL(p.estimated_budget).formatted : '')
    setEditBudgetRaw(p.estimated_budget || null)
    setEditClientIds(p.client_ids || (p.client_id ? [p.client_id] : []))
    setEditClientError(null)
    setEditStartDate(p.start_date || '')
    setEditDeadline(p.deadline || '')
    setEditDescription(p.description || '')
    setCopiedCode(false)
    setSearchQuery('')
    setAddressSuggestions([])
    setShowSuggestions(false)
    setIsSearchingAddress(false)
    setIsSearchingCep(false)
    setAddressSuccessMessage(null)
    setNumberWarning(null)
    isSelectingAddressRef.current = false

    // Parse coordinates and address parts
    let rawAddress = p.address || ''
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

    const cleanRoad = rawAddress.replace(/^,\s*/, '').replace(/,\s*$/, '').replace(/\s*-\s*$/, '').trim()
    setAddressRoad(cleanRoad)
    setAddressComplement('')
    setAddressCity(p.city || '')
    setAddressState(normalizeUF(p.state))
  }

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || !editTitle.trim()) return

    if (editClientIds.length === 0) {
      setEditClientError('Selecione ao menos um cliente cadastrado para o projeto.')
      return
    }

    setEditClientError(null)
    setLoading(true)
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

    const res = await updateProjectAction(editingProject.id, formData)
    setLoading(false)

    if (res.success) {
      const linkedClients = (initialClients || []).filter((c) => editClientIds.includes(c.id))
      const updatedClientName = linkedClients.length > 0
        ? linkedClients.map((c) => c.name).join(', ')
        : editingProject.client_name
      const updatedClientEmail = linkedClients[0]?.email || null
      const updatedClientPhone = linkedClients[0]?.phone || null

      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProject.id
            ? {
              ...p,
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
            : p
        )
      )
      setEditingProject(null)
      showToast('Projeto atualizado com sucesso!')
    } else {
      await showAlert({
        title: 'Erro ao atualizar projeto',
        message: res.error || 'Falha ao atualizar projeto.',
        variant: 'error',
      })
    }
  }

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!deletingProject) return

    setLoading(true)
    const res = await deleteProjectAction(deletingProject.id)
    setLoading(false)

    if (res?.error) {
      await showAlert({
        title: 'Erro ao excluir projeto',
        message: res.error || 'Não foi possível excluir o projeto.',
        variant: 'error',
      })
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id))
      setDeletingProject(null)
      showToast('Projeto excluído com sucesso.')
    }
  }

  return (
    <div className="space-y-6 antialiased">
      {/* Toast Notification */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Page Header & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-blue-600" /> Projetos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie o ciclo completo de projetos, prazos e controle de aprovações. ({projects.length} cadastrados)
          </p>
        </div>

        {canCreate && (
          <Link
            href="/app/projetos/novo"
            className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/25 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Novo Projeto
          </Link>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nome do projeto, cliente, tipologia ou cidade..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-all text-slate-800 font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Dropdown & View Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm font-semibold text-slate-700 bg-transparent outline-hidden cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativos</option>
              <option value="em_producao">Em Andamento</option>
              <option value="pausado">Pausados</option>
              <option value="concluido">Concluídos</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              title="Visualização em Lista / Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-4 shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {search || statusFilter !== 'todos' ? 'Nenhum projeto encontrado' : 'Nenhum projeto cadastrado'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {search || statusFilter !== 'todos'
                ? 'Tente limpar a busca ou os filtros para ver todos os projetos.'
                : 'Cadastre seu primeiro projeto e as etapas do fluxo de trabalho serão configuradas automaticamente!'}
            </p>
          </div>
          {search || statusFilter !== 'todos' ? (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('todos')
              }}
              className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Limpar Filtros
            </button>
          ) : canCreate ? (
            <Link
              href="/app/projetos/novo"
              className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar Projeto Agora
            </Link>
          ) : null}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj) => {
            const statusConfig = STATUS_COLORS[proj.status] || STATUS_COLORS.ativo

            return (
              <div
                key={proj.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
              >
                <div className="space-y-3">
                  {/* Top Bar: Code, Status & Quick Action Buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded-lg">
                      {proj.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                      >
                        {statusConfig.label}
                      </span>

                      {/* Edit & Delete Action Buttons */}
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEdit(proj)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar Informações do Projeto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => setDeletingProject(proj)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Projeto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Project Title & Client */}
                  <div>
                    <Link
                      href={`/app/projetos/${proj.id}`}
                      className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors block line-clamp-1 cursor-pointer"
                    >
                      {proj.title}
                    </Link>
                    {(() => {
                      const { label, names } = formatProjectClientDisplay(proj.client_name, proj.client_ids)
                      return (
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {label}: <strong className="text-slate-700">{names}</strong>
                          </span>
                        </p>
                      )
                    })()}
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Compass className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{proj.area_sqm ? `${formatNumberBRL(proj.area_sqm)} m²` : 'Área não def.'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{proj.deadline ? proj.deadline : 'Sem prazo'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action: Open Project Hub */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {proj.typology || 'Residencial'}
                  </span>

                  <Link
                    href={`/app/projetos/${proj.id}`}
                    className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white text-sm font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Ver detalhes <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Projeto</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Tipologia</th>
                  <th className="py-3.5 px-4">Área</th>
                  <th className="py-3.5 px-4">Prazo</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((proj) => {
                  const statusConfig = STATUS_COLORS[proj.status] || STATUS_COLORS.ativo

                  return (
                    <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-4 font-mono font-bold text-slate-700">
                        {proj.code}
                      </td>
                      <td className="py-4 px-4">
                        <Link
                          href={`/app/projetos/${proj.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {proj.title}
                        </Link>
                        {proj.address && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">{proj.address}</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {formatProjectClientDisplay(proj.client_name, proj.client_ids).names}
                      </td>
                      <td className="py-4 px-4 text-slate-500">
                        {proj.typology || 'Residencial'}
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-mono">
                        {proj.area_sqm ? `${formatNumberBRL(proj.area_sqm)} m²` : '—'}

                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {proj.deadline || '—'}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-1.5 shrink-0">
                        <Link
                          href={`/app/projetos/${proj.id}`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg inline-flex items-center transition-colors cursor-pointer"
                          title="Ver detalhes"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(proj)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg inline-flex items-center transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeletingProject(proj)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg inline-flex items-center transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PROJETO */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto antialiased overscroll-contain">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setEditingProject(null)} />

          <div className="relative bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl z-10 space-y-6 border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto overscroll-contain">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-blue-500" />
                    {editingProject.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    title="Copiar código do projeto"
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
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Editar Dados do Projeto</h3>
                <p className="text-sm text-slate-500">Atualize as informações cadastrais, contato do cliente e localização da obra.</p>
              </div>

              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-6">
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
                      organizationId={editingProject?.organization_id || organizationId}
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
                  clients={initialClients}
                  selectedClientIds={editClientIds}
                  onChange={(ids) => {
                    setEditClientIds(ids)
                    if (ids.length > 0) setEditClientError(null)
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

                  {/* Mapa Interativo com Pin */}
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
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !editTitle.trim() || editClientIds.length === 0}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Salvando Alterações...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setDeletingProject(null)} />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4 border border-rose-100 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Projeto</h3>
                <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Tem certeza que deseja excluir o projeto{' '}
              <strong className="text-slate-900 font-bold">{deletingProject.title}</strong> ({deletingProject.code})?
              Todas as etapas, comentários, anexos e fichas vinculadas serão excluídos permanentemente.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Excluindo...' : 'Sim, Excluir Projeto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
