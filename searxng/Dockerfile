FROM searxng/searxng:latest

COPY settings.yml limiter.toml /etc/searxng/

ENV BIND_ADDRESS=0.0.0.0:8080 \
    GRANIAN_HOST=0.0.0.0 \
    GRANIAN_PORT=8080

EXPOSE 8080
