'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Building2,
  User,
  Move,
  UploadCloud,
} from 'lucide-react'

interface ImageCropperModalProps {
  imageSrc: string
  onCropComplete: (croppedDataUrl: string) => void
  onCancel: () => void
  title?: string
  description?: string
  confirmText?: string
  cropShape?: 'round' | 'rect'
}

const VIEWPORT_SIZE = 256
const OUTPUT_SIZE = 512

export default function ImageCropperModal({
  imageSrc,
  onCropComplete,
  onCancel,
  title = 'Ajustar Imagem',
  description = 'Arraste e use o zoom para enquadrar perfeitamente.',
  confirmText = 'Aplicar Imagem',
  cropShape = 'round',
}: ImageCropperModalProps) {
  const [currentImageSrc, setCurrentImageSrc] = useState(imageSrc)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [, setIsDragging] = useState(false)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)

  const imageElementRef = useRef<HTMLImageElement | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const modalFileInputRef = useRef<HTMLInputElement | null>(null)

  // Referências para os canvas de prévia em tempo real
  const preview36Ref = useRef<HTMLCanvasElement | null>(null)
  const preview48Ref = useRef<HTMLCanvasElement | null>(null)
  const preview64Ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    setCurrentImageSrc(imageSrc)
  }, [imageSrc])

  // Carrega imagem e armazena elemento e dimensões naturais
  useEffect(() => {
    if (!currentImageSrc) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = currentImageSrc
    img.onload = () => {
      imageElementRef.current = img
      setImageSize({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      })
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
  }, [currentImageSrc])

  // Permite selecionar outro arquivo de imagem diretamente pelo modal
  const handleModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        setCurrentImageSrc(result)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Cálculo das proporções e dimensões base (para cobrir 256x256 no zoom 1x)
  const { aspect, baseWidth, baseHeight, containZoom, minZoom, maxZoom } = useMemo(() => {
    if (!imageSize) {
      return {
        aspect: 1,
        baseWidth: VIEWPORT_SIZE,
        baseHeight: VIEWPORT_SIZE,
        containZoom: 1,
        minZoom: 0.5,
        maxZoom: 3,
      }
    }

    const asp = imageSize.width / imageSize.height
    let bW = VIEWPORT_SIZE
    let bH = VIEWPORT_SIZE

    if (asp >= 1) {
      // Paisagem ou quadrado: altura cobre o viewport, largura expande
      bH = VIEWPORT_SIZE
      bW = VIEWPORT_SIZE * asp
    } else {
      // Retrato: largura cobre o viewport, altura expande
      bW = VIEWPORT_SIZE
      bH = VIEWPORT_SIZE / asp
    }

    const cZoom = asp >= 1 ? 1 / asp : asp
    const calculatedMinZoom = Math.max(0.25, Math.min(0.5, parseFloat(cZoom.toFixed(2))))

    return {
      aspect: asp,
      baseWidth: bW,
      baseHeight: bH,
      containZoom: parseFloat(cZoom.toFixed(2)),
      minZoom: calculatedMinZoom,
      maxZoom: 3,
    }
  }, [imageSize])

  // Limita o deslocamento para manter o enquadramento equilibrado
  const clampOffset = (x: number, y: number, currentZoom: number) => {
    const curW = baseWidth * currentZoom
    const curH = baseHeight * currentZoom

    let maxOffsetX = Math.max(0, (curW - VIEWPORT_SIZE) / 2)
    let maxOffsetY = Math.max(0, (curH - VIEWPORT_SIZE) / 2)

    if (curW < VIEWPORT_SIZE) {
      maxOffsetX = (VIEWPORT_SIZE - curW) / 2
    }
    if (curH < VIEWPORT_SIZE) {
      maxOffsetY = (VIEWPORT_SIZE - curH) / 2
    }

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
    }
  }

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(maxZoom, Math.max(minZoom, parseFloat(newZoom.toFixed(2))))
    setZoom(clampedZoom)
    setOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom))
  }

  // Dimensões e posicionamento calculados
  const displayedWidth = baseWidth * zoom
  const displayedHeight = baseHeight * zoom
  const imgLeft = (VIEWPORT_SIZE - displayedWidth) / 2 + offset.x
  const imgTop = (VIEWPORT_SIZE - displayedHeight) / 2 + offset.y

  // Desenha prévias nos Canvas de forma matematicamente idêntica ao recorte final
  const drawPreview = (canvas: HTMLCanvasElement | null, size: number) => {
    if (!canvas || !imageElementRef.current || !imageSize) return
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.clearRect(0, 0, size, size)

    const scale = size / VIEWPORT_SIZE
    const destX = imgLeft * scale
    const destY = imgTop * scale
    const destWidth = displayedWidth * scale
    const destHeight = displayedHeight * scale

    ctx.drawImage(imageElementRef.current, destX, destY, destWidth, destHeight)
  }

  // Atualiza as prévias em tempo real (60 FPS) sempre que as coordenadas mudarem
  useEffect(() => {
    drawPreview(preview36Ref.current, 36)
    drawPreview(preview48Ref.current, 48)
    drawPreview(preview64Ref.current, 64)
  }, [imgLeft, imgTop, displayedWidth, displayedHeight, imageSize])

  // Manipulação de Mouse Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    }
  }

  // Manipulação de Touch Drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true
      setIsDragging(true)
      dragStartRef.current = {
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return
    const rawX = e.touches[0].clientX - dragStartRef.current.x
    const rawY = e.touches[0].clientY - dragStartRef.current.y
    setOffset(clampOffset(rawX, rawY, zoom))
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  // Listeners de janela para arrastar suavemente sem travar ao sair da caixa
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const rawX = e.clientX - dragStartRef.current.x
      const rawY = e.clientY - dragStartRef.current.y
      setOffset(clampOffset(rawX, rawY, zoom))
    }

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsDragging(false)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [zoom, baseWidth, baseHeight])

  // Zoom via Scroll do Mouse
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.05 : -0.05
    handleZoomChange(zoom + delta)
  }

  const handleReset = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  // Confirmação e geração do Canvas de alta resolução (512x512)
  const handleConfirm = () => {
    const img = imageElementRef.current
    if (!img || !imageSize) return

    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = OUTPUT_SIZE
    outputCanvas.height = OUTPUT_SIZE
    const ctx = outputCanvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

    const scaleFactor = OUTPUT_SIZE / VIEWPORT_SIZE
    const destX = imgLeft * scaleFactor
    const destY = imgTop * scaleFactor
    const destWidth = displayedWidth * scaleFactor
    const destHeight = displayedHeight * scaleFactor

    ctx.drawImage(img, destX, destY, destWidth, destHeight)

    const finalDataUrl = outputCanvas.toDataURL('image/png', 0.95)
    onCropComplete(finalDataUrl)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onCancel} />
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4 border border-slate-200 animate-in zoom-in-95 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              {cropShape === 'round' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
              <p className="text-xs text-slate-500 leading-snug">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => modalFileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
              title="Carregar outro arquivo de imagem"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trocar</span>
            </button>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input oculto para selecionar novo arquivo direto no modal */}
        <input
          ref={modalFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleModalFileSelect}
          className="hidden"
        />

        {/* Viewport de Recorte (sem flexbox centralizador para garantir alinhamento exato a 0,0) */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="relative w-64 h-64 bg-slate-950 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none ring-2 ring-slate-200 shadow-inner touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            title="Arraste para mover • Scroll para zoom"
          >
            {currentImageSrc && imageSize && (
              <img
                src={currentImageSrc}
                alt="Para recortar"
                className="max-w-none pointer-events-none select-none"
                style={{
                  position: 'absolute',
                  width: `${displayedWidth}px`,
                  height: `${displayedHeight}px`,
                  left: `${imgLeft}px`,
                  top: `${imgTop}px`,
                }}
              />
            )}

            {/* Máscara de recorte: escurece a área externa */}
            <div
              className={`absolute inset-0 pointer-events-none border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] ${
                cropShape === 'round' ? 'rounded-full' : 'rounded-2xl'
              }`}
            />

            {/* Guia visual sutil */}
            <div
              className={`absolute inset-0 pointer-events-none border border-dashed border-white/30 ${
                cropShape === 'round' ? 'rounded-full' : 'rounded-2xl'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Move className="w-3.5 h-3.5 text-slate-400" />
            <span>Arraste para enquadrar • Scroll para zoom</span>
          </div>
        </div>

        {/* Controles de Zoom */}
        <div className="w-full space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-slate-500" /> Zoom
            </span>
            <div className="flex items-center gap-1.5">
              {containZoom < 0.95 && (
                <button
                  type="button"
                  onClick={() => {
                    handleZoomChange(containZoom)
                    setOffset({ x: 0, y: 0 })
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium px-2 py-0.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  Caber Tudo
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleZoomChange(1)
                  setOffset({ x: 0, y: 0 })
                }}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium px-2 py-0.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Preencher
              </button>
              <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.1)}
              disabled={zoom <= minZoom}
              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.02}
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.1)}
              disabled={zoom >= maxZoom}
              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prévia em Tempo Real desenhada via Canvas para alinhamento e centralização milimétrica */}
        <div className="w-full p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-center">
            Prévia em tempo real de exibição no sistema
          </span>
          <div className="flex items-center justify-center gap-6 sm:gap-8 pt-0.5">
            {cropShape === 'round' ? (
              <>
                <div className="flex flex-col items-center gap-1.5">
                  <canvas
                    ref={preview36Ref}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full shadow-2xs ring-1 ring-slate-200/80 bg-slate-950 shrink-0"
                  />
                  <div className="text-center leading-tight">
                    <span className="text-[11px] font-bold text-slate-700 block">Menu Lateral</span>
                    <span className="text-[10px] text-slate-400 font-mono block">36px</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <canvas
                    ref={preview48Ref}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full shadow-2xs ring-1 ring-slate-200/80 bg-slate-950 shrink-0"
                  />
                  <div className="text-center leading-tight">
                    <span className="text-[11px] font-bold text-slate-700 block">Navegação</span>
                    <span className="text-[10px] text-slate-400 font-mono block">48px</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <canvas
                    ref={preview64Ref}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full shadow-2xs ring-1 ring-slate-200/80 bg-slate-950 shrink-0"
                  />
                  <div className="text-center leading-tight">
                    <span className="text-[11px] font-bold text-slate-700 block">Meu Perfil</span>
                    <span className="text-[10px] text-slate-400 font-mono block">64px</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-1.5">
                  <canvas
                    ref={preview36Ref}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-xl shadow-2xs ring-1 ring-slate-200/80 bg-slate-950 shrink-0"
                  />
                  <div className="text-center leading-tight">
                    <span className="text-[11px] font-bold text-slate-700 block">Menu Lateral</span>
                    <span className="text-[10px] text-slate-400 font-mono block">36px</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <canvas
                    ref={preview48Ref}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-xl shadow-2xs ring-1 ring-slate-200/80 bg-slate-950 shrink-0"
                  />
                  <div className="text-center leading-tight">
                    <span className="text-[11px] font-bold text-slate-700 block">Portal Cliente</span>
                    <span className="text-[10px] text-slate-400 font-mono block">48px</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <canvas
                    ref={preview64Ref}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-2xl shadow-2xs ring-1 ring-slate-200/80 bg-slate-950 shrink-0"
                  />
                  <div className="text-center leading-tight">
                    <span className="text-[11px] font-bold text-slate-700 block">Escritório</span>
                    <span className="text-[10px] text-slate-400 font-mono block">64px</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-semibold px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Centralizar
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" /> {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
