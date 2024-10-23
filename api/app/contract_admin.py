from app.abi import abi
from app.constants import ALCHEMY_API_URL, SC_ADDRESS, WALLET_PK
from web3 import Web3
from web3.middleware import geth_poa_middleware


w3 = Web3(Web3.HTTPProvider(ALCHEMY_API_URL))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)
acct = w3.eth.account.from_key(WALLET_PK)
contract = w3.eth.contract(address=SC_ADDRESS, abi=abi)


def toggle_pause():
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


def get_paused():
    paused = contract.functions.isPaused().call({"from": acct.address})
    return paused


def get_commission():
    commission_percentage = contract.functions.getCommissionPercentage().call({"from": acct.address})
    return commission_percentage


def set_commission(value: int):
    tx = contract.functions.setCommissionPercentage(value).build_transaction(
        {
            "from": acct.address,
            "gas": 1_000_000,
            "nonce": w3.eth.get_transaction_count(acct.address),
        }
    )
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=acct.key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash)


def get_balance():
    balance_in_wei = contract.functions.getContractBalance().call({"from": acct.address})
    balance_in_pol = w3.fromWei(balance_in_wei, "ether")
    return balance_in_pol


def withdraw(amount: int):  # amount in POL
    amount_in_wei = w3.to_wei(amount, "ether")
    tx = contract.functions.withdraw(amount_in_wei).build_transaction(
        {
            "from": acct.address,
            "gas": 1_000_000,
            "nonce": w3.eth.get_transaction_count(acct.address),
        }
    )
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=acct.key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash)
