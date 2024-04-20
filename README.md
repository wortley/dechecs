# d&eacute;checs

> from &eacute;checs (French for 'chess') and *de*centralised

Performant multiplayer chess dapp on the Polygon blockchain utilising web3py, wagmi, Socket.IO and react-dnd. A smart contract, written with Solidity, is used to pool players' wagers and then distribute payouts at the conclusion of the match according to the outcome. Game states stored in Redis cache with a pub/sub channel used for game events. Backend is currently scaled to 8 uvicorn workers on a single Heroku dyno, and can be scaled much further.

<!-- ![Screenshot of gameplay](images/play.png) -->

## System design

<!-- TODO: diagram and short description of architecture -->

## Running locally

### Backend

1. Navigate to /api
2. Run `venv/scripts/activate`
3. Ensure Memurai or Redis service is running in background or in another terminal window
4. Open another terminal window and run `rabbitmq-server` to start RabbitMQ
5. Run with single worker: `uvicorn app.main:chess_api --reload` or n workers: `uvicorn app.main:chess_api --workers n`

### Frontend

1. Navigate to /ui
2. Run `yarn dev`

## Heroku management

Manually push to Heroku repo: `git subtree push --prefix api heroku master`

View logs: `heroku logs --tail -a unichess-api`
