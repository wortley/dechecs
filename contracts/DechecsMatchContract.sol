// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

/**
 * @title DechecsMatchContract
 * @dev Pool funds from two players and transfer to winner
 */
contract DechecsMatchContract {
    struct Game {
        address player1; // wallet address of player 1
        address player2; // wallet address of player 2
        uint256 wager; // amount to wager in wei
        uint256 created_at; // timestamp of when the game was created
    }

    address private _owner; // owner of the contract
    uint256 private _gasLimit = 100000; // gas limit for each transaction
    uint8 private _commission = 7; // 7% commission
    bool private _paused; // flag to indicate if the contract is paused
    uint32 private _gameExpiry = 86400; // expire after 24 hours if no other player has joined

    mapping(string => Game) private _games;

    receive() external payable {}

    fallback() external payable {}

    /**
     * @dev Set contract deployer as owner
     */
    constructor() {
        _owner = msg.sender;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier isOwner() {
        require(msg.sender == _owner, "Caller is not owner");
        _;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    modifier notPaused() {
        require(!_paused, "Contract is paused");
        _;
    }

    /**
     * @dev Pauses or unpauses the contract
     */
    function togglePause() public isOwner {
        _paused = !_paused;
    }

    /**
     * @dev Withdraw the full balance of the contract
     */
    function withdraw() public isOwner {
        uint256 contractBalance = address(this).balance;
        uint256 gasAmount = _gasLimit * tx.gasprice;
        require(
            contractBalance > gasAmount,
            "Insufficient balance to cover gas fee"
        );
        uint256 withdrawalAmount = contractBalance - gasAmount;
        payable(_owner).transfer(withdrawalAmount);
    }

    /**
     * @dev Create a new game
     * @param gid id of the game
     */
    function createGame(string calldata gid) public payable notPaused {
        _games[gid] = Game(msg.sender, address(0), msg.value, block.timestamp);
    }

    /**
     * @dev Join an existing game
     * @param gid id of the game
     */
    function joinGame(string calldata gid) public payable notPaused {
        Game storage game = _games[gid];
        require(game.created_at > 0, "Game does not exist");
        require(msg.value == game.wager, "Incorrect wager amount sent");
        require(
            block.timestamp - game.created_at < _gameExpiry,
            "Game has expired"
        );

        game.player2 = msg.sender;
    }

    /**
     * @dev Declare the game as a draw
     * @param gid id of the game
     */
    function declareDraw(string calldata gid) public isOwner {
        Game storage game = _games[gid];
        require(game.created_at > 0, "Game does not exist");
        require(game.player2 != address(0), "Game has not started");

        uint256 gasFee = tx.gasprice * _gasLimit;
        uint256 playerAmount = game.wager;
        uint256 commission = (playerAmount * _commission) / 100;
        playerAmount -= commission;

        require(playerAmount > gasFee, "Insufficient funds to cover gas fee");

        playerAmount -= gasFee;

        require(
            address(this).balance >= ((playerAmount * 2) + (gasFee * 2)),
            "Insufficient funds to cover player payout"
        );
        payable(game.player1).transfer(playerAmount);
        payable(game.player2).transfer(playerAmount);

        delete _games[gid]; // free up storage
    }

    /**
     * @dev Declare the winner of a game
     * @param gid id of the game
     * @param _winner address of the winner
     */
    function declareWinner(
        string calldata gid,
        address _winner
    ) public isOwner {
        Game storage game = _games[gid];
        require(game.created_at > 0, "Game does not exist");
        require(game.player2 != address(0), "Game has not started");
        require(
            _winner == game.player1 || _winner == game.player2,
            "Invalid winner address"
        );

        uint256 gasFee = tx.gasprice * _gasLimit;
        uint256 totalWager = (game.wager * 2);
        uint256 commission = (totalWager * _commission) / 100;
        totalWager -= commission;

        require(gasFee < totalWager, "Insufficient funds to cover gas fee");
        uint256 winnerAmount = totalWager - gasFee;

        require(
            address(this).balance >= (winnerAmount + gasFee),
            "Insufficient funds to cover winner payout"
        );
        payable(_winner).transfer(winnerAmount);

        delete _games[gid];
    }
}
