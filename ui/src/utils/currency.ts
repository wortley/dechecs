import { parseUnits } from "viem";
import { API_URL } from "../constants";

async function getMATICGBPExchangeRate() {
  /**
   * Fetch the current exchange rate of MATIC to GBP from CoinGecko API
   *
   * @returns the exchange rate of MATIC to GBP
   */
  try {
    const response = await fetch(`${API_URL}/exchange/matic-gbp`);
    const data = await response.json();
    return data["exchange_rate"];
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
  }
}

export async function GBPtoMATIC(amountGbp: number) {
  /**
   * Fetch the current exchange rate of GBP to MATIC from CoinGecko API
   *
   * @param amountGbp - the amount in GBP to convert to MATIC
   * @returns the amount in MATIC
   */
  let maticAmount = 0;
  const exchangeRate = await getMATICGBPExchangeRate();
  maticAmount = amountGbp / exchangeRate;
  return maticAmount;
}

export async function MATICtoGBP(amountMatic: number) {
  /**
   * Fetch the current exchange rate of MATIC to GBP from CoinGecko API
   *
   * @param amountMatic - the amount in MATIC to convert to GBP
   * @returns the amount in GBP
   */
  let gbpAmount = 0;
  const exchangeRate = await getMATICGBPExchangeRate();
  gbpAmount = amountMatic * exchangeRate;
  return gbpAmount;
}

export function parseMatic(amount: string) {
  /**
   * Convert MATIC string amount to wei (bigint)
   *
   * Equivalent to viem parseEther method but for MATIC
   *
   * @param amount - the amount in MATIC to parse
   * @returns the parsed amount
   */
  return parseUnits(amount, 18);
}
