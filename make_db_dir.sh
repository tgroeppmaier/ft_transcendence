#!/bin/bash

if [ ! -d "/Users/${USER}/data/sqlite" ]; then
    mkdir -p /Users/${USER}/data/sqlite
    echo "Created /Users/${USER}/data/sqlite"
else
    echo "/Users/${USER}/data/sqlite already exists"
fi
