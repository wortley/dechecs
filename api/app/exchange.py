import aiohttp
from app.constants import CMC_API_KEY
from fastapi import APIRouter, HTTPException
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

router = APIRouter(prefix="/exchange", tags=["exchange"])


@router.get("/{fiat}")
async def get_exchange_rate(fiat: str):
    """
    Fetch the current exchange rate of POL to fiat from CoinMarketCap API

    Returns:
        dict: The exchange rate
    """
    FIAT = fiat.upper()
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
                params={"symbol": "POL", "convert": FIAT},
                headers={
                    "X-CMC_PRO_API_KEY": CMC_API_KEY,
                    "Accept-Encoding": "deflate, gzip",
                    "Accept": "application/json",
                },
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    exchange_rate = data["data"]["POL"][0]["quote"][FIAT]["price"]
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
