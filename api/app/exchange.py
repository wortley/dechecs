import aiohttp
from app.constants import CMC_API_KEY
from fastapi import APIRouter, HTTPException
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

MATIC_UCID = "3890"

router = APIRouter(prefix="/exchange", tags=["exchange"])


@router.get("/matic-gbp")
async def get_matic_gbp_exchange_rate():
    """
    Fetch the current exchange rate of MATIC to GBP from CoinMarketCap API

    Returns:
        dict: The exchange rate of MATIC to GBP
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
                params={"symbol": "MATIC", "convert": "GBP"},
                headers={
                    "X-CMC_PRO_API_KEY": CMC_API_KEY,
                    "Accept-Encoding": "deflate, gzip",
                    "Accept": "application/json",
                },
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    exchange_rate = data["data"][MATIC_UCID]["quote"]["GBP"]["price"]
                    return {"exchange_rate": exchange_rate}
                else:
                    raise HTTPException(
                        status_code=response.status,
                        detail="Error fetching exchange rate from CoinMarketCap API",
                    )
    except Exception:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching the exchange rate",
        )
