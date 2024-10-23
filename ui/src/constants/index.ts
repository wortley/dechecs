import { polygon, polygonAmoy } from "wagmi/chains"

export const DraggableTypes = {
  PIECE: "piece",
}
export const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID
export const chainId = import.meta.env.PROD ? polygon.id : polygonAmoy.id
export const SC_ADDRESS = import.meta.env.VITE_SC_ADDRESS
export const CMC_API_KEY = import.meta.env.VITE_CMC_API_KEY
export const API_URL = import.meta.env.VITE_API_URL

export const MAX_GAS = 1000000n

export const COMMISSION_PERCENTAGE = import.meta.env.VITE_COMMISSION
