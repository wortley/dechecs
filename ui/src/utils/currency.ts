import { toast } from "react-toastify"
import { parseUnits } from "viem"
import { API_URL } from "../constants"

async function getPOLExchangeRate(fiat: string) {
  /**
   * Fetch the current exchange rate of POL to {fiat} from CoinMarketCap
   *
   * @param fiat - the target fiat currency
   * @returns the exchange rate
   */
  try {
    const response = await fetch(`${API_URL}/exchange/${fiat}`)
    const data = await response.json()
    return data["exchange_rate"]
  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    toast.error("Error fetching exchange rate")
  }
}

export async function POLtoX(amountPOL: number, fiat: string) {
  /**
   * Fetch the current exchange rate of POL to GBP from CoinMarketCap
   *
   * @param amountPOL - the amount in POL to convert
   * @param fiat - the target fiat currency
   * @returns the amount in {fiat}
   */
  let fiatAmount = 0
  const exchangeRate = await getPOLExchangeRate(fiat)
  fiatAmount = amountPOL * exchangeRate
  return fiatAmount
}

export function parsePOL(amount: string) {
  /**
   * Convert POL string amount to wei (bigint)
   *
   * Equivalent to viem parseEther method but for POL
   *
   * @param amount - the amount in POL to parse
   * @returns the parsed amount
   */
  return parseUnits(amount, 18)
}
