# My (I)P

You ever needed a screensaver that shows your IP address? 😁

## About

Simple stupid IP viewer.

- no external dependencies
- no external API calls
- plain HTML/CSS/JS
- plus a tiny node server

Extra plus 🤓:

An API key is injected into the client side code, so you can only once request the IP address.

## Build & Run

```shell
docker build -t myp:latest . && docker kill myp ; docker run --rm -p 3000:80 --name myp myp:latest
```

## Deployment

```shell
SERVER=localhost; \
ssh $SERVER 'mkdir -p /opt/docker/myp' && \
scp docker-compose.yml $SERVER:/opt/docker/myp/ && \
docker build -t myp:latest . && \
docker save myp:latest | gzip |  ssh $SERVER 'gunzip | docker load' && \
ssh $SERVER 'docker compose -f /opt/docker/myp/docker-compose.yml up -d --force-recreate' 
```

## Create favicon
First we crop a bit:
```shell
ffmpeg -i assets/logo.png -vfy "crop=iw*0.8:ih*0.8" /tmp/crop.png
```
next we round the edges:
```shell
W=$(identify -format "%w" tmp/crop.png); \
H=$(identify -format "%h" tmp/crop.png); \
R=$((W / 5)); \
convert /tmp/crop.png -alpha on \( -size ${W}x${H} xc:none -draw "roundrectangle 0,0,$((W-1)),$((H-1)),$R,$R" \) -compose DstIn -composite /tmp/rounded.png
```

at last, we convert to favicon:
```shell
ffmpeg -i /tmp/rounded.png -vfy "scale=64:64:flags=lanczos" public/favicon.ico
```
