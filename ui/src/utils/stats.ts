import { toast } from "react-toastify"
import { API_URL } from "../constants"
import { UsageStats } from "../types"

export async function getUsageStats() {
  /**
   * Fetch the total number of games played and total amount wagered from backend
   *
   * @returns {UsageStats} usage statistics
   */
  try {
    const response = await fetch(`${API_URL}/stats`)
    const data = await response.json()
    return data as UsageStats
  } catch (error) {
    console.error("Error fetching usage statistics:", error)
    toast.error("Error fetching usage statistics")
  }
}
