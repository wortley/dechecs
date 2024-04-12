# _unichess_

Lightweight, performant multiplayer chess web app utilising Socket.IO, python-chess and react-dnd. Features drag and drop interface, CSS piece animations, rematch functionality and multiple time controls. Game states stored in Redis cache with a pub/sub channel used for game events. Backend is currently scaled to 8 uvicorn workers on a single Heroku dyno, but can be scaled much further.

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
