from fastapi import APIRouter, HTTPException
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
import app.utils as utils


def build_stats_router(redis_client):
    router = APIRouter(prefix="/stats", tags=["stats"])

    async def get_stats():
        """
        Fetch usage statistics (number of games played etc.)

        Returns:
            dict: The stats dict
        """
        try:
            n_games = await redis_client.get(utils.get_redis_stat_key("n_games"))
            return {"n_games": n_games}
        except Exception as e:
            print(e)
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while fetching usage stats",
            )

    router.add_api_route("", get_stats)
    return router
