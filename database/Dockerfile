FROM alpine:3.16

RUN apk add --no-cache sqlite
WORKDIR /data
COPY init.sql /docker-entrypoint-init.sql

#If the database does not exist — create it. If it already exists — DO NOT touch it (important!)
ENTRYPOINT ["/bin/sh", "-c", "\
    if [ ! -f /data/database.sqlite ]; then \
        sqlite3 /data/database.sqlite < /docker-entrypoint-init.sql; \
        echo 'Database created'; \
    else \
        echo 'Database already exists, skipping init'; \
    fi && \
    exec tail -f /dev/null \
"]
