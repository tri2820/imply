# Quick Guide to Running **Imply** with Docker

Some useful Docker commands:

1. Build the Docker image for **Imply**.

```sh
docker build -t docker.io/implyapp/imply .
```

2. Use the following to start the application:

```sh
docker-compose up
```

3. To run **Imply** in a detached container:

```sh
docker run -d --name imply --env-file .env -p 3000:3000 implyapp/imply
```
