# WChess

Lightweight, performant multiplayer chess web app utilising Socket.IO, python-chess and react-dnd. Features drag and drop interface, CSS piece animations, rematch functionality and multiple time controls. Designed for limited numbers of concurrent users but can be scaled via use of Redis/Memcached and multiple Uvicorn workers/Heroku dynos. FE is a React app built with Vite and deployed on Netlify; BE is a FastAPI app deployed on Heroku.

![Screenshot](images/play.png)

[Site link](https://wchess.netlify.app/)
