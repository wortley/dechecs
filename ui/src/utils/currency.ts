import { parseUnits } from "viem";

export async function GBPtoMATIC(amountGbp: number) {
  /**
   * Fetch the current exchange rate of GBP to MATIC from CoinGecko API
   *
   * @param amountGbp - the amount in GBP to convert to MATIC
   * @returns the amount in MATIC
   */
  let maticAmount = 0;

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=gbp"
    );
    const data = await response.json();
    const exchangeRate = data["matic-network"].gbp;
    maticAmount = amountGbp / exchangeRate;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
  }

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

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=gbp"
    );
    const data = await response.json();
    const exchangeRate = data["matic-network"].gbp;
    gbpAmount = amountMatic * exchangeRate;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
  }

  return gbpAmount;
}

export function parseMatic(amount: string) {
  /**
   * Convert MATIC string amount to wei (bigint)
   *
   * @param amount - the amount in MATIC to parse
   * @returns the parsed amount
   */
  return parseUnits(amount, 18);
}
