import { defaultWagmiConfig } from "@web3modal/wagmi/react/config"
import "react-toastify/dist/ReactToastify.min.css"
import { polygon, polygonAmoy } from "wagmi/chains"
import "./App.css"
import { WC_PROJECT_ID } from "./constants"

const metadata = {
  name: "dechecs",
  description: "dechecs is a decentralized chess platform on Ethereum.",
  url: "https://dechecs.netlify.app",
  icons: [],
}

const chains = [polygon, polygonAmoy] as const

export const config = defaultWagmiConfig({
  chains,
  projectId: WC_PROJECT_ID,
  metadata,
})
