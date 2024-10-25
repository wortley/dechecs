import * as amplitude from "@amplitude/analytics-browser"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createWeb3Modal, useWeb3ModalTheme } from "@web3modal/wagmi/react"
import { useEffect, useState } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { TouchBackend } from "react-dnd-touch-backend"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.min.css"
import { WagmiProvider } from "wagmi"
import "./App.css"
import Router from "./Router"
import ConnectionStatus from "./components/ConnectionStatus"
import Footer from "./components/Footer"
import Header from "./components/Header"
import { CustomPreview } from "./components/Piece"
import { config } from "./config"
import { AMPLITUDE_API_KEY, WC_PROJECT_ID } from "./constants"
import { socket } from "./socket"

const queryClient = new QueryClient()

createWeb3Modal({
  wagmiConfig: config,
  projectId: WC_PROJECT_ID,
  enableAnalytics: true,
  enableOnramp: true,
  themeVariables: {
    "--w3m-font-family": "'Red Hat Mono', monospace",
  },
})

function App() {
  const [connected, setConnected] = useState(false)
  const dndBackend = window.innerWidth <= 1024 ? TouchBackend : HTML5Backend
  const [theme, setTheme] = useState("")
  const { setThemeMode } = useWeb3ModalTheme()

  useEffect(() => {
    function onConnect() {
      setConnected(true)
    }

    function onDisconnect() {
      setConnected(false)
    }

    function onError(message: string) {
      toast.error(message)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("error", onError)

    socket.connect()

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("error", onError)
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (import.meta.env.PROD) amplitude.init(AMPLITUDE_API_KEY)
  }, [])

  useEffect(() => {
    const userDefaultTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    setTheme(userDefaultTheme)
    setThemeMode(userDefaultTheme)
    document.documentElement.setAttribute("data-theme", userDefaultTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    setThemeMode(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DndProvider backend={dndBackend} options={{ enableMouseEvents: true }}>
          <CustomPreview />
          <ToastContainer autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss draggable={false} pauseOnHover theme="colored" />
          <Header theme={theme} toggleTheme={toggleTheme} />
          <ConnectionStatus connected={connected} />
          <Router />
          <Footer />
        </DndProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
