abi = [
    {"inputs": [], "stateMutability": "nonpayable", "type": "constructor"},
    {"stateMutability": "payable", "type": "fallback"},
    {"inputs": [{"internalType": "string", "name": "gid", "type": "string"}], "name": "createGame", "outputs": [], "stateMutability": "payable", "type": "function"},
    {"inputs": [{"internalType": "string", "name": "gid", "type": "string"}], "name": "declareDraw", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {
        "inputs": [{"internalType": "string", "name": "gid", "type": "string"}, {"internalType": "address", "name": "_winner", "type": "address"}],
        "name": "declareWinner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {"inputs": [{"internalType": "string", "name": "gid", "type": "string"}], "name": "joinGame", "outputs": [], "stateMutability": "payable", "type": "function"},
    {"inputs": [], "name": "togglePause", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"stateMutability": "payable", "type": "receive"},
]
