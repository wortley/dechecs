# d&eacute;checs

> from &eacute;checs (French for 'chess') and *de*centralised

Performant multiplayer chess dapp on the Polygon blockchain utilising web3py, wagmi, Socket.IO and react-dnd. A smart contract, written with Solidity, is used to pool players' wagers and then distribute payouts at the conclusion of the match according to the outcome. Game states stored in Redis cache with a RabbitMQ message channels used for passing events between backend workers.

## System design

![High-level system design diagram](./media/system.png)

## License

d&eacute;checs is licensed under the GNU Affero General Public License v3. Any file in this project that does not state otherwise is part of d&eacute;checs and copyright (c) 2024 Montagu Technologies.
