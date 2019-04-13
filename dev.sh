(sleep 1; touch src/server.js) &
while inotifywait -e modify,close_write,move_self -q src/*
do 
  kill -9 `cat .pid`
  sleep 0.3
  clear;
  node src/server.js &
  echo $! > .pid
  sleep 2
done
