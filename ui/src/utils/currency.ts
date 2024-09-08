import { toast } from "react-toastify"
import { parseUnits } from "viem"
import { API_URL } from "../constants"

async function getPOLExchangeRate(fiat: string) {
  /**
   * Fetch the current exchange rate of POL to {fiat} from CoinGecko API
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

export async function POLtoGBP(amountPOL: number) {
  /**
   * Fetch the current exchange rate of POL to GBP from CoinGecko API
   *
   * @param amountPOL - the amount in POL to convert to GBP
   * @returns the amount in GBP
   */
  let gbpAmount = 0
  const exchangeRate = await getPOLExchangeRate("gbp")
  gbpAmount = amountPOL * exchangeRate
  return gbpAmount
}

export async function POLtoUSD(amountPOL: number) {
  /**
   * Fetch the current exchange rate of POL to GBP from CoinGecko API
   *
   * @param amountPOL - the amount in POL to convert to GBP
   * @returns the amount in USD
   */
  let usdAmount = 0
  const exchangeRate = await getPOLExchangeRate("usd")
  usdAmount = amountPOL * exchangeRate
  return usdAmount
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
