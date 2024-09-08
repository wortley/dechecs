from app.abi import abi
from app.constants import ALCHEMY_API_URL, SC_ADDRESS, WALLET_PK
from web3 import Web3
from web3.middleware import geth_poa_middleware


w3 = Web3(Web3.HTTPProvider(ALCHEMY_API_URL))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)
acct = w3.eth.account.from_key(WALLET_PK)
contract = w3.eth.contract(address=SC_ADDRESS, abi=abi)


def withdraw():
    tx = contract.functions.withdraw().build_transaction(
        {
            "from": acct.address,
            "gas": 1_000_000,
            "nonce": w3.eth.get_transaction_count(acct.address),
        }
    )
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=acct.key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash)


def pause():
    tx = contract.functions.togglePause().build_transaction(
        {
            "from": acct.address,
            "gas": 1_000_000,
            "nonce": w3.eth.get_transaction_count(acct.address),
        }
    )
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=acct.key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash)


if __name__ == "__main__":
    receipt = withdraw()
    print(receipt)
