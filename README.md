# _unichess_

Lightweight, performant multiplayer chess web app utilising Socket.IO, python-chess and react-dnd. Features drag and drop interface, CSS piece animations, rematch functionality and multiple time controls. Game states stored in Redis cache with a pub/sub channel used for game events. Backend is currently scaled to 8 uvicorn workers on a single Heroku dyno, but can be scaled much further.

![Screenshot of gameplay](images/play.png)

## System design

<!-- TODO: diagram and short description of architecture -->

## Run locally

### Backend

1. Navigate to /api
2. `venv/scripts/activate`
3. Open another terminal window and run `rabbitmq-server` to start RabbitMQ
4. Run with single worker: `uvicorn main:chess_api --reload` or n workers: `uvicorn main:chess_api --workers n`

### Frontend

1. Navigate to /ui
2. `yarn dev`

## Heroku management

Manually push to Heroku repo: `git subtree push --prefix api heroku master`

View logs: `heroku logs --tail -a unichess-api`
