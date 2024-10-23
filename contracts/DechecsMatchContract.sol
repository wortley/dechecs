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
    uint256 private _gasLimit = 1000000; // gas limit for each transaction
    bool private _paused = false; // flag to indicate if the contract is paused
    uint32 private _gameExpiry = 86400; // expire after 24 hours if no other player has joined
    uint32 private _commissionPercentage = 5; // (initial value) 5% commission on wagers

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
        require(msg.sender == _owner, "Caller is not the contract owner");
        _;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    modifier notPaused() {
        require(!_paused, "Contract is paused");
        _;
    }

    //
    // ADMIN METHODS
    //

    // SETTERS

    /**
     * @dev Pauses or unpauses the contract
     */
    function togglePause() external isOwner {
        _paused = !_paused;
    }

    /**
     * @dev Withdraw a specified amount from the contract balance
     * @param withdrawalAmount The amount to withdraw (in wei)
     */
    function withdraw(uint256 withdrawalAmount) external isOwner {
        uint256 contractBalance = address(this).balance;
        uint256 gasAmount = _gasLimit * tx.gasprice;

        require(
            withdrawalAmount > 0,
            "Withdrawal amount must be greater than zero"
        );
        require(
            withdrawalAmount + gasAmount <= contractBalance,
            "Insufficient balance to cover withdrawal and gas fee"
        );

        payable(_owner).transfer(withdrawalAmount);
    }

    /**
     * @dev Set the commission percentage (only callable by the owner)
     * @param commission New commission percentage
     */
    function setCommissionPercentage(uint32 commission) external isOwner {
        require(commission > 0, "Commission must be greater than 0%");
        require(commission <= 100, "Commission cannot exceed 100%");
        _commissionPercentage = commission;
    }

    // GETTERS

    /**
     * @dev Returns the contract's balance (in wei)
     */
    function getContractBalance() external view isOwner returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Returns whether the contract is paused or not
     */
    function isPaused() external view isOwner returns (bool) {
        return _paused;
    }

    /**
     * @dev Returns the current commission percentage
     */
    function getCommissionPercentage() external view isOwner returns (uint32) {
        return _commissionPercentage;
    }

    //
    // DECHECS FUNCTIONALITY
    //

    /**
     * @dev Create a new game
     * @param gid id of the game
     */
    function createGame(
        string calldata gid,
        uint256 wager
    ) external payable notPaused {
        uint256 commission = (wager * _commissionPercentage) / 100;
        require(
            msg.value == wager + commission,
            "Commission not included in value"
        );

        _games[gid] = Game(msg.sender, address(0), wager, block.timestamp);
    }

    /**
     * @dev Join an existing game
     * @param gid id of the game
     */
    function joinGame(string calldata gid) external payable notPaused {
        Game storage game = _games[gid];

        require(game.created_at > 0, "Game does not exist");
        require(game.wager > 0, "Game has no wager");
        require(game.player2 == address(0), "Game has already started");

        uint256 commission = (game.wager * _commissionPercentage) / 100;

        require(msg.value == game.wager + commission, "Incorrect value sent");
        require(
            block.timestamp - game.created_at < _gameExpiry,
            "Game has expired"
        );

        game.player2 = msg.sender;
    }

    /**
     * @dev Cancel a game and get wager back
     * @param gid id of the game
     */
    function cancelGame(string calldata gid) external isOwner notPaused {
        Game storage game = _games[gid];
        require(game.created_at > 0, "Game does not exist");
        require(game.player2 == address(0), "Game has already started");

        uint256 gasFee = tx.gasprice * _gasLimit;

        require(
            address(this).balance >= (game.wager + gasFee),
            "Insufficient funds to cover gas"
        );

        payable(game.player1).transfer(game.wager);

        delete _games[gid];
    }

    /**
     * @dev Declare the game as a draw
     * @param gid id of the game
     */
    function declareDraw(string calldata gid) external isOwner notPaused {
        Game storage game = _games[gid];
        require(game.created_at > 0, "Game does not exist");
        require(game.player2 != address(0), "Game has not started");

        uint256 gasFee = tx.gasprice * _gasLimit;

        require(
            address(this).balance >= ((game.wager * 2) + (gasFee * 2)),
            "Insufficient funds to cover player payout"
        );
        payable(game.player1).transfer(game.wager);
        payable(game.player2).transfer(game.wager);

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
    ) external isOwner notPaused {
        Game storage game = _games[gid];
        require(game.created_at > 0, "Game does not exist");
        require(game.player2 != address(0), "Game has not started");
        require(
            _winner == game.player1 || _winner == game.player2,
            "Invalid winner address"
        );

        uint256 gasFee = tx.gasprice * _gasLimit;
        uint256 totalWager = (game.wager * 2);

        require(
            address(this).balance >= (totalWager + gasFee),
            "Insufficient funds to cover winner payout"
        );
        payable(_winner).transfer(totalWager);

        delete _games[gid];
    }
}
