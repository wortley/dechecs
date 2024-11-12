import { toast } from "react-toastify"
import { API_URL } from "../constants"

export async function getTotalNGames() {
  /**
   * Fetch the total number of games played from backend
   *
   * @returns total number of games played since last server restart
   */
  try {
    const response = await fetch(`${API_URL}/stats`)
    const data = await response.json()
    return data["n_games"]
  } catch (error) {
    console.error("Error fetching usage statistics:", error)
    toast.error("Error fetching usage statistics")
  }
}
