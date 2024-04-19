from app.abi import abi
from app.constants import SC_ADDRESS, WALLET_PK


class GameContract:
    """Wrapper around smart contract functions declareWinner and declareDraw"""

    GAS_LIMIT = 100000

    def __init__(self, w3):
        self.w3 = w3
        self.contract = w3.eth.contract(address=SC_ADDRESS, abi=abi)
        self.acct = w3.eth.account.from_key(WALLET_PK)

    async def declare_winner(self, gid: str, winner: str):
        """Declare winner of game"""
        tx = self.contract.functions.declareWinner(gid, winner).buildTransaction(
            {
                "from": self.acct.address,
                "gas": self.GAS_LIMIT,
                "nonce": self.w3.eth.getTransactionCount(self.acct.address),
            }
        )
        signed_tx = self.acct.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return await self.w3.eth.wait_for_transaction_receipt(tx_hash)

    async def declare_draw(self, gid: str):
        """Declare draw in game"""
        tx = self.contract.functions.declareDraw(gid).buildTransaction(
            {
                "from": self.acct.address,
                "gas": self.GAS_LIMIT,
                "nonce": self.w3.eth.getTransactionCount(self.acct.address),
            }
        )
        signed_tx = self.acct.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return await self.w3.eth.wait_for_transaction_receipt(tx_hash)
