import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.organizeasy.com.br";

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Organizeasy — Gestão Inteligente de Escritórios & Projetos",
    template: "%s | Organizeasy",
  },
  description:
    "A plataforma SaaS definitiva para gestão e organização de escritórios: cronogramas por etapas, Kanban ágil, fluxo financeiro e portal do cliente com aprovação sem senha.",
  keywords: [
    "gestão de escritórios",
    "gestão de projetos",
    "software para escritórios",
    "organização de processos",
    "portal do cliente",
    "kanban para equipes",
    "fluxo financeiro escritório",
    "Organizeasy",
  ],
  authors: [{ name: "Organizeasy" }],
  creator: "Organizeasy",
  publisher: "Organizeasy",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logos/logo-organizeasy-quadrado.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: baseUrl,
    title: "Organizeasy — Gestão Inteligente de Escritórios & Projetos",
    description:
      "Controle prazos, visualize etapas em Lista, Kanban e Gantt, e colete aprovações com auditoria no Portal do Cliente.",
    siteName: "Organizeasy",
    images: [
      {
        url: "/logos/logo-organizeasy-quadrado.png",
        width: 1200,
        height: 1200,
        alt: "Organizeasy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Organizeasy — Gestão Inteligente de Escritórios & Projetos",
    description:
      "Plataforma completa de organização, fluxo de projetos, Kanban e portal do cliente para escritórios.",
    images: ["/logos/logo-organizeasy-quadrado.png"],
  },
};

import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-[#F8FAFC] text-slate-800 text-sm selection:bg-blue-100 selection:text-blue-700`}>
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
      </body>
    </html>
  );
}
