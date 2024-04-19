// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

/**
 * @title UnichessGameContract
 * @dev Pool funds from two players and transfer to winner
 */
contract UnichessGameContract {
    struct Game {
        address player1; // wallet address of player 1
        address player2; // wallet address of player 2
        uint256 wager; // amount to wager in wei
        address winner; // wallet address of the winner
        bool ended; // flag to indicate if the game has ended
    }

    address private _owner; // owner of the contract
    uint256 private _gasLimit = 50000; // gas limit for each transaction

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

    function withdraw() public isOwner {
        payable(_owner).transfer(address(this).balance);
    }

    /**
     * @dev Create a new game
     * @param gid id of the game
     */
    function createGame(string memory gid) public payable {
        _games[gid] = Game(
            msg.sender,
            address(0),
            msg.value,
            address(0),
            false
        );
    }

    /**
     * @dev Join an existing game
     * @param gid id of the game
     */
    function joinGame(string memory gid) public payable {
        Game storage game = _games[gid];
        require(!game.ended, "Game has already ended.");
        require(msg.value == game.wager, "Incorrect wager amount sent");

        game.player2 = msg.sender;
    }

    /**
     * @dev Declare the game as a draw
     * @param gid id of the game
     */
    function declareDraw(string memory gid) public {
        Game storage game = _games[gid];
        require(!game.ended, "Game has already ended");
        require(
            msg.sender == game.player1 || msg.sender == game.player2,
            "Only players can declare the result"
        );

        game.ended = true;
        uint256 gasFee = tx.gasprice * _gasLimit;
        uint256 playerAmount = game.wager;
        uint256 commission = (playerAmount * 5) / 100; // 5% commission
        playerAmount -= commission;

        if (gasFee >= game.wager) {
            emit InsufficientFunds(gid, address(this).balance);
            return;
        }

        playerAmount -= gasFee;

        if (address(this).balance >= ((playerAmount * 2) + (gasFee * 2))) {
            payable(game.player1).transfer(playerAmount);
            payable(game.player2).transfer(playerAmount);
        } else emit InsufficientFunds(gid, address(this).balance);
    }

    /**
     * @dev Declare the winner of a game
     * @param gid id of the game
     * @param _winner address of the winner
     */
    function declareWinner(string memory gid, address _winner) public {
        Game storage game = _games[gid];
        require(!game.ended, "Game has already ended");
        require(
            msg.sender == game.player1 || msg.sender == game.player2,
            "Only players can declare the winner"
        );
        require(
            _winner == game.player1 || _winner == game.player2,
            "Invalid winner address"
        );

        game.winner = _winner;
        game.ended = true;

        uint256 gasFee = tx.gasprice * _gasLimit;
        uint256 totalWager = (game.wager * 2);
        uint256 commission = (totalWager * 5) / 100; // 5% commission
        totalWager -= commission;

        if (gasFee >= totalWager) {
            emit InsufficientFunds(gid, address(this).balance);
            return;
        }

        uint256 winnerAmount = totalWager - gasFee;
        if (address(this).balance >= (winnerAmount + gasFee))
            payable(game.winner).transfer(winnerAmount);
        else emit InsufficientFunds(gid, address(this).balance);
    }

    //  events for EVM logging
    event InsufficientFunds(string gid, uint256 contractBalance);
}
