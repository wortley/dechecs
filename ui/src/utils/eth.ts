export async function GBPToETH(amountGbp: number) {
  /**
   * Fetch the current exchange rate of GBP to ETH from CoinGecko API
   *
   * @param amountGbp - the amount in GBP to convert to ETH
   * @returns the amount in ETH
   */
  let ethAmount = 0;

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=gbp"
    );
    const data = await response.json();
    const exchangeRate = data.ethereum.gbp;
    ethAmount = amountGbp / exchangeRate;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
  }

  return ethAmount;
}

export async function ETHtoGBP(amountEth: number) {
  /**
   * Fetch the current exchange rate of ETH to GBP from CoinGecko API
   *
   * @param amountEth - the amount in ETH to convert to GBP
   * @returns the amount in GBP
   */
  let gbpAmount = 0;

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=gbp"
    );
    const data = await response.json();
    const exchangeRate = data.ethereum.gbp;
    gbpAmount = amountEth * exchangeRate;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
  }

  return gbpAmount;
}
